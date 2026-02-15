// 简单的端口测试脚本
const http = require('http');

const PORT = 50000;
const HOST = '127.0.0.1';

console.log(`Attempting to start server on ${HOST}:${PORT}...`);

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('OK');
});

server.on('error', (err) => {
  console.error('Server error:', err);
  console.error('Error code:', err.code);
  console.error('Error message:', err.message);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`✅ Server successfully started on http://${HOST}:${PORT}`);
  console.log('Press Ctrl+C to stop');
});
