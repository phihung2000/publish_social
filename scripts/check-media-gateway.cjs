const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { createGateway, mediaTarget } = require('../services/media-gateway/server.cjs');

const webhook = '/webhook/72b6fa94-2772-4442-bd42-5b4d07e37206/buffer-media/';
const name = 'queue_' + 'a'.repeat(32) + '.png';
const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4, 5, 6, 7, 8]);

function listen(server) {
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
}
function request(port, method, pathname, headers) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: pathname, method, headers }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'media-gateway-'));
  fs.writeFileSync(path.join(root, name), bytes);
  const upstream = http.createServer((req, res) => {
    const body = Buffer.from(req.url);
    res.writeHead(200, { 'content-type': 'text/plain', 'content-length': body.length });
    res.end(body);
  });
  const upstreamPort = await listen(upstream);
  const gateway = createGateway({ mediaRoot: root, upstream: 'http://127.0.0.1:' + upstreamPort, now: () => 1_700_000_000_000 });
  const port = await listen(gateway);
  try {
    assert.equal(mediaTarget('/healthz', 0), null);
    const full = await request(port, 'GET', webhook + name);
    assert.equal(full.status, 200);
    assert.equal(full.headers['content-type'], 'image/png');
    assert.equal(full.headers['content-length'], String(bytes.length));
    assert.equal(full.headers['transfer-encoding'], undefined);
    assert.equal(full.headers['content-disposition'], 'inline; filename="' + name + '"');
    assert.deepEqual(full.body, bytes);
    const head = await request(port, 'HEAD', webhook + name);
    assert.equal(head.status, 200);
    assert.equal(head.headers['content-length'], String(bytes.length));
    assert.equal(head.body.length, 0);
    const range = await request(port, 'GET', webhook + name, { range: 'bytes=0-3' });
    assert.equal(range.status, 206);
    assert.equal(range.headers['content-range'], 'bytes 0-3/' + bytes.length);
    assert.equal(range.headers['content-length'], '4');
    assert.deepEqual(range.body, bytes.subarray(0, 4));
    assert.equal((await request(port, 'GET', webhook + 'queue_' + 'b'.repeat(32) + '.jpg')).status, 404);
    assert.equal((await request(port, 'GET', webhook + '..')).status, 404);
    assert.equal((await request(port, 'GET', webhook + '..%2Ftelegram-content-queue.json')).status, 404);
    const expired = 'c'.repeat(32) + '_' + (1_700_000_000_000 - 1) + '.jpg';
    assert.equal((await request(port, 'GET', webhook + expired)).status, 404);
    const fresh = 'd'.repeat(32) + '_' + (1_700_000_000_000 + 1000) + '.zip';
    assert.equal(mediaTarget(webhook + fresh, 1_700_000_000_000).mimeType, 'application/zip');
    const proxied = await request(port, 'POST', '/webhook/telegram');
    assert.equal(proxied.status, 200);
    assert.equal(proxied.body.toString(), '/webhook/telegram');
    const health = await request(port, 'GET', '/healthz');
    assert.equal(health.body.toString(), '/healthz');
    console.log('PASS media gateway: Content-Length, real filename, range, whitelist, proxy.');
  } finally {
    gateway.close();
    upstream.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
