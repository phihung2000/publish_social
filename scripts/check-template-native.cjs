// Validate generated n8n code and expressions without calling external services.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const base = '/usr/local/lib/node_modules/n8n/node_modules/';
const { Workflow } = require(base + 'n8n-workflow');
const { Telegram } = require(base + 'n8n-nodes-base/dist/nodes/Telegram/Telegram.node.js');
const exported = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const spec = Array.isArray(exported) ? exported[0] : exported;
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
for (const node of spec.nodes) if (node.parameters.jsCode) new AsyncFunction(node.parameters.jsCode);
const workflow = new Workflow({ id: 'template-native-check', nodes: structuredClone(spec.nodes), connections: spec.connections, active: false,
  nodeTypes: { getByNameAndVersion: name => name === 'n8n-nodes-base.telegram' ? new Telegram() : { description: { name, properties: [], version: 1, inputs: ['main'], outputs: ['main'] } } },
});
const node = workflow.getNode('Telegram Accepted');
for (const templateToken of ['sample-token', undefined]) {
  const input = [{ json: { templateToken, caption: 'Bài kiểm tra' } }];
  const text = workflow.expression.getParameterValue(node.parameters.text, { resultData: { runData: {} } }, 0, 0, node.name, input, 'manual', {});
  assert.equal(typeof text, 'string');
  if (templateToken) assert.match(text, /bài mẫu/);
  else assert.doesNotMatch(text, /bài mẫu/);
}
assert.match(spec.nodes.find(node => node.name === 'Start Queue Worker').parameters.jsCode, /templateSlot/);
assert.match(spec.nodes.find(node => node.name === 'Save Content Draft').parameters.jsCode, /context.templateToken/);
console.log('PASS native n8n: generated code compiles, template upload acknowledgment resolves, ordinary acknowledgment remains separate.');
