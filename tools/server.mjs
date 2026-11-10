import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'.');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.png':'image/png'};
const server=http.createServer((req,res)=>{
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=path.resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
    const relative=path.relative(root,file);
    if(relative.startsWith('..')||path.isAbsolute(relative)||relative.split(path.sep).some(p=>p.startsWith('.'))){res.writeHead(403);res.end();return;}
    const stat=fs.statSync(file);if(!stat.isFile())throw new Error();
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
  }catch{res.writeHead(404);res.end('Not found');}
});
const port=Number(process.env.PORT||5173);
server.listen(port,'127.0.0.1',()=>console.log(`NIS-GameCenter: http://localhost:${port}`));
