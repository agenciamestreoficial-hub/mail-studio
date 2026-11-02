# Prompt para o Replit Agent

Copie o texto abaixo no Agent **dentro do seu SaaS existente**, com este repositório disponível.

---

Integre o editor de e-mails deste repositório ao meu SaaS. Primeiro leia README.md, docs/REPLIT.md, docs/ARCHITECTURE.md, src/editor/types.ts e examples/SaasEmailEditor.tsx. Inspecione a arquitetura atual do SaaS antes de alterar arquivos.

Quero o componente real EmailEditor, baseado em GrapesJS Core e MJML, com a interface em português, sem marca d’água. Preserve os 14 blocos, modelos, arrastar/soltar, texto rico, edição HTML por bloco, prévia desktop/celular e exportação JSON/HTML/MJML. Não substitua por Unlayer ou por um SDK comercial.

Crie uma rota de edição integrada à navegação existente. Reutilize meu login, permissões, design externo, banco, ORM e armazenamento de imagens. Não recrie o SaaS e não copie .replit, vite.config.ts, main.tsx ou a configuração de publicação deste demo por cima do aplicativo existente.

Copie o módulo src/editor e adicione só as dependências necessárias, mantendo uma única instalação de React. Carregue o editor sob demanda e sem SSR, se houver. Monte com key por tenant + documento. Espere o carregamento do projeto antes de passar initialProject.

Implemente os endpoints documentados, ou adapte os callbacks aos endpoints equivalentes já existentes. Persista o envelope JSON editável, o assunto, o pré-cabeçalho e as saídas HTML/MJML. Use controle otimista de versão para impedir sobrescritas entre abas. Derive o tenant da sessão no servidor e aplique autorização em toda leitura, gravação e upload. O cliente não pode escolher outro tenant.

Conecte onSave a uma gravação real, com feedback de sucesso e erro. Implemente onUploadImage com uma URL HTTPS pública durável, validação de arquivo e limites. Não use URLs blob/data ou URLs temporárias nos e-mails exportados. Mantenha credenciais somente no servidor. Autosave remoto, se implementado, deve serializar requisições e tratar conflitos.

Conecte as mergeTags às variáveis do meu sistema de envio. Mantenha Salvar separado de Enviar campanha. Não envie nenhum e-mail real automaticamente. Respeite o descadastro e use os dados reais da empresa no backend.

Valide a integração com npm test e build, e teste no navegador: criar, arrastar, editar texto, alterar HTML de um bloco, duplicar, reorganizar, desfazer, salvar, reabrir, exportar e visualizar no celular. Verifique também isolamento entre tenants, falhas de rede, conflitos de versão e upload persistente.

Ao terminar, mostre os arquivos alterados, rotas criadas, como testar no meu SaaS e eventuais recursos ainda não conectados. Não afirme ter testado envio ou clientes de e-mail sem evidência real.
