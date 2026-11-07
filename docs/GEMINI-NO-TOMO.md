# Gemini dentro do Tomo

Configurado em 05/11/2026 por solicitação de Miguel. Usuários aprovados usam a própria conta Tomo; não precisam conectar conta Google individual. O responsável confirmou público maior de 18 anos.

## Configuração

- Projeto Google observado no AI Studio: `gen-lang-client-0486211104`, marcado Free tier com opção de configurar faturamento. Nenhum faturamento foi habilitado por esta implementação.
- Chave existente armazenada como `GEMINI_API_KEY` nos segredos das Edge Functions do Supabase. Não copiar o valor para frontend, GitHub ou documentação.
- Modelo: `GEMINI_MODEL=gemini-3.5-flash-lite`. A tabela oficial consultada inclui cota gratuita; a disponibilidade efetiva depende do projeto Google.
- Backend: `historias-ia`, com validação de sessão e perfil aprovado antes da geração.
- Cota Tomo: 20 tentativas por usuário por dia, aplicada pela RPC existente `reservar_geracao_ia`. As contas também compartilham a cota Google do projeto; a cota gratuita não é garantida ou ilimitada.
- O servidor devolve HTTP 429 ao atingir a cota do provedor. Não há retentativa automática de erros nem troca para um provedor pago. Cada trecho de uma continuação usa uma tentativa.

## Experiência

No editor de livro, abrir **Criar com IA**, descrever a história e escolher **Gerar história**. A geração usa somente Gemini, sem seletor de provedor. A resposta aparece em uma prévia editável; **Adicionar ao livro** insere novas páginas sem publicar ou substituir as existentes.

Na navegação principal, **Criar com IA → Começar** abre um novo rascunho com o painel expandido. A janela inicial apresenta apenas a criação de histórias no Tomo e esse botão; os controles de conexão externa foram removidos da interface. Exemplos de aventura, mistério e história infantil ajudam a começar dentro do editor.

O campo de ideia não tem mais o bloqueio de 6.000 caracteres e a instrução de 1.200 palavras foi removida. Não há teto fixo de páginas na prévia ou na paginação. Há limites técnicos por requisição: até 4 MiB de JSON no servidor, contexto e resposta do modelo, tempo de execução e cota gratuita. Portanto, isso não é geração literalmente infinita.

Gemini gera trechos de até 8.192 tokens por resposta. Se retornar `MAX_TOKENS`, o texto parcial é preservado e o Tomo solicita a continuação automaticamente até o modelo finalizar, o usuário pausar ou ocorrer uma falha/limite de cota. **Parar após este trecho** termina o trecho em andamento; **Continuar história** retoma a prévia, incluindo suas revisões. Falhas não apagam os trechos já recebidos nem são repetidas automaticamente.

A IA recebe a ideia e o contexto da prévia, sem acesso automático às páginas do livro. Em prévias acima de 80.000 caracteres, somente a abertura e os trechos mais recentes voltam ao modelo; o texto completo continua na prévia. Isso limita o contexto de continuidade e pode afetar a coerência de obras muito extensas. O usuário deve revisar o resultado.

A frase entre o contador e Gerar história foi removida da interface por solicitação de Miguel. As condições do serviço gratuito Google continuam aplicáveis.

Verificação deste ajuste: 102 testes aprovados, build e TypeScript da função aprovados. No navegador, com rede fictícia, uma ideia de 12.200 caracteres foi aceita; três trechos foram reunidos automaticamente; pausar preservou o trecho em andamento; retomar completou a prévia; falha de cota posterior manteve o primeiro trecho editável. O teste de paginação preservou integralmente uma história com mais de 100 páginas. Não foi consumida a cota real Google para simular obras extensas.

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
