const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

(async () => {
  const workflow = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))[0];
  const trigger = workflow.nodes.find(node => node.name === 'Telegram Trigger');
  const file = '/tmp/telegram-startup-credential-' + process.pid + '.json';
  try {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        if (fs.existsSync(file)) fs.unlinkSync(file);
        execFileSync('n8n', ['export:credentials', '--id=' + trigger.credentials.telegramApi.id, '--decrypted', '--output=' + file], { stdio: 'pipe' });
        break;
      } catch (error) {
        if (attempt === 4) throw error;
        await sleep(2000);
      }
    }
    const [credential] = JSON.parse(fs.readFileSync(file, 'utf8'));
    fs.unlinkSync(file);
    const base = 'https://api.telegram.org/bot' + credential.data.accessToken + '/';
    const call = async (method, body) => {
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const response = await fetch(base + method, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
          const data = await response.json();
          if (!data.ok) throw new Error(data.description || ('Telegram tu choi ' + method));
          return data.result;
        } catch (error) {
          const code = error.cause?.code || '';
          const retryable = ['ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT'].includes(code) || error.name === 'TimeoutError';
          if (!retryable || attempt === 4) throw error;
          await sleep(2000);
        }
      }
    };
    const baseUrl = process.argv[3] || process.env.N8N_WEBHOOK_URL;
    if (!baseUrl) throw new Error('Thieu URL cong khai cua webhook.');
    const url = new URL('/webhook/' + trigger.webhookId + '/webhook', baseUrl).href;
    let info = await call('getWebhookInfo', {});
    if (info.url !== url) {
      const updates = [...trigger.parameters.updates];
      if (updates.includes('message') && !updates.includes('callback_query')) updates.push('callback_query');
      await call('setWebhook', {
        url, allowed_updates: updates, drop_pending_updates: false,
        secret_token: (workflow.id + '_' + trigger.id).replace(/[^a-zA-Z0-9_-]+/g, ''),
      });
      info = await call('getWebhookInfo', {});
    }
    if (info.url !== url) throw new Error('Webhook Telegram dang tro toi dia chi khac.');
    console.log('Telegram webhook OK. Tin dang cho: ' + info.pending_update_count);
  } finally { if (fs.existsSync(file)) fs.unlinkSync(file); }
})().catch(error => {
  const detail = (error.stderr ? error.stderr.toString() : (error.message || String(error))).replace(/bot\d+:[A-Za-z0-9_-]+/g, 'bot***').slice(0, 500);
  console.error(detail);
  console.error('Khong xac nhan duoc webhook Telegram. Kiem tra credential va ket noi mang.');
  process.exitCode = 1;
});
