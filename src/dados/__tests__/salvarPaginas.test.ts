import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ chamadas: [] as string[], falharGravacao: false }));
vi.mock('../supabaseCliente', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient('https://teste.supabase.co', 'anon-teste', { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith('/perfis')) return new Response(JSON.stringify({ id: 'autor', status: 'aprovado' }), { headers: { 'Content-Type': 'application/json' } });
    const metodo = init?.method || 'GET';
    mocks.chamadas.push(metodo + ' ' + url.pathname + url.search);
    if (metodo === 'POST' && mocks.falharGravacao) return new Response(JSON.stringify({ message: 'Gravação indisponível', code: 'XX000' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    return new Response(null, { status: 204 });
  } } });
  vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({ data: { user: { id: 'autor' } }, error: null } as Awaited<ReturnType<typeof supabase.auth.getUser>>);
  return { supabase, isSupabaseConfigured: true, erroConfiguracaoSupabase: null };
});
import { salvarPaginas } from '../index';
beforeEach(() => { mocks.chamadas.length = 0; mocks.falharGravacao = false; });

it('não apaga as páginas antigas quando a gravação falha', async () => {
  mocks.falharGravacao = true;
  await expect(salvarPaginas('livro', [{ numero: 1, texto: 'Nova história' }])).rejects.toThrow('Gravação indisponível');
  expect(mocks.chamadas.some(c => c.startsWith('DELETE'))).toBe(false);
});
it('grava as páginas antes de remover somente as páginas que sobraram', async () => {
  await expect(salvarPaginas('livro', [{ numero: 1, texto: 'Nova história' }])).resolves.toBe(true);
  expect(mocks.chamadas[0]).toContain('POST');
  expect(mocks.chamadas[0]).toContain('on_conflict=livro_id%2Cnumero');
  expect(mocks.chamadas[1]).toContain('DELETE');
  expect(mocks.chamadas[1]).toContain('numero=gt.1');
});
it('não altera o banco com páginas fora da sequência', async () => {
  await expect(salvarPaginas('livro', [{ numero: 2, texto: 'Página sem a primeira' }])).rejects.toThrow('sequência');
  expect(mocks.chamadas).toEqual([]);
});
