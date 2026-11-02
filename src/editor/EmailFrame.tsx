import { useEffect, useState } from 'react';
import { isLocalCountdownUrl } from '../countdown/config';

/** Local preview images need the parent page's origin; the email frame stays fully sandboxed. */
export async function preparePreviewHtml(html: string, signal: AbortSignal): Promise<string> {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const images = Array.from(doc.images).filter(image => isLocalCountdownUrl(image.getAttribute('src') || ''));
  const urls = [...new Set(images.map(image => image.getAttribute('src')!))];
  const sources = new Map<string, string>();
  // Small batches stay inside the local image service's rendering budget.
  for (let at = 0; at < urls.length; at += 3) {
    await Promise.all(urls.slice(at, at + 3).map(async url => {
      const response = await fetch(url, { signal, credentials: 'same-origin' });
      if (!response.ok || !response.headers.get('content-type')?.startsWith('image/gif')) throw new Error('Não foi possível carregar o cronômetro local. Tente abrir a prévia novamente.');
      const blob = await response.blob();
      if (blob.size > 600_000) throw new Error('A imagem do cronômetro excedeu o tamanho esperado.');
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Falha ao preparar a imagem.')); reader.readAsDataURL(blob);
      });
      sources.set(url, data);
    }));
  }
  if (!urls.length) return html;
  images.forEach(image => image.setAttribute('src', sources.get(image.getAttribute('src')!)!));
  return '<!doctype html>\n' + doc.documentElement.outerHTML;
}
export function EmailFrame({ html, title, className }: { html: string; title: string; className: string }) {
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    void preparePreviewHtml(html, controller.signal).then(result => {
      if (!controller.signal.aborted) { setPreview(result); setError(''); }
    }).catch(e => { if (!controller.signal.aborted) { setPreview(html); setError(e instanceof Error ? e.message : 'Falha ao carregar a prévia.'); } });
    return () => controller.abort();
  }, [html]);
  return <>{error && <p className="error-message" role="alert">{error}</p>}<iframe title={title} sandbox="" srcDoc={preview} className={className}/></>;
}
