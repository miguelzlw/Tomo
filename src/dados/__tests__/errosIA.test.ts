import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('../supabaseCliente', () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
import { consultarConexoesIA, gerarHistoriaIA } from '../ia';

beforeEach(() => vi.clearAllMocks());

it.each([
  [429, 'A cota compartilhada da IA foi atingida. Tente novamente mais tarde.'],
  [403, 'Sua conta precisa estar aprovada.'],
  [401, 'Entre novamente na sua conta.'],
])('preserva a mensagem recebida no erro HTTP %s', async (status, erro) => {
  mocks.invoke.mockResolvedValue({ data: null, error: { context: new Response(JSON.stringify({ erro }), { status }) } });
  await expect(gerarHistoriaIA('gemini', 'Uma aventura')).rejects.toThrow(erro);
  expect(mocks.invoke).toHaveBeenCalledOnce();
});

it('mantém erro acionável se a resposta de infraestrutura não for JSON', async () => {
  mocks.invoke.mockResolvedValue({ data: null, error: { context: new Response('<html>502</html>', { status: 502 }) } });
  await expect(gerarHistoriaIA('gemini', 'Uma aventura')).rejects.toThrow('Não foi possível gerar');
});

it('não consome o corpo original ao ler o erro de disponibilidade', async () => {
  const resposta = new Response(JSON.stringify({ erro: 'Entre novamente na sua conta.' }), { status: 401 });
  mocks.invoke.mockResolvedValue({ data: null, error: { context: resposta } });
  await expect(consultarConexoesIA()).rejects.toThrow('Entre novamente');
  expect(resposta.bodyUsed).toBe(false);
});
