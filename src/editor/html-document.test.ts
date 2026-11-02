// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import sample from '../../examples/custom-email.html?raw';
import type { Editor } from 'grapesjs';
import { compileHtmlDocument, sanitizeEmailDocument } from './html-document';
import { bodyOf, createEditor, exportEmail, snapshot } from './engine';
import { preparePreviewHtml } from './EmailFrame';
import { countdownUrl, defaultCountdown } from '../countdown/config';
import { parseProject } from './security';
const meta = { name: 'HTML importado', subject: 'Oferta $& <cliente> $1', preheader: 'Hoje $& e amanhã' };
const editors: Editor[] = [];
function editor() { const container = document.createElement('div'); document.body.append(container); const ed = createEditor(container, false); editors.push(ed); return ed; }
afterEach(() => { editors.splice(0).forEach(ed => ed.destroy()); document.body.innerHTML = ''; vi.unstubAllGlobals(); });
describe('E-mail completo em HTML', () => {
  it('mantém CSS responsivo, tabelas e comentários parciais de Outlook', () => {
    const { html } = compileHtmlDocument(sample, meta);
    expect(html).toContain('@media screen and (max-width:600px)');
    expect(html).toContain('<!--[if mso]><table role="presentation" width="600"><tr><td><![endif]-->');
    expect(html).toContain('<!--[if mso]></td></tr></table><![endif]-->');
    expect(html).toContain('width="600"'); expect(html).toContain('[FNAME]');
    expect(html).not.toContain('MSCOND_');
    expect(html).toContain('Oferta $&amp; &lt;cliente&gt; $1');
    expect(html).toContain('Hoje $&amp; e amanhã');
  });
  it('preserva VML seguro, mas remove scripts/eventos inclusive dentro de comentários', () => {
    const source = '<html><head><style>@import "https://evil.test/x.css"; .a{color:red}</style></head><body onload="alert(1)"><p onclick="bad()">Olá</p><script>bad()</script><iframe src="https://evil.test"></iframe><form><input></form><a href="javascript:bad()">X</a><!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="https://example.com" arcsize="10%"><w:anchorlock/></v:roundrect><![endif]--><!--[if mso]><img src="x" onerror="bad()"><![endif]--></body></html>';
    const clean = sanitizeEmailDocument(source);
    expect(clean).toContain('<v:roundrect'); expect(clean).toContain('<w:anchorlock/>');
    expect(clean).toContain('.a{color:red}');
    expect(clean).not.toMatch(/script|onload|onclick|onerror|iframe|<form|<input|javascript|@import/);
  });
  it('preserva marcadores condicionais revelados e não acumula pré-cabeçalhos', () => {
    const first = compileHtmlDocument('<body><!--[if !mso]><!--><p>Conteúdo alternativo</p><!--<![endif]--></body>', meta).html;
    const second = compileHtmlDocument(first, { ...meta, preheader: 'Novo resumo' }).html;
    expect(second).toContain('<!--[if !mso]><!-->'); expect(second).toContain('<!--<![endif]-->');
    expect(second.match(/id="ms-email-preheader"/g)).toHaveLength(1);
    expect(second).toContain('Novo resumo'); expect(second).not.toContain(meta.preheader);
  });
  it('restaura o modo HTML pelo JSON e mantém o rascunho visual independente', () => {
    const ed = editor(); const visual = bodyOf(ed)!.toHTML();
    const output = exportEmail(ed, meta, sample);
    const project = parseProject(JSON.stringify(output.project));
    expect(project.mode).toBe('html'); expect(project.htmlSource).toContain('Seu código.'); expect(output.mjml).toBe('');
    const restored = editor(); restored.loadProjectData(project.design);
    expect(bodyOf(restored)!.toHTML()).toBe(visual);
    expect(exportEmail(restored, meta, project.htmlSource).html).toContain('Seu código.');
    const visualProject = parseProject(JSON.stringify(snapshot(restored, meta, sample, 'visual')));
    expect(visualProject.mode).toBe('visual'); expect(visualProject.htmlSource).toContain('Seu código.');
    expect(exportEmail(restored, meta, sample, 'visual').mjml).toContain('<mjml');
  });
  it('rejeita HTML vazio, arquivos grandes e modos inválidos, aceitando rascunho vazio', () => {
    expect(() => sanitizeEmailDocument('')).toThrow();
    expect(() => sanitizeEmailDocument('a'.repeat(2_000_001))).toThrow(/2 MB/);
    const ed = editor(); const project = snapshot(ed, meta, '');
    expect(() => parseProject(JSON.stringify(project))).not.toThrow();
    expect(() => parseProject(JSON.stringify({ ...project, mode: 'unknown' }))).toThrow(/Modo/);
    expect(() => parseProject(JSON.stringify({ ...project, htmlSource: 7 }))).toThrow();
  });
  it('compila metadados com cifrão literalmente também no modo de blocos', () => {
    expect(exportEmail(editor(), meta).html).toContain('Oferta $&amp; &lt;cliente&gt; $1');
  });
});


describe('Imagens locais na prévia isolada', () => {
  it('prepara somente GIF local sem alterar o HTML exportado ou buscar imagens de terceiros', async () => {
    const src = countdownUrl(defaultCountdown());
    const html = `<html><body><img src="${src}"><img src="https://example.com/photo.jpg"></body></html>`;
    const request = vi.fn().mockResolvedValue({ ok: true, headers: new Headers({ 'content-type': 'image/gif' }), blob: async () => new Blob(['GIF89a'], { type: 'image/gif' }) });
    vi.stubGlobal('fetch', request);
    const result = await preparePreviewHtml(html, new AbortController().signal);
    expect(request).toHaveBeenCalledTimes(1); expect(request.mock.calls[0][0]).toBe(src);
    expect(result).toContain('data:image/gif;base64,'); expect(result).toContain('https://example.com/photo.jpg');
    expect(html).not.toContain('base64');
  });
  it('mostra falha em vez de tratar erro da API como imagem válida', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }));
    await expect(preparePreviewHtml(`<img src="${countdownUrl(defaultCountdown())}">`, new AbortController().signal)).rejects.toThrow(/cronômetro local/);
  });
});
