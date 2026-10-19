create or replace function public.obter_conexao_mcp() returns jsonb
language sql security definer set search_path = '' as $$
  select jsonb_build_object('ativo', exists(select 1 from public.tokens_mcp where usuario_id = auth.uid() and expira_em > now()),
    'expira_em', (select expira_em from public.tokens_mcp where usuario_id = auth.uid() and expira_em > now()));
$$;
revoke all on function public.obter_conexao_mcp() from public;
grant execute on function public.obter_conexao_mcp() to authenticated;
