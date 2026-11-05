\o /dev/null
create or replace function public.t_ok(cond boolean, msg text) returns void language plpgsql as $$
begin if cond is not true then raise exception 'FALHOU: %', msg; end if; end $$;
create or replace function public.t_falha(cmd text, trecho text) returns void language plpgsql as $$
begin
  begin execute cmd; exception when others then
    if sqlerrm like '%' || trecho || '%' then return; end if;
    raise exception 'FALHOU: erro inesperado em [%]: %', cmd, sqlerrm;
  end;
  raise exception 'FALHOU: deveria falhar: %', cmd;
end $$;
create or replace function public.t_uid(n integer) returns uuid language sql immutable as $$ select ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid $$;
create or replace function public.t_tok(n integer) returns text language sql immutable as $$ select 'tomo_' || md5(n::text) || md5(n::text || 'x') $$;
create or replace function public.t_leg(n integer) returns text language sql immutable as $$ select 'tomo_' || repeat(n::text, 64) $$;
create or replace function public.t_hash(tok text) returns text language sql immutable as $$ select encode(sha256(convert_to(tok, 'UTF8')), 'hex') $$;
create or replace function public.t_como(n integer) returns void language sql as $$ select set_config('request.jwt.claim.sub', public.t_uid(n)::text, false) $$;

-- A. Migração dos dados legados -----------------------------------------------------------------
select public.t_ok((select count(*) from public.conexoes_mcp) = 2, 'A1 duas conexões migradas');
select public.t_ok((select origem from public.conexoes_mcp where usuario_id = public.t_uid(1)) = 'migrada', 'A2 origem migrada');
select public.t_ok((select usos from public.uso_mcp_diario where usuario_id = public.t_uid(1)) = 3, 'A3 uso diário copiado');
select public.t_ok((select count(*) from public.uso_mcp_diario) = 2, 'A3b uso copiado sem duplicar (2ª execução idempotente)');
select public.t_ok((select count(*) from public.tokens_mcp) = 2, 'A4 tokens_mcp intacta');
set role anon;
select public.t_ok(public.validar_token_mcp(public.t_leg(1)), 'A5 token legado do usuário 1 continua válido');
select public.t_ok(public.validar_token_mcp(public.t_leg(2)), 'A5b token legado do usuário 2 continua válido');
select public.t_ok(not public.validar_token_mcp(public.t_tok(9)), 'A6 token inexistente é recusado');
select public.t_ok(not public.validar_token_mcp('tomo_curto'), 'A6b token malformado é recusado');
select public.criar_rascunho_mcp(public.t_leg(1), 'História legada', '["p1","p2"]'::jsonb);
reset role;
select public.t_ok((select usos from public.uso_mcp_diario where usuario_id = public.t_uid(1)) = 4, 'A7 uso 3 -> 4 após rascunho com token legado');
select public.t_ok((select ultimo_uso_em is not null from public.conexoes_mcp where usuario_id = public.t_uid(1)), 'A8 ultimo_uso_em preenchido');
select public.t_ok((select count(*) from public.paginas p join public.livros l on l.id = p.livro_id where l.titulo = 'História legada') = 2, 'A9 páginas gravadas');

-- B. Duas conexões OAuth (Claude e ChatGPT) na MESMA conta -------------------------------------------
insert into public.codigos_oauth_mcp(hash, usuario_id, expira_em) values
  ('code_claude', public.t_uid(1), now() + interval '5 min'),
  ('code_chatgpt', public.t_uid(1), now() + interval '5 min');
set role service_role;
select public.t_ok(public.trocar_codigo_oauth_mcp('code_claude', public.t_hash(public.t_tok(11)), 'Claude'), 'B1 troca do código do Claude');
select public.t_ok(public.trocar_codigo_oauth_mcp('code_chatgpt', public.t_hash(public.t_tok(12)), 'ChatGPT'), 'B2 troca do código do ChatGPT');
select public.t_ok(not public.trocar_codigo_oauth_mcp('code_claude', public.t_hash(public.t_tok(13)), 'Claude'), 'B3 código de uso único: reuso negado');
reset role;
select public.t_ok((select count(*) from public.conexoes_mcp where usuario_id = public.t_uid(1)) = 3, 'B4 usuário 1 tem 3 conexões ao mesmo tempo');
set role anon;
select public.t_ok(public.validar_token_mcp(public.t_tok(11)) and public.validar_token_mcp(public.t_tok(12)) and public.validar_token_mcp(public.t_leg(1)), 'B5 as 3 válidas simultaneamente');
select public.t_ok(not public.validar_token_mcp(public.t_tok(13)), 'B6 token do código reutilizado não existe');
select public.criar_rascunho_mcp(public.t_tok(11), 'Rascunho do Claude', '["a"]'::jsonb);
select public.criar_rascunho_mcp(public.t_tok(12), 'Rascunho do ChatGPT', '["b"]'::jsonb);
reset role;
select public.t_ok((select count(*) from public.livros where autor_id = public.t_uid(1) and titulo in ('Rascunho do Claude', 'Rascunho do ChatGPT') and situacao = 'rascunho' and visibilidade = 'privado') = 2, 'B7 um rascunho privado por cliente');

