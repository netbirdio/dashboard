const http = require('http');
const fs = require('fs');
const path = require('path');
const root = '/usr/share/nginx/html';

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.wasm': 'application/wasm',
  '.ttf': 'font/ttf', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.txt': 'text/plain', '.xml': 'text/xml'
};

function isFile(p) {
  try { return fs.statSync(p).isFile(); } catch(e) { return false; }
}

function resolvePath(url) {
  let p = url.split('?')[0];
  if (p === '/' || p.endsWith('/')) p += 'index.html';
  const abs = root + p;
  if (isFile(abs)) return abs;
  // Try .html suffix (Next.js static export uses path.html)
  const asHtml = root + p + '.html';
  if (isFile(asHtml)) return asHtml;
  // Try path/index.html
  const asDirIndex = root + p + '/index.html';
  if (isFile(asDirIndex)) return asDirIndex;
  // Try /zh prefix (next-intl locale)
  if (!p.startsWith('/zh')) {
    const zh = root + '/zh' + p;
    if (isFile(zh)) return zh;
    const zhHtml = root + '/zh' + p + '.html';
    if (isFile(zhHtml)) return zhHtml;
    const zhDirIndex = root + '/zh' + p + '/index.html';
    if (isFile(zhDirIndex)) return zhDirIndex;
  }
  return null;
}

http.createServer((req, res) => {
  const filePath = resolvePath(req.url);
  if (filePath) {
    const ext = path.extname(filePath);
    fs.readFile(filePath, (err, data) => {
      if (err) { send404(res); return; }
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': ext === '.html' ? 'no-store, no-cache, must-revalidate, max-age=0' : 'public, max-age=3600'
      });
      res.end(data);
    });
  } else {
    send404(res);
  }
}).listen(80, () => console.log('NetBird Dashboard running on port 80'));

function send404(res) {
  fs.readFile(root + '/404.html', (err, data) => {
    res.writeHead(404, {'Content-Type': 'text/html', 'Cache-Control': 'no-store'});
    res.end(err ? '404 Not Found' : data);
  });
}
