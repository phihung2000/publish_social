// Buffer, TikTok, Facebook and Threads reject a chunked n8n webhook body that has
// no Content-Length. This process serves the same media URL with a known length.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const mimeTypes = {
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', zip: 'application/zip',
};

function mediaTarget(pathname, now) {
  const match = /^\/webhook\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/buffer-media\/([^/?#]+)$/.exec(pathname.split('?')[0]);
  if (!match) return null;
  let name = match[1];
  try { if (decodeURIComponent(name) !== name) return { status: 404 }; } catch { return { status: 404 }; }
  const queueMedia = /^queue_[a-f0-9]{32}\.(mp4|mov|webm|jpg|jpeg|png|webp)$/.exec(name);
  const timed = /^([a-f0-9]{32})_(\d{13})\.(mp4|mov|webm|jpg|jpeg|png|webp|zip)$/.exec(name);
  if (!queueMedia && (!timed || Number(timed[2]) <= now)) return { status: 404 };
  return { name, mimeType: mimeTypes[queueMedia ? queueMedia[1] : timed[3]] };
}

function safeFile(root, name) {
  const directory = fs.realpathSync(root);
  const full = path.resolve(directory, name);
  if (!fs.existsSync(full)) return null;
  const resolved = fs.realpathSync(full);
  const relative = path.relative(directory, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative) || path.basename(resolved) !== name || !fs.statSync(resolved).isFile()) return null;
  return resolved;
}

function writeBytes(response, status, headers, body) {
  response.writeHead(status, { ...headers, 'content-length': body.length });
  response.end(body);
}

function serveFile(request, response, file, stat, target) {
  const headers = {
    'content-type': target.mimeType,
    'accept-ranges': 'bytes',
    'cache-control': 'public, max-age=86400',
    'content-disposition': 'inline; filename="' + target.name + '"',
    'x-content-type-options': 'nosniff',
  };
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range || '');
  if (request.headers.range && !range) {
    writeBytes(response, 416, { 'content-range': 'bytes */' + stat.size }, '');
    return;
  }
  let start = 0;
  let end = stat.size - 1;
  if (range) {
    start = range[1] === '' ? Math.max(0, stat.size - Number(range[2])) : Number(range[1]);
    end = range[1] !== '' && range[2] !== '' ? Number(range[2]) : stat.size - 1;
    if (!Number.isInteger(start) || !Number.isInteger(end) || start > end || start >= stat.size) {
      writeBytes(response, 416, { 'content-range': 'bytes */' + stat.size }, '');
      return;
    }
    end = Math.min(end, stat.size - 1);
    headers['content-range'] = 'bytes ' + start + '-' + end + '/' + stat.size;
  }
  headers['content-length'] = end - start + 1;
  response.writeHead(range ? 206 : 200, headers);
  if (request.method === 'HEAD') { response.end(); return; }
  fs.createReadStream(file, { start, end }).on('error', () => response.destroy()).pipe(response);
}

function createGateway({ mediaRoot, upstream, now = () => Date.now() }) {
  const target = new URL(upstream);
  const proxy = (request, response) => {
    const headers = { ...request.headers };
    if (headers['transfer-encoding']) delete headers['content-length'];
    for (const name of ['connection', 'keep-alive', 'proxy-connection', 'transfer-encoding', 'upgrade', 'te', 'trailer', 'expect']) delete headers[name];
    const forwarded = http.request({
      protocol: target.protocol, hostname: target.hostname, port: target.port,
      method: request.method, path: request.url, headers,
    }, incoming => {
      const headers = { ...incoming.headers };
      for (const name of ['transfer-encoding', 'connection', 'keep-alive']) delete headers[name];
      response.writeHead(incoming.statusCode, headers);
      incoming.pipe(response);
    });
    forwarded.on('error', () => { if (!response.headersSent) writeBytes(response, 502, { 'content-type': 'text/plain' }, ''); });
    request.pipe(forwarded);
  };
  const server = http.createServer((request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') { proxy(request, response); return; }
    const media = mediaTarget(request.url, now());
    if (!media) { proxy(request, response); return; }
    if (media.status) { writeBytes(response, media.status, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }, ''); return; }
    let file;
    let stat;
    try { file = safeFile(mediaRoot, media.name); stat = file && fs.statSync(file); }
    catch { file = null; }
    if (!file) { writeBytes(response, 404, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }, ''); return; }
    serveFile(request, response, file, stat, media);
  });
  server.on('upgrade', (request, socket, head) => {
    const forwarded = http.request({
      protocol: target.protocol, hostname: target.hostname, port: target.port,
      method: request.method, path: request.url, headers: request.headers,
    });
    forwarded.on('upgrade', (incoming, upstreamSocket, upstreamHead) => {
      const lines = Object.entries(incoming.headers).flatMap(([key, value]) => (Array.isArray(value) ? value : [value]).filter(item => item != null).map(item => key + ': ' + item));
      socket.write('HTTP/1.1 ' + incoming.statusCode + ' ' + incoming.statusMessage + '\r\n' + lines.join('\r\n') + '\r\n\r\n');
      if (upstreamHead.length) socket.write(upstreamHead);
      if (head.length) upstreamSocket.write(head);
      upstreamSocket.pipe(socket);
      socket.pipe(upstreamSocket);
    });
    forwarded.on('error', () => socket.destroy());
    forwarded.end();
  });
  return server;
}

function main() {
  const server = createGateway({
    mediaRoot: process.env.MEDIA_ROOT || '/files',
    upstream: process.env.UPSTREAM || 'http://n8n:5678',
  });
  server.listen(Number(process.env.PORT || 5678), '0.0.0.0');
}

module.exports = { createGateway, mediaTarget };
if (require.main === module) main();
