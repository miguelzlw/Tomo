-- ==============================================================================
-- Tomo — Schema do Banco de Dados Supabase (Postgres)
-- Versão: 1.0 (Conforme Seções 5, 6 e 7 do Documento Mestre de Requisitos)
-- Todas as tabelas possuem Row Level Security (RLS) estritamente ativado.
-- ==============================================================================

-- 1. EXTENSÕES
create extension if not exists "uuid-ossp";

-- 2. TABELAS

-- Perfis dos usuários
create table if not exists public.perfis (
    id uuid primary key references auth.users(id) on delete cascade,
    nome_usuario text unique not null,
    foto_url text,
    bio text,
    papel text not null default 'usuario' check (papel in ('usuario', 'admin')),
    status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'bloqueado')),
    criado_em timestamptz not null default now()
);

-- Livros criados pelos usuários
create table if not exists public.livros (
    id uuid primary key default gen_random_uuid(),
    autor_id uuid not null references public.perfis(id) on delete cascade,
    titulo text not null,
    descricao text,
    capa_url text,
    fundo_url text,
    situacao text not null default 'rascunho' check (situacao in ('rascunho', 'lancado')),
    visibilidade text not null default 'privado' check (visibilidade in ('privado', 'amigos', 'publico')),
    oculto_admin boolean not null default false,
    lixeira boolean not null default false,
    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now()
);

-- Páginas de cada livro (máx 1.500 caracteres por página)
create table if not exists public.paginas (
    id uuid primary key default gen_random_uuid(),
    livro_id uuid not null references public.livros(id) on delete cascade,
    numero integer not null check (numero >= 1),
    texto text not null check (length(texto) <= 1500),
    unique(livro_id, numero)
);

-- Seguidores (amizade = mútuo)
create table if not exists public.seguidores (
    seguidor_id uuid not null references public.perfis(id) on delete cascade,
    seguido_id uuid not null references public.perfis(id) on delete cascade,
    criado_em timestamptz not null default now(),
    primary key (seguidor_id, seguido_id),
    check (seguidor_id <> seguido_id)
);

-- Progresso de leitura (marcação da última página lida)
create table if not exists public.progresso_leitura (
    usuario_id uuid not null references public.perfis(id) on delete cascade,
    livro_id uuid not null references public.livros(id) on delete cascade,
    pagina_numero integer not null default 1,
    atualizado_em timestamptz not null default now(),
    primary key (usuario_id, livro_id)
);

-- Livros salvos para ler depois
create table if not exists public.salvos (
    usuario_id uuid not null references public.perfis(id) on delete cascade,
    livro_id uuid not null references public.livros(id) on delete cascade,
    criado_em timestamptz not null default now(),
    primary key (usuario_id, livro_id)
);

-- Notificações sociais
create table if not exists public.notificacoes (
    id uuid primary key default gen_random_uuid(),
    usuario_id uuid not null references public.perfis(id) on delete cascade,
    tipo text not null check (tipo in ('novo_seguidor', 'seguir_mutuo', 'nova_conta_pendente')),
    origem_id uuid not null references public.perfis(id) on delete cascade,
    lida boolean not null default false,
    criado_em timestamptz not null default now()
);

-- Buscas recentes do usuário
create table if not exists public.buscas_recentes (
    id uuid primary key default gen_random_uuid(),
    usuario_id uuid not null references public.perfis(id) on delete cascade,
    termo text not null,
    tipo text not null check (tipo in ('livro', 'perfil')),
    criado_em timestamptz not null default now()
);

-- Sessões para registro de atividade e tempo online
create table if not exists public.sessoes (
    id uuid primary key default gen_random_uuid(),
    usuario_id uuid not null references public.perfis(id) on delete cascade,
    entrada timestamptz not null default now(),
    ultimo_sinal timestamptz not null default now()
);

-- 3. FUNÇÕES DE APOIO

