# Tomo MCP — múltiplas conexões, revogação individual e CORS

Nada aqui foi aplicado no seu banco nem publicado. Este pacote só contém arquivos e testes.

## 1. O problema que foi corrigido

`tokens_mcp` tinha **um token por usuário** (`usuario_id` era a chave primária). Toda nova conexão (OAuth ou token manual) **substituía a anterior**. Conectar o ChatGPT derrubava o Claude, e vice-versa; como o servidor não emite `refresh_token`, o cliente derrubado só voltava refazendo a autorização, o que derrubava o outro. Foi reproduzido em PostgreSQL real: depois de o ChatGPT conectar, o token do Claude passou a ser inválido.

## 2. O que mudou

| Arquivo | Mudança |
|---|---|
| `supabase/migrations/202610190001_multiplas_conexoes_mcp.sql` (**nova**) | Tabelas `conexoes_mcp` (várias por usuário, só hash SHA-256) e `uso_mcp_diario` (limite de 50/dia **somado por usuário**). Copia os dados atuais. Funções novas: `revogar_conexao_mcp`, `listar_conexoes_mcp`. Funções existentes mantêm a assinatura (código antigo continua funcionando). Teto de 10 conexões por usuário: remove primeiro as expiradas e depois as menos usadas. `tokens_mcp` **não é apagada**. |
| `supabase/functions/tomo-mcp/index.ts` | CORS completo (`OPTIONS` 204, cabeçalhos do protocolo MCP, `WWW-Authenticate` exposto). `initialize` negocia a versão do protocolo (`2025-06-18`, `2025-03-26`, `2024-11-05`) em vez de fixar uma. Erro real de paginação chega ao modelo (`isError`). |
| `supabase/functions/mcp-oauth/index.ts` | O nome do cliente (do DCR) nomeia a conexão. `/token` responde `invalid_grant` também para código inválido ou expirado. Logs estruturados sem segredos. Negociação de DCR opcional, **desligada por padrão** (seção 4). |
| `vercel.json` | Dois fallbacks de descoberta na raiz do domínio, para clientes que ignoram o `resource_metadata`. |
| `src/dados/ia.ts`, `src/ConexoesIA.tsx`, `src/AutorizarMCP.tsx` | Lista de conexões ativas com **Revogar** por conexão; botão antigo virou "Revogar todas as conexões"; textos que diziam "substitui a conexão anterior" corrigidos. |
| `supabase/rollback/…rollback_multiplas_conexoes_mcp.sql` | Volta ao modelo antigo (seção 6). |
| `supabase/tests/**`, `supabase/functions/_tests/mcp_conexoes.test.ts` | Testes (seção 3). |

**Não mudou (de propósito):** PKCE S256 obrigatório; correspondência **exata** de `redirect_uri`; `resource` e `scope` estritos; código assinado de uso único (5 min); token só como hash; consentimento só com sessão real e conta aprovada; ferramenta única `criar_rascunho`, privada.

## 3. O que foi testado e o que depende de validação real

### Testado aqui (ambiente isolado, sem tocar no seu Supabase)

| Camada | Como | Resultado |
|---|---|---|
| Migration + funções SQL | PostgreSQL 16 real, esquema mínimo que imita o Tomo e as roles do Supabase; dados legados migrados; migration rodada duas vezes (idempotente); rollback e reaplicação | passou |
| Cenários SQL | várias conexões simultâneas; revogar uma não afeta a outra; usuário B não revoga a conexão de A; limite de 50 somado entre conexões e que não cria livro quando excedido; virada de dia; teto de 10; expiração; conta suspensa perde acesso na hora; uso único do código; privilégios de `anon`/`authenticated`; compatibilidade com chamadas antigas | passou |
| Ponta a ponta | As **duas Edge Functions reais rodando no Deno**, falando com o PostgreSQL real por um backend falso do Supabase: DCR, `/authorize`, consentimento, `/token` com PKCE, MCP `initialize`/`tools/list`/`tools/call`, "Claude" e "ChatGPT" na mesma conta, um rascunho por cliente, revogação individual, limite somado, recusas de segurança | **33/33** |
| Tipos | `deno check` nas duas funções; `tsc --strict` nos três arquivos do front | sem erros* |
| Unitários | `vitest`: 10 testes que já existiam + 4 novos | 14/14 |

