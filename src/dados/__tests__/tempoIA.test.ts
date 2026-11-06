import { afterEach, expect, it, vi } from 'vitest';

const rede = vi.hoisted(() => ({ iniciou: vi.fn() }));
vi.mock('../supabaseCliente', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient('https://teste.supabase.co', 'anon-teste', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (_input, init) => {
      rede.iniciou();
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Conexão interrompida', 'AbortError')), { once: true });
      });
    } },
  });
  return { supabase };
});
import { consultarConexoesIA, gerarHistoriaIA } from '../ia';
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

it.each([
  { nome: 'consulta', executar: consultarConexoesIA, prazo: 15000, mensagem: 'Não foi possível consultar' },
  { nome: 'geração', executar: () => gerarHistoriaIA('gemini', 'Uma aventura'), prazo: 70000, mensagem: 'Não foi possível gerar' },
])('encerra $nome se a rede não responder, sem repetir o pedido', async ({ executar, prazo, mensagem }) => {
  vi.useFakeTimers();
  const resultado = expect(executar()).rejects.toThrow(mensagem);
  await vi.advanceTimersByTimeAsync(prazo);
  await resultado;
  expect(rede.iniciou).toHaveBeenCalledOnce();
});