-- C. Revogar UMA conexão não interrompe a outra --------------------------------------------------------
select public.t_como(1);
set role authenticated;
select public.t_ok((select count(*) from public.listar_conexoes_mcp()) = 3, 'C1 lista 3 conexões');
select public.t_ok((select count(*) from public.listar_conexoes_mcp() where nome in ('Claude', 'ChatGPT', 'Conexão anterior')) = 3, 'C2 nomes corretos');
select public.t_ok(public.revogar_conexao_mcp((select id from public.listar_conexoes_mcp() where nome = 'ChatGPT')), 'C3 revoga só o ChatGPT');
select public.t_ok((select count(*) from public.listar_conexoes_mcp()) = 2, 'C4 sobram 2');
reset role;
set role anon;
select public.t_ok(not public.validar_token_mcp(public.t_tok(12)), 'C5 ChatGPT revogado: 401');
select public.t_ok(public.validar_token_mcp(public.t_tok(11)), 'C6 Claude continua funcionando');
select public.t_ok(public.validar_token_mcp(public.t_leg(1)), 'C7 conexão migrada continua funcionando');
select public.t_falha($$select public.criar_rascunho_mcp(public.t_tok(12), 'Não deve salvar', '["x"]'::jsonb)$$, 'Acesso MCP inválido');
select public.criar_rascunho_mcp(public.t_tok(11), 'Claude depois da revogação', '["ok"]'::jsonb);
reset role;
select public.t_ok((select count(*) from public.livros where titulo = 'Não deve salvar') = 0, 'C8 nada foi salvo com token revogado');
select public.t_ok((select count(*) from public.livros where titulo = 'Claude depois da revogação') = 1, 'C9 Claude ainda salva');

-- D. Isolamento entre usuários ---------------------------------------------------------------------------
select id as claude_id from public.conexoes_mcp where nome = 'Claude' \gset
select public.t_como(2);
set role authenticated;
select public.t_ok(not public.revogar_conexao_mcp(:'claude_id'::uuid), 'D1 usuário 2 não revoga conexão do usuário 1');
select public.t_ok((select count(*) from public.listar_conexoes_mcp()) = 1, 'D2 usuário 2 só vê a própria');
select public.t_ok(not public.revogar_conexao_mcp(gen_random_uuid()), 'D3 id inexistente devolve false');
reset role;
set role anon;
select public.t_ok(public.validar_token_mcp(public.t_tok(11)), 'D4 conexão do usuário 1 intacta');
reset role;

-- E. Limite diário de 50 SOMADO por usuário (conexões diferentes) -----------------------------------------------
update public.uso_mcp_diario set dia = current_date, usos = 48 where usuario_id = public.t_uid(1);
select count(*) as livros_antes from public.livros \gset
set role anon;
select public.criar_rascunho_mcp(public.t_tok(11), 'Limite 49', '["x"]'::jsonb);
select public.criar_rascunho_mcp(public.t_leg(1), 'Limite 50', '["x"]'::jsonb);
select public.t_falha($$select public.criar_rascunho_mcp(public.t_tok(11), 'Limite 51 A', '["x"]'::jsonb)$$, 'Limite diário');
select public.t_falha($$select public.criar_rascunho_mcp(public.t_leg(1), 'Limite 51 B', '["x"]'::jsonb)$$, 'Limite diário');
reset role;
select public.t_ok((select usos from public.uso_mcp_diario where usuario_id = public.t_uid(1)) = 50, 'E1 contador parou em 50 (soma das conexões)');
select public.t_ok((select count(*) from public.livros) = :livros_antes + 2, 'E2 tentativas acima do limite não criam livros');
select public.t_ok((select count(*) from public.livros where titulo like 'Limite 51%') = 0, 'E3 nenhum livro 51');
-- usuário 2 tem limite próprio
set role anon;
select public.criar_rascunho_mcp(public.t_leg(2), 'Outro usuário não é afetado', '["x"]'::jsonb);
reset role;

