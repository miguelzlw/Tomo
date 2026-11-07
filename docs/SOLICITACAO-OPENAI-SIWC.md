# Solicitação de acesso — Sign in with ChatGPT para Tomo

Preparada e enviada em 05/11/2026, após autorização explícita de Miguel nesta conversa.
Status: recebimento confirmado na página oficial; avaliação e acesso pendentes.
Formulário oficial: https://openai.com/form/sign-in-with-chatgpt-interest/

Objetivo: obter acesso autorizado para usar o plano ChatGPT do próprio usuário em geração de histórias dentro do Tomo, com retorno HTTPS automático e sem cobrança adicional. Este pedido não é publicação de plugin MCP no catálogo.

## Campos do formulário

| Campo | Valor preparado |
|---|---|
| Work email | **A confirmar por Miguel**. O contato público atual do site é `joaotse@gmail.com`; confirmar se deve ser usado e se o formulário aceita esse endereço. |
| First name | **A confirmar** — usar o nome do responsável pela candidatura. |
| Last name | **A confirmar** — não inferir sobrenome pelo perfil ou por identificadores de conta. |
| Company name | Tomo — independent, free personal project. Confirmar aceitação de projeto sem empresa constituída. |
| Website URL | https://tomobooks.vercel.app |
| Job title (opcional) | Creator and developer — confirmar descrição do papel de Miguel. |
| Capabilities | **Sign in and ChatGPT plan use for AI requests** |

## Texto para “Which of your products would use Sign in with ChatGPT?”

Tomo (https://tomobooks.vercel.app) is a free, independent Portuguese-language web app for reading and writing stories, initially intended for a small group of friends in Brazil, with mobile-first access.

We would like to integrate Sign in with ChatGPT with permission to use each eligible user's own ChatGPT plan for AI requests directly inside Tomo. The intended experience is: sign in to Tomo, choose Continue with ChatGPT, authorize on OpenAI's official page, return automatically to Tomo through a registered HTTPS callback, describe a story, review the generated text, and explicitly add it to a private draft. Publishing remains a separate user action.

Tomo uses React/Vite, Supabase for authentication and storage, and Vercel for hosting. We have existing code for a separate MCP integration that creates private drafts from an external assistant; it is not the in-app plan-usage integration requested here, and we are not claiming this new integration is already approved or operational.

We are requesting authorized access for a remotely hosted application, its own OAuth client registration, and confirmation of eligible user plans, permitted callbacks, token storage and renewal requirements, usage limits, and any partnership or usage fees. Our requirement is no additional charge to Tomo's operator or end users beyond any ChatGPT plan they already hold. We will not enable a paid API fallback or launch this feature until the access conditions and cost model are confirmed.

Public information: privacy https://tomobooks.vercel.app/privacidade/ ; terms https://tomobooks.vercel.app/termos/ ; support https://tomobooks.vercel.app/suporte/ . These describe the existing product and will be updated to reflect the approved integration before launch.

Could you confirm whether a small, non-commercial hosted project is eligible and advise on the appropriate onboarding path?

## Antes do envio

- Confirmar nome, sobrenome e e-mail de contato com Miguel.
- Revisar a descrição acima e a apresentação como projeto independente.
- Não incluir chaves, tokens, dados de usuários, quantidade de usuários inventada ou promessa de uso ilimitado.
- Enviar como pedido de acesso; não aceitar condições de pagamento ou contrato sem decisão explícita de Miguel.

## Após o envio

Registrar confirmação/protocolo e data; aguardar resposta de elegibilidade e condições. Não marcar como aprovado ou criar client_id fictício. Só então implementar o contrato técnico para o fluxo hospedado; não copiar credenciais de Codex ou de outro produto.

## Registro do envio

- Responsável preenchido por Miguel: Luiz Miguel Costa; projeto Tomo; cargo preenchido como “Criador e desenvolvedor do Tomo”. E-mail já estava preenchido pelo usuário e não foi copiado para este documento.
- Modalidade selecionada: login e uso do plano ChatGPT para solicitações de IA.
- Texto enviado: resumo em inglês da proposta acima, incluindo uso dentro do site hospedado, retorno HTTPS, revisão antes de inserir rascunho e pedido explícito de confirmação de custos. Não foi solicitado somente login nem publicação no catálogo MCP.
- Confirmação observada: a página informou que recebeu o formulário e que entrará em contato se o produto se enquadrar nos critérios. Nenhum protocolo ou prazo individual foi exibido.
- Comprovante local: `.tmp/solicitacao-openai-enviada.png` (arquivo local de verificação, ignorado pelo Git).
- Nenhuma assinatura, pagamento, chave de API ou integração de geração foi ativada com esse envio.
