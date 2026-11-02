import { describe, expect, it } from 'vitest';
import { COUNTDOWN_PATH, countdownColors, countdownUrl, deadlineLabel, isLocalCountdownUrl, readCountdownUrl, remaining, safeCountdownEndpoint, validateCountdown, wallTime, wallTimeToUtc } from './config';
const config = { end: '2026-11-10T21:30:00.000Z', zone: 'America/Sao_Paulo', ...countdownColors };
describe('Prazos absolutos do cronômetro', () => {
  it('converte Brasília para UTC e mantém a data legível', () => {
    expect(wallTimeToUtc('2026-11-10T18:30', config.zone)).toBe(config.end);
    expect(wallTime(config.end, config.zone)).toBe('2026-11-10T18:30');
    expect(deadlineLabel(config)).toBe('Prazo: 10/11/2026 às 18:30 (America/Sao_Paulo).');
  });
  it('trata fusos com minutos de diferença e mudança de dia', () => {
    expect(wallTimeToUtc('2026-11-11T00:00', 'Asia/Kolkata')).toBe('2026-11-10T18:30:00.000Z');
    expect(wallTimeToUtc('2026-11-11T00:00', 'UTC')).toBe('2026-11-11T00:00:00.000Z');
  });
  it('rejeita horários inexistentes e ambíguos no horário de verão', () => {
    expect(() => wallTimeToUtc('2026-03-08T02:30', 'America/New_York')).toThrow(/inexistente/);
    expect(() => wallTimeToUtc('2026-11-01T01:30', 'America/New_York')).toThrow(/ambíguo/);
    expect(() => wallTimeToUtc('2026-02-30T10:00', 'UTC')).toThrow(/Data inválida/);
  });
  it('não fica negativo, não reinicia e zera exatamente no prazo', () => {
    const end = Date.parse(config.end);
    expect(remaining(config.end, end - 90061_000)).toEqual({ total: 90061, days: 1, hours: 1, minutes: 1, seconds: 1 });
    expect(remaining(config.end, end - 1).total).toBe(1);
    expect(remaining(config.end, end).total).toBe(0);
    expect(remaining(config.end, end + 86400_000).total).toBe(0);
  });
  it('preserva configuração no URL e restringe a exceção de prévia local', () => {
    const url = countdownUrl(config);
    expect(readCountdownUrl(url)).toEqual({ config, endpoint: COUNTDOWN_PATH });
    expect(isLocalCountdownUrl(url)).toBe(true);
    for (const unsafe of ['/api/other?x=1', '//evil.test/api/countdown.gif', '/api/countdown.gif?end=x', url + '" onload="x']) expect(isLocalCountdownUrl(unsafe)).toBe(false);
  });
  it('aceita serviço público HTTPS e rejeita protocolos, credenciais e parâmetros', () => {
    expect(safeCountdownEndpoint('https://assets.example.com/api/countdown.gif')).toBeTruthy();
    for (const unsafe of ['javascript:alert(1)', 'http://example.com/gif', 'https://u:secret@example.com/gif', 'https://example.com/gif?secret=x', 'https://localhost/gif', 'https://127.0.0.1/gif']) expect(safeCountdownEndpoint(unsafe)).toBe('');
  });
  it('rejeita parâmetros de renderização inválidos antes de gerar imagens', () => {
    for (const patch of [{ end: '2026-02-30T00:00:00Z' }, { end: '2026-11-10' }, { end: '9999-01-01T00:00:00Z' }, { zone: 'Unknown/Zone' }, { accent: '<script>' }]) expect(() => validateCountdown({ ...config, ...patch })).toThrow();
  });
});
