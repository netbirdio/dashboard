const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.resolve('/usr/share/nginx/html');

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.wasm': 'application/wasm',
  '.ttf': 'font/ttf', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.txt': 'text/plain', '.xml': 'text/xml'
};

// Replace both placeholder styles used by generated assets and templates.
const ENV_KEYS = [
  'USE_AUTH0',
  'AUTH_AUDIENCE',
  'AUTH_AUTHORITY',
  'AUTH_CLIENT_ID',
  'AUTH_CLIENT_SECRET',
  'AUTH_SUPPORTED_SCOPES',
  'NETBIRD_MGMT_API_ENDPOINT',
  'NETBIRD_MGMT_GRPC_API_ENDPOINT',
  'NETBIRD_HOTJAR_TRACK_ID',
  'NETBIRD_GOOGLE_ANALYTICS_ID',
  'NETBIRD_GOOGLE_TAG_MANAGER_ID',
  'AUTH_REDIRECT_URI',
  'AUTH_SILENT_REDIRECT_URI',
  'NETBIRD_TOKEN_SOURCE',
  'NETBIRD_DRAG_QUERY_PARAMS',
  'NETBIRD_WASM_PATH',
  'AUTH0_DOMAIN',
  'AUTH0_CLIENT_ID',
  'AUTH0_AUDIENCE',
];

function substituteEnv(content) {
  let changed = false;
  for (const key of ENV_KEYS) {
    const val = process.env[key] || '';
    for (const pattern of ['$$' + key, '$' + key]) {
      if (content.includes(pattern)) {
        content = content.split(pattern).join(val);
        changed = true;
      }
    }
  }
  return { content, changed };
}

function walkDir(dir) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walkDir(full);
      else if (entry.isFile() && /\.(js|html|txt|json)$/.test(entry.name)) {
        const result = substituteEnv(fs.readFileSync(full, 'utf8'));
        if (result.changed) fs.writeFileSync(full, result.content, 'utf8');
      }
    }
  } catch (e) {
    console.warn('Failed to substitute environment variables:', e);
  }
}

console.log('Substituting environment variables...');
try {
  const tmpl = path.join(root, 'OidcTrustedDomains.js.tmpl');
  if (fs.existsSync(tmpl)) {
    const result = substituteEnv(fs.readFileSync(tmpl, 'utf8'));
    fs.writeFileSync(path.join(root, 'OidcTrustedDomains.js'), result.content, 'utf8');
  }
} catch (e) {
  console.warn('Failed to create OidcTrustedDomains.js:', e);
}

walkDir(root);
console.log('Environment substitution complete.');

function isFile(p) {
  try { return fs.statSync(p).isFile(); } catch(e) { return false; }
}

function safePath(p) {
  const abs = path.resolve(root, '.' + p);
  return abs === root || abs.startsWith(root + path.sep) ? abs : null;
}

function resolvePath(url) {
  let p = url.split('?')[0];
  if (!p.startsWith('/')) p = '/' + p;
  if (p === '/' || p.endsWith('/')) p += 'index.html';
  const abs = safePath(p);
  if (abs && isFile(abs)) return abs;
  // Try .html suffix (Next.js static export uses path.html)
  const asHtml = safePath(p + '.html');
  if (asHtml && isFile(asHtml)) return asHtml;
  // Try path/index.html
  const asDirIndex = safePath(p + '/index.html');
  if (asDirIndex && isFile(asDirIndex)) return asDirIndex;
  // Try /zh prefix (next-intl locale)
  if (!p.startsWith('/zh')) {
    const zh = safePath('/zh' + p);
    if (zh && isFile(zh)) return zh;
    const zhHtml = safePath('/zh' + p + '.html');
    if (zhHtml && isFile(zhHtml)) return zhHtml;
    const zhDirIndex = safePath('/zh' + p + '/index.html');
    if (zhDirIndex && isFile(zhDirIndex)) return zhDirIndex;
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
        'Cache-Control': ['.html', '.js'].includes(ext) ? 'no-store, no-cache, must-revalidate, max-age=0' : 'public, max-age=3600'
      });
      res.end(data);
    });
  } else {
    send404(res);
  }
}).listen(80, () => console.log('NetBird Dashboard running on port 80'));

function send404(res) {
  fs.readFile(path.join(root, '404.html'), (err, data) => {
    res.writeHead(404, {'Content-Type': 'text/html', 'Cache-Control': 'no-store'});
    res.end(err ? '404 Not Found' : data);
  });
}