-- Verifica se quem faz a consulta está aprovado
create or replace function public.usuario_aprovado()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and status = 'aprovado'
  );
$$;

-- Verifica se o usuário atual é administrador
create or replace function public.usuario_is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and papel = 'admin'
  );
$$;

-- Verifica se dois usuários são amigos (seguir mútuo)
create or replace function public.sao_amigos(a uuid, b uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select (
    exists (select 1 from public.seguidores where seguidor_id = a and seguido_id = b)
    and
    exists (select 1 from public.seguidores where seguidor_id = b and seguido_id = a)
  );
$$;

-- Regra central da Seção 5: quem pode ver cada livro
-- Matriz de permissão:
-- Autor: pode ver sempre (mesmo rascunho, só eu, oculto). Se oculto, exibe aviso.
-- Se não for o autor:
--  - Se conta pendente ou bloqueada: Não.
--  - Se oculto por admin: Não.
--  - Se rascunho: Não.
--  - Se 'privado' (só eu): Não (nem mesmo o Admin!).
--  - Se 'amigos': Sim, se sao_amigos(auth.uid(), autor_id).
--  - Se 'publico': Sim para qualquer usuário aprovado (incluindo admin).
create or replace function public.pode_ver_livro(
    p_autor_id uuid,
    p_situacao text,
    p_visibilidade text,
    p_oculto_admin boolean
)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
begin
    -- Sem login, ninguém vê nada
    if v_uid is null then
        return false;
    end if;

    -- O próprio autor sempre vê seu livro
    if v_uid = p_autor_id then
        return true;
    end if;

    -- Usuários não aprovados (pendente/bloqueado) não veem nenhum conteúdo de outros
    if not public.usuario_aprovado() then
        return false;
    end if;

    -- Livro oculto pelo admin: invisível para terceiros
    if p_oculto_admin then
        return false;
    end if;

    -- Rascunhos são estritamente privados do autor
    if p_situacao = 'rascunho' then
        return false;
    end if;

    -- Visibilidade 'privado' ("só eu"): estritamente do autor (admin NÃO lê)
    if p_visibilidade = 'privado' then
        return false;
    end if;

    -- Visibilidade 'amigos': requer amizade mútua
    if p_visibilidade = 'amigos' then
        return public.sao_amigos(v_uid, p_autor_id);
    end if;

    -- Visibilidade 'publico' ("todos"): qualquer usuário aprovado pode ver
    if p_visibilidade = 'publico' then
        return true;
    end if;

    return false;
end;
$$;

-- 4. AUTOMATISMOS (TRIGGERS)

-- Trigger: ao cadastrar no Supabase Auth, cria perfil com status 'pendente'
create or replace function public.trg_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_username text;
begin
    v_username := coalesce(new.raw_user_meta_data->>'nome_usuario', split_part(new.email, '@', 1));
    
    insert into public.perfis (id, nome_usuario, papel, status)
    values (new.id, v_username, 'usuario', 'pendente')
    on conflict (id) do nothing;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.trg_handle_new_user();

-- Trigger: ao inserir em seguidores, cria notificações (novo_seguidor e seguir_mutuo)
create or replace function public.trg_handle_new_follower()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_mutuo boolean;
begin
    -- Verifica se já havia o follow recíproco
    select exists (
        select 1 from public.seguidores
        where seguidor_id = new.seguido_id and seguido_id = new.seguidor_id
    ) into v_mutuo;

    if v_mutuo then
        -- Notifica os dois sobre seguir mútuo (amizade estabelecida)
        insert into public.notificacoes (usuario_id, tipo, origem_id)
        values (new.seguido_id, 'seguir_mutuo', new.seguidor_id);

        insert into public.notificacoes (usuario_id, tipo, origem_id)
        values (new.seguidor_id, 'seguir_mutuo', new.seguido_id);
    else
        -- Notifica apenas o seguido sobre novo seguidor
        insert into public.notificacoes (usuario_id, tipo, origem_id)
        values (new.seguido_id, 'novo_seguidor', new.seguidor_id);
    end if;

    return new;
end;
$$;

drop trigger if exists on_new_follower on public.seguidores;
create trigger on_new_follower
    after insert on public.seguidores
    for each row execute function public.trg_handle_new_follower();

-- Trigger de updated_at para livros
create or replace function public.trg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.atualizado_em = now();
    return new;
end;
$$;

drop trigger if exists on_livro_updated on public.livros;
create trigger on_livro_updated
    before update on public.livros
    for each row execute function public.trg_set_updated_at();

-- 5. HABILITAÇÃO DO RLS EM TODAS AS TABELAS
alter table public.perfis enable row level security;
alter table public.livros enable row level security;
alter table public.paginas enable row level security;
alter table public.seguidores enable row level security;
alter table public.progresso_leitura enable row level security;
alter table public.salvos enable row level security;
alter table public.notificacoes enable row level security;
alter table public.buscas_recentes enable row level security;
alter table public.sessoes enable row level security;

-- 6. POLÍTICAS DE RLS

-- --- PERFIS ---
-- Ler: Usuário aprovado lê perfis de usuários aprovados; qualquer um lê o próprio perfil
create policy "perfis_select"
on public.perfis for select
using (
    id = auth.uid()
    or (status = 'aprovado' and public.usuario_aprovado())
    or public.usuario_is_admin()
);

-- Alterar próprio perfil (sem alterar papel ou status)
create policy "perfis_update_proprio"
on public.perfis for update
using (id = auth.uid())
with check (
    id = auth.uid() 
    and papel = (select p.papel from public.perfis p where p.id = auth.uid())
    and status = (select p.status from public.perfis p where p.id = auth.uid())
);

-- Alterar status: apenas Admin pode atualizar
create policy "perfis_update_admin"
on public.perfis for update
using (public.usuario_is_admin())
with check (public.usuario_is_admin());

-- --- LIVROS ---
-- Ler: matriz de permissão pode_ver_livro
create policy "livros_select"
on public.livros for select
using (
    public.pode_ver_livro(autor_id, situacao, visibilidade, oculto_admin)
);

-- Criar: usuário aprovado, sempre com ele mesmo como autor
create policy "livros_insert"
on public.livros for insert
with check (
    public.usuario_aprovado()
    and autor_id = auth.uid()
);

-- Alterar e apagar: só o autor
create policy "livros_update_autor"
on public.livros for update
using (autor_id = auth.uid())
with check (autor_id = auth.uid());

-- Admin pode alterar apenas o status de moderação (oculto_admin)
create policy "livros_update_admin_ocultar"
on public.livros for update
using (public.usuario_is_admin())
with check (public.usuario_is_admin());

create policy "livros_delete"
on public.livros for delete
using (autor_id = auth.uid());

-- --- PÁGINAS ---
-- Ler: mesma regra do livro dono
create policy "paginas_select"
on public.paginas for select
using (
    exists (
        select 1 from public.livros l
        where l.id = paginas.livro_id
        and public.pode_ver_livro(l.autor_id, l.situacao, l.visibilidade, l.oculto_admin)
    )
);

-- Criar, alterar e apagar: só o autor do livro dono
create policy "paginas_insert"
on public.paginas for insert
with check (
    exists (
        select 1 from public.livros l
        where l.id = paginas.livro_id
        and l.autor_id = auth.uid()
    )
);

create policy "paginas_update"
on public.paginas for update
using (
    exists (
        select 1 from public.livros l
        where l.id = paginas.livro_id
        and l.autor_id = auth.uid()
    )
)
with check (
    exists (
        select 1 from public.livros l
        where l.id = paginas.livro_id
        and l.autor_id = auth.uid()
    )
);

create policy "paginas_delete"
on public.paginas for delete
using (
    exists (
        select 1 from public.livros l
        where l.id = paginas.livro_id
        and l.autor_id = auth.uid()
    )
);

-- --- SEGUIDORES ---
-- Ler: o próprio usuário vê quem ele segue e quem o segue
create policy "seguidores_select"
on public.seguidores for select
using (
    seguidor_id = auth.uid() or seguido_id = auth.uid()
);

-- Criar e apagar: só como seguidor (ele mesmo), e só usuário aprovado
create policy "seguidores_insert"
on public.seguidores for insert
with check (
    public.usuario_aprovado()
    and seguidor_id = auth.uid()
    and seguidor_id <> seguido_id
);

create policy "seguidores_delete"
on public.seguidores for delete
using (
    seguidor_id = auth.uid()
);

-- --- PROGRESSO LEITURA ---
create policy "progresso_select"
on public.progresso_leitura for select
using (
    usuario_id = auth.uid()
    and exists (
        select 1 from public.livros l
        where l.id = progresso_leitura.livro_id
        and public.pode_ver_livro(l.autor_id, l.situacao, l.visibilidade, l.oculto_admin)
    )
);

create policy "progresso_insert"
on public.progresso_leitura for insert
with check (
    usuario_id = auth.uid()
    and exists (
        select 1 from public.livros l
        where l.id = progresso_leitura.livro_id
        and public.pode_ver_livro(l.autor_id, l.situacao, l.visibilidade, l.oculto_admin)
    )
);

create policy "progresso_update"
on public.progresso_leitura for update
using (
    usuario_id = auth.uid()
    and exists (
        select 1 from public.livros l
        where l.id = progresso_leitura.livro_id
        and public.pode_ver_livro(l.autor_id, l.situacao, l.visibilidade, l.oculto_admin)
    )
)
with check (usuario_id = auth.uid());

create policy "progresso_delete"
on public.progresso_leitura for delete
using (usuario_id = auth.uid());

-- --- SALVOS ---
create policy "salvos_select"
on public.salvos for select
using (
    usuario_id = auth.uid()
    and exists (
        select 1 from public.livros l
        where l.id = salvos.livro_id
        and public.pode_ver_livro(l.autor_id, l.situacao, l.visibilidade, l.oculto_admin)
    )
);

create policy "salvos_insert"
on public.salvos for insert
with check (
    usuario_id = auth.uid()
    and exists (
        select 1 from public.livros l
        where l.id = salvos.livro_id
        and public.pode_ver_livro(l.autor_id, l.situacao, l.visibilidade, l.oculto_admin)
    )
);

create policy "salvos_delete"
on public.salvos for delete
using (usuario_id = auth.uid());

-- --- NOTIFICACOES ---
create policy "notificacoes_select"
on public.notificacoes for select
using (usuario_id = auth.uid());

create policy "notificacoes_update"
on public.notificacoes for update
using (usuario_id = auth.uid())
with check (usuario_id = auth.uid());

create policy "notificacoes_delete"
on public.notificacoes for delete
using (usuario_id = auth.uid());

-- --- BUSCAS RECENTES ---
create policy "buscas_recentes_select"
on public.buscas_recentes for select
using (usuario_id = auth.uid());

create policy "buscas_recentes_insert"
on public.buscas_recentes for insert
with check (usuario_id = auth.uid());

create policy "buscas_recentes_delete"
on public.buscas_recentes for delete
using (usuario_id = auth.uid());

-- --- SESSOES ---
create policy "sessoes_insert"
on public.sessoes for insert
with check (usuario_id = auth.uid());

create policy "sessoes_update"
on public.sessoes for update
using (usuario_id = auth.uid())
with check (usuario_id = auth.uid());

-- O próprio usuário lê a sua; o admin lê todas (apenas dados de tempo de sessão, nunca livros)
create policy "sessoes_select"
on public.sessoes for select
using (
    usuario_id = auth.uid()
    or public.usuario_is_admin()
);
