/** Shared by the editor and the public GIF route. No browser or Node dependencies. */
export const COUNTDOWN_PATH = '/api/countdown.gif';
export const DEFAULT_ZONE = 'America/Sao_Paulo';
export type CountdownConfig = { end: string; zone: string; background: string; foreground: string; accent: string };
export const countdownColors = { background: '#29223f', foreground: '#ffffff', accent: '#c7b6ff' };
export function validateCountdown(input: CountdownConfig): CountdownConfig {
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(input.end)) throw new Error('Informe uma data limite válida em UTC.');
  const time = Date.parse(input.end);
  if (!Number.isFinite(time) || time < Date.UTC(2020, 0, 1) || time >= Date.UTC(2100, 0, 1)) throw new Error('A data deve estar entre 2020 e 2099.');
  if (new Date(time).toISOString().replace('.000Z', 'Z') !== input.end.replace('.000Z', 'Z')) throw new Error('A data limite não existe.');
  if (input.zone.length > 64 || !/^[A-Za-z_+\-/0-9]+$/.test(input.zone)) throw new Error('Fuso horário inválido.');
  try { new Intl.DateTimeFormat('pt-BR', { timeZone: input.zone }); } catch { throw new Error('Fuso horário inválido.'); }
  for (const color of [input.background, input.foreground, input.accent]) if (!/^#[\da-f]{6}$/i.test(color)) throw new Error('Use cores no formato #RRGGBB.');
  return { ...input, end: new Date(time).toISOString() };
}
export function defaultCountdown(now = Date.now()): CountdownConfig {
  return { end: new Date(Math.floor((now + 86400_000) / 60000) * 60000).toISOString(), zone: DEFAULT_ZONE, ...countdownColors };
}
export function configFromParams(params: URLSearchParams): CountdownConfig {
  return validateCountdown({ end: params.get('end') || '', zone: params.get('zone') || DEFAULT_ZONE, background: params.get('bg') || countdownColors.background, foreground: params.get('fg') || countdownColors.foreground, accent: params.get('accent') || countdownColors.accent });
}
export function safeCountdownEndpoint(input: string): string {
  if (input === COUNTDOWN_PATH) return input;
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || /^(localhost|127\.|0\.|\[|terminal\.local)/i.test(url.hostname) || !url.hostname.includes('.')) return '';
    return url.href;
  } catch { return ''; }
}
export function countdownUrl(config: CountdownConfig, endpoint = COUNTDOWN_PATH) {
  const safe = safeCountdownEndpoint(endpoint);
  if (!safe) throw new Error('Use a URL HTTPS pública do serviço, sem parâmetros.');
  const value = validateCountdown(config);
  const params = new URLSearchParams({ end: value.end, zone: value.zone, bg: value.background, fg: value.foreground, accent: value.accent });
  return `${safe}?${params}`;
}
export function readCountdownUrl(src: string): { config: CountdownConfig; endpoint: string } {
  const url = new URL(src, 'https://local.invalid');
  const endpoint = src.startsWith(COUNTDOWN_PATH + '?') ? COUNTDOWN_PATH : url.origin + url.pathname;
  if (!safeCountdownEndpoint(endpoint)) throw new Error('Endereço do cronômetro inválido.');
  return { config: configFromParams(url.searchParams), endpoint };
}
export function isLocalCountdownUrl(value: string): boolean {
  if (!value.startsWith(COUNTDOWN_PATH + '?') || /["<>\\]/.test(value)) return false;
  try { readCountdownUrl(value); return true; } catch { return false; }
}
export function remaining(end: string, now = Date.now()) {
  const total = Math.max(0, Math.ceil((Date.parse(end) - now) / 1000));
  return { total, days: Math.floor(total / 86400), hours: Math.floor(total % 86400 / 3600), minutes: Math.floor(total % 3600 / 60), seconds: total % 60 };
}
export function wallTime(end: string, zone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(end));
  const get = (key: string) => parts.find(p => p.type === key)!.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}
/** Reject nonexistent and ambiguous DST times, instead of silently changing a deadline. */
export function wallTimeToUtc(value: string, zone: string): string {
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value)) throw new Error('Preencha a data e a hora.');
  const naive = Date.parse(value + ':00Z');
  if (!Number.isFinite(naive) || new Date(naive).toISOString().slice(0, 16) !== value) throw new Error('Data inválida.');
  const offsets = new Set<number>();
  for (let hour = -36; hour <= 36; hour += 6) {
    const sample = naive + hour * 3600_000;
    offsets.add(Date.parse(wallTime(new Date(sample).toISOString(), zone) + ':00Z') - sample);
  }
  const matches = [...offsets].map(offset => new Date(naive - offset).toISOString()).filter(end => wallTime(end, zone) === value);
  if (matches.length !== 1) throw new Error('Horário inexistente ou ambíguo neste fuso. Escolha outro horário ou use UTC.');
  return matches[0];
}
export function deadlineLabel(config: CountdownConfig): string {
  const wall = wallTime(config.end, config.zone);
  return `Prazo: ${wall.slice(8, 10)}/${wall.slice(5, 7)}/${wall.slice(0, 4)} às ${wall.slice(11)} (${config.zone}).`;
}
