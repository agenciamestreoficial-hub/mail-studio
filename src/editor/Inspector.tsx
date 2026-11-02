import { CountdownSettings } from './CountdownSettings';
import { countdownAncestor, isCountdown } from './countdown';
import type { Component, Editor } from 'grapesjs';
import type { EmailEditorProps, MergeTag } from './types';
import { bodyOf, innerHtml, labels, sectionOf } from './engine';
import { escapeXml, safeUrl } from './security';
import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, Code2, ColorField, Copy, Field, IconButton, Image, Settings2, Trash2, Upload } from './ui';
import { useRef, useState } from 'react';

interface Props {
  editor?: Editor;
  selected?: Component;
  version: number;
  mergeTags: MergeTag[];
  onCode: () => void;
  onSectionCode: () => void;
  notify: (message: string) => void;
  onUploadImage?: EmailEditorProps['onUploadImage'];
}
export function Inspector({ editor, selected, version, mergeTags, onCode, onSectionCode, notify, onUploadImage }: Props) {
  const [tab, setTab] = useState<'block' | 'email'>('block');
  const [uploading, setUploading] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const active = tab === 'email' ? (editor && bodyOf(editor)) : countdownAncestor(selected) || selected;
  const timer = isCountdown(active);
  const type = active?.get('type') || '';
  const attrs = active?.getAttributes() || {};
  const isText = ['mj-text', 'mj-button'].includes(type);
  const isLayout = ['mj-section', 'mj-column', 'mj-body'].includes(type);
  const set = (key: string, value: string) => {
    if (!active) return;
    // GrapesJS MJML emits attributes into XML; encode quotes at this boundary.
    active.addAttributes({ [key]: value.replace(/"/g, '&quot;').replace(/</g, '&lt;') });
    if (key === 'src') active.set('src', value);
  };
  function changeUrl(key: string, value: string, image = false) {
    if (value && !safeUrl(value, image)) { notify(image ? 'Use uma URL pública HTTPS para a imagem.' : 'Use um link HTTP, HTTPS, mailto, tel ou uma variável.'); return; }
    set(key, value ? safeUrl(value, image) : '');
  }
  const number = (key: string, fallback = 0) => {
    const value = parseFloat(String(attrs[key] ?? ''));
    return Number.isFinite(value) ? value : fallback;
  };
  const smallNumber = (key: string, label: string, fallback: number, min = 0, max = 100) => <Field label={label}><div className="unit-field"><input type="number" min={min} max={max} aria-label={label} value={number(key, fallback)} onChange={e => set(key, `${Math.min(max, Math.max(min, Number(e.target.value)))}px`)} /><span>px</span></div></Field>;
  function move(direction: -1 | 1) {
    if (!active?.parent()) return;
    const parent = active.parent()!;
    const index = active.index();
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= parent.components().length) return;
    active.move(parent, { at: direction > 0 ? newIndex + 1 : newIndex });
    editor?.select(active);
  }
  async function upload(image: File) {
    if (!onUploadImage) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(image.type) || image.size > 5_000_000) { notify('Use uma imagem PNG, JPG, WEBP ou GIF de até 5 MB.'); return; }
    const target = active;
    setUploading(true);
    try {
      const url = await onUploadImage(image);
      if (!safeUrl(url, true)) throw new Error('O upload precisa retornar uma URL HTTPS pública.');
      const permanentUrl = safeUrl(url, true);
      target?.addAttributes({ src: permanentUrl }); target?.set('src', permanentUrl);
      notify('Imagem adicionada.');
    } catch (e) { notify(e instanceof Error ? e.message : 'Não foi possível enviar a imagem.'); }
    finally { setUploading(false); }
  }
  return <aside className="inspector">
    <div className="panel-heading"><div><span className="eyebrow">DEIXE COM A SUA CARA</span><h2>Personalizar</h2></div><Settings2 size={18}/></div>
    <div className="segmented inspector-tabs"><button className={tab === 'block' ? 'active' : ''} onClick={() => setTab('block')}>Bloco</button><button className={tab === 'email' ? 'active' : ''} onClick={() => setTab('email')}>E-mail</button></div>
    <div className="inspector-scroll">
    {!active ? <div className="empty-inspector"><MouseGraphic/><h3>Cada detalhe conta.</h3><p>Selecione um bloco no e-mail para personalizar cores, fontes e espaçamentos.</p><button className="text-button" onClick={() => setTab('email')}>Editar estilo do e-mail →</button></div> : <>
      <div className="selected-heading"><span className="type-dot"/><strong>{timer ? 'Cronômetro' : labels[type] || 'Bloco'}</strong>{type !== 'mj-body' && <span className="selection-tag">Selecionado</span>}</div>
      {type !== 'mj-body' && <div className="selection-actions"><IconButton label="Mover para cima" onClick={() => move(-1)} disabled={active.index() === 0}><ArrowUp size={16}/></IconButton><IconButton label="Mover para baixo" onClick={() => move(1)} disabled={active.index() >= (active.parent()?.components().length || 0) - 1}><ArrowDown size={16}/></IconButton><IconButton label="Duplicar bloco" onClick={() => { const copy = active.clone(); active.parent()?.append(copy, { at: active.index() + 1 }); editor?.select(copy); }}><Copy size={16}/></IconButton><span/><IconButton label="Excluir bloco" onClick={() => { active.remove(); editor?.select(undefined); notify('Bloco removido. Você pode desfazer.'); }}><Trash2 size={16}/></IconButton></div>}
      {type !== 'mj-body' && <div className="code-action"><button className="button button-full" onClick={onCode}><Code2 size={16}/>Editar HTML do bloco</button><p className="hint">Controle cada detalhe do código.</p>{selected && sectionOf(selected) && selected !== sectionOf(selected) && <button className="text-button" onClick={onSectionCode}><Code2 size={13}/> Ver HTML da seção inteira</button>}</div>}
      {timer && <CountdownSettings key={active.cid} component={active} version={version} notify={notify}/>}
      {type === 'mj-body' && <section className="property-section"><h3>Estrutura</h3><Field label="Largura do conteúdo"><select aria-label="Largura do conteúdo" value={attrs.width || '600px'} onChange={e => set('width', e.target.value)}><option value="500px">500 px · compacto</option><option value="600px">600 px · padrão</option><option value="680px">680 px · amplo</option><option value="800px">800 px · extra amplo</option></select></Field><ColorField label="Fundo do e-mail" value={attrs['background-color'] || '#f0eef5'} onChange={value => set('background-color', value)}/><p className="hint">O conteúdo se adapta à largura da tela no celular.</p></section>}
      {type === 'mj-image' && <section className="property-section"><h3>Imagem</h3><img className="image-thumb" src={attrs.src || active.get('src')} alt={attrs.alt || 'Imagem selecionada'}/><Field label="URL da imagem"><input key={`${active.cid}-src-${version}`} type="url" defaultValue={attrs.src || active.get('src')} placeholder="https://..." onBlur={e => changeUrl('src', e.target.value, true)}/></Field><Field label="Texto alternativo"><input value={attrs.alt || ''} onChange={e => set('alt', e.target.value)}/></Field><Field label="Link da imagem"><input key={`${active.cid}-href-${version}`} defaultValue={attrs.href || ''} placeholder="https://..." onBlur={e => changeUrl('href', e.target.value)}/></Field>{onUploadImage ? <><input ref={file} hidden type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={e => e.target.files?.[0] && upload(e.target.files[0])}/><button className="button button-full" onClick={() => file.current?.click()} disabled={uploading}><Upload size={15}/>{uploading ? 'Enviando…' : 'Enviar imagem'}</button></> : <p className="hint">Cole o endereço público da sua imagem. O upload pode ser conectado ao armazenamento do seu SaaS.</p>}</section>}
      {type === 'mj-button' && <section className="property-section"><h3>Conteúdo do botão</h3><Field label="Texto do botão"><input key={`${active.cid}-text`} defaultValue={active.getEl()?.textContent || 'Saiba mais'} onBlur={e => { active.set('content', ''); active.components(escapeXml(e.target.value)); }}/></Field><Field label="Link do botão"><input key={`${active.cid}-href-${version}`} defaultValue={attrs.href || ''} placeholder="https://..." onBlur={e => changeUrl('href', e.target.value)}/></Field></section>}
      {isText && <section className="property-section"><h3>Tipografia</h3><Field label="Fonte"><select value={attrs['font-family'] || 'Arial, Helvetica, sans-serif'} onChange={e => set('font-family', e.target.value)}><option value="Arial, Helvetica, sans-serif">Arial</option><option value="Georgia, serif">Georgia</option><option value="Verdana, sans-serif">Verdana</option><option value="Tahoma, sans-serif">Tahoma</option><option value="Trebuchet MS, sans-serif">Trebuchet MS</option><option value="Courier New, monospace">Courier New</option></select></Field><div className="field-row">{smallNumber('font-size', 'Tamanho', 16, 8, 96)}<Field label="Peso"><select value={attrs['font-weight'] || '400'} onChange={e => set('font-weight', e.target.value)}><option value="400">Normal</option><option value="600">Seminegrito</option><option value="700">Negrito</option></select></Field></div><Field label="Altura da linha"><input type="number" min="0.9" max="3" step="0.1" value={number('line-height', 1.6)} onChange={e => set('line-height', String(Math.min(3, Math.max(.9, Number(e.target.value)))))}/></Field><ColorField label="Cor do texto" value={attrs.color || '#302947'} onChange={value => set('color', value)}/></section>}
      {['mj-text', 'mj-button', 'mj-image'].includes(type) && <section className="property-section"><h3>Alinhamento</h3><div className="alignment">{([['left', AlignLeft, 'Esquerda'], ['center', AlignCenter, 'Centro'], ['right', AlignRight, 'Direita']] as const).map(([value, Icon, label]) => <IconButton key={value} label={label} active={(attrs.align || 'left') === value} onClick={() => set('align', value)}><Icon size={18}/></IconButton>)}</div></section>}
      {type !== 'mj-body' && type !== 'mj-raw' && <section className="property-section"><h3>Aparência</h3><ColorField label={type === 'mj-button' ? 'Cor do botão' : 'Cor de fundo'} value={attrs[isLayout || type === 'mj-button' ? 'background-color' : 'container-background-color'] || '#ffffff'} onChange={value => set(isLayout || type === 'mj-button' ? 'background-color' : 'container-background-color', value)}/>{['mj-button', 'mj-image'].includes(type) && smallNumber('border-radius', 'Arredondamento', 0, 0, 100)}{type === 'mj-divider' && <><ColorField label="Cor da linha" value={attrs['border-color'] || '#e8e7ef'} onChange={value => set('border-color', value)}/>{smallNumber('border-width', 'Espessura', 1, 1, 20)}</>}{type === 'mj-spacer' && smallNumber('height', 'Altura', 32, 0, 300)}</section>}
      {!['mj-body', 'mj-raw'].includes(type) && <section className="property-section"><h3>Espaçamento interno</h3><div className="padding-grid">{smallNumber('padding-top', 'Superior', 10)}{smallNumber('padding-right', 'Direita', 25)}{smallNumber('padding-bottom', 'Inferior', 10)}{smallNumber('padding-left', 'Esquerda', 25)}</div></section>}
      {isText && <section className="property-section"><h3>Personalização</h3><Field label="Adicionar variável"><select value="" onChange={e => { if (e.target.value) { active.components(innerHtml(active) + ' ' + escapeXml(e.target.value)); notify('Variável adicionada ao final do bloco.'); } }}><option value="">Escolha uma variável…</option>{mergeTags.map(tag => <option key={tag.value} value={tag.value}>{tag.label}</option>)}</select></Field><p className="hint">O seu sistema de envio substitui as variáveis pelos dados do contato.</p></section>}
      {selected && sectionOf(selected) && selected !== sectionOf(selected) && tab === 'block' && <button className="text-button select-section" onClick={() => editor?.select(sectionOf(selected))}>Selecionar seção inteira ↑</button>}
    </>}
    </div>
    <div className="inspector-bottom"><span className="green-dot"/>Sua marca. Seu conteúdo. Sem marca d’água.</div>
  </aside>;
}
function MouseGraphic() { return <div className="empty-graphic"><Image size={32}/><span>↖</span></div>; }
