-- ROLLBACK de 202610190001_multiplas_conexoes_mcp.sql (rode manualmente; não é uma migration).
-- Volta ao modelo antigo de UM token por usuário. Para cada usuário, mantém a conexão ativa
-- usada/criada mais recentemente; as demais perdem acesso (limitação do modelo antigo).
-- As tabelas novas NÃO são apagadas (para não perder dados); apague-as depois, se quiser.
begin;

insert into public.tokens_mcp(usuario_id, hash, expira_em, dia, usos)
select distinct on (c.usuario_id) c.usuario_id, c.hash, c.expira_em, coalesce(u.dia, current_date), coalesce(u.usos, 0)
from public.conexoes_mcp c left join public.uso_mcp_diario u on u.usuario_id = c.usuario_id
where c.expira_em > now()
order by c.usuario_id, coalesce(c.ultimo_uso_em, c.criado_em) desc, c.criado_em desc
on conflict (usuario_id) do update set hash = excluded.hash, expira_em = excluded.expira_em, dia = excluded.dia, usos = excluded.usos;

drop function if exists public.registrar_conexao_mcp(uuid, text, text, text);
drop function if exists public.revogar_conexao_mcp(uuid);
drop function if exists public.listar_conexoes_mcp();
drop function if exists public.definir_token_mcp(text, text);
drop function if exists public.trocar_codigo_oauth_mcp(text, text, text);

create or replace function public.validar_token_mcp(token text) returns boolean
language sql security definer set search_path = '' as $$
  select length(token) <= 100 and exists(select 1 from public.tokens_mcp t join public.perfis p on p.id = t.usuario_id
    where t.hash = encode(sha256(convert_to(token, 'UTF8')), 'hex') and t.expira_em > now() and p.status = 'aprovado');
$$;
revoke all on function public.validar_token_mcp(text) from public;
grant execute on function public.validar_token_mcp(text) to anon;

create or replace function public.definir_token_mcp(hash_token text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.usuario_aprovado() then raise exception 'Conta não aprovada'; end if;
  insert into public.tokens_mcp(usuario_id, hash) values (auth.uid(), hash_token)
  on conflict (usuario_id) do update set hash = excluded.hash, expira_em = now() + interval '30 days';
end;
$$;
revoke all on function public.definir_token_mcp(text) from public;
grant execute on function public.definir_token_mcp(text) to authenticated;

create or replace function public.revogar_token_mcp() returns void
language sql security definer set search_path = '' as $$
  delete from public.tokens_mcp where usuario_id = auth.uid();
$$;
revoke all on function public.revogar_token_mcp() from public;
grant execute on function public.revogar_token_mcp() to authenticated;

create or replace function public.criar_rascunho_mcp(token text, titulo text, paginas jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare autor uuid; livro uuid;
begin
  if length(token) > 100 or length(token) < 60 then raise exception 'Acesso MCP inválido'; end if;
  if titulo is null or length(trim(titulo)) < 1 or length(titulo) > 200 then raise exception 'Título inválido'; end if;
  if jsonb_typeof(paginas) is distinct from 'array' then raise exception 'Páginas inválidas'; end if;
  if jsonb_array_length(paginas) < 1 or jsonb_array_length(paginas) > 100 then raise exception 'Limite de páginas excedido'; end if;
  if exists(select 1 from jsonb_array_elements(paginas) p where jsonb_typeof(p) is distinct from 'string' or length(p #>> '{}') > 1500) then raise exception 'Página inválida'; end if;
  update public.tokens_mcp t set usos = case when t.dia = current_date then t.usos + 1 else 1 end, dia = current_date
  where t.hash = encode(sha256(convert_to(token, 'UTF8')), 'hex') and t.expira_em > now()
    and (t.dia <> current_date or t.usos < 50)
    and exists(select 1 from public.perfis p where p.id = t.usuario_id and p.status = 'aprovado')
  returning t.usuario_id into autor;
  if autor is null then raise exception 'Acesso MCP inválido, expirado ou limite diário atingido'; end if;
  insert into public.livros(autor_id, titulo, situacao, visibilidade) values (autor, trim(titulo), 'rascunho', 'privado') returning id into livro;
  insert into public.paginas(livro_id, numero, texto)
    select livro, ord::integer, p #>> '{}' from jsonb_array_elements(paginas) with ordinality as a(p, ord);
  return livro;
end;
$$;
revoke all on function public.criar_rascunho_mcp(text,text,jsonb) from public;
grant execute on function public.criar_rascunho_mcp(text,text,jsonb) to anon;

create or replace function public.trocar_codigo_oauth_mcp(hash_codigo text, hash_token text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare autor uuid;
begin
  delete from public.codigos_oauth_mcp where expira_em < now();
  delete from public.codigos_oauth_mcp where hash = hash_codigo and expira_em > now() returning usuario_id into autor;
  if autor is null or not exists(select 1 from public.perfis where id = autor and status = 'aprovado') then return false; end if;
  insert into public.tokens_mcp(usuario_id, hash) values(autor, hash_token)
  on conflict(usuario_id) do update set hash = excluded.hash, expira_em = now() + interval '30 days';
  return true;
end;
$$;
revoke all on function public.trocar_codigo_oauth_mcp(text,text) from public, anon, authenticated;
grant execute on function public.trocar_codigo_oauth_mcp(text,text) to service_role;

create or replace function public.obter_conexao_mcp() returns jsonb
language sql security definer set search_path = '' as $$
  select jsonb_build_object('ativo', exists(select 1 from public.tokens_mcp where usuario_id = auth.uid() and expira_em > now()),
    'expira_em', (select expira_em from public.tokens_mcp where usuario_id = auth.uid() and expira_em > now()));
$$;
revoke all on function public.obter_conexao_mcp() from public;
grant execute on function public.obter_conexao_mcp() to authenticated;

commit;
