const http = require('http');
const PORT = 8087;

const DIRS = ['RIGHT', 'UP', 'DOWN', 'LEFT'];
const DELTAS = { RIGHT: [1, 0], UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0] };

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }
  
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
        const hx = d.headX || 0, hy = d.headY || 0;
        const fx = d.foodX || 0, fy = d.foodY || 0;
        const sz = d.size || 8;
        const bodyList = d.body || [];
        
        const blocked = new Set();
        blocked.add(hx + ',' + hy);
        for (const p of bodyList) {
          const px = p.x !== undefined ? p.x : p[0];
          const py = p.y !== undefined ? p.y : p[1];
          blocked.add(px + ',' + py);
        }
        
        const tail = bodyList.length > 0 
          ? [bodyList[bodyList.length-1].x || bodyList[bodyList.length-1][0],
             bodyList[bodyList.length-1].y || bodyList[bodyList.length-1][1]]
          : [hx, hy];
        
        let bestDir = 'RIGHT';
        let bestScore = -9999;
        
        for (const dir of DIRS) {
          const [dx, dy] = DELTAS[dir];
          const nx = hx + dx, ny = hy + dy;
          
          if (nx < 0 || nx >= sz || ny < 0 || ny >= sz) continue;
          if (blocked.has(nx + ',' + ny)) continue;
          
          const foodDist = Math.abs(nx - fx) + Math.abs(ny - fy);
          const tailDist = Math.abs(nx - tail[0]) + Math.abs(ny - tail[1]);
          const len = bodyList.length;
          const score = -foodDist + (len > 5 ? 0.3 * tailDist : 0);
          
          if (score > bestScore) { bestScore = score; bestDir = dir; }
        }
        
        res.writeHead(200).end(JSON.stringify({ direction: bestDir }));
      } catch (e) {
        res.writeHead(200).end(JSON.stringify({ direction: 'RIGHT' }));
      }
    });
    return;
  }
  
  res.writeHead(200).end(JSON.stringify({ status: 'ok' }));
});

server.listen(PORT, '127.0.0.1', () => console.log('Snake AI on ' + PORT));
