import { COUNTDOWN_PATH } from '../countdown/config';
import { countdownAncestor, countdownBlock, countdownWarnings, isCountdown } from './countdown';
import grapesjs, { type Component, type Editor } from 'grapesjs';
import grapesJSMJMLImport from 'grapesjs-mjml';
import { blockDefinitions, normalizeTemplate, section, templates, wrapMjml } from './templates';
import { compileHtmlDocument, sanitizeEmailDocument } from './html-document';
import { escapeXml, safeUrl, sanitizeEmailHtml } from './security';
import type { EmailExport, EmailMetadata, EmailProject } from './types';

// The plugin's UMD build exposes a nested default under Vite's CJS interop.
const grapesJSMJML = typeof grapesJSMJMLImport === 'function' ? grapesJSMJMLImport
  : (grapesJSMJMLImport as unknown as { default: typeof grapesJSMJMLImport }).default;

export const labels: Record<string, string> = {
  'mj-text': 'Texto', 'mj-button': 'Botão', 'mj-image': 'Imagem', 'mj-section': 'Seção',
  'mj-column': 'Coluna', 'mj-body': 'E-mail', 'mj-divider': 'Divisor', 'mj-spacer': 'Espaçador',
  'mj-raw': 'HTML personalizado', 'mj-social': 'Redes sociais',
};

export function editableComponent(component?: Component): Component | undefined {
  if (!component) return;
  const timer = countdownAncestor(component);
  if (timer) return timer;
  if (labels[component.get('type') || '']) return component;
  return editableComponent(component.parent());
}
export function bodyOf(editor: Editor): Component | undefined { return editor.getWrapper()!.findType('mj-body')[0]; }
export function sectionOf(component?: Component): Component | undefined {
  if (!component) return;
  if (component.parent()?.get('type') === 'mj-body') return component;
  return sectionOf(component.parent());
}
export function innerHtml(component: Component) {
  return (component.get('content') || '') + component.components().map((c: Component) => c.toHTML()).join('');
}
const countdownEndpoints = new WeakMap<Editor, string>();
export function prepareBlock(editor: Editor, id: string) {
  if (id === 'countdown') editor.Blocks.get(id).set('content', normalizeTemplate(countdownBlock(countdownEndpoints.get(editor))));
}
export function componentLabel(component: Component) { return isCountdown(component) ? 'Cronômetro' : labels[component.get('type') || ''] || 'Conteúdo'; }
export function createEditor(container: HTMLElement, autorender = true, countdownEndpoint = COUNTDOWN_PATH): Editor {
  const editor = grapesjs.init({
    container, autorender, height: '100%', width: '100%', storageManager: false,
    noticeOnUnload: false, telemetry: false, fromElement: false,
    panels: { defaults: [] },
    blockManager: { custom: true },
    selectorManager: { custom: true },
    styleManager: { custom: true },
    traitManager: { custom: true },
    layerManager: { custom: true },
    deviceManager: { devices: [{ id: 'desktop', name: 'Desktop', width: '' }, { id: 'mobile', name: 'Celular', width: '375px', widthMedia: '480px' }] },
    parser: { optionsHtml: { allowScripts: false, allowUnsafeAttr: false, allowUnsafeAttrValue: false } },
    domComponents: { disableTextInnerChilds: true },
    richTextEditor: { actions: ['bold', 'italic', 'underline', 'strikethrough', 'link'] },
    canvas: { styles: [], scripts: [] },
    plugins: [ed => grapesJSMJML(ed, {
      blocks: [], resetBlocks: true, resetDevices: false, resetStyleManager: false,
      useCustomTheme: false, useXmlParser: false, columnsPadding: '0',
    })],
    components: templates[0].mjml,
  });
  // The plugin adds its own panels. The shell provides all controls instead.
  editor.Panels.getPanels().reset();
  blockDefinitions.forEach(block => editor.Blocks.add(block.id, { label: block.label, content: normalizeTemplate(block.content), category: block.category, select: true }));
  countdownEndpoints.set(editor, countdownEndpoint);
  prepareBlock(editor, 'countdown');
  const rte = editor.RichTextEditor;
  rte.remove('link');
  rte.add('link', {
    icon: '↗', attributes: { title: 'Inserir link', 'aria-label': 'Inserir link' },
    result: r => { const entered = window.prompt('Endereço do link (https://, mailto: ou variável)', 'https://'); if (entered && safeUrl(entered)) r.exec('createLink', safeUrl(entered)); },
  });
  const actions = [
    ['left', '≡', 'Alinhar à esquerda', 'justifyLeft'], ['center', '≡', 'Centralizar', 'justifyCenter'],
    ['right', '≡', 'Alinhar à direita', 'justifyRight'], ['bullets', '• ≡', 'Lista com marcadores', 'insertUnorderedList'],
    ['numbers', '1 ≡', 'Lista numerada', 'insertOrderedList'], ['clear', 'Tx', 'Limpar formatação', 'removeFormat'],
  ];
  actions.forEach(([name, icon, title, command]) => rte.add(name, { icon, attributes: { title, 'aria-label': title }, result: r => r.exec(command) }));
  rte.add('textColor', {
    icon: '<input type="color" value="#302947" aria-label="Cor do texto selecionado" title="Cor do texto selecionado" />',
    event: 'change', result: (r, action) => r.exec('foreColor', action.btn!.querySelector('input')!.value),
  });
  rte.add('highlight', {
    icon: '<input type="color" value="#eeebfa" aria-label="Marca-texto" title="Marca-texto" />',
    event: 'change', result: (r, action) => r.exec('hiliteColor', action.btn!.querySelector('input')!.value),
  });
  editor.on('canvas:frame:load', () => {
    const doc = editor.Canvas.getDocument();
    if (!doc) return;
    const style = doc.createElement('style');
    style.textContent = 'body{margin:0!important;} [contenteditable=true]{outline:0!important} a{cursor:text} ::selection{background:#d9d2ff}';
    doc.head.appendChild(style);
  });
  return editor;
}

