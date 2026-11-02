# Cronômetro de prazo fixo

O bloco Cronômetro usa uma imagem GIF produzida pelo próprio projeto, sem SaaS de terceiros, chave ou marca d’água. O e-mail enviado contém uma imagem e uma legenda de prazo; não usa JavaScript para contar o tempo.

## Usar no editor

1. Adicione Cronômetro por clique ou arraste.
2. Escolha data/hora e fuso. A data digitada é interpretada no fuso selecionado.
3. Personalize fundo, números e legendas. Clique **Aplicar cronômetro**.
4. Em **Serviço de imagem**, configure a URL HTTPS do endpoint hospedado. A prop `countdownEndpoint` define o endereço inicial de novos blocos.
5. Salve/exporte o JSON para preservar prazo e configuração. A data limite também é incluída no texto alternativo e na legenda visível.

O instante é armazenado em UTC e não reinicia ao abrir. Horários inexistentes ou ambíguos na transição de horário de verão são rejeitados; escolha outro horário ou UTC. Datas passadas geram “PRAZO ENCERRADO”. O prazo real da oferta deve ser aplicado também na página/checkout do SaaS.

## Executar o serviço

```bash
npm ci
npm run dev       # editor e GET /api/countdown.gif no Vite
npm run build
npm start         # servidor Node de produção, dist + GIF
```

Node >=22.12; o script usa `--experimental-strip-types` para executar os módulos TypeScript no Node 22. Não precisa de canvas nativo, fontes de sistema, banco ou chaves. `gifenc@1.0.3` é dependência MIT e roda somente no servidor.

O servidor usa `PORT` ou 5173, escuta em `0.0.0.0` e deve ficar atrás do HTTPS da plataforma. Não hospede apenas `dist` se quiser gerar GIFs. No Replit, use uma publicação com servidor e preserve o backend existente ao integrar no SaaS.

Configure na demonstração, antes do build:

```text
VITE_COUNTDOWN_ENDPOINT=https://seu-dominio.com/api/countdown.gif
```

Ou no componente React:

```tsx
<EmailEditor countdownEndpoint="https://seu-dominio.com/api/countdown.gif" />
```

Não há implantação pública automática neste repositório. Sem configuração, `/api/countdown.gif` funciona na prévia local e gera aviso na exportação. Esse caminho relativo não deve ser enviado em campanhas. A configuração nova não altera silenciosamente URLs de projetos já salvos: atualize os blocos locais pelo painel.

## Contrato da rota

`GET` ou `HEAD /api/countdown.gif`:

| Parâmetro | Formato |
| --- | --- |
| `end` | Instante ISO UTC, como `2026-11-10T21:30:00.000Z` |
| `zone` | Fuso IANA, padrão `America/Sao_Paulo` |
| `bg` | Cor hexadecimal de fundo, padrão `#29223f` |
| `fg` | Cor hexadecimal das legendas, padrão `#ffffff` |
| `accent` | Cor hexadecimal dos números, padrão `#c7b6ff` |

Os valores devem ser codificados com URLSearchParams; `countdownUrl()` faz isso. A resposta tem `Content-Type: image/gif`, `Cache-Control: no-store, no-cache, must-revalidate` e `X-Content-Type-Options: nosniff`. Dados inválidos retornam 400; métodos incompatíveis, 405.

A imagem é sempre 600×184; animação de até 60 segundos e um quadro final. Sem loop: depois de 60 segundos, mostra a data limite, em vez de reiniciar uma contagem vencida ou congelar um número positivo. Se o prazo termina durante a animação, a última imagem mostra prazo encerrado. Uma nova requisição após o vencimento retorna um único quadro encerrado.

A rota não busca URLs nem acessa arquivos do usuário. O cache interno dura o segundo corrente e guarda até 24 imagens. Há limite de dez novas renderizações por segundo/processo, com 429 e Retry-After. Para campanhas com volume, dimensione o serviço, teste a carga e aplique limite na borda; o limitador básico não é uma infraestrutura de envio em massa.

## Limites dos clientes de e-mail

- Alguns clientes exibem apenas o primeiro quadro ou bloqueiam imagens.
- Proxies e mecanismos de privacidade podem buscar imagens antecipadamente ou reutilizar versões em cache. `no-store` não garante que o cliente peça um GIF novo ao abrir.
- O GIF é calculado no horário da requisição, não com um relógio executado na caixa de entrada. A animação dura até 60 segundos; o prazo textual permanece como referência.
- Não há garantia de sincronização perfeita em Gmail, Outlook ou Apple Mail. Faça envios reais de teste antes de usar em campanhas; isso não foi verificado nesta entrega.

Referências primárias: [limitações de HTML em e-mail, Mailchimp](https://mailchimp.com/help/limitations-of-html-email/), [Mail Privacy Protection, Apple](https://support.apple.com/guide/mail/protect-email-privacy-mlhlp1205/mac), [gifenc](https://github.com/mattdesl/gifenc), [configuração do Replit](https://docs.replit.com/features/project-setup/configuration).
