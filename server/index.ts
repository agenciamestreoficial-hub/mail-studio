import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCountdownMiddleware } from './countdown-route.ts';
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const countdown = createCountdownMiddleware();
const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };
const server = createServer((req, res) => countdown(req, res, () => {
  void (async () => {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
    const pathname = decodeURIComponent(new URL(req.url || '/', 'http://local.invalid').pathname);
    const path = resolve(dist, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!path.startsWith(dist.endsWith(sep) ? dist : dist + sep)) { res.writeHead(403).end(); return; }
    try {
      const data = await readFile(path);
      res.setHeader('Content-Type', mime[extname(path)] || 'application/octet-stream');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
      res.writeHead(200).end(req.method === 'HEAD' ? undefined : data);
    } catch { res.writeHead(404).end('Não encontrado.'); }
  })().catch(() => { if (!res.headersSent) res.writeHead(400); res.end('Requisição inválida.'); });
}));
const port = Number(process.env.PORT || 5173);
server.listen(port, '0.0.0.0', () => console.log(`Mail Studio com serviço de cronômetro na porta ${port}`));
