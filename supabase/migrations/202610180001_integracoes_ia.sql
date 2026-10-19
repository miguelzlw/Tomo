-- Tokens MCP são revogáveis e armazenados somente como SHA-256.
create table public.tokens_mcp (
  usuario_id uuid primary key references public.perfis(id) on delete cascade,
  hash text not null unique check (hash ~ '^[a-f0-9]{64}$'),
  expira_em timestamptz not null default now() + interval '30 days',
  dia date not null default current_date,
  usos integer not null default 0
);
alter table public.tokens_mcp enable row level security;
revoke all on public.tokens_mcp from anon, authenticated;

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

-- A única operação concedida ao token cria livro e páginas na mesma transação.
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

create table public.uso_ia (
  usuario_id uuid primary key references public.perfis(id) on delete cascade,
  dia date not null default current_date,
  usos integer not null default 0
);
alter table public.uso_ia enable row level security;
revoke all on public.uso_ia from anon, authenticated;
create or replace function public.reservar_geracao_ia() returns void
language plpgsql security definer set search_path = '' as $$
declare total integer;
begin
  if not public.usuario_aprovado() then raise exception 'Conta não aprovada'; end if;
  insert into public.uso_ia(usuario_id, usos) values(auth.uid(), 1)
  on conflict(usuario_id) do update set usos = case when uso_ia.dia = current_date then uso_ia.usos + 1 else 1 end, dia = current_date
  where uso_ia.dia <> current_date or uso_ia.usos < 20 returning usos into total;
  if total is null then raise exception 'Limite diário de 20 gerações atingido'; end if;
end;
$$;
revoke all on function public.reservar_geracao_ia() from public;
grant execute on function public.reservar_geracao_ia() to authenticated;

-- Códigos OAuth duram cinco minutos e são consumidos uma única vez.
create table public.codigos_oauth_mcp (
  hash text primary key,
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  expira_em timestamptz not null
);
alter table public.codigos_oauth_mcp enable row level security;
revoke all on public.codigos_oauth_mcp from anon, authenticated;

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
