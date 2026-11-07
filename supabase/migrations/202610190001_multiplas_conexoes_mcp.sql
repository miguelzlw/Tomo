-- Várias conexões MCP simultâneas por usuário, com revogação individual.
--
-- Antes: public.tokens_mcp tinha UM token por usuário (usuario_id era a chave primária) e
-- cada nova conexão (OAuth ou token manual) substituía a anterior. Conectar o ChatGPT
-- derrubava o Claude e vice-versa.
--
-- Depois: cada conexão é uma linha em public.conexoes_mcp (token guardado só como SHA-256),
-- o limite diário de 50 rascunhos é somado por usuário em public.uso_mcp_diario, e cada
-- conexão pode ser revogada individualmente.
--
-- Esta migration NÃO apaga public.tokens_mcp: os dados antigos são copiados e a tabela fica
-- parada (sem leitura nem escrita) até você validar tudo. Veja LEIA-ME-IMPLANTACAO.md para o
-- script de remoção posterior e para o rollback.

-- 1) Tabelas --------------------------------------------------------------------------------
create table if not exists public.conexoes_mcp (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  hash text not null unique check (hash ~ '^[a-f0-9]{64}$'),
  nome text not null default 'Conexão MCP' check (char_length(nome) between 1 and 100),
  origem text not null default 'oauth' check (origem in ('oauth', 'manual', 'migrada')),
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null default now() + interval '30 days',
  ultimo_uso_em timestamptz
);
create index if not exists conexoes_mcp_usuario_idx on public.conexoes_mcp(usuario_id, criado_em desc);
alter table public.conexoes_mcp enable row level security;
revoke all on public.conexoes_mcp from anon, authenticated;

-- Limite diário por usuário (soma de todas as conexões).
create table if not exists public.uso_mcp_diario (
  usuario_id uuid primary key references public.perfis(id) on delete cascade,
  dia date not null default current_date,
  usos integer not null default 0 check (usos >= 0)
);
alter table public.uso_mcp_diario enable row level security;
revoke all on public.uso_mcp_diario from anon, authenticated;

-- 2) Migração dos dados atuais (idempotente) ----------------------------------------------------
insert into public.conexoes_mcp(usuario_id, hash, nome, origem, expira_em)
select usuario_id, hash, 'Conexão anterior', 'migrada', expira_em from public.tokens_mcp
on conflict (hash) do nothing;

insert into public.uso_mcp_diario(usuario_id, dia, usos)
select usuario_id, dia, usos from public.tokens_mcp
on conflict (usuario_id) do nothing;

comment on table public.tokens_mcp is 'OBSOLETA desde 202610190001: substituída por conexoes_mcp e uso_mcp_diario. Mantida só para rollback.';

-- 3) Auxiliar interno: registra uma conexão e aplica o teto de 10 por usuário ------------------
-- Remove primeiro as expiradas e depois as MENOS USADAS acima do teto. A conexão recém-criada
-- nunca é removida (é a mais recente).
create or replace function public.registrar_conexao_mcp(usuario uuid, hash_token text, nome_conexao text, origem_conexao text)
returns void language plpgsql security definer set search_path = '' as $$
declare nome_limpo text;
begin
  nome_limpo := left(nullif(btrim(regexp_replace(coalesce(nome_conexao, ''), '[[:cntrl:]]', '', 'g')), ''), 100);
  insert into public.conexoes_mcp(usuario_id, hash, nome, origem)
  values (usuario, hash_token,
    coalesce(nome_limpo, case origem_conexao when 'manual' then 'Token manual' else 'Conexão OAuth' end),
    origem_conexao);
  delete from public.conexoes_mcp where usuario_id = usuario and expira_em <= now();
  delete from public.conexoes_mcp where id in (
    select id from public.conexoes_mcp where usuario_id = usuario
    order by coalesce(ultimo_uso_em, criado_em) desc, criado_em desc offset 10);
end;
$$;
revoke all on function public.registrar_conexao_mcp(uuid, text, text, text) from public, anon, authenticated;

-- 4) Validação do token (mesma assinatura de antes) ---------------------------------------------
create or replace function public.validar_token_mcp(token text) returns boolean
language sql security definer set search_path = '' as $$
  select length(token) <= 100 and exists(select 1 from public.conexoes_mcp c join public.perfis p on p.id = c.usuario_id
    where c.hash = encode(sha256(convert_to(token, 'UTF8')), 'hex') and c.expira_em > now() and p.status = 'aprovado');
$$;
revoke all on function public.validar_token_mcp(text) from public;
grant execute on function public.validar_token_mcp(text) to anon;

-- 5) Token manual: agora ADICIONA uma conexão (assinatura antiga continua valendo pelo default) ----
drop function if exists public.definir_token_mcp(text);
create or replace function public.definir_token_mcp(hash_token text, nome text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.usuario_aprovado() then raise exception 'Conta não aprovada'; end if;
  perform public.registrar_conexao_mcp(auth.uid(), hash_token, nome, 'manual');
end;
$$;
revoke all on function public.definir_token_mcp(text, text) from public, anon;
grant execute on function public.definir_token_mcp(text, text) to authenticated;

-- 6) Troca do código OAuth por conexão (chamada só pela Edge Function, com service_role) ----------
drop function if exists public.trocar_codigo_oauth_mcp(text, text);
create or replace function public.trocar_codigo_oauth_mcp(hash_codigo text, hash_token text, nome_conexao text default null) returns boolean
language plpgsql security definer set search_path = '' as $$
declare autor uuid;
begin
  delete from public.codigos_oauth_mcp where expira_em < now();
  delete from public.codigos_oauth_mcp where hash = hash_codigo and expira_em > now() returning usuario_id into autor;
  if autor is null or not exists(select 1 from public.perfis where id = autor and status = 'aprovado') then return false; end if;
  perform public.registrar_conexao_mcp(autor, hash_token, nome_conexao, 'oauth');
  return true;
