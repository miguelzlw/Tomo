# Gemini dentro do Tomo

Configurado em 05/11/2026 por solicitação de Miguel. Usuários aprovados usam a própria conta Tomo; não precisam conectar conta Google individual. O responsável confirmou público maior de 18 anos.

## Configuração

- Projeto Google observado no AI Studio: `gen-lang-client-0486211104`, marcado Free tier com opção de configurar faturamento. Nenhum faturamento foi habilitado por esta implementação.
- Chave existente armazenada como `GEMINI_API_KEY` nos segredos das Edge Functions do Supabase. Não copiar o valor para frontend, GitHub ou documentação.
- Modelo: `GEMINI_MODEL=gemini-3.5-flash-lite`. A tabela oficial consultada inclui cota gratuita; a disponibilidade efetiva depende do projeto Google.
- Backend: `historias-ia`, com validação de sessão e perfil aprovado antes da geração.
- Cota Tomo: 20 tentativas por usuário por dia, aplicada pela RPC existente `reservar_geracao_ia`. As contas também compartilham a cota Google do projeto; a cota gratuita não é garantida ou ilimitada.
- O servidor devolve HTTP 429 ao atingir a cota do provedor. Não há retentativa automática nem troca para um provedor pago.

## Experiência

No editor de livro, abrir **Criar com IA**, descrever a história e escolher **Gerar história**. Gemini é priorizado quando o servidor o anuncia disponível. A resposta aparece em uma prévia editável; **Adicionar ao livro** insere novas páginas sem publicar ou substituir as existentes.

Na navegação principal, **Criar com IA → Começar uma história** abre um novo rascunho com o painel expandido. Exemplos de aventura, mistério e história infantil ajudam a começar. As conexões externas ficam em uma seção avançada separada.

Pedidos aceitam até 6.000 caracteres. A orientação é pedir até cerca de 1.200 palavras por vez; o tamanho final depende do modelo. A IA recebe apenas o pedido: para continuar ou revisar um texto, inclua o trecho necessário. Não há acesso automático às páginas do livro.

A prévia e o pedido ficam em `sessionStorage`, separados por usuário e livro, para recuperação na mesma aba. Isso não substitui salvar o livro e não garante recuperação depois de fechar a aba. Ao sair da conta, as prévias desse usuário são removidas. Se o navegador bloquear esse armazenamento, a tela informa.

Durante a geração, os controles que saem do editor ficam bloqueados. Ao voltar com alterações, o editor salva antes de sair; falhas mantêm o texto na tela. O salvamento grava as páginas antes de remover páginas excedentes. Essas duas operações não são uma transação única.

A tela informa antes do envio que o Google pode usar pedidos e respostas para melhorar seus produtos no serviço gratuito. Trata-se de conteúdo, não de respostas a questionários. Não enviar material confidencial ou dados pessoais sensíveis. Os termos Google exigem público adulto e impõem condições regionais.

## Manutenção

Conferir uso, modelos, Free tier e limites no Google AI Studio. Gerenciar chave/modelo no Supabase → Edge Functions → Secrets. Se o projeto Google for alterado para faturamento pago por um administrador, esta integração não consegue detectar essa alteração automaticamente; limites locais de requisições não são um teto financeiro. Não habilitar faturamento para resolver erro de cota.

Este caminho não depende da aprovação Sign in with ChatGPT. A solicitação OpenAI anterior continua sendo um pedido separado e não habilita uso do plano ChatGPT aqui.

## Fontes

- https://aistudio.google.com/docs/api-key
- https://aistudio.google.com/docs/billing
- https://aistudio.google.com/docs/pricing#gemini-3.5-flash-lite
- https://aistudio.google.com/docs/terms
- https://supabase.com/docs/guides/functions/secrets
