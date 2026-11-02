# Verificação da versão 0.1.0

Verificada em ambiente Node 24 e Chrome pelo navegador interno. A publicação no Replit, a integração com o backend do SaaS e envios reais não fazem parte destes resultados.

## Automatizado

`npm test`: **12 testes passando**.

- HTML com assunto/pré-cabeçalho escapados, variáveis e CSS responsivo.
- Saída com condicionais de Outlook e sem marca do editor.
- Alteração de HTML de um texto preservando os vizinhos e restaurando do JSON.
- Estilos e espaçamento zero preservados no HTML.
- Conversão de seção em HTML personalizado sem alterar outras seções.
- Quatro modelos compilados sem erro estrutural MJML.
- Remoção de scripts, eventos e iframes do HTML personalizado.
- Rejeição de schema desconhecido e componentes/atributos executáveis no JSON.
- Rejeição de URLs JavaScript, URLs codificadas maliciosas, blob/data para imagens e injeção em atributos MJML.

`npm run build`: **TypeScript e build de produção concluídos**, incluindo checagem do exemplo de integração. O Vite avisa que o módulo MJML é grande; o editor é carregado separadamente sob demanda. Bundle aproximado: 671 KB gzip para o módulo do editor e 70 KB gzip para a aplicação/runtime React.

## Navegador: fluxo completo

| Ação | Evidência observada |
| --- | --- |
| Abrir a aplicação local | Paleta, canvas, modelo e painel de propriedades renderizados |
| Editar HTML de um texto | Conteúdo alterado somente no bloco escolhido |
| Salvar e recarregar | Texto alterado e assunto preservados |
| Arrastar Texto da paleta | Nova seção inserida entre a chamada e a imagem |
| Texto rico direto no canvas | Texto substituído e negrito visível no HTML compilado |
| Trocar modelo | Modelo escolhido substituiu o documento e seus metadados |
| Converter seção para HTML | Tabela personalizada renderizada no lugar da seção |
| Desfazer a conversão | Texto anterior restaurado |
| Duplicar e reordenar | Cópia com texto diferente movida para antes da original |
| Excluir seções de teste | Seções removidas, documento original preservado |
| Prévia móvel | HTML compilado renderizado em largura de celular |
| Baixar e importar JSON | Arquivo exportado reaberto com mensagem de sucesso e todos os blocos |

Após os testes, o modelo de boas-vindas foi restaurado sem os textos temporários de teste.

## Limites de validação

- Não houve envio de mensagens nem acesso a listas de contatos.
- Não foram testados Gmail/Outlook/Apple Mail com mensagens entregues.
- O callback de upload está implementado, mas depende de um backend do SaaS; não houve upload a storage real.
- O exemplo de API é checado pelo TypeScript; seus endpoints precisam ser implementados no SaaS.
- O isolamento entre tenants precisa ser validado no backend que receber a integração.