end;
$$;
revoke all on function public.trocar_codigo_oauth_mcp(text, text, text) from public, anon, authenticated;
grant execute on function public.trocar_codigo_oauth_mcp(text, text, text) to service_role;

-- 7) Criação do rascunho: limite de 50 por dia SOMADO por usuário, na mesma transação do livro ------
create or replace function public.criar_rascunho_mcp(token text, titulo text, paginas jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare conexao uuid; autor uuid; livro uuid; total integer;
begin
  if length(token) > 100 or length(token) < 60 then raise exception 'Acesso MCP inválido'; end if;
  if titulo is null or length(trim(titulo)) < 1 or length(titulo) > 200 then raise exception 'Título inválido'; end if;
  if jsonb_typeof(paginas) is distinct from 'array' then raise exception 'Páginas inválidas'; end if;
  if jsonb_array_length(paginas) < 1 or jsonb_array_length(paginas) > 100 then raise exception 'Limite de páginas excedido'; end if;
  if exists(select 1 from jsonb_array_elements(paginas) p where jsonb_typeof(p) is distinct from 'string' or length(p #>> '{}') > 1500) then raise exception 'Página inválida'; end if;

  select c.id, c.usuario_id into conexao, autor
  from public.conexoes_mcp c join public.perfis p on p.id = c.usuario_id
  where c.hash = encode(sha256(convert_to(token, 'UTF8')), 'hex') and c.expira_em > now() and p.status = 'aprovado';
  if autor is null then raise exception 'Acesso MCP inválido ou expirado'; end if;

  insert into public.uso_mcp_diario(usuario_id, usos) values (autor, 1)
  on conflict (usuario_id) do update
    set usos = case when public.uso_mcp_diario.dia = current_date then public.uso_mcp_diario.usos + 1 else 1 end, dia = current_date
    where public.uso_mcp_diario.dia <> current_date or public.uso_mcp_diario.usos < 50
  returning usos into total;
  if total is null then raise exception 'Limite diário de 50 rascunhos atingido'; end if;

  update public.conexoes_mcp set ultimo_uso_em = now() where id = conexao;
  insert into public.livros(autor_id, titulo, situacao, visibilidade) values (autor, trim(titulo), 'rascunho', 'privado') returning id into livro;
  insert into public.paginas(livro_id, numero, texto)
    select livro, ord::integer, p #>> '{}' from jsonb_array_elements(paginas) with ordinality as a(p, ord);
  return livro;
end;
$$;
revoke all on function public.criar_rascunho_mcp(text, text, jsonb) from public;
grant execute on function public.criar_rascunho_mcp(text, text, jsonb) to anon;

-- 8) Gerenciamento pelo usuário logado ------------------------------------------------------------
-- Revoga TODAS as conexões (mesma semântica anterior de revogar_token_mcp).
create or replace function public.revogar_token_mcp() returns void
language sql security definer set search_path = '' as $$
  delete from public.conexoes_mcp where usuario_id = auth.uid();
$$;
revoke all on function public.revogar_token_mcp() from public, anon;
grant execute on function public.revogar_token_mcp() to authenticated;

-- Revoga UMA conexão do próprio usuário; devolve false se não existir ou não for dele.
create or replace function public.revogar_conexao_mcp(conexao_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare removidas integer;
begin
  delete from public.conexoes_mcp where id = conexao_id and usuario_id = auth.uid();
  get diagnostics removidas = row_count;
  return removidas > 0;
end;
$$;
revoke all on function public.revogar_conexao_mcp(uuid) from public, anon;
grant execute on function public.revogar_conexao_mcp(uuid) to authenticated;

-- Lista as conexões ativas do usuário (nunca devolve hash).
create or replace function public.listar_conexoes_mcp()
returns table(id uuid, nome text, origem text, criado_em timestamptz, expira_em timestamptz, ultimo_uso_em timestamptz)
language sql security definer set search_path = '' as $$
  select c.id, c.nome, c.origem, c.criado_em, c.expira_em, c.ultimo_uso_em
  from public.conexoes_mcp c where c.usuario_id = auth.uid() and c.expira_em > now()
  order by c.criado_em desc;
$$;
revoke all on function public.listar_conexoes_mcp() from public, anon;
grant execute on function public.listar_conexoes_mcp() to authenticated;

-- Contrato existente de obter_conexao_mcp preservado ('ativo' e 'expira_em'); 'total' é novo.
-- 'expira_em' passa a ser a MAIOR validade entre as conexões ativas.
create or replace function public.obter_conexao_mcp() returns jsonb
language sql security definer set search_path = '' as $$
  select jsonb_build_object(
    'ativo', exists(select 1 from public.conexoes_mcp where usuario_id = auth.uid() and expira_em > now()),
    'expira_em', (select max(expira_em) from public.conexoes_mcp where usuario_id = auth.uid() and expira_em > now()),
    'total', (select count(*) from public.conexoes_mcp where usuario_id = auth.uid() and expira_em > now()));
$$;
revoke all on function public.obter_conexao_mcp() from public, anon;
grant execute on function public.obter_conexao_mcp() to authenticated;
