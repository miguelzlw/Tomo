import { describe, it, expect, vi } from 'vitest';

vi.mock('../supabaseCliente', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient('https://teste.supabase.co', 'chave-teste', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input) => {
      const url = new URL(String(input));
      const select = url.searchParams.get('select') || '';
      if (select.includes('autor:perfis(')) {
        return new Response(JSON.stringify({ code: 'PGRST201', message: 'Relação ambígua' }), { status: 300 });
      }
      const livro = { id: 'livro', autor_id: 'autor', titulo: 'Livro salvo', autor: { id: 'autor' } };
      const tabela = url.pathname.split('/').pop();
      const data = tabela === 'perfis' ? { id: 'autor', status: 'aprovado' }
        : tabela === 'progresso_leitura' || tabela === 'salvos' ? [{ livro }]
        : tabela === 'buscas_recentes' ? []
        : url.searchParams.has('id') ? livro : [livro];
      return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } },
  });
  vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({ data: { user: { id: 'autor' } }, error: null } as Awaited<ReturnType<typeof supabase.auth.getUser>>);
  return { supabase, isSupabaseConfigured: true, erroConfiguracaoSupabase: null };
});

import { listarMeusRascunhos, listarMeusLivros, listarFeed, listarLixeira,
  listarLivrosDoAutor, obterLivroPorId, listarContinuarLendo, listarSalvosParaLer,
  buscarLivrosEPerfis } from '../index';

describe('Leitura de livros com mais de uma relação entre livros e perfis', () => {
  it.each([
    ['rascunhos', listarMeusRascunhos], ['lançados', listarMeusLivros],
    ['feed', listarFeed], ['lixeira', listarLixeira],
    ['autor', () => listarLivrosDoAutor('autor')],
    ['continuar lendo', listarContinuarLendo], ['salvos', listarSalvosParaLer],
  ])('exibe os registros em %s', async (_, consultar) => {
    expect(await consultar()).toHaveLength(1);
  });
  it('abre o livro salvo', async () => {
    expect(await obterLivroPorId('livro')).toMatchObject({ id: 'livro' });
  });
  it('encontra o livro na busca', async () => {
    expect((await buscarLivrosEPerfis('Livro')).livros).toHaveLength(1);
  });
});
