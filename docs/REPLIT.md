# Replit: executar e integrar

## 1. Abrir a demonstração

No Replit, importe este repositório pelo fluxo **Import from GitHub**. Para um repositório privado, use a conexão GitHub com acesso a ele. Como alternativa, importe o ZIP do projeto.

No Shell:

```bash
npm ci
npm run dev
```

O arquivo `.replit` configura Node 22, porta 5173 e o comando Run. O Vite aceita os hosts de desenvolvimento do Replit e o host da demonstração interna. Se usar um domínio de desenvolvimento próprio, acrescente **apenas esse domínio** em `server.allowedHosts`, sem desativar a verificação de host.

Para publicar a demonstração com cronômetro, use build `npm ci && npm run build` e execução `npm start` em uma publicação com servidor (por exemplo, Autoscale). O `.replit` usa `deploymentTarget = "cloudrun"`, conforme o exemplo de configuração oficial. O servidor serve `dist` e a rota de GIF na mesma porta; configure `PORT` conforme o ambiente. Uma publicação somente estática não executa o serviço de cronômetro. Não foi realizada publicação no Replit nesta entrega. Para integrar ao SaaS existente, siga os próximos passos e preserve a configuração de publicação dele.

Referências oficiais consultadas: [Importação de projetos](https://docs.replit.com/pt/build/welcome), [configuração do projeto](https://docs.replit.com/pt/references/project-setup/configuration) e [publicação estática](https://docs.replit.com/pt/references/publishing/static-deployments).

## 2. Integrar em um SaaS React existente

1. Copie as pastas `src/editor` e `src/countdown` para o projeto existente. Não copie `main.tsx`, `demo.css`, `.replit`, `vite.config.ts` nem a configuração de publicação por cima do SaaS.
2. Adicione as dependências de produção em versões compatíveis com o lockfile: `grapesjs`, `grapesjs-mjml`, `dompurify`, `lucide-react`. Este projeto usa React 19; mantenha uma única instalação de React e valide compatibilidade caso o SaaS use outra versão.
3. Crie uma rota autenticada para a edição, por exemplo `/emails/:id/editor`.
4. Carregue o projeto do backend **antes** de montar `EmailEditor`. Use uma `key` que inclua a identidade do tenant e do documento. `initialProject` é lido apenas na montagem.
5. Conecte `onSave`, `onChange` opcional e `onUploadImage` ao backend já existente. Veja o exemplo em `examples/SaasEmailEditor.tsx`.
6. Mantenha os estilos do editor nessa rota. Os resets próprios estão limitados a `.mail-studio`; o GrapesJS usa classes `gjs-*`. Se o SaaS tiver CSS global muito agressivo, use uma rota dedicada ou iframe no mesmo domínio.

Uso mínimo:

```tsx
import { EmailEditor, type EmailExport } from './editor';

<EmailEditor
  key={`${tenantId}:${emailId}`}
  initialProject={loadedProject}
  brandName="Meu SaaS"
  countdownEndpoint="https://seu-dominio.com/api/countdown.gif"
  onSave={async (result: EmailExport) => {
    const response = await fetch(`/api/email-designs/${emailId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ project: result.project, html: result.html, mjml: result.mjml }),
    });
    if (!response.ok) throw new Error('Não foi possível salvar o e-mail.');
  }}
/>
```

No SaaS, omita `storageKey` se não quiser cache local. Se habilitar, use algo como `email-editor:${tenantId}:${userId}:${emailId}` e apague esse cache no logout. O armazenamento local não deve ser a fonte principal do documento.

`onChange(project)` recebe snapshots após 700 ms sem alterações. Não faz chamadas de rede por conta própria. Para autosave remoto, aplique debounce/serialização das requisições e controle de versão para evitar que uma resposta antiga sobrescreva conteúdo novo.

### Next.js e SSR

O editor depende do DOM. Use um componente cliente e carregamento sem SSR:

```tsx
'use client';
import dynamic from 'next/dynamic';
const EmailEditor = dynamic(
  () => import('./editor').then(m => m.EmailEditor),
  { ssr: false, loading: () => <p>Carregando editor…</p> },
);
```

Carregue a rota sob demanda: o motor MJML é relativamente grande. O build atual inclui cerca de 740 KB gzip de JavaScript do editor, além do runtime React; não o carregue em todas as páginas do SaaS.

### Cronômetro e código HTML

Para o cronômetro, adapte `createCountdownMiddleware()` de `server/countdown-route.ts` ao servidor Node do SaaS e instale `gifenc@1.0.3`. Importe também `server/countdown-gif.ts`, a declaração de tipos e `src/countdown/config.ts`. Mantenha a rota de imagem pública, sem login nem cookies, para os clientes de e-mail conseguirem carregá-la. Leia [COUNTDOWN.md](COUNTDOWN.md) para configuração e cache.

Passe a URL HTTPS pública na prop `countdownEndpoint`. Na demonstração standalone, defina `VITE_COUNTDOWN_ENDPOINT=https://seu-dominio.com/api/countdown.gif` **antes do build**. O valor não é segredo. Para documentos antigos com cronômetro local, selecione cada cronômetro → Serviço de imagem → URL pública → Aplicar.

