const http = require('http');
const PORT = 8087;

function buildPath(size) {
  const path = [];
  for (let y = 0; y < size; y++) {
    if (y % 2 === 0) {
      for (let x = 0; x < size; x++) path.push([x, y]);
    } else {
      for (let x = size - 1; x >= 0; x--) path.push([x, y]);
    }
  }
  return path;
}

const cache = {8: buildPath(8), 10: buildPath(10)};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }
  
  if (req.url === '/init' && req.method === 'POST') {
    console.log('[INIT]');
    res.writeHead(200).end('{"status":"initialized"}');
    return;
  }
  
  if (req.url === '/move' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const d = JSON.parse(body);
        const hx = d.headX || 0, hy = d.headY || 0, sz = d.size || 8;
        const bodyList = d.body || [];
        
        const path = cache[sz] || buildPath(sz);
        
        let idx = 0;
        if (hy % 2 === 0) idx = hy * sz + hx;
        else idx = hy * sz + (sz - 1 - hx);
        
        const total = sz * sz;
        const nextIdx = (idx + 1) % total;
        const next = path[nextIdx];
        
        const dx = next[0] - hx, dy = next[1] - hy;
        
        let dir = 'RIGHT';
        if (dx === 0 && dy === -1) dir = 'UP';
        else if (dx === 0 && dy === 1) dir = 'DOWN';
        else if (dx === -1) dir = 'LEFT';
        
        console.log(`[MOVE] head=(${hx},${hy}) body=${bodyList.length} -> ${dir}`);
        
        res.writeHead(200).end(JSON.stringify({direction: dir}));
      } catch (e) {
        console.log('[ERROR]', e.message);
        res.writeHead(200).end('{"direction":"RIGHT"}');
      }
    });
    return;
  }
  
  res.writeHead(200).end('{"status":"ok"}');
});

server.listen(PORT, '127.0.0.1', () => console.log('Hamilton on ' + PORT));
