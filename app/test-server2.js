const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Test server working!');
});
server.listen(3000, '127.0.0.1', () => {
  console.log('Test server running on http://127.0.0.1:3000');
  console.log('Server address:', server.address());
});