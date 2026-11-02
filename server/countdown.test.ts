import { describe, expect, it, vi, afterEach } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { countdownColors, countdownUrl } from '../src/countdown/config';
import { renderCountdownGif, WIDTH, HEIGHT } from './countdown-gif';
import { createCountdownMiddleware } from './countdown-route';
const now = Date.parse('2026-11-10T12:00:00Z');
const config = { end: '2026-11-10T12:02:00.000Z', zone: 'America/Sao_Paulo', ...countdownColors };
function inspectGif(bytes: Uint8Array) {
  const buf = Buffer.from(bytes);
  expect(buf.subarray(0, 6).toString()).toBe('GIF89a');
  expect(buf.readUInt16LE(6)).toBe(WIDTH); expect(buf.readUInt16LE(8)).toBe(HEIGHT);
  const delays: number[] = []; let frames = 0;
  let index = 13 + ((buf[10] & 128) ? 3 * 2 ** ((buf[10] & 7) + 1) : 0);
  const skipBlocks = () => { while (buf[index]) index += buf[index] + 1; index++; };
  while (index < buf.length && buf[index] !== 0x3b) {
    if (buf[index] === 0x21) {
      const kind = buf[index + 1]; index += 2;
      if (kind === 0xf9) delays.push(buf.readUInt16LE(index + 2) * 10);
      skipBlocks();
    } else if (buf[index] === 0x2c) {
      frames++; const packed = buf[index + 9]; index += 10;
      if (packed & 128) index += 3 * 2 ** ((packed & 7) + 1);
      index++; skipBlocks();
    } else throw new Error(`Invalid GIF block at ${index}`);
  }
  expect(buf[index]).toBe(0x3b);
  expect(buf.includes(Buffer.from('NETSCAPE2.0'))).toBe(false); // no looping back in time
  return { frames, delays };
}
function invoke(middleware: ReturnType<typeof createCountdownMiddleware>, url: string, method = 'GET') {
  const headers: Record<string, string | number> = {};
  const result = { status: 0, body: undefined as Uint8Array | string | undefined, next: false, headers };
  const response = { setHeader(key: string, value: string | number) { headers[key] = value; }, writeHead(status: number) { result.status = status; return this; }, end(body?: Uint8Array | string) { result.body = body; } };
  middleware({ url, method } as IncomingMessage, response as unknown as ServerResponse, () => { result.next = true; });
  return result;
}
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
describe('Serviço público de GIF', () => {
  it('gera 60 segundos e uma tela final de prazo, sem loop', () => {
    const gif = renderCountdownGif(config, now);
    const result = inspectGif(gif);
    expect(result.frames).toBe(61); expect(result.delays).toEqual(Array(61).fill(1000));
    expect(gif.length).toBeLessThan(500_000);
  });
  it('encerra a animação ao vencer e retorna uma única imagem para prazo passado', () => {
    expect(inspectGif(renderCountdownGif({ ...config, end: new Date(now + 2000).toISOString() }, now)).frames).toBe(3);
    const expired = { ...config, end: new Date(now - 1000).toISOString() };
    expect(inspectGif(renderCountdownGif(expired, now)).frames).toBe(1);
    expect(renderCountdownGif(expired, now)).toEqual(renderCountdownGif(expired, now + 86400_000));
  });
  it('retorna imagem com cabeçalhos corretos, HEAD e passagem das demais rotas', () => {
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const handler = createCountdownMiddleware();
    const result = invoke(handler, countdownUrl(config));
    expect(result.status).toBe(200); expect(result.headers['Content-Type']).toBe('image/gif');
    expect(result.headers['Cache-Control']).toContain('no-store');
    expect(result.headers['X-Content-Type-Options']).toBe('nosniff');
    expect(inspectGif(result.body as Uint8Array).frames).toBe(61);
    expect(invoke(handler, countdownUrl(config), 'HEAD').body).toBeUndefined();
    expect(invoke(handler, '/').next).toBe(true);
  });
  it('valida entrada, método e duplicatas sem renderizar conteúdo arbitrário', () => {
    const handler = createCountdownMiddleware();
    for (const url of ['/api/countdown.gif', countdownUrl(config) + '&bg=bad', countdownUrl(config) + '&url=https://evil.test', '/api/countdown.gif?end=' + 'a'.repeat(1200)]) expect(invoke(handler, url).status).toBe(400);
    expect(invoke(handler, countdownUrl(config), 'POST').status).toBe(405);
  });
  it('reaproveita imagem no mesmo segundo e limita trabalho de renderização', () => {
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const handler = createCountdownMiddleware();
    const first = invoke(handler, countdownUrl(config));
    expect(invoke(handler, countdownUrl(config)).body).toBe(first.body);
    for (let i = 1; i < 10; i++) expect(invoke(handler, countdownUrl({ ...config, end: new Date(now + (120 + i) * 1000).toISOString() })).status).toBe(200);
    expect(invoke(handler, countdownUrl({ ...config, accent: '#123456' })).status).toBe(429);
  });
});
