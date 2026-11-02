import type { IncomingMessage, ServerResponse } from 'node:http';
import { COUNTDOWN_PATH, configFromParams, countdownUrl } from '../src/countdown/config.ts';
import { renderCountdownGif } from './countdown-gif.ts';
/** Public image route: does not read cookies, fetch URLs, accept uploads, or store contacts. */
export function createCountdownMiddleware() {
  const cache = new Map<string, { second: number; data: Uint8Array }>();
  let budgetSecond = 0, renders = 0;
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    let url: URL;
    try { url = new URL(req.url || '/', 'http://local.invalid'); } catch { next(); return; }
    if (url.pathname !== COUNTDOWN_PATH) { next(); return; }
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.setHeader('Allow', 'GET, HEAD'); res.writeHead(405).end(); return; }
    try {
      if ((req.url || '').length > 1000 || [...url.searchParams.keys()].some(key => !['end', 'zone', 'bg', 'fg', 'accent'].includes(key)) || [...url.searchParams.keys()].some(key => url.searchParams.getAll(key).length !== 1)) throw new Error('Parâmetros inválidos.');
      const config = configFromParams(url.searchParams);
      if (req.method === 'HEAD') { res.setHeader('Content-Type', 'image/gif'); res.writeHead(200).end(); return; }
      const second = Math.floor(Date.now() / 1000), key = countdownUrl(config);
      let item = cache.get(key);
      if (!item || item.second !== second) {
        if (budgetSecond !== second) { budgetSecond = second; renders = 0; }
        if (++renders > 10) { res.setHeader('Retry-After', '1'); res.writeHead(429).end('Tente novamente em um segundo.'); return; }
        item = { second, data: renderCountdownGif(config, second * 1000) };
        cache.delete(key); cache.set(key, item);
        if (cache.size > 24) cache.delete(cache.keys().next().value!);
      }
      res.setHeader('Content-Type', 'image/gif'); res.setHeader('Content-Length', item.data.length);
      res.writeHead(200).end(item.data);
    } catch (error) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.writeHead(400).end(error instanceof Error ? error.message : 'Cronômetro inválido.');
    }
  };
}
