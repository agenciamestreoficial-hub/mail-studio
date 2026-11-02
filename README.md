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
npm run preview
```

## O que funciona

- 14 blocos: título, texto, imagem, botão, divisor, espaçador, redes sociais, HTML, duas colunas, imagem + texto, duas imagens, card, dois botões e rodapé.
- Arrastar e soltar, inserção por clique, reordenação, duplicação, exclusão, desfazer e refazer.
- Texto editável diretamente no e-mail, com negrito, itálico, sublinhado, tachado, listas, links, alinhamento, cor e marca-texto.
- Fontes, tamanho, peso, entrelinha, cores, bordas arredondadas, links e espaçamentos pelo painel.
- HTML **do bloco selecionado**, sem substituir o e-mail inteiro.
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

O botão Salvar na demonstração grava neste navegador. **Não equivale a salvar na nuvem.** Ao integrar `onSave`, ele aguarda o salvamento no seu backend e informa erros.

## Integrar ao seu SaaS pelo Replit

- [Guia do Replit e integração](docs/REPLIT.md)
- [Prompt pronto para o Replit Agent](docs/PROMPT_REPLIT.md)
- [Componente de integração de exemplo](examples/SaasEmailEditor.tsx)
- [Arquitetura, contrato e limitações](docs/ARCHITECTURE.md)
- [Verificações realizadas](docs/VERIFICATION.md)

A entrada reutilizável é `src/editor/index.ts`. Não é necessário copiar a página de demonstração, criar outro login ou trocar o banco do seu SaaS. Os endpoints do exemplo são um **contrato a implementar** no aplicativo existente.

## O que esta versão não inclui

Não há disparo de campanhas, SMTP, listas de contatos, autenticação, banco de dados ou armazenamento de imagens hospedado neste repositório. Esses serviços pertencem ao seu SaaS e são conectados pelos callbacks. Imagens são adicionadas por URL HTTPS; o controle de upload aparece ao fornecer `onUploadImage`.

IA de texto, biblioteca pessoal de blocos, importação de HTML arbitrário para componentes estruturados e contadores regressivos dinâmicos não estão implementados. HTML personalizado pode perder controles visuais e exige revisão da responsividade. A edição completa foi verificada em Chrome desktop; o modo celular é uma prévia e a interface também se adapta a telas menores.

MJML produz HTML com tabelas, estilos e condicionais de Outlook. Isso não substitui testes reais de envio em Gmail, Outlook e Apple Mail. O editor não foi submetido a uma matriz de clientes de e-mail. Substitua links `example.com`, a imagem de exemplo e os dados da empresa antes de enviar.

## Código e licenças

Código próprio sob [MIT](LICENSE). As dependências conservam suas licenças em [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Não há chave do Unlayer, serviço obrigatório de editor ou cobrança por remoção de marca.

O projeto tem `package-lock.json`; use `npm ci` para reproduzir a instalação. Não coloque senhas, tokens ou chaves SMTP no frontend. A demonstração carrega fontes do Google Fonts e uma imagem de exemplo do Unsplash; é possível substituí-las por recursos da sua marca.
