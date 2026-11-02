# Mail Studio

Editor de e-mails visual, em português, com interface própria e sem marca d’água. Construído com **React + TypeScript + GrapesJS Core + MJML**. A biblioteca comercial GrapesJS Studio SDK não é utilizada.

## Rodar localmente

Requer Node.js **22.12 ou superior** (Node 24 também funciona).

```bash
npm ci
npm run dev
```

Abra o endereço indicado pelo Vite (normalmente `http://localhost:5173`).

```bash
npm test       # testes de integração do modelo/exportação e validação
npm run build # TypeScript + bundle de produção em dist/
npm run preview # prévia do build, com rota de GIF
npm start       # servidor de produção: dist/ + /api/countdown.gif
```

## O que funciona

- 17 blocos: título, texto, imagem, botão, divisor, espaçador, redes sociais, HTML, duas colunas, imagem + texto, duas imagens, card, dois botões, rodapé, cronômetro, cupom e benefícios.
- Arrastar e soltar, inserção por clique, reordenação, duplicação, exclusão, desfazer e refazer.
- Texto editável diretamente no e-mail, com negrito, itálico, sublinhado, tachado, listas, links, alinhamento, cor e marca-texto.
- Fontes, tamanho, peso, entrelinha, cores, bordas arredondadas, links e espaçamentos pelo painel.
- HTML **do bloco ou da seção selecionada**, com atalho `</>` em cada seção na aba Estrutura.
- Importação de arquivo `.html`/`.htm` ou código colado; modo HTML completo com edição e prévia lado a lado.
- Cronômetro com prazo fixo, fuso, cores, GIF animado e serviço Node incluído.
- Quatro modelos editáveis: boas-vindas, newsletter, oferta e tela em branco.
- Assunto, pré-cabeçalho, nome do projeto e variáveis de personalização.
- Canvas desktop/celular e prévia do **HTML realmente compilado**, em iframe isolado.
- Salvamento automático local, importação/exportação JSON e exportação HTML/MJML.
- Componente React com callbacks para persistência e upload no seu SaaS.

## Como usar

1. Arraste um bloco para o e-mail. Ou clique para inseri-lo depois da seção selecionada.
2. Dê dois cliques no texto para escrever e formatar. Clique em outros elementos para abrir suas propriedades.
3. Use **Editar HTML do bloco** para mudar o código. Em texto/botão, o conteúdo continua visualmente editável. Estruturas convertidas em HTML personalizado passam a ser editadas por código; **Desfazer** restaura o componente original.
4. Use **Prévia** para conferir o HTML em telas grandes e pequenas.
5. **Baixar projeto** salva um JSON que preserva a edição. **Exportar → HTML** gera o conteúdo para o seu provedor de envio. O HTML final não contém marca do Mail Studio nem dos motores utilizados.

### HTML de uma seção ou do e-mail inteiro

- **Estrutura → `</>` ao lado da seção** abre seu HTML; selecione um bloco para editar apenas seu conteúdo ou use **Ver HTML da seção inteira** no painel.
- **Importar HTML** aceita arquivo ou código colado, até 2 MB. O botão **HTML** da navegação abre o modo de código, com prévia desktop/celular.
- O modo de código preserva tabelas, CSS e comentários seguros de Outlook; scripts, formulários e iframes são removidos. O HTML importado continua editável por código. O rascunho em blocos fica guardado separadamente.
- Salvar, reabrir e exportar JSON funcionam nos dois modos. No modo de código, exporte HTML ou JSON; MJML é exclusivo do modo de blocos.

### Cronômetro

Adicione **Cronômetro**, escolha prazo, fuso e cores e clique em **Aplicar cronômetro**. A demo já gera o GIF localmente. Antes de usar em e-mails enviados, hospede a rota Node e configure `countdownEndpoint` ou `VITE_COUNTDOWN_ENDPOINT` com a URL pública HTTPS. O editor avisa quando a imagem ainda usa a rota local. Veja [o guia](docs/COUNTDOWN.md).

O botão Salvar na demonstração grava neste navegador. **Não equivale a salvar na nuvem.** Ao integrar `onSave`, ele aguarda o salvamento no seu backend e informa erros.

## Integrar ao seu SaaS pelo Replit

- [Cronômetro: serviço e integração](docs/COUNTDOWN.md)
- [Guia do Replit e integração](docs/REPLIT.md)
- [Prompt pronto para o Replit Agent](docs/PROMPT_REPLIT.md)
- [Componente de integração de exemplo](examples/SaasEmailEditor.tsx)
- [Arquitetura, contrato e limitações](docs/ARCHITECTURE.md)
- [Verificações realizadas](docs/VERIFICATION.md)

A entrada reutilizável é `src/editor/index.ts`. Não é necessário copiar a página de demonstração, criar outro login ou trocar o banco do seu SaaS. Os endpoints do exemplo são um **contrato a implementar** no aplicativo existente.

## O que esta versão não inclui

Não há disparo de campanhas, SMTP, listas de contatos, autenticação, banco de dados ou armazenamento de imagens hospedado neste repositório. Esses serviços pertencem ao seu SaaS e são conectados pelos callbacks. Imagens são adicionadas por URL HTTPS; o controle de upload aparece ao fornecer `onUploadImage`.

IA de texto, biblioteca pessoal de blocos, importação de HTML arbitrário para componentes estruturados não estão implementadas. No modo HTML completo, o JSON guarda `mode: "html"` e `htmlSource`; `mjml` fica vazio porque HTML arbitrário não é convertido para MJML. O rascunho visual anterior fica separado. HTML personalizado de um bloco pode perder controles visuais e exige revisão da responsividade. A edição completa foi verificada em Chrome desktop; o modo celular é uma prévia e a interface também se adapta a telas menores.

MJML produz HTML com tabelas, estilos e condicionais de Outlook. Isso não substitui testes reais de envio em Gmail, Outlook e Apple Mail. O editor não foi submetido a uma matriz de clientes de e-mail. Substitua links `example.com`, a imagem de exemplo e os dados da empresa antes de enviar.

## Código e licenças

Código próprio sob [MIT](LICENSE). As dependências conservam suas licenças em [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Não há chave do Unlayer, serviço obrigatório de editor ou cobrança por remoção de marca.

O projeto tem `package-lock.json`; use `npm ci` para reproduzir a instalação. Não coloque senhas, tokens ou chaves SMTP no frontend. A demonstração carrega fontes do Google Fonts e uma imagem de exemplo do Unsplash; é possível substituí-las por recursos da sua marca.