Preserve os campos opcionais `mode` e `htmlSource` do envelope JSON. `mode: "html"` usa o documento de código; `design` é o rascunho visual separado. No modo HTML, a saída `mjml` é uma string vazia. Salve e envie `result.html` do modo ativo, sem recompilar `design` por cima do código importado. O modo de HTML aceita arquivos/código até 2 MB, com validação e sanitização também no servidor.

## 3. Contrato sugerido do backend

Estes endpoints **não estão implementados neste frontend**. Use o framework, autenticação, ORM e armazenamento já presentes no SaaS.

| Endpoint | Entrada | Saída |
| --- | --- | --- |
| `GET /api/email-designs/:id` | Sessão autenticada | `{ project: EmailProject \| null, version: number }` |
| `PUT /api/email-designs/:id` | `{ project, html, mjml, expectedVersion }` | `{ version: number }` |
| `POST /api/email-assets` | `multipart/form-data`, campo `file` | `{ url: "https://..." }` |

Para cada leitura/gravação, derive `tenant_id` e permissões da sessão do servidor. Consulte pelo par `id + tenant_id`; não confie em um tenant enviado pelo browser. Em conflito de versão, responda `409` sem sobrescrever o registro.

Registro sugerido no banco:

```text
id, tenant_id, name, subject, preheader,
design_json, compiled_html, mjml_source,
version, created_by, created_at, updated_at
```

`design_json` deve guardar o envelope completo `EmailProject`, incluindo `schemaVersion` e `metadata`. O HTML é uma saída derivada: ele não substitui o JSON editável. Ao mudar versões de GrapesJS/MJML, valide os projetos armazenados e adicione migrações antes de atualizar o schema.

Valide tamanho e formato no servidor. A validação do navegador serve à experiência do editor, não autoriza persistência nem envio. Se recompilar MJML no backend, use a mesma versão de MJML efetivamente resolvida pelo lockfile, rejeite `mj-include` e acesso a arquivos, e não aceite scripts. Nunca execute o conteúdo recebido.

## 4. Imagens

Forneça `onUploadImage(file): Promise<string>`. Ele deve chamar um endpoint autenticado que valide MIME, tamanho e conteúdo, grave em storage com prefixo por tenant e devolva uma URL HTTPS durável. URLs `blob:`, `data:` ou assinadas com expiração curta não servem para campanhas já enviadas.

PNG, JPEG, GIF e WEBP até 5 MB são aceitos pelo controle de frontend. O servidor deve validar novamente e pode impor limites menores. Para cobertura de clientes de e-mail, prefira PNG/JPEG/GIF. Não envie credenciais de storage ao navegador.

## 5. Variáveis e envio

Personalize `mergeTags` conforme o seu sistema. O editor deixa as variáveis literais:

```tsx
mergeTags={[
  { label: 'Primeiro nome', value: '[FNAME]' },
  { label: 'Cancelar inscrição', value: '[UNSUBSCRIBE_URL]' },
]}
```

Na etapa de envio do seu backend, substitua variáveis de texto com escape HTML e variáveis de URL com validação apropriada. Gere o link de descadastro por destinatário e inclua o endereço real da empresa. Não faça substituições ingênuas de dados arbitrários no HTML.

O editor não dispara e-mails. Conecte seu provedor atual em um fluxo separado de revisão, teste e envio. Não dispare campanhas automaticamente ao clicar em Salvar.

## 6. Aceite da integração

- Abrir documento salvo, editar texto/HTML e reabrir sem perda.
- Salvar um documento com duas colunas e conferir HTML exportado na prévia móvel.
- Upload retorna imagem persistente após recarregar e após logout/login.
- Erros de rede e conflitos `409` aparecem na interface e não exibem “salvo” indevidamente.
- Usuário de outro tenant recebe `404/403` e não acessa projeto ou upload.
- Assunto/pré-cabeçalho e variáveis corretos em um envio real de teste.
- Importar `.html`, editar código, conferir CSS/condicionais de Outlook, salvar e reabrir no modo HTML.
- Aplicar prazo/fuso/cores do cronômetro e validar a rota HTTPS após logout; testar prazo vencido e bloquear envio com URL local.
- Enviar amostras a Gmail, Outlook e Apple Mail antes de liberar produção.

Use também `npm test` e `npm run build`. Não reutilize chaves SMTP no frontend.
