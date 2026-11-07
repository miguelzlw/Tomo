\o /dev/null
-- Rollback: volta ao modelo de um token por usuário e continua funcional.
-- Antes do rollback o usuário 2 cria uma conexão nova: é a mais recente e a que sobrevive.
select public.t_como(2);
set role authenticated;
select public.definir_token_mcp(public.t_hash(public.t_tok(60)), 'Última conexão');
reset role;
select public.t_ok((select count(*) from public.conexoes_mcp where usuario_id = public.t_uid(2)) > 1, 'R0 usuário 2 tem várias conexões antes do rollback');
\i ../rollback/202610190001_rollback_multiplas_conexoes_mcp.sql
select public.t_ok(not exists(select 1 from pg_proc where proname = 'listar_conexoes_mcp'), 'R1 funções novas removidas');
select public.t_ok((select count(*) from public.tokens_mcp where usuario_id = public.t_uid(2)) = 1, 'R1b um token por usuário no modelo antigo');
set role anon;
select public.t_ok(public.validar_token_mcp(public.t_tok(60)), 'R2 a conexão mais recente sobrevive ao rollback');
select public.t_ok(not public.validar_token_mcp(public.t_leg(2)), 'R2b as demais perdem acesso (limitação documentada do modelo antigo)');
select public.criar_rascunho_mcp(public.t_tok(60), 'Depois do rollback', '["ok"]'::jsonb);
reset role;
select public.t_ok((select count(*) from public.livros where titulo = 'Depois do rollback') = 1, 'R3 criar_rascunho_mcp antigo funciona');
select public.t_ok((select usos from public.tokens_mcp where usuario_id = public.t_uid(2)) = 2, 'R3b contador diário foi levado para o modelo antigo (1 + 1)');
select public.t_como(2);
set role authenticated;
select public.definir_token_mcp(public.t_hash(public.t_tok(50)));
reset role;
set role anon;
select public.t_ok(public.validar_token_mcp(public.t_tok(50)) and not public.validar_token_mcp(public.t_tok(60)), 'R4 modelo antigo: novo token substitui o anterior');
reset role;
-- Reaplicar a migration depois do rollback é seguro.
\i ../migrations/202610190001_multiplas_conexoes_mcp.sql
select public.t_ok(exists(select 1 from pg_proc where proname = 'listar_conexoes_mcp'), 'R5 migration reaplicada');
\o
\echo 'testes SQL de rollback: OK'
