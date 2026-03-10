const http = require('http');
const PORT = 8087;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.url === '/status') {
    res.writeHead(200).end('{"status":"ok"}');
    return;
  }
  
  if (req.url === '/init' && req.method === 'POST') {
    res.writeHead(200).end('{"status":"initialized"}');
    return;
  }
  
  if (req.url === '/move' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const d = JSON.parse(body);
        const hx = d.headX || 0;
        const hy = d.headY || 0;
        const sz = d.size || 8;
        
        // Pure Hamilton: 蛇形路径
        // 计算 (hx, hy) 在路径中的索引
        let idx;
        if (hy % 2 === 0) {
          idx = hy * sz + hx;
        } else {
          idx = hy * sz + (sz - 1 - hx);
        }
        
        // 下一个位置
        const total = sz * sz;
        const nextIdx = (idx + 1) % total;
        const nextY = Math.floor(nextIdx / sz);
        let nextX;
        if (nextY % 2 === 0) {
          nextX = nextIdx % sz;
        } else {
          nextX = sz - 1 - (nextIdx % sz);
        }
        
        const dx = nextX - hx;
        const dy = nextY - hy;
        
        let dir = 'RIGHT';
        if (dx === 0 && dy === -1) dir = 'UP';
        else if (dx === 0 && dy === 1) dir = 'DOWN';
        else if (dx === -1 && dy === 0) dir = 'LEFT';
        
        res.writeHead(200).end(JSON.stringify({ direction: dir }));
      } catch (e) {
        res.writeHead(200).end('{"direction":"RIGHT"}');
      }
    });
    return;
  }
  
  res.writeHead(200).end('{"status":"ok"}');
});

server.listen(PORT, '127.0.0.1', () => console.log('Server on ' + PORT));
