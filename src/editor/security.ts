import DOMPurify from 'dompurify';
import { isLocalCountdownUrl } from '../countdown/config';
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
      if (decoder.value !== '#' && !(key === 'src' && isLocalCountdownUrl(decoder.value)) && !safeUrl(decoder.value, key !== 'href')) throw new Error('O projeto contém uma URL não permitida.');
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
  if (data.mode !== undefined && !['visual', 'html'].includes(data.mode)) throw new Error('Modo de edição inválido.');
  if (data.mode === 'html' || data.htmlSource !== undefined) {
    if (typeof data.htmlSource !== 'string' || data.htmlSource.length > MAX_HTML_SIZE) throw new Error('O HTML deve ter até 2 MB.');
    data.htmlSource = data.htmlSource.trim() ? sanitizeEmailDocument(data.htmlSource) : '';
  }
  inspectNodes(data.design);
  const serialized = JSON.stringify(page.frames[0].component);
  if (!serialized.includes('mj-body')) throw new Error('O projeto não possui uma estrutura MJML válida.');
  return data as EmailProject;
}

export const MAX_HTML_SIZE = 2_000_000;
const forbidden = ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'link', 'meta', 'base', 'video', 'audio'];
const conditionalTags = new Set(['table', 'tbody', 'thead', 'tfoot', 'tr', 'td', 'th', 'div', 'span', 'p', 'a', 'img', 'br', 'center', 'style', 'v:rect', 'v:roundrect', 'v:fill', 'v:textbox', 'v:stroke', 'v:imagedata', 'w:anchorlock', 'w:wrap', 'o:officedocumentsettings', 'o:allowpng', 'o:pixelsperinch']);
const conditionalAttrs = new Set(['style', 'class', 'width', 'height', 'align', 'valign', 'bgcolor', 'border', 'cellpadding', 'cellspacing', 'role', 'xmlns:v', 'xmlns:w', 'xmlns:o', 'fillcolor', 'strokecolor', 'strokeweight', 'arcsize', 'type', 'src', 'href', 'target', 'alt', 'color', 'opacity', 'aspect', 'origin', 'position', 'focus', 'size', 'inset', 'v:ext', 'coordsize', 'fill', 'stroke']);
function cleanCss(css: string): string {
  // Do not allow executable legacy CSS or external stylesheets. Ordinary email CSS stays intact.
  return css.replace(/@import[^;]*(;|$)/gi, '').replace(/[^{};]*(?:expression\s*\(|behavior\s*:|-moz-binding|javascript\s*:|vbscript\s*:)[^{};]*/gi, '');
}
function safeConditional(comment: string): string {
  const condition = comment.match(/^<!--\[if ([^\]]+)\]>/i)?.[1];
  if (condition && (!/mso|IE/i.test(condition) || !/^[\w\s!()|&.<>=-]+$/.test(condition))) return '';
  if (/<\s*(script|iframe|object|embed|form|svg|math)\b|\son[a-z]+\s*=|javascript\s*:|vbscript\s*:|expression\s*\(|\\/i.test(comment)) return '';
  return comment.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (_match, start, css, end) => start + cleanCss(css) + end).replace(/<(\/?)([a-z][\w:-]*)([^<>]*?)>/gi, (_tag, closing: string, tag: string, raw: string) => {
    if (!conditionalTags.has(tag.toLowerCase())) return '';
    if (closing) return `</${tag}>`;
    // Parse only attributes, preserving deliberately unbalanced table/VML fragments for Outlook.
    const doc = new DOMParser().parseFromString(`<div ${raw.replace(/\/$/, '')}></div>`, 'text/html');
    const element = doc.body.firstElementChild;
    const attrs = Array.from(element?.attributes || []).filter(attr => conditionalAttrs.has(attr.name.toLowerCase())).flatMap(attr => {
      let value = attr.value;
      if (attr.name === 'src' && !safeUrl(value, true) && !isLocalCountdownUrl(value)) return [];
      if (attr.name === 'href' && value !== '#' && !safeUrl(value)) return [];
      if (attr.name === 'style') value = cleanCss(value);
      return [`${attr.name}="${escapeXml(value)}"`];
    });
    return `<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}${raw.endsWith('/') ? '/' : ''}>`;
  });
}
/** Preserve document CSS and safe Outlook conditionals, while removing executable content. */
export function sanitizeEmailDocument(source: string): string {
  if (source.length > MAX_HTML_SIZE) throw new Error('O HTML deve ter até 2 MB.');
  if (!source.trim()) throw new Error('Cole um e-mail em HTML ou escolha um arquivo .html.');
  const markers: string[] = [];
  const nonce = Math.random().toString(36).slice(2);
  const prepared = source.replace(/<!--\[if [^\]]+\]><!-->|<!--<!\[endif\]-->|<!--\[if [^\]]+\]>[\s\S]*?<!\[endif\]-->/gi, comment => {
    const index = markers.push(safeConditional(comment)) - 1;
    return `<style>/*MSCOND_${nonce}_${index}*/</style>`;
  });
  let clean = DOMPurify.sanitize(prepared, { WHOLE_DOCUMENT: true, ADD_TAGS: ['style'], FORBID_TAGS: forbidden, FORBID_ATTR: ['srcdoc', 'formaction'], ALLOW_DATA_ATTR: false });
  const document = new DOMParser().parseFromString(clean, 'text/html');
  document.querySelectorAll('style').forEach(style => { style.textContent = cleanCss(style.textContent || ''); });
  document.querySelectorAll('[style]').forEach(node => node.setAttribute('style', cleanCss(node.getAttribute('style') || '')));
  clean = document.documentElement.outerHTML;
  markers.forEach((comment, index) => { clean = clean.replace(`<style>/*MSCOND_${nonce}_${index}*/</style>`, comment); });
  if (!new DOMParser().parseFromString(clean, 'text/html').body.innerHTML.trim()) throw new Error('O HTML precisa ter conteúdo no corpo do e-mail.');
  return '<!doctype html>\n' + clean;
}
