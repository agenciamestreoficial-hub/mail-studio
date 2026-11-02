# Verificação da versão 0.2.0

Verificada em Node 24 e Chrome no navegador interno. O fluxo testado é: inserir/editar bloco ou importar HTML → preservar projeto JSON → compilar/gerar imagem → renderizar a prévia → salvar/reabrir. Publicação no Replit, backend multi-tenant e envios reais não fazem parte destes resultados.

## Automatizado

**52 testes** em quatro arquivos, incluindo:

- Os 12 testes da versão anterior: metadados, responsividade, estilos/padding zero, HTML por bloco, JSON, quatro modelos e validação de conteúdo.
- Inserção e compilação de cada um dos **17 blocos**, sem erro estrutural MJML.
- Cronômetro: configuração preservada no JSON, cores, legenda, duplicação independente, exclusão e avisos de prazo vencido/URL local.
- Prazo absoluto: conversão Brasília/UTC e fuso de meia hora, mudança de dia, horários inexistentes/ambíguos de verão, zero no vencimento e ausência de reinício.
- GIF: cabeçalho/dimensões, até 61 quadros, atraso de um segundo, ausência de loop, quadro final de prazo e resposta estática após vencer.
- Rota: Content-Type, no-store, HEAD, validação de parâmetros/métodos, cache por segundo e limite de renderização.
- HTML completo: CSS responsivo, tabelas e comentários parciais de Outlook; VML seguro; remoção de scripts/eventos inclusive nos condicionais.
- Metadados com cifrão literal, pré-cabeçalho sem duplicação, limite de HTML e restauração do modo pelo JSON.
- Preparação de GIF local para iframe isolado, sem incorporar a imagem na exportação nem buscar imagens externas pelo código de prévia.

`npm run build`: TypeScript e bundle de produção passam, incluindo servidor e exemplo SaaS. O editor é carregado sob demanda; o Vite mantém o aviso de tamanho do motor MJML. Aproximadamente 679 KB gzip para o módulo do editor e 70 KB gzip para a aplicação/runtime React.

O gerador de GIF também foi executado diretamente no Node com `--experimental-strip-types`, fora do transformador do Vite/Vitest.

## Navegador: v0.2.0

| Ação | Resultado observado |
| --- | --- |
| Arrastar Cronômetro da paleta | Seção inserida entre chamada e imagem |
| Alterar data, fuso e cor | URL/legenda e controles atualizados; prazo convertido para UTC |
| Escolher data passada | GIF exibiu PRAZO ENCERRADO com a data configurada |
| Restaurar prazo futuro | GIF voltou à contagem; prazo fixo salvo |
| Abrir exportação | Aviso explícito de endpoint local e links de exemplo |
| Prévia móvel do cronômetro | GIF 600×184 carregado e reduzido para a largura do conteúdo |
| Estrutura → HTML da seção 2 | Editor abriu o código da seção inteira |
| Aplicar HTML à seção | Tabela personalizada substituiu somente a seção escolhida |
| Desfazer | Seção original restaurada |
| Importar arquivo .html pelo seletor | Código/tabelas/CSS apareceram no modo HTML com prévia |
| Colar HTML completo | Documento aberto no modo de código |
| Salvar e recarregar HTML | Modo, código e conteúdo da prévia restaurados |
| Baixar projeto no modo HTML | JSON contém mode=html, htmlSource e o rascunho visual separado |
| Voltar à aba Estrutura/Blocos | Rascunho visual anterior preservado |

Foi corrigida durante a verificação a atualização de campos de data/cor via eventos de entrada. A prévia isolada também recebeu preparação de GIFs locais no contexto da página: os dados da imagem são usados apenas no iframe, mantendo `sandbox=""` e preservando URLs na exportação.

## Verificações da versão anterior mantidas

Texto rico e negrito no canvas, HTML de texto, duplicação/reordenação/exclusão, troca de modelo, JSON baixado e reimportado, prévia desktop/celular e salvamento local foram exercitados na v0.1.0. A suite da v0.2.0 mantém seus testes de regressão.

## Limites

- Não houve envio de mensagens nem acesso a listas de contatos.
- Não foram testados Gmail/Outlook/Apple Mail com mensagens entregues. GIFs podem ser pré-carregados, armazenados em cache ou não animar, dependendo do cliente.
- O serviço de GIF foi testado localmente; a URL HTTPS de produção precisa ser hospedada no SaaS.
- Não houve teste de carga de campanha em massa. O limitador básico do servidor é descrito em COUNTDOWN.md.
- Salvamento remoto, upload persistente, autenticação e isolamento entre tenants dependem do backend do SaaS.
