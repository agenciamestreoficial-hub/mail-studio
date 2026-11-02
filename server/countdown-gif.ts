import { createRequire } from 'node:module';
// gifenc 1.0.3 ships CJS; resolve it consistently in Node, Vite and Vitest.
const { GIFEncoder } = createRequire(import.meta.url)('gifenc') as typeof import('gifenc')['default'];
import { remaining, validateCountdown, wallTime, type CountdownConfig } from '../src/countdown/config.ts';
export const WIDTH = 600, HEIGHT = 184;
// An original 5×7 bitmap alphabet keeps deployment independent of system fonts or native canvas.
const glyphs: Record<string, string> = {
  '0':'01110/10001/10011/10101/11001/10001/01110', '1':'00100/01100/00100/00100/00100/00100/01110',
  '2':'01110/10001/00001/00010/00100/01000/11111', '3':'11110/00001/00001/01110/00001/00001/11110',
  '4':'00010/00110/01010/10010/11111/00010/00010', '5':'11111/10000/10000/11110/00001/00001/11110',
  '6':'01110/10000/10000/11110/10001/10001/01110', '7':'11111/00001/00010/00100/01000/01000/01000',
  '8':'01110/10001/10001/01110/10001/10001/01110', '9':'01110/10001/10001/01111/00001/00001/01110',
  A:'01110/10001/10001/11111/10001/10001/10001', B:'11110/10001/10001/11110/10001/10001/11110',
  C:'01111/10000/10000/10000/10000/10000/01111', D:'11110/10001/10001/10001/10001/10001/11110',
  E:'11111/10000/10000/11110/10000/10000/11111', F:'11111/10000/10000/11110/10000/10000/10000',
  G:'01111/10000/10000/10111/10001/10001/01111', H:'10001/10001/10001/11111/10001/10001/10001',
  I:'01110/00100/00100/00100/00100/00100/01110', J:'00111/00010/00010/00010/00010/10010/01100',
  K:'10001/10010/10100/11000/10100/10010/10001', L:'10000/10000/10000/10000/10000/10000/11111',
  M:'10001/11011/10101/10101/10001/10001/10001', N:'10001/11001/10101/10011/10001/10001/10001',
  O:'01110/10001/10001/10001/10001/10001/01110', P:'11110/10001/10001/11110/10000/10000/10000',
  Q:'01110/10001/10001/10001/10101/10010/01101', R:'11110/10001/10001/11110/10100/10010/10001',
  S:'01111/10000/10000/01110/00001/00001/11110', T:'11111/00100/00100/00100/00100/00100/00100',
  U:'10001/10001/10001/10001/10001/10001/01110', V:'10001/10001/10001/10001/10001/01010/00100',
  W:'10001/10001/10001/10101/10101/10101/01010', X:'10001/10001/01010/00100/01010/10001/10001',
  Y:'10001/10001/01010/00100/00100/00100/00100', Z:'11111/00001/00010/00100/01000/10000/11111',
  ':':'00000/00100/00100/00000/00100/00100/00000', '/':'00001/00010/00010/00100/01000/01000/10000',
  '-':'00000/00000/00000/01110/00000/00000/00000', '.':'00000/00000/00000/00000/00000/00100/00100',
  '_':'00000/00000/00000/00000/00000/00000/11111', '+':'00000/00100/00100/11111/00100/00100/00000',
};
function rgb(hex: string) { return [1, 3, 5].map(at => parseInt(hex.slice(at, at + 2), 16)); }
function rectangle(frame: Uint8Array, x: number, y: number, width: number, height: number, color: number, radius = 0) {
  for (let row = 0; row < height; row++) {
    const edge = Math.min(row, height - row - 1);
    const inset = edge < radius ? Math.ceil(radius - Math.sqrt(radius ** 2 - (radius - edge - 1) ** 2)) : 0;
    frame.fill(color, (y + row) * WIDTH + x + inset, (y + row) * WIDTH + x + width - inset);
  }
}
function text(frame: Uint8Array, value: string, center: number, y: number, scale: number, color: number) {
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  let x = Math.round(center - (normalized.length * 6 - 1) * scale / 2);
  for (const char of normalized) {
    (glyphs[char] || '').split('/').forEach((row, r) => [...row].forEach((pixel, c) => {
      if (pixel === '1') rectangle(frame, x + c * scale, y + r * scale, scale, scale, color);
    }));
    x += 6 * scale;
  }
}
export function countdownFrame(config: CountdownConfig, now: number, final = false): Uint8Array {
  const frame = new Uint8Array(WIDTH * HEIGHT);
  const time = remaining(config.end, now);
  const wall = wallTime(config.end, config.zone);
  const date = `${wall.slice(8, 10)}/${wall.slice(5, 7)}/${wall.slice(0, 4)} ${wall.slice(11)}`;
  if (!time.total || final) {
    text(frame, time.total ? 'PRAZO DA OFERTA' : 'PRAZO ENCERRADO', WIDTH / 2, 38, 3, 3);
    text(frame, date, WIDTH / 2, 84, 3, 2);
    text(frame, config.zone, WIDTH / 2, 135, config.zone.length > 44 ? 1 : 2, 2);
    return frame;
  }
  text(frame, 'TEMPO RESTANTE', WIDTH / 2, 15, 2, 2);
  const numbers = [time.days, time.hours, time.minutes, time.seconds];
  const labels = ['DIAS', 'HORAS', 'MINUTOS', 'SEGUNDOS'];
  numbers.forEach((number, i) => {
    const x = 28 + i * 140;
    const value = String(number).padStart(2, '0');
    const scale = value.length <= 2 ? 7 : value.length === 3 ? 5 : value.length === 4 ? 4 : 3;
    rectangle(frame, x, 42, 124, 105, 1, 10);
    text(frame, value, x + 62, 57 + (7 - scale) * 3, scale, 3);
    text(frame, labels[i], x + 62, 121, 2, 2);
  });
  text(frame, `${date} - ${config.zone}`, WIDTH / 2, 163, 1, 2);
  return frame;
}
export function renderCountdownGif(input: CountdownConfig, now = Date.now()): Uint8Array {
  const config = validateCountdown(input);
  const bg = rgb(config.background), fg = rgb(config.foreground);
  const palette = [bg, bg.map((value, i) => Math.round(value * .88 + fg[i] * .12)), fg, rgb(config.accent)];
  const gif = GIFEncoder();
  const frames = Math.min(60, remaining(config.end, now).total);
  for (let second = 0; second < frames; second++) {
    gif.writeFrame(countdownFrame(config, now + second * 1000), WIDTH, HEIGHT, { palette, delay: 1000, repeat: -1, dispose: 1 });
  }
  // No looping or frozen positive countdown: end on the deadline (or expired state).
  gif.writeFrame(countdownFrame(config, now + frames * 1000, true), WIDTH, HEIGHT, { palette, delay: 1000, repeat: -1, dispose: 1 });
  gif.finish();
  return gif.bytes();
}
