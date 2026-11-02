/** Integration example: implement these API routes in your existing SaaS. */
import { useEffect, useRef, useState } from 'react';
import { EmailEditor, parseProject, type EmailExport, type EmailProject } from '../src/editor';

export function SaasEmailEditor({ emailId, tenantId, countdownEndpoint }: { emailId: string; tenantId: string; countdownEndpoint: string }) {
  // A separate keyed loader prevents one document's state from leaking into another.
  return <EmailLoader key={`${tenantId}:${emailId}`} emailId={emailId} countdownEndpoint={countdownEndpoint} />;
}

function EmailLoader({ emailId, countdownEndpoint }: { emailId: string; countdownEndpoint: string }) {
  const [project, setProject] = useState<EmailProject>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const version = useRef(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/email-designs/${encodeURIComponent(emailId)}`, { signal: controller.signal, credentials: 'same-origin' });
        if (!response.ok) throw new Error('Não foi possível carregar o e-mail.');
        const data = await response.json();
        version.current = data.version;
        setProject(data.project ? parseProject(JSON.stringify(data.project)) : undefined);
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Falha ao abrir o e-mail.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [emailId]);

  async function save(result: EmailExport) {
    const response = await fetch(`/api/email-designs/${encodeURIComponent(emailId)}`, {
      method: 'PUT', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: result.project, html: result.html, mjml: result.mjml, expectedVersion: version.current }),
    });
    if (response.status === 409) throw new Error('Este e-mail mudou em outra aba. Baixe seu JSON antes de recarregar.');
    if (!response.ok) throw new Error('Falha ao salvar no servidor. Tente novamente.');
    const data = await response.json();
    version.current = data.version;
  }
  async function upload(file: File) {
    const body = new FormData(); body.append('file', file);
    const response = await fetch('/api/email-assets', { method: 'POST', body, credentials: 'same-origin' });
    if (!response.ok) throw new Error('Falha no upload da imagem.');
    const data = await response.json();
    return data.url as string;
  }
  if (loading) return <p role="status">Carregando e-mail…</p>;
  if (error) return <p role="alert">{error}</p>;
  return <EmailEditor initialProject={project} brandName="Meu SaaS" countdownEndpoint={countdownEndpoint} onSave={save} onUploadImage={upload} />;
}
