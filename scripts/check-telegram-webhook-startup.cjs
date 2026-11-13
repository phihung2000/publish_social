// Run the real registration snippet with an isolated Telegram API mock.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'scripts/start-telegram.cjs'), 'utf8');
const code = fs.readFileSync(path.join(root, 'scripts/register-telegram-webhook.cjs'), 'utf8');
const workflow = { id: 'workflow-id', nodes: [{ id: 'telegram-trigger', name: 'Telegram Trigger', webhookId: 'webhook-id', parameters: { updates: ['message'] }, credentials: { telegramApi: { id: 'test-credential' } } }] };
const expected = 'https://new.example/webhook/webhook-id/webhook';
async function check(existingUrl, override, reject = false) {
  let privateFile = false;
  let pending = 35;
  let currentUrl = existingUrl;
  const calls = [];
  const process = { argv: ['node', '/tmp/register-telegram-webhook.cjs', '/tmp/workflow.json', ...(override ? ['https://new.example/'] : [])], env: { N8N_WEBHOOK_URL: 'https://old.example/' }, pid: 123 };
  await vm.runInNewContext(code, {
    URL, AbortSignal, process,
    console: { log() {}, error() {} },
    require: name => name === 'node:fs' ? {
      readFileSync: file => file === '/tmp/workflow.json' ? JSON.stringify([workflow]) : JSON.stringify([{ data: { accessToken: 'fake-token' } }]),
      existsSync: () => privateFile,
      unlinkSync: () => { privateFile = false; },
    } : { execFileSync: () => { privateFile = true; } },
    fetch: async (url, options) => {
      const body = JSON.parse(options.body);
      const method = url.split('/').pop();
      calls.push({ method, body });
      if (method === 'setWebhook') {
        if (body.drop_pending_updates) pending = 0;
        if (reject) return { json: async () => ({ ok: false }) };
        currentUrl = body.url;
      }
      return { json: async () => ({ ok: true, result: { url: currentUrl, pending_update_count: pending } }) };
    },
  });
  assert.equal(privateFile, false, 'Temporary decrypted credentials are removed');
  assert.equal(pending, 35, 'Queued albums survive registration');
  if (reject) assert.equal(process.exitCode, 1, 'Registration failure prevents successful startup');
  else assert.equal(process.exitCode, undefined);
  return calls;
}
(async () => {
  const readinessCode = source.slice(source.indexOf('async function waitTelegramTrigger('), source.indexOf('function updateMediaUrl('));
  async function readiness(statuses) {
    let calls = 0;
    const probeWorkflow = { id: 'workflow-id', nodes: [{ id: 'telegram-trigger', name: 'Telegram Trigger', webhookId: 'webhook-id' }] };
    await vm.runInNewContext(readinessCode + '\nwaitTelegramTrigger(workflow)', {
      workflow: probeWorkflow, AbortSignal, pause: async () => {},
      fetch: async (url, options) => {
        assert.equal(url, 'http://localhost:5678/webhook/webhook-id/webhook');
        assert.equal(options.body, '{}', 'Readiness does not send a real update');
        assert.equal(options.headers['x-telegram-bot-api-secret-token'], 'workflow-id_telegram-trigger');
        const status = statuses[Math.min(calls++, statuses.length - 1)];
        if (status === 'timeout') throw new Error('timeout');
        return { ok: status === 200 };
      },
    });
    return calls;
  }
  assert.equal(await readiness([404, 'timeout', 200, 200, 404, 200, 200, 200]), 8);
  await assert.rejects(readiness([404]), /Telegram Trigger chua kich hoat/);
  assert.ok(source.indexOf('await waitTelegramTrigger(workflow)') < source.lastIndexOf('runRegister(url + \'/\')'), 'Wait for the actual trigger before final webhook registration');
  const changed = await check('https://old.example/webhook/webhook-id/webhook', true);
  const registration = changed.find(call => call.method === 'setWebhook').body;
  assert.equal(registration.url, expected, 'Explicit new URL takes precedence over the old container environment');
  assert.equal(registration.drop_pending_updates, false);
  assert.ok(registration.secret_token);
  assert.deepEqual(registration.allowed_updates, ['message', 'callback_query']);
  assert.equal((await check(expected, true)).filter(call => call.method === 'setWebhook').length, 0);
  const old = await check('', false);
  assert.equal(old.find(call => call.method === 'setWebhook').body.url, 'https://old.example/webhook/webhook-id/webhook');
  await check('', true, true);
  const compose = fs.readFileSync(path.join(root, 'compose.yaml'), 'utf8');
  assert.match(compose, /^      WEBHOOK_URL: \$\{N8N_WEBHOOK_URL/m);
  const recreate = source.indexOf("docker(['up', '-d', '--force-recreate', 'n8n']");
  const register = source.indexOf('runRegister(url + \'/\')');
  assert.ok(register > 0 && register < recreate, 'Registration happens before n8n restarts on a new URL');
  console.log('PASS Telegram startup: pending albums preserved, URL override, authentication, callback updates, idempotent registration and failure cleanup.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
