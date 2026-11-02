import { useEffect, useState } from 'react';
import type { Component } from 'grapesjs';
import { COUNTDOWN_PATH, defaultCountdown, wallTime, wallTimeToUtc, type CountdownConfig } from '../countdown/config';
import { readCountdown, updateCountdown } from './countdown';
import { ColorField, Field } from './ui';
const zones = ['America/Sao_Paulo', 'America/Manaus', 'America/Rio_Branco', 'America/Noronha', 'Europe/Lisbon', 'America/New_York', 'UTC'];
export function CountdownSettings({ component, version, notify }: { component: Component; version: number; notify: (message: string) => void }) {
  let saved: { config: CountdownConfig; endpoint: string };
  try { saved = readCountdown(component); } catch { saved = { config: defaultCountdown(), endpoint: COUNTDOWN_PATH }; }
  const signature = JSON.stringify(saved);
  const [draft, setDraft] = useState(saved.config);
  const [date, setDate] = useState(() => wallTime(saved.config.end, saved.config.zone));
  const [endpoint, setEndpoint] = useState(saved.endpoint);
  const [error, setError] = useState('');
  useEffect(() => {
    const next = JSON.parse(signature) as typeof saved;
    setDraft(next.config); setDate(wallTime(next.config.end, next.config.zone)); setEndpoint(next.endpoint); setError('');
  }, [signature, component.cid]);
  function apply(event: React.FormEvent) {
    event.preventDefault();
    try {
      const config = { ...draft, end: wallTimeToUtc(date, draft.zone) };
      updateCountdown(component, config, endpoint.trim());
      setDraft(config); setError(''); notify('Cronômetro atualizado. O prazo é fixo para todos os destinatários.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Revise os campos.'); }
  }
  return <form className="property-section countdown-settings" onSubmit={apply} data-version={version}>
    <div className="countdown-badge">GIF ANIMADO · PRAZO FIXO</div><h3>Contagem regressiva</h3>
    <Field label="Data e hora limite"><input aria-label="Data e hora limite" type="datetime-local" required min="2020-01-01T00:00" max="2099-12-31T23:59" value={date} onInput={e => setDate(e.currentTarget.value)}/></Field>
    <Field label="Fuso horário"><select aria-label="Fuso horário" value={draft.zone} onChange={e => { setDraft({ ...draft, zone: e.target.value }); setError(''); }}>{[...new Set([...zones, draft.zone])].map(zone => <option key={zone} value={zone}>{zone === 'America/Sao_Paulo' ? 'Brasília · São Paulo' : zone.replaceAll('_', ' ')}</option>)}</select></Field>
    <p className="hint">A data acima é interpretada no fuso escolhido. O prazo não reinicia ao abrir o e-mail.</p>
    <div className="countdown-presets"><button type="button" onClick={() => { const next = defaultCountdown(); setDate(wallTime(next.end, draft.zone)); }}>+24 horas</button><button type="button" onClick={() => setDate(wallTime(new Date(Date.now() + 7 * 86400_000).toISOString(), draft.zone))}>+7 dias</button></div>
    <ColorField label="Fundo do cronômetro" value={draft.background} onChange={background => setDraft({ ...draft, background })}/>
    <ColorField label="Cor dos números" value={draft.accent} onChange={accent => setDraft({ ...draft, accent })}/>
    <ColorField label="Cor das legendas" value={draft.foreground} onChange={foreground => setDraft({ ...draft, foreground })}/>
    <p className="hint">Ao terminar: “Prazo encerrado”. Após 60 segundos de animação, a imagem mostra a data limite, sem reiniciar a contagem.</p>
    <details className="countdown-service"><summary>Serviço de imagem</summary><Field label="URL pública do serviço"><input aria-label="URL pública do serviço" value={endpoint} onChange={e => setEndpoint(e.target.value)} placeholder="https://seu-saas.com/api/countdown.gif"/></Field><p className="hint">Use a rota incluída no projeto, hospedada no seu SaaS.</p></details>
    {endpoint === COUNTDOWN_PATH && <p className="countdown-local">Prévia local ativa. Para enviar, conecte a URL pública do serviço.</p>}
    {error && <p className="error-message" role="alert">{error}</p>}
    <button type="submit" className="button primary button-full">Aplicar cronômetro</button>
  </form>;
}
