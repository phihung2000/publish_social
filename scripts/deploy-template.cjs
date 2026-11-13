// Update the existing single-bot workflow, retaining credentials/configuration/routes.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const workflowId = 'seKtuQgWny3K7y5m';
const backupDir = path.join(root, 'temp/template-deploy-' + Date.now());
const docker = (args, options = {}) => execFileSync('docker', ['compose', ...args], { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 120000, ...options });
const prefix = code => code?.match(/^const publisherConfig = .*;\r?\n/)?.[0];

(async () => {
  fs.mkdirSync(backupDir, { recursive: true });
  const built = JSON.parse(fs.readFileSync(path.join(root, 'workflows/telegram-publisher.json'), 'utf8'));
  docker(['exec', '-T', 'n8n', 'n8n', 'export:workflow', '--id=' + workflowId, '--output=/tmp/template-deploy-before.json']);
  const before = docker(['exec', '-T', 'n8n', 'cat', '/tmp/template-deploy-before.json']);
  const [workflow] = JSON.parse(before);
  if (!workflow.active || workflow.versionId !== workflow.activeVersionId) throw new Error('Expected a published workflow without unpublished changes.');
  fs.writeFileSync(path.join(backupDir, 'before.json'), before);
  const replaced = [];
  for (const current of workflow.nodes) {
    if (!prefix(current.parameters.jsCode) || !current.parameters.jsCode.includes('const queueStore = (() => {')) continue;
    const replacement = built.nodes.find(node => node.name === current.name);
    if (!prefix(replacement?.parameters.jsCode)) throw new Error('Missing compatible source for ' + current.name);
    current.parameters.jsCode = replacement.parameters.jsCode.replace(/^const publisherConfig = .*;\r?\n/, () => prefix(current.parameters.jsCode));
    replaced.push(current.name);
  }
  for (const required of ['Telegram Intake', 'Save Content Draft', 'Handle Queue Command', 'Start Queue Worker', 'Next Queue Work', 'Record Queue Result']) if (!replaced.includes(required)) throw new Error('Missing required node ' + required);
  workflow.nodes.find(node => node.name === 'Telegram Accepted').parameters.text = built.nodes.find(node => node.name === 'Telegram Accepted').parameters.text;
  workflow.versionId = crypto.randomUUID();
  const after = JSON.stringify([workflow]);
  fs.writeFileSync(path.join(backupDir, 'after.json'), after);
  docker(['cp', path.join(backupDir, 'after.json'), 'n8n:/tmp/template-deploy-after.json']);
  docker(['cp', 'scripts/check-template-native.cjs', 'n8n:/tmp/check-template-native.cjs']);
  console.log(docker(['exec', '-T', 'n8n', 'node', '/tmp/check-template-native.cjs', '/tmp/template-deploy-after.json']).trim());
  const counts = JSON.parse(docker(['exec', '-T', 'n8n', 'node'], { input: "const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync('/home/node/.n8n/database.sqlite',{readOnly:true});console.log(JSON.stringify(db.prepare(\"SELECT count(*) AS count FROM execution_entity WHERE status='running'\").get()));db.close();" }));
  if (counts.count) throw new Error('Waiting for active executions to finish; deployment prepared at ' + backupDir);
  console.log(docker(['exec', '-T', 'n8n', 'n8n', 'import:workflow', '--input=/tmp/template-deploy-after.json']).trim());
  console.log(docker(['exec', '-T', 'n8n', 'n8n', 'publish:workflow', '--id=' + workflowId]).trim());
  docker(['restart', 'n8n']);
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const response = await fetch('http://127.0.0.1:5678/healthz', { signal: AbortSignal.timeout(2000) });
      if (response.ok) { console.log(JSON.stringify({ deployed: true, workflowId, replaced, backupDir })); return; }
    } catch { /* Wait for restart. */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Published, but health has not been confirmed. Backup: ' + backupDir);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
