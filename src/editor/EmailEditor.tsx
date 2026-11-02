import { useCallback, useEffect, useRef, useState } from 'react';
import type { Component, Editor } from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import './editor.css';
import { applyBlockHtml, blockHtml, bodyOf, codeTarget, createEditor, downloadFile, editableComponent, exportEmail, insertBlock, labels, snapshot } from './engine';
import { blockDefinitions, templates } from './templates';
import { parseProject } from './security';
import { defaultMergeTags, type EmailEditorProps, type EmailExport, type EmailMetadata, type EmailProject } from './types';
import { Inspector } from './Inspector';
import { Check, CheckCircle2, ChevronRight, Code2, Copy, Download, Eye, Field, FileJson, GripVertical, HelpCircle, IconButton, icons, LayoutTemplate, ListTree, Loader2, Mail, Modal, Monitor, Plus, Redo2, Search, Smartphone, Sparkles, Undo2, Upload } from './ui';

type Panel = 'blocks' | 'templates' | 'layers';
type Dialog = 'code' | 'export' | 'preview' | 'help' | 'template' | 'import' | null;
const defaultMetadata: EmailMetadata = { name: 'Boas-vindas · Aurora', subject: templates[0].subject, preheader: templates[0].preheader };

export function EmailEditor(props: EmailEditorProps) {
  const { brandName = 'Mail Studio', mergeTags = defaultMergeTags, storageKey, onUploadImage } = props;
  const canvas = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | undefined>(undefined);
  const callbacks = useRef(props);
  callbacks.current = props;
  const metadataRef = useRef(defaultMetadata);
  const [metadata, setMetadata] = useState(defaultMetadata);
  const [editor, setEditor] = useState<Editor>();
  const [selected, setSelected] = useState<Component>();
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);
  const [panel, setPanel] = useState<Panel>('blocks');
  const [query, setQuery] = useState('');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [status, setStatus] = useState('Tudo salvo neste navegador');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [code, setCode] = useState('');
  const codeComponent = useRef<Component | undefined>(undefined);
  const [codeError, setCodeError] = useState('');
  const [exported, setExported] = useState<EmailExport>();
  const [exportTab, setExportTab] = useState<'html' | 'mjml' | 'json'>('html');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [pendingTemplate, setPendingTemplate] = useState(0);
  const [pendingImport, setPendingImport] = useState<EmailProject>();
  const importInput = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const notify = useCallback((message: string) => {
    setToast(message); clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 5000);
  }, []);
  const closeDialog = useCallback(() => { setDialog(null); setCodeError(''); }, []);

  const persist = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const project = snapshot(ed, metadataRef.current);
    try {
      if (callbacks.current.storageKey) {
        localStorage.setItem(callbacks.current.storageKey, JSON.stringify(project));
        setStatus('Tudo salvo neste navegador');
      } else setStatus('Alterações no editor');
    } catch { setStatus('Não salvo · baixe o projeto JSON'); }
    try { callbacks.current.onChange?.(project); } catch { notify('Falha ao comunicar as alterações ao aplicativo.'); }
  }, [notify]);

  useEffect(() => {
    if (!canvas.current) return;
    const ed = createEditor(canvas.current);
    editorRef.current = ed;
    setEditor(ed);
    let startingProject = callbacks.current.initialProject;
    if (!startingProject && callbacks.current.storageKey) {
      try {
        const stored = localStorage.getItem(callbacks.current.storageKey);
        if (stored) startingProject = parseProject(stored);
      } catch { notify('Não foi possível restaurar o rascunho. O modelo inicial está aberto.'); }
    }
    if (startingProject) {
      try {
        const safe = parseProject(JSON.stringify(startingProject));
        ed.loadProjectData(safe.design);
        metadataRef.current = safe.metadata; setMetadata(safe.metadata);
      } catch { notify('O projeto recebido não é válido. O modelo inicial está aberto.'); }
    }
    ed.on('load', () => {
      setReady(true);
      ed.select(bodyOf(ed)?.findType('mj-text')[2]);
      setVersion(v => v + 1);
      ed.UndoManager.clear();
    });
    const select = (component?: Component) => setSelected(editableComponent(component));
    ed.on('component:selected', select);
    ed.on('component:deselected', () => select(ed.getSelected()));
    ed.on('undo redo', () => {
      // A replaced component may no longer belong to the restored document.
      ed.select(undefined);
      setSelected(undefined);
      setVersion(v => v + 1);
    });
    ed.on('update', () => {
      setVersion(v => v + 1);
      setStatus('Salvando alterações…');
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(persist, 700);
    });
    return () => {
      clearTimeout(saveTimer.current); clearTimeout(toastTimer.current);
      ed.destroy(); editorRef.current = undefined;
    };
  }, [notify, persist]);

  function updateMetadata(patch: Partial<EmailMetadata>) {
    const next = { ...metadataRef.current, ...patch };
    metadataRef.current = next; setMetadata(next);
    setStatus('Salvando alterações…');
    clearTimeout(saveTimer.current); saveTimer.current = setTimeout(persist, 700);
  }
  async function save() {
    if (!editor) return;
    setSaving(true); clearTimeout(saveTimer.current); persist();
    try {
      if (callbacks.current.onSave) {
        await callbacks.current.onSave(exportEmail(editor, metadataRef.current));
        setStatus('Salvo no seu aplicativo'); notify('E-mail salvo no seu aplicativo.');
      } else if (storageKey) notify('Projeto salvo neste navegador. Exporte o JSON para levar com você.');
      else {
        downloadFile('email-projeto.json', JSON.stringify(snapshot(editor, metadataRef.current), null, 2), 'application/json');
        notify('Projeto JSON baixado.');
      }
    } catch (e) { setStatus('Falha ao salvar no aplicativo'); notify(e instanceof Error ? e.message : 'Falha ao salvar.'); }
    finally { setSaving(false); }
  }
  useEffect(() => {
    const beforeUnload = () => { clearTimeout(saveTimer.current); persist(); };
    window.addEventListener('pagehide', beforeUnload);
    return () => window.removeEventListener('pagehide', beforeUnload);
  }, [persist]);

  function openExport(mode: 'export' | 'preview') {
    if (!editor) return;
    try { setExported(exportEmail(editor, metadataRef.current)); setDialog(mode); }
    catch (e) { notify(e instanceof Error ? e.message : 'Falha ao gerar o e-mail.'); }
  }
  function editCode() {
    if (!editor || !selected) return;
    const target = codeTarget(selected);
    if (target.get('type') === 'mj-body') return;
    try { codeComponent.current = target; setCode(blockHtml(editor, target)); setDialog('code'); }
    catch { notify('Não foi possível abrir o HTML deste bloco.'); }
  }
  function applyCode() {
    if (!editor || !codeComponent.current) return;
    try {
      const replacement = applyBlockHtml(codeComponent.current, code);
      editor.select(replacement); setSelected(replacement); closeDialog(); notify('HTML aplicado ao bloco.');
    } catch (e) { setCodeError(e instanceof Error ? e.message : 'Revise o HTML.'); }
  }
  function applyTemplate() {
    if (!editor) return;
    const template = templates[pendingTemplate];
    editor.setComponents(template.mjml);
    updateMetadata({ name: template.name, subject: template.subject, preheader: template.preheader });
    editor.select(undefined); setSelected(undefined); closeDialog(); setPanel('blocks'); notify('Modelo carregado. Agora ele é seu.');
  }
  async function importProject(file: File) {
    try { setPendingImport(parseProject(await file.text())); setDialog('import'); }
    catch (e) { notify(e instanceof Error ? e.message : 'Arquivo inválido.'); }
    if (importInput.current) importInput.current.value = '';
  }
  function loadImport() {
    if (!editor || !pendingImport) return;
    editor.loadProjectData(pendingImport.design); updateMetadata(pendingImport.metadata);
    editor.UndoManager.clear(); editor.select(undefined); setSelected(undefined); closeDialog(); notify('Projeto importado com sucesso.');
  }
  function changeDevice(value: 'desktop' | 'mobile') { setDevice(value); editor?.setDevice(value); }
  const filteredBlocks = blockDefinitions.filter(block => block.label.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
  const exportedCode = exported ? exportTab === 'html' ? exported.html : exportTab === 'mjml' ? exported.mjml : JSON.stringify(exported.project, null, 2) : '';
  function downloadExport() {
    downloadFile(`email.${exportTab === 'json' ? 'json' : exportTab}`, exportedCode, exportTab === 'json' ? 'application/json' : 'text/plain;charset=utf-8');
    notify('Arquivo exportado.');
  }
  function projectDownload() {
    if (editor) downloadFile('email-projeto.json', JSON.stringify(snapshot(editor, metadataRef.current), null, 2), 'application/json');
  }

  return <div className="mail-studio">
    <header className="app-header">
      <div className="brand"><div className="brand-mark"><Mail size={22}/><i/></div><span>{brandName}</span><span className="beta">BETA</span></div>
      <div className="document-heading"><span className="document-type">MEUS E-MAILS</span><ChevronRight size={14}/><input aria-label="Nome do e-mail" value={metadata.name} maxLength={120} onChange={e => updateMetadata({ name: e.target.value })}/></div>
      <div className="header-actions"><span className="save-status"><span className="green-dot"/>{status}</span><button className="button" onClick={() => openExport('preview')} disabled={!ready}><Eye size={16}/><span>Prévia</span></button><button className="button primary" onClick={save} disabled={!ready || saving}>{saving ? <Loader2 size={16} className="spin"/> : <Check size={16}/>}Salvar e-mail</button></div>
    </header>
    <div className="message-meta"><div className="message-label"><Mail size={16}/><span>Sua mensagem</span></div><Field label="Assunto"><input aria-label="Assunto do e-mail" maxLength={250} value={metadata.subject} onChange={e => updateMetadata({ subject: e.target.value })} placeholder="Um assunto que dá vontade de abrir"/></Field><div className="meta-divider"/><Field label="Pré-cabeçalho"><input aria-label="Pré-cabeçalho" maxLength={250} value={metadata.preheader} onChange={e => updateMetadata({ preheader: e.target.value })} placeholder="O texto que aparece depois do assunto"/></Field><span className="draft-badge">Rascunho</span></div>
    <main className="workspace">
      <nav className="nav-rail" aria-label="Ferramentas do editor">
        <button className={panel === 'blocks' ? 'rail-button active' : 'rail-button'} onClick={() => setPanel('blocks')} title="Blocos"><Plus size={21}/><span>Blocos</span></button>
        <button className={panel === 'templates' ? 'rail-button active' : 'rail-button'} onClick={() => setPanel('templates')} title="Modelos"><LayoutTemplate size={20}/><span>Modelos</span></button>
        <button className={panel === 'layers' ? 'rail-button active' : 'rail-button'} onClick={() => setPanel('layers')} title="Estrutura"><ListTree size={20}/><span>Estrutura</span></button>
        <div className="rail-spacer"/>
        <button className="rail-button" onClick={() => setDialog('help')} title="Como usar"><HelpCircle size={20}/><span>Ajuda</span></button><div className="avatar" title="Seu espaço de criação">MS</div>
      </nav>
      <aside className="library-panel">
        {panel === 'blocks' && <><div className="panel-heading"><div><span className="eyebrow">SUA PRÓXIMA BOA IDEIA</span><h2>Comece com um bloco</h2></div></div><p className="panel-description">Arraste para o e-mail ou clique para adicionar.</p><div className="search-field"><Search size={16}/><input aria-label="Buscar blocos" placeholder="Buscar blocos…" value={query} onChange={e => setQuery(e.target.value)}/><span>⌕</span></div><div className="block-scroll">{(['Conteúdo', 'Layouts'] as const).map(category => <section key={category} className="block-category"><div className="category-label"><h3>{category}</h3><span>{filteredBlocks.filter(b => b.category === category).length}</span></div><div className="block-grid">{filteredBlocks.filter(b => b.category === category).map(block => { const Icon = icons[block.icon as keyof typeof icons]; return <button key={block.id} className="block-card" draggable={false} onPointerDown={e => { if (e.button !== 0 || !editor) return; editor.refresh(); editor.BlockManager.startDrag(editor.Blocks.get(block.id), e.nativeEvent); window.addEventListener('pointerup', () => editor.BlockManager.endDrag(), { once: true }); }} onClick={() => editor && insertBlock(editor, block.id)} disabled={!ready} aria-label={`Adicionar ${block.label}`}><Icon size={25} strokeWidth={1.4}/><span>{block.label}</span><GripVertical className="block-grip" size={13}/></button>; })}</div></section>)}{!filteredBlocks.length && <p className="hint">Nenhum bloco encontrado.</p>}</div><div className="palette-tip"><div className="tip-icon"><Sparkles size={17}/></div><div><strong>Feito para ser seu.</strong><p>Combine blocos e crie um e-mail com a personalidade da sua marca.</p></div></div></>}
        {panel === 'templates' && <><div className="panel-heading"><div><span className="eyebrow">UM PONTO DE PARTIDA</span><h2>Modelos para inspirar</h2></div></div><p className="panel-description">Escolha, personalize e deixe com a sua cara.</p><div className="template-list">{templates.map((template, index) => <button className="template-card" key={template.id} onClick={() => { setPendingTemplate(index); setDialog('template'); }}><div className="template-art" style={{ background: template.color }}><div className="mini-email"><span/><b/>{index !== 3 && <i/>}<em/><em/><small/></div><span className="template-use">Usar modelo →</span></div><div><strong>{template.name}</strong><span>{template.category}</span></div></button>)}</div></>}
        {panel === 'layers' && <><div className="panel-heading"><div><span className="eyebrow">TUDO NO SEU LUGAR</span><h2>Estrutura do e-mail</h2></div></div><p className="panel-description">Selecione um elemento. Use as setas à direita para reorganizar.</p><div className="layers-list">{editor && bodyOf(editor)?.components().map((section: Component, i: number) => <div className="layer-group" key={section.cid}><button className={selected === section ? 'layer selected' : 'layer'} onClick={() => editor.select(section)}><LayoutTemplate size={15}/><strong>{section.get('type') === 'mj-raw' ? 'HTML' : 'Seção'} {i + 1}</strong><span>{section.components().length}</span></button>{section.findType('mj-column').flatMap((col: Component) => col.components().map((child: Component) => <button key={child.cid} className={selected === child ? 'layer child selected' : 'layer child'} onClick={() => { editor.select(child); child.getEl()?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }}><span className="layer-line"/>{labels[child.get('type') || ''] || 'Conteúdo'}<small>{(child.getEl()?.textContent || '').trim().slice(0, 21)}</small></button>))}</div>)}</div></>}
        <div className="library-footer"><button onClick={() => importInput.current?.click()}><Upload size={14}/>Importar JSON</button><button onClick={projectDownload} disabled={!ready}><FileJson size={14}/>Baixar projeto</button><input ref={importInput} hidden type="file" accept="application/json,.json" onChange={e => e.target.files?.[0] && importProject(e.target.files[0])}/></div>
      </aside>
      <section className="editor-area" aria-label="Área de edição">
        <div className="canvas-toolbar"><div className="history-buttons"><IconButton label="Desfazer" disabled={!editor?.UndoManager.hasUndo()} onClick={() => editor?.UndoManager.undo()}><Undo2 size={17}/></IconButton><IconButton label="Refazer" disabled={!editor?.UndoManager.hasRedo()} onClick={() => editor?.UndoManager.redo()}><Redo2 size={17}/></IconButton><span className="toolbar-line"/><span className="canvas-label">EDITOR VISUAL</span></div><div className="segmented device-switch"><button title="Desktop" aria-label="Visualização desktop" className={device === 'desktop' ? 'active' : ''} onClick={() => changeDevice('desktop')}><Monitor size={16}/><span>Desktop</span></button><button title="Celular" aria-label="Visualização celular" className={device === 'mobile' ? 'active' : ''} onClick={() => changeDevice('mobile')}><Smartphone size={16}/><span>Celular</span></button></div><button className="export-button" onClick={() => openExport('export')} disabled={!ready}><Code2 size={16}/><span>Exportar</span><ChevronRight size={14}/></button></div>
        <div className="canvas-container"><div className="canvas-topline"><span>{device === 'desktop' ? 'SEU E-MAIL, DO SEU JEITO' : 'PRÉVIA EM TELA PEQUENA'}</span><span>{device === 'desktop' ? 'Responsivo' : '375 px'} <CheckCircle2 size={12}/></span></div><div ref={canvas} className="grapes-canvas"/>{!ready && <div className="loading-editor"><Loader2 className="spin" size={27}/><h3>Preparando seu espaço de criação…</h3></div>}</div>
        <footer className="canvas-footer"><span><span className="keyboard-key">↖</span> Dois cliques no texto para editar</span><span>HTML responsivo <span className="footer-dot">·</span> 100% seu</span></footer>
      </section>
      <Inspector editor={editor} selected={selected} version={version} mergeTags={mergeTags} onCode={editCode} notify={notify} onUploadImage={onUploadImage}/>
    </main>
    {toast && <div className="toast" role="status"><CheckCircle2 size={18}/>{toast}</div>}
    {dialog === 'code' && <Modal title="HTML do bloco" subtitle="Edite o código e aplique apenas neste bloco." wide onClose={closeDialog} footer={<><span className="modal-footnote">Scripts e elementos executáveis são removidos.</span><button className="button" onClick={closeDialog}>Cancelar</button><button className="button primary" onClick={applyCode}>Aplicar HTML</button></>}>
      {codeComponent.current && !['mj-text', 'mj-button', 'mj-raw'].includes(codeComponent.current.get('type') || '') && <div className="notice">Este elemento será convertido em HTML personalizado. Seus controles de estrutura serão substituídos pela edição de código; os outros blocos continuam editáveis. Use Desfazer para restaurar.</div>}<div className="code-editor-label"><span><span className="code-dot"/>HTML</span><span>{code.split('\n').length} linhas</span></div><textarea className="code-editor" aria-label="Código HTML do bloco" spellCheck={false} value={code} onChange={e => setCode(e.target.value)}/>{codeError && <p className="error-message" role="alert">{codeError}</p>}
    </Modal>}
    {dialog === 'export' && exported && <Modal title="Seu e-mail, pronto para levar" subtitle="O HTML é para enviar. O JSON preserva o projeto para continuar editando." wide onClose={closeDialog} footer={<><span className="modal-footnote">{(new Blob([exported.html]).size / 1024).toFixed(1)} KB de HTML · sem marca d’água</span><button className="button" onClick={async () => { try { await navigator.clipboard.writeText(exportedCode); notify('Código copiado.'); } catch { notify('Use o botão Baixar arquivo para exportar.'); } }}><Copy size={15}/>Copiar</button><button className="button primary" onClick={downloadExport}><Download size={15}/>Baixar arquivo</button></>}><div className="export-tabs">{(['html', 'mjml', 'json'] as const).map(type => <button key={type} className={type === exportTab ? 'active' : ''} onClick={() => setExportTab(type)}>{type === 'json' ? 'Projeto JSON' : type.toUpperCase()}</button>)}</div>{exported.warnings.length > 0 && <details className="export-warnings"><summary>{exported.warnings.length} pontos para revisar antes de enviar</summary><ul>{exported.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul></details>}<textarea className="code-editor export-code" aria-label="Código exportado" value={exportedCode} readOnly spellCheck={false}/></Modal>}
    {dialog === 'preview' && exported && <Modal title="Veja como ficou" subtitle={metadata.subject || 'Seu e-mail'} wide onClose={closeDialog} footer={<><span className="modal-footnote">As variáveis serão preenchidas pelo seu sistema de envio.</span><button className="button primary" onClick={closeDialog}>Continuar editando</button></>}><div className="preview-controls segmented"><button className={previewDevice === 'desktop' ? 'active' : ''} onClick={() => setPreviewDevice('desktop')}><Monitor size={16}/>Desktop</button><button className={previewDevice === 'mobile' ? 'active' : ''} onClick={() => setPreviewDevice('mobile')}><Smartphone size={16}/>Celular</button></div><div className="preview-surface"><iframe title="Prévia do e-mail exportado" sandbox="" srcDoc={exported.html} className={previewDevice === 'mobile' ? 'preview-frame mobile' : 'preview-frame'}/></div></Modal>}
    {dialog === 'template' && <Modal title={`Usar “${templates[pendingTemplate].name}”?`} subtitle="O modelo substituirá o e-mail aberto." onClose={closeDialog} footer={<><button className="button" onClick={projectDownload}><Download size={15}/>Baixar projeto atual</button><button className="button primary" onClick={applyTemplate}>Usar modelo</button></>}><p>Você pode baixar uma cópia do projeto atual antes de começar o novo modelo.</p></Modal>}
    {dialog === 'import' && <Modal title="Abrir projeto importado?" subtitle={pendingImport?.metadata.name} onClose={closeDialog} footer={<><button className="button" onClick={projectDownload}><Download size={15}/>Baixar projeto atual</button><button className="button primary" onClick={loadImport}>Abrir projeto</button></>}><p>O projeto importado substituirá o e-mail aberto. Salve uma cópia antes de continuar.</p></Modal>}
    {dialog === 'help' && <Modal title="Um espaço para suas boas ideias" subtitle="Conheça o seu editor em um minuto." onClose={closeDialog} footer={<button className="button primary" onClick={closeDialog}>Vamos criar</button>}><div className="help-list"><div><span>01</span><section><h3>Monte com blocos</h3><p>Arraste um bloco para a posição desejada, ou clique para inserir depois da seção selecionada. Reorganize pela alça do bloco ou pelas setas do painel.</p></section></div><div><span>02</span><section><h3>Edite do seu jeito</h3><p>Dê dois cliques no texto para escrever e formatar. Use o painel para fontes, cores, links e espaçamentos. “Editar HTML do bloco” abre o código.</p></section></div><div><span>03</span><section><h3>Leve com você</h3><p>Baixe o JSON para reabrir o projeto e exporte o HTML para o seu serviço de envio. A prévia mostra o HTML compilado em desktop e celular.</p></section></div></div><div className="notice">Esta demonstração salva neste navegador. Para o SaaS, conecte o salvamento e o upload de imagens pelos callbacks descritos na documentação. Faça um envio de teste no seu provedor antes de usar em campanhas reais.</div></Modal>}
  </div>;
}
