# Histórias com IA e MCP

## No Tomo

O editor oferece **Criar com IA**: escolha OpenAI ou Claude, descreva a
história, revise a prévia e use **Adicionar ao livro**. Apenas o pedido é enviado
ao provedor. Os textos existentes não são enviados nem substituídos. A inserção
respeita o limite de 1.500 caracteres por página, preservando palavras.

No botão **Conectar com IA**, ao lado de Minha estante, escolha Claude ou ChatGPT.
O guia copia o endereço MCP e abre as configurações do aplicativo escolhido.
A autorização é concluída no aplicativo e na tela de consentimento do Tomo.
Configurar uma API para geração dentro do editor não vincula a assinatura pessoal:
essas chamadas usam créditos da API do projeto.
O servidor permite 20 tentativas de geração por usuário aprovado por dia.

## Preparação do servidor

1. Aplicar `supabase/migrations/202610180001_integracoes_ia.sql`.
2. Publicar as funções `historias-ia`, `tomo-mcp` e `mcp-oauth` com os arquivos
   compartilhados e a configuração em `supabase/config.toml`.
3. Em **Supabase → Edge Functions → Secrets**, configurar somente os provedores
   desejados, com chave e nome de um modelo habilitado na conta:

| Provedor | Chave secreta | Modelo |
| --- | --- | --- |
| OpenAI | `OPENAI_API_KEY` | `OPENAI_MODEL` |
| Gemini | `GEMINI_API_KEY` | `GEMINI_MODEL` |
| Claude | `CLAUDE_API_KEY` | `CLAUDE_MODEL` |

As chaves são do administrador do projeto, com cobrança pela respectiva API.
Não colocar essas chaves no `.env` do Vite, nem usar prefixo `VITE_`.

O domínio público é **https://tomobooks.vercel.app**, definido em
`supabase/functions/_shared/configuracao.ts`. A variável `TOMO_APP_URL` pode
substituí-lo para outra hospedagem. O arquivo
`vercel.json` encaminha `/api/mcp`, `/api/mcp-oauth` e os endpoints de descoberta
ao projeto Supabase atual. Em outro provedor de hospedagem, reproduzir essas
rotas, incluindo preservação do método POST, cabeçalho Authorization e query
string. O domínio deve corresponder a `TOMO_APP_URL`.

## Conectar uma IA externa

No ChatGPT ou Claude, adicionar como conector MCP a URL exibida na janela de conexões e usar
OAuth. O fluxo volta ao Tomo, exige login de uma conta aprovada e mostra o nome
do cliente, o destino do retorno e a permissão antes da autorização. A conta no
aplicativo de IA precisa permitir conectores personalizados.

No Gemini, usar um cliente com MCP, como a API ou Gemini CLI; esta implementação
não pressupõe disponibilidade de conectores personalizados no chat comum.

O servidor implementa Streamable HTTP sem sessão/SSE e uma ferramenta:
`criar_rascunho({ titulo, texto })`. A operação cria livro privado e páginas em
uma transação. Não permite ler conteúdo, editar livros existentes ou publicar.
O limite é de 50 histórias por dia por usuário.

Clientes com cabeçalhos configuráveis podem usar o token manual da janela de conexões em
`Authorization: Bearer TOKEN`. Ele é mostrado uma única vez e seu hash SHA-256
é armazenado no banco. O acesso dura 30 dias. Gerar ou autorizar uma conexão
substitui a anterior; **Revogar acesso MCP** invalida o token imediatamente.

OAuth usa registro dinâmico de clientes públicos, PKCE S256, pedidos assinados
com validade de dez minutos e códigos de cinco minutos consumidos uma única
vez. O token tem validade de 30 dias, sem refresh token: reconectar ao expirar.
O nome do cliente é informado pelo próprio aplicativo; confira o domínio de
retorno na tela de consentimento.

## Verificação e limites

Os testes automatizados cobrem extração das respostas dos provedores,
rejeição de respostas incompletas, validação de pedidos, PKCE, assinaturas,
expiração, validação do token MCP, ferramenta permitida e preservação do texto.
A geração real depende de chaves e créditos. O fluxo OAuth completo deve ser
verificado no domínio publicado e no aplicativo escolhido.

Referências: [OpenAI](https://help.openai.com/en/articles/12584461-developer-mode-and-full-mcp-connectors-in-chatgpt),
[Claude](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp),
[Gemini](https://ai.google.dev/gemini-api/docs/function-calling/).