\* O `tsc` acusou apenas um módulo que não veio no ZIP (`src/dados/consultasCompartilhadas`), sem relação com as mudanças.

### Depende de validação real (não foi nem poderia ser testado aqui)

1. **Claude e ChatGPT de verdade.** O teste ponta a ponta simula o que a documentação diz que eles enviam; só os apps reais confirmam. É o seu teste de aceite (seção 5).
2. **O que o ChatGPT envia no registro (DCR).** Não consegui confirmar nas documentações qual `token_endpoint_auth_method` ele pede. Nosso servidor anuncia só `none`.
3. **Rewrites da Vercel em produção** (inclusive os dois novos) e a latência/cold start das Edge Functions (o Claude espera respostas de OAuth em poucos segundos).
4. **A interface** (`ConexoesIA.tsx`): checada só por tipos e sintaxe; não abri no navegador. Os estilos da lista são inline e simples, sem CSS novo.
5. **A migration no seu banco real.** Testei com um esquema mínimo; ela depende de `perfis`, `livros`, `paginas` e `usuario_aprovado()` já existirem como nas migrations anteriores.
6. **Claude Code / outros clientes** (Cursor, VS Code): não testados. Com DCR, clientes de loopback registram a própria `redirect_uri` com porta e a correspondência exata funciona em teoria; confirme se for usá-los.
7. A função `historias-ia` não veio no ZIP. O contrato de `obter_conexao_mcp` (`ativo`, `expira_em`) foi preservado e ganhou `total`, mas ela não foi testada.

## 4. O que as especificações oficiais mostraram (e o que isso mudou no plano)

Consultei a especificação de autorização do MCP (2025-06-18), a RFC 7591 e as documentações de conectores do Claude e do ChatGPT.

- **DCR com `client_secret_post`:** a RFC 7591 §3.2.1 permite o servidor substituir o valor pedido e responder com o que registrou, e o cliente deve verificar a resposta. **Mas não garante que cada cliente aceite.** Por isso o padrão continua sendo **recusar** (400 `invalid_client_metadata`) e há uma chave opcional, `MCP_DCR_SUBSTITUIR_AUTH_POR_NONE=1`, **desligada**. Só a ligue se os logs mostrarem um cliente pedindo `client_secret_post` **e** o teste real concluir o fluxo com ela ligada.
- **Claude** se registra como cliente público (`none`), registra um cliente novo a cada conexão (o `client_id` do Tomo é assinado e sem estado, então não acumula nada) e pede exatamente o `scope` que o `WWW-Authenticate` informa. **ChatGPT** reenvia o `resource` do `resource_metadata`. Como ambos mandam exatamente o que o Tomo anuncia, **não flexibilizei `resource` nem `scope`** (itens que eu tinha sugerido antes).
- **Refresh token** fica para a segunda etapa, como combinado. Efeito: a conexão **expira em 30 dias** e o cliente precisa reconectar (o Claude tenta renovar ao receber 401, mas sem `refresh_token` isso termina em nova autorização).

## 5. Implantação (ordem importa)

Faça backup do banco antes. Nada abaixo foi executado por mim.

1. **Conferir o ponto de partida** (SQL Editor):
   `select count(*) from public.tokens_mcp;`
2. **Aplicar a migration** `202610190001_multiplas_conexoes_mcp.sql` (SQL Editor ou `supabase db push`). Ela é segura para rodar duas vezes. Conferir:
   `select count(*) from public.conexoes_mcp;` (deve ser igual ao passo 1) e `select usuario_id, usos from public.uso_mcp_diario;`
   A migration vem **primeiro** porque o código novo das Edge Functions chama `trocar_codigo_oauth_mcp` com o parâmetro novo `nome_conexao`; o código **antigo** continua funcionando com o banco novo.