export function snapshot(editor: Editor, metadata: EmailMetadata, htmlSource?: string, mode: 'visual' | 'html' = htmlSource === undefined ? 'visual' : 'html'): EmailProject {
  return { schemaVersion: 1, metadata: { ...metadata }, design: editor.getProjectData(), updatedAt: new Date().toISOString(), ...(htmlSource === undefined ? {} : { mode, htmlSource }) };
}
export function exportEmail(editor: Editor, metadata: EmailMetadata, htmlSource?: string, mode: 'visual' | 'html' = htmlSource === undefined ? 'visual' : 'html'): EmailExport {
  if (mode === 'html') {
    const source = sanitizeEmailDocument(htmlSource || '');
    const { html, warnings } = compileHtmlDocument(source, metadata);
    return { project: snapshot(editor, metadata, source), html, mjml: '', warnings };
  }
  let mjml: string = editor.runCommand('mjml-code');
  const head = `<mj-title>${escapeXml(metadata.subject)}</mj-title><mj-preview>${escapeXml(metadata.preheader)}</mj-preview>`;
  mjml = mjml.includes('<mj-head') ? mjml.replace(/(<mj-head[^>]*>)/, (_match: string, opening: string) => opening + head) : mjml.replace(/(<mjml[^>]*>)/, (_match: string, opening: string) => opening + '<mj-head>' + head + '</mj-head>');
  const result = editor.runCommand('mjml-code-to-html', { mjml, validationLevel: 'soft' });
  if (!result?.html) throw new Error('Não foi possível gerar o HTML. Revise a estrutura do e-mail.');
  const warnings: string[] = (result.errors || []).map((e: { message?: string; formattedMessage?: string }) => e.formattedMessage || e.message || 'Estrutura MJML inválida.');
  warnings.push(...countdownWarnings(bodyOf(editor)?.findType('mj-section') || []));
  if (!metadata.subject.trim()) warnings.push('Preencha o assunto antes de enviar.');
  if (result.html.includes('https://example.com')) warnings.push('Substitua os links de exemplo pelo endereço da sua marca.');
  if (!result.html.includes('[UNSUBSCRIBE_URL]')) warnings.push('Inclua o link de descadastro exigido pelo seu provedor de envio.');
  return { project: snapshot(editor, metadata, htmlSource, mode), html: result.html, mjml, warnings };
}
export function insertBlock(editor: Editor, id: string) {
  const block = blockDefinitions.find(b => b.id === id);
  const body = bodyOf(editor);
  if (!block || !body) return;
  const current = sectionOf(editor.getSelected());
  const index = current ? current.index() + 1 : body.components().length;
  prepareBlock(editor, id);
  const added = body.append(editor.Blocks.get(id).get('content') as string, { at: index });
  editor.select(added[0]);
  added[0].getEl()?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
export function codeTarget(component: Component): Component {
  if (['mj-column', 'mj-body'].includes(component.get('type') || '')) return sectionOf(component) || component;
  return component;
}
export function blockHtml(editor: Editor, component: Component): string {
  const type = component.get('type') || '';
  if (['mj-text', 'mj-button', 'mj-raw'].includes(type)) return innerHtml(component);
  let fragment = component.toHTML();
  if (!['mj-section', 'mj-wrapper', 'mj-hero'].includes(type)) fragment = section(fragment);
  const output = editor.runCommand('mjml-code-to-html', { mjml: wrapMjml(fragment) });
  const doc = new DOMParser().parseFromString(output.html, 'text/html');
  return sanitizeEmailHtml(doc.body.innerHTML).trim();
}
export function applyBlockHtml(component: Component, html: string): Component {
  const clean = sanitizeEmailHtml(html);
  if (!clean.trim()) throw new Error('O bloco precisa ter algum conteúdo HTML.');
  if (['mj-text', 'mj-button', 'mj-raw'].includes(component.get('type') || '')) {
    component.set('content', '');
    component.components(clean);
    return component;
  }
  const replacement = component.parent()?.get('type') === 'mj-body'
    ? `<mj-raw>${clean}</mj-raw>`
    : `<mj-text padding="0">${clean}</mj-text>`;
  return component.replaceWith(replacement)[0];
}
export function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
