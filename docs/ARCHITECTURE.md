# Arquitetura e decisões

## Fluxo de dados

O React controla a interface e os metadados. GrapesJS Core controla os componentes, seleção e histórico. O plugin MJML renderiza o canvas e compila a estrutura em HTML para e-mail. `snapshot()` captura o projeto editável; `exportEmail()` inclui assunto e pré-cabeçalho na saída compilada.

| Arquivo | Responsabilidade |
| --- | --- |
| `src/editor/EmailEditor.tsx` | Shell, eventos, metadados, salvamento, importação, exportação e modais |
| `src/editor/engine.ts` | Adaptador GrapesJS/MJML e operações de bloco |
| `src/editor/Inspector.tsx` | Propriedades, estilos, imagens, botões e variáveis |
| `src/editor/templates.ts` | 17 blocos, quatro modelos e normalização de atributos MJML |
| `src/editor/security.ts` | Sanitização do HTML, URLs e validação do envelope JSON |
| `src/editor/CountdownSettings.tsx` / `countdown.ts` | Prazo, fuso, cores e seção MJML do cronômetro |
| `src/countdown/config.ts` | Validação de prazo/URL e conversão de fuso, compartilhadas com o servidor |
| `server/countdown-gif.ts` / `countdown-route.ts` | GIF e rota pública; sem dependências de canvas/fontes nativas |
| `server/index.ts` | Servidor de produção de arquivos dist e GIF, respeitando PORT |
| `src/editor/HtmlWorkspace.tsx` / `html-document.ts` | Edição e prévia do documento HTML completo |
| `src/editor/types.ts` | Contrato público do módulo |
| `src/editor/editor.test.ts` | Testes do fluxo de edição/serialização/compilação e validação |
| `examples/SaasEmailEditor.tsx` | Exemplo de consumo de API, sem backend de persistência incluído |

Não há Zustand/Redux, SDK comercial, serviço de editor, telemetria habilitada do GrapesJS, chave embutida ou servidor de envio.

## Persistência

O envelope tem `schemaVersion: 1`, `metadata`, `design` (ProjectData do GrapesJS) e `updatedAt`. Somente uma página/frame de e-mail é aceita na importação. O limite do JSON é 5 MB. `initialProject` é lido uma vez por montagem; remonte o componente para trocar de documento.

`storageKey` habilita persistência local e é usado somente na demonstração por padrão. `onChange` não garante persistência remota. `onSave` retorna uma Promise aguardada pelo botão. O host deve manter controle de versão/autorização. Mudanças de assunto e pré-cabeçalho não fazem parte do histórico de componentes do GrapesJS.

## HTML de cada bloco

- Em `mj-text` e `mj-button`, a edição altera apenas o HTML interno. Os atributos do bloco e o restante do documento são preservados.
- Uma imagem/divisor/espaçador convertido por código se torna conteúdo HTML em um `mj-text`.
- Uma seção/estrutura convertida se torna `mj-raw`. Isso preserva o HTML inserido, mas troca os controles estruturados pela edição de código. CSS responsivo de uma estrutura original pode não acompanhar a conversão; revise a prévia.
- A ação no nível de coluna seleciona sua seção, evitando uma estrutura MJML inválida.
- Scripts, formulários, iframes e elementos executáveis não são suportados. DOMPurify sanitiza HTML personalizado.

Não existe promessa de converter qualquer HTML externo de volta em blocos estruturados. Para continuar a edição fiel, guarde sempre o JSON do projeto.

## Compatibilidade e normalização

Os blocos da paleta são seções completas. Assim, podem ser inseridos diretamente em `mj-body` e conter uma ou mais colunas. Elementos internos também podem ser movidos pelos controles do GrapesJS.

`normalizeTemplate()` expande tags MJML autocontidas para pares explícitos (o parser HTML do GrapesJS não trata todas as tags MJML como void). Também expande o shorthand de padding para os quatro lados, evitando divergência entre os defaults do canvas e o HTML exportado. O adaptador resolve a exportação UMD do plugin para funcionar com Vite.

O editor usa fontes comuns nos e-mails. As fontes DM Sans/Manrope pertencem à interface, carregadas do Google Fonts; se quiser operação sem requisições a terceiros, remova o `@import` ou hospede as fontes mantendo suas licenças. A imagem inicial é apenas um exemplo de URL externa.

## Limites desta entrega

É uma primeira versão funcional do núcleo de edição, não uma cópia completa do MailingBoss. Não inclui gerenciamento de campanhas/listas, métricas, SMTP, IA, hospedagem de imagens, biblioteca de blocos por conta. O callback de upload permite conectar o storage existente sem acoplar o módulo a um provedor.

O histórico cobre operações de componente. A troca de projeto importado limpa o histórico anterior. O botão de prévia usa iframe sem permissões de execução; links ficam inativos ali. No canvas, a biblioteca permite selecionar e editar elementos.

O HTML é gerado localmente. Segurança multi-tenant, regras de negócio, validação de servidor, controle de acesso, armazenamento e testes reais de entregabilidade devem ser implementados pelo SaaS conforme o guia de integração. O tamanho do motor recomenda carregamento por rota sob demanda.


## HTML completo e compatibilidade de projetos

`schemaVersion: 1` foi mantido com campos opcionais aditivos: `mode?: 'visual' | 'html'` e `htmlSource?: string`. Projetos antigos sem `mode` abrem normalmente em blocos. `design` continua existindo e guarda o rascunho visual; o modo ativo é salvo. Ao voltar aos blocos e depois ao HTML, os dois rascunhos são mantidos separadamente. Editar código não reescreve os componentes visuais.

`exportEmail(editor, metadata, htmlSource, mode)` compila a fonte correspondente ao modo ativo. Para HTML completo, sanitiza o documento, mantém CSS e condicionais seguros de Outlook, insere assunto/pré-cabeçalho e retorna `mjml: ''`. Não há reconstrução arbitrária de HTML em MJML. O JSON exportado por `snapshot` pode conter o rascunho de código ainda não sanitizado; o host deve tratá-lo como entrada não confiável. Importação, prévia e compilação aplicam a sanitização.

A sanitização de documento usa DOMPurify e preserva comentários de Outlook por marcadores temporários. Fragmentos parciais de tabelas/VML em condicionais são filtrados por tags/atributos permitidos sem fechar suas tabelas. A prévia usa iframe com `sandbox=""`. Isso não dispensa validação equivalente no backend do SaaS.

## Cronômetro

A seção usa `css-class="ms-countdown"`, com `mj-image` e legenda de prazo independente da imagem. O URL guarda instante UTC, fuso e cores. Duplicar/reordenar/remover seleciona a seção como unidade. O endpoint calcula o tempo no momento da requisição e gera no máximo 61 quadros. Consulte `docs/COUNTDOWN.md` para limites de cache, animação e publicação.

A prévia resolve GIFs locais no contexto da página e prepara uma cópia com dados da imagem apenas para o iframe isolado. Essa cópia não é persistida no projeto nem devolvida como HTML de envio; URLs públicas continuam sendo usadas diretamente.
