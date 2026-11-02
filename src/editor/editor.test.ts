// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import type { Editor } from 'grapesjs';
import { applyBlockHtml, bodyOf, createEditor, exportEmail, snapshot } from './engine';
import { parseProject, safeUrl, sanitizeEmailHtml } from './security';
import { templates } from './templates';

const editors: Editor[] = [];
function openEditor() {
  const container = document.createElement('div');
  document.body.append(container);
  const editor = createEditor(container, false);
  editors.push(editor);
  return editor;
}
const meta = { name: 'Teste', subject: 'Olá <cliente> & equipe', preheader: 'Confira as novidades' };
afterEach(() => { editors.splice(0).forEach(editor => editor.destroy()); document.body.innerHTML = ''; });

describe('Fluxo editável → JSON → MJML → HTML', () => {
  it('gera e-mail responsivo com metadados, variáveis e sem marca do editor', () => {
    const editor = openEditor();
    const { html, mjml, warnings } = exportEmail(editor, meta);
    expect(html).toContain('Olá &lt;cliente&gt; &amp; equipe');
    expect(html).toContain('Confira as novidades');
    expect(html).toContain('[FNAME]');
    expect(html).toContain('[UNSUBSCRIBE_URL]');
    expect(html).toContain('@media');
    expect(html).toContain('mso');
    expect(html).not.toMatch(/grapesjs|Mail Studio|Powered by/i);
    expect(mjml).toContain('<mjml');
    expect(warnings).toHaveLength(1); // only the intentional example.com link
  });
  it('edita o HTML de um texto sem alterar blocos vizinhos e restaura do JSON', () => {
    const editor = openEditor();
    const body = bodyOf(editor)!;
    const heading = body.findType('mj-text')[2];
    const beforeFooter = body.components().last().toHTML();
    applyBlockHtml(heading, '<strong>Texto personalizado</strong><br/>Olá [FNAME]');
    const project = parseProject(JSON.stringify(snapshot(editor, meta)));
    const reopened = openEditor();
    reopened.loadProjectData(project.design);
    const output = exportEmail(reopened, project.metadata);
    expect(output.html).toContain('<strong>Texto personalizado</strong>');
    expect(bodyOf(reopened)!.components().last().toHTML()).toBe(beforeFooter);
    expect(bodyOf(reopened)!.findType('mj-text')).toHaveLength(body.findType('mj-text').length);
  });
  it('mantém estilos de bloco e o zero de espaçamento no HTML final', () => {
    const editor = openEditor();
    const heading = bodyOf(editor)!.findType('mj-text')[2];
    expect(heading.getAttributes()['padding-top']).toBe('0');
    heading.addAttributes({ color: '#123456', 'font-size': '27px', 'padding-top': '0px' });
    const output = exportEmail(editor, meta);
    expect(output.html).toContain('font-size:27px');
    expect(output.html).toContain('color:#123456');
    expect(output.warnings).toHaveLength(1);
  });
  it('converte uma seção em HTML personalizado preservando as demais seções', () => {
    const editor = openEditor();
    const body = bodyOf(editor)!;
    const count = body.components().length;
    const last = body.components().last().toHTML();
    const replacement = applyBlockHtml(body.components().at(1), '<table role="presentation" width="100%"><tr><td style="padding:24px;color:#302947">Meu bloco exclusivo</td></tr></table>');
    expect(replacement.get('type')).toBe('mj-raw');
    expect(body.components().length).toBe(count);
    expect(body.components().last().toHTML()).toBe(last);
    expect(exportEmail(editor, meta).html).toContain('Meu bloco exclusivo');
  });
  it.each(templates)('compila o modelo $name sem erro de estrutura MJML', template => {
    const editor = openEditor();
    editor.setComponents(template.mjml);
    const output = exportEmail(editor, { ...meta, subject: template.subject || 'Teste' });
    expect(output.html).toContain('<!doctype html>');
    expect(output.warnings.filter(w => !w.startsWith('Substitua') && !w.startsWith('Inclua'))).toEqual([]);
  });
});

describe('Limites para conteúdo importado', () => {
  it('remove scripts, eventos, iframes e links executáveis do HTML por bloco', () => {
    const clean = sanitizeEmailHtml('<p onclick="alert(1)">Olá <b>você</b></p><script>alert(1)</script><iframe src="https://evil.test"></iframe><a href="javascript:alert(1)">link</a>');
    expect(clean).toContain('<b>você</b>');
    expect(clean).not.toMatch(/script|onclick|iframe|javascript:/);
  });
  it('rejeita scripts em JSON e mantém a versão do schema', () => {
    const editor = openEditor();
    const project = snapshot(editor, meta);
    expect(() => parseProject(JSON.stringify({ ...project, schemaVersion: 9 }))).toThrow();
    const unsafe = structuredClone(project);
    unsafe.design.pages[0].frames[0].component.script = 'alert(1)';
    expect(() => parseProject(JSON.stringify(unsafe))).toThrow(/executável/);
    expect(() => parseProject(JSON.stringify(project))).not.toThrow();
  });
  it('aceita URLs de envio e macros, rejeita imagens temporárias e JavaScript', () => {
    expect(safeUrl('[UNSUBSCRIBE_URL]')).toBe('[UNSUBSCRIBE_URL]');
    expect(safeUrl('mailto:oi@example.com')).toBeTruthy();
    expect(safeUrl('javascript:alert(1)')).toBe('');
    expect(safeUrl('data:image/png;base64,AAAA', true)).toBe('');
    expect(safeUrl('blob:https://example.com/123', true)).toBe('');
    expect(safeUrl('https://example.com/photo.jpg', true)).toBeTruthy();
  });
  it('rejeita protocolos codificados e injeção em atributos MJML importados', () => {
    const editor = openEditor();
    bodyOf(editor)!.findType('mj-button')[0].addAttributes({ href: 'java&#x73;cript:alert(1)' });
    expect(() => parseProject(JSON.stringify(snapshot(editor, meta)))).toThrow(/URL/);
    bodyOf(editor)!.findType('mj-button')[0].addAttributes({ href: 'https://example.com', color: '#fff" invalid="x' });
    expect(() => parseProject(JSON.stringify(snapshot(editor, meta)))).toThrow(/atributo/);
  });
});
