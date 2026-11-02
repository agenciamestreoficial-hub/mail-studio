import { useEffect, useRef, type ReactNode } from 'react';
import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, Check, ChevronRight, Code2, Columns2, Copy, Download, Eye, FileJson, GripVertical, Heading, Image, Images, LayoutTemplate, Link, ListTree, Mail, Minus, MousePointer2, PanelBottom, Plus, Redo2, Search, Settings2, Share2, Smartphone, Sparkles, Square, StretchVertical, Trash2, Type, Undo2, Upload, X, Monitor, HelpCircle, CheckCircle2, Loader2, ArrowUpRight, LayoutPanelTop } from 'lucide-react';
export const icons = { heading: Heading, text: Type, image: Image, button: MousePointer2, divider: Minus, spacer: StretchVertical, social: Share2, code: Code2, columns: Columns2, 'image-text': LayoutPanelTop, images: Images, card: LayoutTemplate, buttons: Square, footer: PanelBottom };
export { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, Check, ChevronRight, Code2, Copy, Download, Eye, FileJson, GripVertical, Image, Link, ListTree, Mail, Plus, Redo2, Search, Settings2, Smartphone, Sparkles, Trash2, Undo2, Upload, X, Monitor, HelpCircle, CheckCircle2, Loader2, ArrowUpRight, LayoutTemplate, Type };
export function IconButton({ label, children, active, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode; active?: boolean }) {
  return <button type="button" title={label} aria-label={label} className={`icon-button ${active ? 'active' : ''}`} {...props}>{children}</button>;
}
export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return <label className={`field ${className}`}><span>{label}</span>{children}</label>;
}
export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const color = /^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff';
  return <Field label={label}><div className="color-field"><input type="color" aria-label={label} value={color} onChange={e => onChange(e.target.value)} /><span>{value || 'Padrão'}</span></div></Field>;
}
export function Modal({ title, subtitle, children, footer, onClose, wide = false }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const nodes = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select,textarea,a[href],[tabindex="0"]') || []);
        if (!nodes.length) return;
        const first = nodes[0], last = nodes.at(-1)!;
        if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last.focus(); }
        if (!e.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); prev?.focus(); };
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
      <header className="modal-header"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><IconButton label="Fechar" onClick={onClose}><X size={20}/></IconButton></header>
      <div className="modal-body">{children}</div>{footer && <footer className="modal-footer">{footer}</footer>}
    </div>
  </div>;
}
