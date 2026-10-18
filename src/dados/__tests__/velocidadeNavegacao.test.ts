import { expect, it, vi } from 'vitest';
const contagem = vi.hoisted(() => ({ auth: 0, perfil: 0 }));
vi.mock('../supabaseCliente', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient('https://teste.supabase.co', 'chave-teste', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input) => {
      const url = new URL(String(input));
      const perfil = url.pathname.endsWith('/perfis');
      if (perfil) contagem.perfil++;
      await new Promise(r => setTimeout(r, 30));
      return new Response(JSON.stringify(perfil ? { id: 'autor', status: 'aprovado' } : []), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } },
  });
  vi.spyOn(supabase.auth, 'getUser').mockImplementation(async () => {
    contagem.auth++; await new Promise(r => setTimeout(r, 30));
    return { data: { user: { id: 'autor' } }, error: null } as Awaited<ReturnType<typeof supabase.auth.getUser>>;
  });
  return { supabase, isSupabaseConfigured: true, erroConfiguracaoSupabase: null };
});
import { listarMeusRascunhos, listarMeusLivros, listarFeed, listarContinuarLendo, listarSalvosParaLer } from '../index';
it('compartilha autenticação e perfil entre cinco listas e a navegação seguinte', async () => {
  const inicio = performance.now();
  await Promise.all([listarMeusRascunhos(), listarMeusLivros(), listarFeed(), listarContinuarLendo(), listarSalvosParaLer()]);
  console.log('Medição: 5 listas, autenticação:',contagem.auth,'perfil:',contagem.perfil,'tempo:',Math.round(performance.now()-inicio),'ms');
  expect(contagem.auth).toBe(1);
  expect(contagem.perfil).toBe(1);
  await Promise.all([listarMeusRascunhos(), listarFeed()]);
  expect(contagem.auth).toBe(1);
  expect(contagem.perfil).toBe(1);
});
