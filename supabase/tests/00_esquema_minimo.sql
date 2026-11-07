-- ESQUEMA MÍNIMO SÓ PARA TESTES: imita o que o Tomo já tem (perfis, livros, paginas, usuario_aprovado)
-- e o que o Supabase fornece (roles, auth.uid(), privilégios padrão). NÃO aplique no banco real.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema if not exists auth;
grant usage on schema public, auth to anon, authenticated, service_role;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
-- Como no Supabase: tabelas e funções novas já nascem acessíveis a anon/authenticated/service_role.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

create table public.perfis (id uuid primary key, status text not null default 'pendente');
create table public.livros (id uuid primary key default gen_random_uuid(), autor_id uuid not null references public.perfis(id),
  titulo text not null, situacao text not null, visibilidade text not null);
create table public.paginas (livro_id uuid not null references public.livros(id) on delete cascade, numero integer not null, texto text not null,
  primary key (livro_id, numero));
create or replace function public.usuario_aprovado() returns boolean language sql security definer set search_path = '' as $$
  select exists(select 1 from public.perfis where id = auth.uid() and status = 'aprovado') $$;
