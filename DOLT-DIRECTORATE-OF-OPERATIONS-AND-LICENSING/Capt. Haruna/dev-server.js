const http = require('http');
const fs = require('fs');
const path = require('path');

const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

http.createServer((req, res) => {
  let route = decodeURIComponent(req.url.split('?')[0]);
  if (route === '/' || route === '') route = '/index.html';

  const filePath = path.join(process.cwd(), route);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': types[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(data);
  });
}).listen(8000, '127.0.0.1', () => {
  console.log('Serving current project at http://127.0.0.1:8000/index.html?v=7');
});
