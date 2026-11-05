import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../supabaseCliente', () => ({ supabase: { rpc: mocks.rpc } }));
import { listarConexoesMCP, revogarConexaoMCP } from '../ia';

beforeEach(() => vi.clearAllMocks());

it('não confirma revogação quando o servidor não encontra uma conexão do usuário', async () => {
  mocks.rpc.mockResolvedValue({ data: false, error: null });
  await expect(revogarConexaoMCP('outra-conexao')).rejects.toThrow('não foi encontrada');
});

it('confirma a revogação somente após o servidor remover a conexão', async () => {
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  await expect(revogarConexaoMCP('minha-conexao')).resolves.toBe(true);
  expect(mocks.rpc).toHaveBeenCalledWith('revogar_conexao_mcp', { conexao_id: 'minha-conexao' });
});

it('distingue uma lista vazia de uma consulta que falhou', async () => {
  mocks.rpc.mockResolvedValueOnce({ data: [], error: null });
  await expect(listarConexoesMCP()).resolves.toEqual([]);
  mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: 'RPC indisponível' } });
  await expect(listarConexoesMCP()).rejects.toThrow('Não foi possível listar');
});
