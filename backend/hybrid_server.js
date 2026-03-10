const http = require('http');
const { spawn } = require('child_process');

const PORT = 8087;

// Hamilton 路径
function buildPath(size) {
  const path = [];
  const order = {};
  for (let y = 0; y < size; y++) {
    if (y % 2 === 0) {
      for (let x = 0; x < size; x++) {
        order[`${x},${y}`] = path.length;
        path.push([x, y]);
      }
    } else {
      for (let x = size - 1; x >= 0; x--) {
        order[`${x},${y}`] = path.length;
        path.push([x, y]);
      }
    }
  }
  return { path, order };
}

const cache = {};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.url === '/status' && req.method === 'GET') {
    res.writeHead(200).end(JSON.stringify({ status: 'ok', algorithm: 'pure-hamilton' }));
    return;
  }
  
  if (req.url === '/init' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const d = JSON.parse(body);
        const size = d.size || 8;
        if (!cache[size]) cache[size] = buildPath(size);
        res.writeHead(200).end(JSON.stringify({ status: 'initialized', size }));
      } catch (e) {
        res.writeHead(200).end(JSON.stringify({ status: 'error' }));
      }
    });
    return;
  }
  
  if (req.url === '/move' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const d = JSON.parse(body);
        const hx = d.headX || 0;
        const hy = d.headY || 0;
        const size = d.size || 8;
        
        if (!cache[size]) cache[size] = buildPath(size);
        const { path, order } = cache[size];
        
        const key = `${hx},${hy}`;
        const idx = order[key] || 0;
        const next = path[(idx + 1) % path.length];
        
        const dx = next[0] - hx;
        const dy = next[1] - hy;
        
        const dirMap = {
          '0,-1': 'UP',
          '0,1': 'DOWN',
          '-1,0': 'LEFT',
          '1,0': 'RIGHT'
        };
        
        const dir = dirMap[`${dx},${dy}`] || 'RIGHT';
        
        console.log(`[MOVE] (${hx},${hy}) -> ${next} -> ${dir}`);
        
        res.writeHead(200).end(JSON.stringify({
          direction: dir,
          algorithm: 'pure-hamilton'
        }));
      } catch (e) {
        console.log('[ERROR]', e.message);
        res.writeHead(200).end(JSON.stringify({ direction: 'RIGHT' }));
      }
    });
    return;
  }
  
  res.writeHead(200).end(JSON.stringify({ status: 'ok' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 Hybrid Hamilton Server on port ${PORT}`);
});