-- F. Virada de dia -------------------------------------------------------------------------------------------------
update public.uso_mcp_diario set dia = current_date - 1, usos = 50 where usuario_id = public.t_uid(1);
set role anon;
select public.criar_rascunho_mcp(public.t_tok(11), 'Novo dia', '["x"]'::jsonb);
reset role;
select public.t_ok((select usos = 1 and dia = current_date from public.uso_mcp_diario where usuario_id = public.t_uid(1)), 'F1 contador reinicia no novo dia');

-- G. Teto de 10 conexões: remove as expiradas e depois as MENOS USADAS --------------------------------------------------
select public.t_como(5);
set role authenticated;
select format('select public.definir_token_mcp(public.t_hash(public.t_tok(%s)), %L)', 100 + g, 'Manual ' || g) from generate_series(1, 10) g \gexec
select public.t_ok((select count(*) from public.listar_conexoes_mcp()) = 10, 'G1 10 conexões');
reset role;
update public.conexoes_mcp set ultimo_uso_em = now() where nome = 'Manual 1' and usuario_id = public.t_uid(5);
select public.t_como(5);
set role authenticated;
select public.definir_token_mcp(public.t_hash(public.t_tok(111)), 'Manual 11');
select public.t_ok((select count(*) from public.listar_conexoes_mcp()) = 10, 'G2 continua 10');
select public.t_ok((select count(*) from public.listar_conexoes_mcp() where nome = 'Manual 1') = 1, 'G3 a conexão usada recentemente foi preservada');
select public.t_ok((select count(*) from public.listar_conexoes_mcp() where nome = 'Manual 2') = 0, 'G4 a menos usada foi removida');
select public.t_ok((select count(*) from public.listar_conexoes_mcp() where nome = 'Manual 11') = 1, 'G5 a nova está presente');
select public.t_ok((select origem from public.listar_conexoes_mcp() where nome = 'Manual 11') = 'manual', 'G6 origem manual');
reset role;
select public.t_ok((select count(*) from public.conexoes_mcp where usuario_id = public.t_uid(1)) = 2, 'G7 teto de um usuário não afeta outro');

-- H. Expiração ---------------------------------------------------------------------------------------------------------------
update public.conexoes_mcp set expira_em = now() - interval '1 minute' where nome = 'Claude';
set role anon;
select public.t_ok(not public.validar_token_mcp(public.t_tok(11)), 'H1 expirada é recusada');
select public.t_falha($$select public.criar_rascunho_mcp(public.t_tok(11), 'x', '["x"]'::jsonb)$$, 'Acesso MCP inválido');
reset role;
select public.t_como(1);
set role authenticated;
select public.t_ok((select count(*) from public.listar_conexoes_mcp() where nome = 'Claude') = 0, 'H2 expirada não aparece na lista');
select public.t_ok((public.obter_conexao_mcp() ->> 'total')::integer = 1, 'H3 obter_conexao_mcp conta só as ativas');
reset role;
insert into public.codigos_oauth_mcp(hash, usuario_id, expira_em) values ('code_novo', public.t_uid(1), now() + interval '5 min');
set role service_role;
select public.t_ok(public.trocar_codigo_oauth_mcp('code_novo', public.t_hash(public.t_tok(14)), 'Claude'), 'H4 nova conexão após expiração');
reset role;
select public.t_ok((select count(*) from public.conexoes_mcp where usuario_id = public.t_uid(1) and expira_em <= now()) = 0, 'H5 expirada foi removida no registro');

-- I. Conta não aprovada ---------------------------------------------------------------------------------------------------------
insert into public.codigos_oauth_mcp(hash, usuario_id, expira_em) values ('code_pendente', public.t_uid(3), now() + interval '5 min');
set role service_role;
select public.t_ok(not public.trocar_codigo_oauth_mcp('code_pendente', public.t_hash(public.t_tok(30)), 'X'), 'I1 conta pendente não conecta');
reset role;
select public.t_como(3);
set role authenticated;
select public.t_falha($$select public.definir_token_mcp(public.t_hash(public.t_tok(31)), 'X')$$, 'Conta não aprovada');
reset role;
update public.perfis set status = 'suspenso' where id = public.t_uid(2);
set role anon;
select public.t_ok(not public.validar_token_mcp(public.t_leg(2)), 'I2 conta suspensa perde acesso imediatamente');
reset role;
update public.perfis set status = 'aprovado' where id = public.t_uid(2);

