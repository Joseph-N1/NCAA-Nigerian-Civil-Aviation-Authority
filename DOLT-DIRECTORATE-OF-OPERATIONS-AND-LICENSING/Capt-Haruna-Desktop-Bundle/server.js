const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const port = Number(process.argv[2]) || 8000;
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const server = http.createServer((request, response) => {
  let requestPath;
  try {
    requestPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('Bad request');
    return;
  }

  const relativePath = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
  const filePath = path.resolve(root, relativePath);
  if (filePath !== root && !filePath.startsWith(root + path.sep)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  fs.stat(filePath, (statError, stat) => {
    const resolvedPath = !statError && stat.isDirectory() ? path.join(filePath, 'index.html') : filePath;
    fs.readFile(resolvedPath, (error, data) => {
      if (error) {
        response.writeHead(error.code === 'ENOENT' ? 404 : 500).end('File not found');
        return;
      }
      response.writeHead(200, {
        'Content-Type': mimeTypes[path.extname(resolvedPath).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      });
      response.end(data);
    });
  });
});

function listenOnPort(p) {
  server.listen(p, '127.0.0.1', () => {
    console.log(`NCAA DOLT desktop app is running at http://127.0.0.1:${p}/`);
    console.log('Keep this window open while using the app. Press Ctrl+C to stop it.');
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const fallbackPort = port === 8000 ? 8080 : port + 1;
    console.log(`[INFO] Port ${port} is occupied, switching to port ${fallbackPort}...`);
    listenOnPort(fallbackPort);
  } else {
    console.error('Server error:', err);
  }
});

listenOnPort(port);
