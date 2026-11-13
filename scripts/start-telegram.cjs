const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const https = require('node:https');
const { Resolver } = require('node:dns').promises;
const { execFileSync, spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const temporaryDirectory = path.join(root, 'temp');
const envFile = path.join(root, '.env');
const tunnelExecutable = process.platform === 'win32'
  ? path.join(root, 'tools/cloudflared.exe')
  : (fs.existsSync('/usr/local/bin/cloudflared') ? '/usr/local/bin/cloudflared' : 'cloudflared');
const tunnelLog = path.join(temporaryDirectory, 'tunnel-startup.log');
const tunnelPidFile = path.join(temporaryDirectory, 'tunnel.pid');
const pause = () => new Promise(resolve => setTimeout(resolve, 1000));
const docker = (args, options = {}) => execFileSync('docker', ['compose', ...args], {
  cwd: root, encoding: 'utf8', windowsHide: true, timeout: 120000, ...options,
});

const powershell = source => execFileSync('powershell.exe', [
  '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from("$ProgressPreference = 'SilentlyContinue'; " + source, 'utf16le').toString('base64'),
], { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 30000 }).trim();
const quote = value => "'" + value.replaceAll("'", "''") + "'";

const isTunnelRunning = (processId) => {
  if (!/^\d+$/.test(processId)) return false;
  if (process.platform === 'win32') {
    return powershell(
      `$task = Get-CimInstance Win32_Process -Filter "ProcessId = ${processId}"; if ($task.ExecutablePath -eq ${quote(tunnelExecutable)} -and $task.CommandLine -like '*--url http://localhost:5678*') { 'yes' }`,
    ) === 'yes';
  }
  try {
    const out = execFileSync('ps', ['-p', String(processId), '-o', 'args='], { encoding: 'utf8' });
    return out.includes('cloudflared') && out.includes('http://localhost:5678');
  } catch {
    return false;
  }
};

const stopTunnelProcess = (processId) => {
  if (process.platform === 'win32') {
    powershell(`Stop-Process -Id ${processId} -ErrorAction Stop`);
  } else {
    try { process.kill(Number(processId), 'SIGTERM'); } catch { }
  }
};

function getWorkflowId() {
  try {
    const list = docker(['exec', 'n8n', 'n8n', 'list:workflow']);
    const match = list.split('\n').map(line => line.trim().split('|')).find(([id, name]) => name && name.includes('Social Publisher'));
    if (match) return match[0];
  } catch { }
  return 'seKtuQgWny3K7y5m';
}

async function ensureDocker() {
  const ready = () => {
    try {
      execFileSync('docker', ['version', '--format', '{{.Server.Version}}'], {
        windowsHide: true, stdio: 'ignore', timeout: 5000,
      });
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') throw new Error('Chua tim thay Docker. Can cai Docker Desktop hoac Colima va mo lai terminal.');
      return false;
    }
  };
  if (ready()) return;
  if (process.platform !== 'win32') {
    try {
      console.log('Khoi dong Colima Docker Engine...');
      execFileSync('colima', ['start'], { stdio: 'inherit' });
    } catch { }
    if (ready()) return;
    throw new Error('Docker Engine chua san sang. Hay bat Colima hoac Docker Desktop.');
  }
  const desktopExecutable = path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Docker', 'Docker', 'Docker Desktop.exe');
  if (!fs.existsSync(desktopExecutable)) throw new Error('Hay mo Docker Desktop roi chay lai lenh nay.');
  console.log('Mo Docker Desktop va cho Engine san sang (toi da 3 phut)...');
  const desktop = spawn(desktopExecutable, [], { detached: true, windowsHide: true, stdio: 'ignore' });
  await new Promise((resolve, reject) => {
    desktop.once('spawn', resolve);
    desktop.once('error', reject);
  });
  desktop.unref();
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    if (ready()) return;
    await pause();
  }
  throw new Error('Docker Engine chua san sang. Kiem tra Docker Desktop roi chay lai lenh nay.');
}

