import type { ProjectData } from 'grapesjs';

export type EmailMetadata = { name: string; subject: string; preheader: string };
export type EmailProject = {
  schemaVersion: 1;
  metadata: EmailMetadata;
  design: ProjectData;
  updatedAt: string;
  /** Absent means visual (backwards compatible with v0.1 projects). */
  mode?: 'visual' | 'html';
  /** Full HTML document in code mode; design retains the separate visual draft. */
  htmlSource?: string;
};
export type EmailExport = {
  project: EmailProject;
  html: string;
  mjml: string;
  warnings: string[];
};
export type MergeTag = { label: string; value: string };
export interface EmailEditorProps {
  /** Load once per mount. Change the React key to open a different document. */
  initialProject?: EmailProject;
  /** In a SaaS, scope to tenant/user/document or omit to disable local persistence. */
  storageKey?: string;
  brandName?: string;
  /** Public HTTPS route serving the included GIF service. Omit for local demo mode. */
  countdownEndpoint?: string;
  mergeTags?: MergeTag[];
  onChange?: (project: EmailProject) => void;
  onSave?: (result: EmailExport) => Promise<void> | void;
  /** Return a durable, public HTTPS image URL. No binary data is embedded in emails. */
  onUploadImage?: (file: File) => Promise<string>;
}

export const defaultMergeTags: MergeTag[] = [
  { label: 'Primeiro nome', value: '[FNAME]' },
  { label: 'E-mail', value: '[EMAIL]' },
  { label: 'Descadastrar', value: '[UNSUBSCRIBE_URL]' },
  { label: 'Versão no navegador', value: '[WEB_VERSION_URL]' },
  { label: 'Endereço da empresa', value: '[COMPANY_FULL_ADDRESS]' },
];