-- J. Privilégios ------------------------------------------------------------------------------------------------------------------------
set role anon;
select public.t_falha($$select * from public.conexoes_mcp$$, 'permission denied');
select public.t_falha($$select * from public.uso_mcp_diario$$, 'permission denied');
select public.t_falha($$select * from public.listar_conexoes_mcp()$$, 'permission denied');
select public.t_falha($$select public.registrar_conexao_mcp(public.t_uid(1), repeat('a', 64), 'x', 'oauth')$$, 'permission denied');
select public.t_falha($$select public.definir_token_mcp(repeat('b', 64), 'x')$$, 'permission denied');
select public.t_falha($$select public.revogar_conexao_mcp(gen_random_uuid())$$, 'permission denied');
reset role;
select public.t_como(1);
set role authenticated;
select public.t_falha($$select * from public.conexoes_mcp$$, 'permission denied');
select public.t_falha($$select * from public.uso_mcp_diario$$, 'permission denied');
select public.t_falha($$select public.registrar_conexao_mcp(public.t_uid(2), repeat('c', 64), 'x', 'oauth')$$, 'permission denied');
select public.t_falha($$select public.trocar_codigo_oauth_mcp('a', 'b', 'c')$$, 'permission denied');
reset role;

-- K. Compatibilidade com o código antigo (chamadas só com os 2 parâmetros originais) --------------------------------------------------------
set role service_role;
select public.t_ok(not public.trocar_codigo_oauth_mcp(hash_codigo => 'inexistente', hash_token => repeat('d', 64)), 'K1 chamada antiga de 2 parâmetros');
reset role;
select public.t_como(1);
set role authenticated;
select public.definir_token_mcp(hash_token => public.t_hash(public.t_tok(40)));
select public.t_ok((select nome from public.listar_conexoes_mcp() where nome = 'Token manual') = 'Token manual', 'K2 nome padrão do token manual');
select public.t_ok((public.obter_conexao_mcp() ->> 'ativo')::boolean, 'K3 obter_conexao_mcp: ativo');
select public.t_ok((public.obter_conexao_mcp() ->> 'expira_em') is not null, 'K4 obter_conexao_mcp: expira_em');
reset role;

-- L. Nome da conexão sanitizado ---------------------------------------------------------------------------------------------------------------------
insert into public.codigos_oauth_mcp(hash, usuario_id, expira_em) values
  ('l1', public.t_uid(2), now() + interval '5 min'), ('l2', public.t_uid(2), now() + interval '5 min'),
  ('l3', public.t_uid(2), now() + interval '5 min'), ('l4', public.t_uid(2), now() + interval '5 min');
set role service_role;
select public.trocar_codigo_oauth_mcp('l1', public.t_hash('l1'), E'  Cla\x07ude\n  ');
select public.trocar_codigo_oauth_mcp('l2', public.t_hash('l2'), null);
select public.trocar_codigo_oauth_mcp('l3', public.t_hash('l3'), repeat('x', 300));
select public.trocar_codigo_oauth_mcp('l4', public.t_hash('l4'), '   ');
reset role;
select public.t_ok(exists(select 1 from public.conexoes_mcp where hash = public.t_hash('l1') and nome = 'Claude'), 'L1 controles removidos e espaços aparados');
select public.t_ok(exists(select 1 from public.conexoes_mcp where hash = public.t_hash('l2') and nome = 'Conexão OAuth'), 'L2 nome ausente');
select public.t_ok(exists(select 1 from public.conexoes_mcp where hash = public.t_hash('l3') and char_length(nome) = 100), 'L3 limitado a 100');
select public.t_ok(exists(select 1 from public.conexoes_mcp where hash = public.t_hash('l4') and nome = 'Conexão OAuth'), 'L4 só espaços');

-- M. Cascata e revogação total ------------------------------------------------------------------------------------------------------------------------
select public.t_como(1);
set role authenticated;
select public.revogar_token_mcp();
select public.t_ok((select count(*) from public.listar_conexoes_mcp()) = 0, 'M1 revogar_token_mcp remove todas as conexões do usuário');
reset role;
set role anon;
select public.t_ok(not public.validar_token_mcp(public.t_leg(1)) and not public.validar_token_mcp(public.t_tok(14)), 'M2 nenhuma sobra');
select public.t_ok(public.validar_token_mcp(public.t_leg(2)), 'M3 outro usuário não é afetado');
reset role;
delete from public.livros where autor_id = public.t_uid(5);
delete from public.perfis where id = public.t_uid(5);
select public.t_ok((select count(*) from public.conexoes_mcp where usuario_id = public.t_uid(5)) = 0, 'M4 apagar o perfil apaga as conexões');
\o
\echo 'testes SQL de conexões: OK'