async function healthy(base) {
  try {
    const response = await fetch(new URL('healthz', base + '/'), { signal: AbortSignal.timeout(5000) });
    return response.ok && (await response.json()).status === 'ok';
  } catch (error) {
    if (error.cause?.code !== 'ENOTFOUND' || !base.endsWith('.trycloudflare.com')) return false;
    try {
      const resolver = new Resolver({ timeout: 3000, tries: 1 });
      resolver.setServers(['1.1.1.1', '8.8.8.8']);
      const [address] = await resolver.resolve4(new URL(base).hostname);
      return await new Promise(resolve => {
        const request = https.get(new URL('healthz', base + '/'), {
          lookup: (_hostname, options, callback) => callback(null,
            options.all ? [{ address, family: 4 }] : address, 4),
        }, response => {
          let body = '';
          response.setEncoding('utf8');
          response.on('data', chunk => { body += chunk; });
          response.on('end', () => {
            try { resolve(response.statusCode === 200 && JSON.parse(body).status === 'ok'); }
            catch { resolve(false); }
          });
          response.on('error', () => resolve(false));
        });
        request.setTimeout(5000, () => request.destroy());
        request.on('error', () => resolve(false));
      });
    } catch { return false; }
  }
}

async function waitHealthy(base) {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await healthy(base)) return;
    await pause();
  }
  throw new Error('n8n chua san sang tai ' + base);
}

async function waitTelegramTrigger(workflow) {
  const trigger = workflow.nodes.find(node => node.name === 'Telegram Trigger');
  const secret = (workflow.id + '_' + trigger.id).replace(/[^a-zA-Z0-9_-]+/g, '');
  let ready = 0;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch('http://localhost:5678/webhook/' + trigger.webhookId + '/webhook', {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': secret },
        body: '{}', signal: AbortSignal.timeout(3000),
      });
      ready = response.ok ? ready + 1 : 0;
      if (ready >= 3) return;
    } catch { ready = 0; }
    await pause();
  }
  throw new Error('Telegram Trigger chua kich hoat xong. Kiem tra log n8n; healthz OK chua du de nhan nut bam.');
}

function updateMediaUrl(workflow, url) {
  let changed = false;
  for (const node of workflow.nodes) {
    if (!node.parameters.jsCode?.startsWith('const publisherConfig = ')) continue;
    node.parameters.jsCode = node.parameters.jsCode.replace(/^const publisherConfig = (.+);\r?\n/, (line, json) => {
      const config = JSON.parse(json);
      if (config.publicBaseUrl === url) return line;
      config.publicBaseUrl = url;
      changed = true;
      return 'const publisherConfig = ' + JSON.stringify(config) + ';\n';
    });
  }
  return changed;
}

