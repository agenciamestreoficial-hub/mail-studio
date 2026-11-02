import DOMPurify from 'dompurify';
import type { EmailProject } from './types';

export function safeUrl(input: string, image = false): string {
  const value = input.trim();
  if (!image && /^\[[A-Z0-9_]+\]$/.test(value)) return value;
  try {
    const url = new URL(value);
    const schemes = image ? ['https:'] : ['https:', 'http:', 'mailto:', 'tel:'];
    return schemes.includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

/** No executable HTML, forms, embeds, or remote stylesheets in the editing canvas. */
export function sanitizeEmailHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'link', 'meta', 'base', 'video', 'audio'],
    FORBID_ATTR: ['srcdoc', 'formaction'],
    ALLOW_DATA_ATTR: false,
  });
}

export function escapeXml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function inspectNodes(value: unknown, depth = 0): void {
  if (depth > 80) throw new Error('O projeto excede o limite de profundidade.');
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (['__proto__', 'constructor', 'prototype', 'script', 'script-export'].includes(key)) throw new Error('O projeto contém código executável não permitido.');
    if (key === 'tagName' && typeof child === 'string' && /^(script|iframe|object|embed|form|input|style|link|meta|base)$/i.test(child)) throw new Error('O projeto contém elementos não permitidos.');
    if (key === 'type' && typeof child === 'string' && /^(script|iframe|video|map)$/i.test(child)) throw new Error('O projeto contém componentes não permitidos.');
    if (/^on[a-z]+$/i.test(key) || key === 'srcdoc') throw new Error('O projeto contém eventos de HTML não permitidos.');
    if (typeof child === 'string' && /(?:javascript|vbscript)\s*:|<\s*(?:script|iframe|object|embed|form|link|base)\b|\son[a-z]+\s*=/i.test(child)) throw new Error('O projeto contém HTML não seguro.');
    if (['href', 'src', 'background-url'].includes(key) && typeof child === 'string' && child) {
      const decoder = document.createElement('textarea');
      decoder.innerHTML = child;
      if (decoder.value !== '#' && !safeUrl(decoder.value, key !== 'href')) throw new Error('O projeto contém uma URL não permitida.');
    }
    if (key === 'content' && typeof child === 'string') (value as Record<string, unknown>)[key] = sanitizeEmailHtml(child);
    if (child && typeof child === 'object') inspectNodes(child, depth + 1);
  }
  const node = value as Record<string, unknown>;
  if (typeof node.type === 'string' && node.type.startsWith('mj-') && node.attributes && typeof node.attributes === 'object') {
    for (const attr of Object.values(node.attributes)) {
      if (typeof attr === 'string' && /["<>]/.test(attr)) throw new Error('Um atributo MJML contém caracteres inválidos.');
    }
  }
}

export function parseProject(raw: string): EmailProject {
  if (raw.length > 5_000_000) throw new Error('O projeto deve ter até 5 MB.');
  const data = JSON.parse(raw);
  if (data?.schemaVersion !== 1 || !data.metadata || !data.design || !Array.isArray(data.design.pages) || data.design.pages.length !== 1) throw new Error('Selecione um projeto JSON do Mail Studio (versão 1).');
  if (!['name', 'subject', 'preheader'].every(key => typeof data.metadata[key] === 'string' && data.metadata[key].length <= 500)) throw new Error('Os dados do e-mail são inválidos.');
  const page = data.design.pages[0];
  if (!Array.isArray(page.frames) || page.frames.length !== 1 || !page.frames[0].component) throw new Error('A estrutura do projeto é inválida.');
  inspectNodes(data.design);
  const serialized = JSON.stringify(page.frames[0].component);
  if (!serialized.includes('mj-body')) throw new Error('O projeto não possui uma estrutura MJML válida.');
  return data as EmailProject;
}