3. **Publicar as Edge Functions** (mantendo `verify_jwt = false` do `config.toml`):
   `supabase functions deploy tomo-mcp --no-verify-jwt` e `supabase functions deploy mcp-oauth --no-verify-jwt`
4. **Publicar o site** na Vercel (front novo e `vercel.json`).
5. **Teste de fumaça**, sem login:
   - `curl -i -X OPTIONS https://tomobooks.vercel.app/api/mcp -H "Origin: https://exemplo.com" -H "Access-Control-Request-Method: POST"` → **204** com `Access-Control-Allow-Origin: *`.
   - `curl -i -X POST https://tomobooks.vercel.app/api/mcp -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"teste","version":"1"}}}'` → **401** com `WWW-Authenticate` contendo `resource_metadata`.
   - `curl -i https://tomobooks.vercel.app/.well-known/oauth-authorization-server` e `…/oauth-protected-resource` → **200** com JSON (novos fallbacks).

### Roteiro do teste de aceite (Claude + ChatGPT na mesma conta)

Use **a mesma conta aprovada do Tomo** nos dois. Em ambos, adicione como **conector personalizado** pela URL `https://tomobooks.vercel.app/api/mcp` (sem catálogo, sem pagamento). O erro "Plugin not found" de antes vinha de abrir o link de um plugin privado em outra conta, não do servidor.

1. Abra os logs de `mcp-oauth` (Supabase → Edge Functions → mcp-oauth → Logs).
2. **Claude:** conecte, faça login no Tomo, autorize. Peça: *"Crie uma história curta e salve como rascunho no Tomo."* Confirme o rascunho em **Meus livros** (privado).
3. **ChatGPT:** repita (modo desenvolvedor/conectores). Peça outra história e salve. Confirme o segundo rascunho.
4. Em **Conexões de IA → Opções avançadas**, devem aparecer **duas conexões** (Claude e ChatGPT). Volte ao Claude e salve outro rascunho: **tem de continuar funcionando** (era o defeito).
5. **Revogue só o ChatGPT** na lista. Tente salvar pelo ChatGPT: deve falhar (401/pedir reconexão). Salve pelo Claude: **deve funcionar**.
6. Nos logs, procure `registro_recebido`: ele mostra `auth_method`, `grant_types` e o destino de cada cliente. Se algum vier com `client_secret_post` e o registro for recusado, é o caso da flag (seção 4); me envie a linha do log.

Critério de aceite: passos 2, 3 e 4 salvam um rascunho por cliente; no passo 5 só o revogado para.

## 6. Rollback e limpeza

- **Rollback:** rode `supabase/rollback/202610190001_rollback_multiplas_conexoes_mcp.sql` e republique o código antigo das funções e do site. Volta a **um token por usuário** (fica a conexão ativa mais recente de cada usuário; as demais perdem acesso). As tabelas novas não são apagadas. O rollback e a reaplicação da migration foram testados.
- **Limpeza futura** (só depois de validar tudo e fazer backup): `drop table public.tokens_mcp;`

## 7. Fica para a segunda etapa (ou decisão sua)

- `refresh_token` com rotação (evita reconectar a cada 30 dias).
- Segredo de assinatura próprio (`MCP_OAUTH_SECRET`) em vez da `SERVICE_ROLE_KEY`, e validade do `client_id` além de 365 dias: rotacionar a chave ou passar de um ano invalida clientes já registrados.
- Parâmetro `iss` na resposta de autorização (RFC 9207), CIMD, e verificar versões do protocolo posteriores a `2025-06-18` antes de anunciá-las.

## 8. Rodar os testes na sua máquina

Precisa de PostgreSQL local, Node 20+ e Deno. Nunca aponte para o banco real.

```
# unitários
npx vitest run supabase/functions/_tests
# SQL (cria e apaga um banco temporário)
cd supabase/tests && ./rodar-testes-sql.sh
# ponta a ponta
cd supabase/tests/e2e && npm install && node aceite.mjs     # use PGUSER/PGHOST se necessário
```
