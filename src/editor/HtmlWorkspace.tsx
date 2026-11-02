import { useEffect, useState } from 'react';
import { EmailFrame } from './EmailFrame';
import { compileHtmlDocument, MAX_HTML_SIZE } from './html-document';
import type { EmailMetadata } from './types';
import { Code2, Eye, Monitor, Smartphone, Upload } from './ui';
export function HtmlWorkspace({ source, metadata, onChange, onImport }: { source: string; metadata: EmailMetadata; onChange: (source: string) => void; onImport: () => void }) {
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      try { setPreview(compileHtmlDocument(source, metadata).html); setError(''); }
      catch (e) { setError(e instanceof Error ? e.message : 'HTML inválido.'); }
    }, 500);
    return () => clearTimeout(timer);
  }, [source, metadata]);
  return <div className="html-workspace">
    <div className="html-workspace-heading"><div><Code2 size={18}/><strong>HTML completo</strong><span>Código + prévia</span></div><button className="button" onClick={onImport}><Upload size={15}/>Importar .html</button></div>
    <div className="html-workspace-note">Edite tabelas, estilos e conteúdo. Scripts são removidos. Este documento continua editável por código.</div>
    <div className="html-workspace-grid"><div className="html-source-pane"><div className="code-editor-label"><span>HTML</span><span>{source.split('\n').length} linhas</span></div><textarea aria-label="Código HTML completo do e-mail" className="code-editor" spellCheck={false} maxLength={MAX_HTML_SIZE} value={source} onInput={e => onChange(e.currentTarget.value)}/></div><div className="html-preview-pane"><div className="html-preview-toolbar"><span><Eye size={14}/>Prévia</span><div className="segmented"><button aria-label="Prévia HTML desktop" className={!mobile ? 'active' : ''} onClick={() => setMobile(false)}><Monitor size={14}/></button><button aria-label="Prévia HTML celular" className={mobile ? 'active' : ''} onClick={() => setMobile(true)}><Smartphone size={14}/></button></div></div>{error ? <p role="alert" className="error-message">{error}</p> : <EmailFrame title="Prévia do HTML completo" html={preview} className={mobile ? 'html-live-preview mobile' : 'html-live-preview'}/>}</div></div>
  </div>;
}
