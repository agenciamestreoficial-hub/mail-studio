import { safeUrl, sanitizeEmailDocument } from './security';
import { isLocalCountdownUrl } from '../countdown/config';
import type { EmailMetadata } from './types';
export { MAX_HTML_SIZE, sanitizeEmailDocument } from './security';
export function compileHtmlDocument(source: string, metadata: EmailMetadata): { html: string; warnings: string[] } {
  const sanitized = sanitizeEmailDocument(source);
  const doc = new DOMParser().parseFromString(sanitized, 'text/html');
  doc.title = metadata.subject;
  doc.head.insertAdjacentHTML('afterbegin', '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">');
  Array.from(doc.body.children).filter(node => node.id === 'ms-email-preheader' || (node instanceof HTMLElement && node.style.display === 'none' && node.style.fontSize === '1px' && node.style.lineHeight === '1px')).forEach(node => node.remove());
  if (metadata.preheader) {
    const preheader = doc.createElement('div'); preheader.id = 'ms-email-preheader';
    preheader.setAttribute('style', 'display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all');
    preheader.textContent = metadata.preheader; doc.body.prepend(preheader);
  }
  const html = '<!doctype html>\n' + doc.documentElement.outerHTML;
  const warnings: string[] = [];
  if (!metadata.subject.trim()) warnings.push('Preencha o assunto antes de enviar.');
  if (html.includes('https://example.com')) warnings.push('Substitua os links de exemplo pelo endereço da sua marca.');
  if (!html.includes('[UNSUBSCRIBE_URL]')) warnings.push('Inclua o link de descadastro exigido pelo seu provedor de envio.');
  if (html.includes('/api/countdown.gif?') && /src=["']\/api\/countdown\.gif/.test(html)) warnings.push('Cronômetro em modo local: configure a URL HTTPS pública do serviço antes de enviar este HTML.');
  const document = new DOMParser().parseFromString(html, 'text/html');
  if (Array.from(document.images).some(image => { const src = image.getAttribute('src') || ''; return !safeUrl(src, true) && !isLocalCountdownUrl(src); })) warnings.push('Use URLs HTTPS públicas e duráveis nas imagens do HTML.');
  return { html, warnings };
}