async function main() {
    if (process.platform !== 'win32' && process.platform !== 'darwin') throw new Error('Lenh nay danh cho Windows hoac macOS.');
    if (!fs.existsSync(envFile)) {
      throw new Error('Can file .env cua du an da thiet lap.');
    }
    fs.mkdirSync(temporaryDirectory, { recursive: true });
    await ensureDocker();
    console.log('Khoi dong n8n...');
    docker(['up', '-d', 'n8n', 'image-tools', 'media-gateway'], { stdio: 'inherit' });
    docker(['restart', 'media-gateway'], { stdio: 'inherit' });
    await waitHealthy('http://localhost:5678');

    const workflowId = getWorkflowId();
    const containerWorkflowFile = '/tmp/telegram-startup-workflow.json';
    const runRegister = baseUrl => {
      docker(['cp', 'scripts/register-telegram-webhook.cjs', 'n8n:/tmp/register-telegram-webhook.cjs']);
      docker(['exec', 'n8n', 'node', '/tmp/register-telegram-webhook.cjs', containerWorkflowFile, baseUrl], { stdio: 'inherit' });
    };
    docker(['exec', 'n8n', 'n8n', 'export:workflow', '--id=' + workflowId, '--output=' + containerWorkflowFile]);
    const exported = docker(['exec', 'n8n', 'cat', containerWorkflowFile]);
    const [workflow] = JSON.parse(exported);
    if (!workflow.active || workflow.versionId !== workflow.activeVersionId) {
      throw new Error('Workflow can o trang thai Published va khong co thay doi chua publish.');
    }

    let env = fs.readFileSync(envFile, 'utf8');
    let url = env.match(/^N8N_WEBHOOK_URL=(.+)/m)?.[1].trim().replace(/\/$/, '');
    let processId = fs.existsSync(tunnelPidFile) ? fs.readFileSync(tunnelPidFile, 'utf8').trim() : '';
    const existingTunnel = isTunnelRunning(processId);

    if (!existingTunnel || !url || !await healthy(url)) {
      fs.writeFileSync(path.join(temporaryDirectory, 'telegram-startup-before.json'), exported);
      fs.writeFileSync(path.join(temporaryDirectory, 'telegram-startup-before.env'), env);
      if (existingTunnel) stopTunnelProcess(processId);
      console.log('Mo Cloudflare Tunnel...');
      const output = fs.openSync(path.join(temporaryDirectory, 'tunnel-startup-output.log'), 'w');
      const errorOutput = fs.openSync(tunnelLog, 'w');
      try {
        const tunnel = spawn(tunnelExecutable, ['tunnel', '--url', 'http://localhost:5678', '--no-autoupdate'], {
          cwd: root, detached: true, windowsHide: true, stdio: ['ignore', output, errorOutput],
        });
        await new Promise((resolve, reject) => {
          tunnel.once('spawn', resolve);
          tunnel.once('error', reject);
        });
        processId = String(tunnel.pid);
        tunnel.unref();
      } finally {
        fs.closeSync(output);
        fs.closeSync(errorOutput);
      }
      fs.writeFileSync(tunnelPidFile, processId);
      url = undefined;
      for (let attempt = 0; attempt < 60; attempt++) {
        url = fs.existsSync(tunnelLog) && fs.readFileSync(tunnelLog, 'utf8').match(/https:\/\/[a-z-]+\.trycloudflare\.com/)?.[0];
        if (url) break;
        await pause();
      }
      if (!url) throw new Error('Khong lay duoc URL tunnel. Xem temp/tunnel-startup.log.');
      await waitHealthy(url);
    } else {
      console.log('Dung lai tunnel dang chay.');
    }

    const changed = updateMediaUrl(workflow, url);
    if (changed) {
      fs.writeFileSync(path.join(temporaryDirectory, 'telegram-startup-before.json'), exported);
      workflow.versionId = crypto.randomUUID();
      docker(['exec', 'n8n', 'node', '-e', "require('fs').writeFileSync(process.argv[1],require('fs').readFileSync(0))", containerWorkflowFile], { input: JSON.stringify([workflow]) });
      docker(['exec', 'n8n', 'n8n', 'import:workflow', '--input=' + containerWorkflowFile]);
      docker(['exec', 'n8n', 'n8n', 'publish:workflow', '--id=' + workflowId]);
    }
    const nextEnv = /^N8N_WEBHOOK_URL=.+/m.test(env)
      ? env.replace(/^N8N_WEBHOOK_URL=.+/m, 'N8N_WEBHOOK_URL=' + url + '/')
      : env + '\nN8N_WEBHOOK_URL=' + url + '/\n';
    if (nextEnv !== env) fs.writeFileSync(envFile, nextEnv);
    for (const file of ['temp/telegram-publisher-config.json', 'workflows/telegram-publisher.json']) {
      const target = path.join(root, file);
      if (!fs.existsSync(target)) continue;
      const content = fs.readFileSync(target, 'utf8');
      const data = JSON.parse(content);
      if (data.nodes ? updateMediaUrl(data, url) : data.publicBaseUrl !== url) {
        if (!data.nodes) data.publicBaseUrl = url;
        fs.writeFileSync(target, JSON.stringify(data, null, 2) + (content.endsWith('\n') ? '\n' : ''));
      }
    }
    if (changed || nextEnv !== env) {
      console.log('Ap dung URL moi...');
      runRegister(url + '/');
      docker(['up', '-d', '--force-recreate', 'n8n'], { stdio: 'inherit' });
      await waitHealthy('http://localhost:5678');
    }
    await waitHealthy(url);
    console.log('Cho Telegram Trigger kich hoat day du...');
    await waitTelegramTrigger(workflow);
    docker(['exec', 'n8n', 'node', '-e', "require('fs').writeFileSync(process.argv[1],require('fs').readFileSync(0))", containerWorkflowFile], { input: JSON.stringify([workflow]) });
    runRegister(url + '/');
    console.log('Kiem tra link media cua cac bai da xep lich tren Buffer...');
    try {
      docker(['cp', 'scripts/repair-buffer-media.cjs', 'n8n:/tmp/repair-buffer-media.cjs']);
      docker(['exec', 'n8n', 'node', '/tmp/repair-buffer-media.cjs', containerWorkflowFile], { stdio: 'inherit' });
    } catch {
      console.log('Bo qua kiem tra repair media tren Buffer.');
    }
    console.log('San sang. Mo http://localhost:5678 va gui /queue cho bot.');
  }

  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
