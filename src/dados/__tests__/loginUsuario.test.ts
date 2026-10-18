import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), setSession: vi.fn(), signInWithPassword: vi.fn() }));
vi.mock('../supabaseCliente', () => ({
  isSupabaseConfigured: true, erroConfiguracaoSupabase: null,
  supabase: { functions: { invoke: mocks.invoke }, auth: { setSession: mocks.setSession, signInWithPassword: mocks.signInWithPassword },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'autor', nome_usuario: 'miguel' }, error: null }) }) }) }) },
}));
import { entrarConta } from '../index';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.invoke.mockResolvedValue({ data: { access_token: 'access', refresh_token: 'refresh' }, error: null });
  mocks.setSession.mockResolvedValue({ data: { user: { id: 'autor' } }, error: null });
  mocks.signInWithPassword.mockResolvedValue({ data: { user: { id: 'autor' } }, error: null });
});
it('normaliza o usuário e persiste somente a sessão autenticada pelo servidor', async () => {
  expect((await entrarConta(' Miguel ', 'senha')).sucesso).toBe(true);
  expect(mocks.invoke).toHaveBeenCalledWith('entrar-usuario', { body: { usuario: 'miguel', senha: 'senha' } });
  expect(mocks.setSession).toHaveBeenCalledWith({ access_token: 'access', refresh_token: 'refresh' });
  expect(mocks.signInWithPassword).not.toHaveBeenCalled();
});
it('mantém o acesso por e-mail direto', async () => {
  expect((await entrarConta(' Autor@Teste.com ', 'senha')).sucesso).toBe(true);
  expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: 'autor@teste.com', password: 'senha' });
  expect(mocks.invoke).not.toHaveBeenCalled();
});
it('não cria sessão com credenciais rejeitadas', async () => {
  mocks.invoke.mockResolvedValue({ data: null, error: { message: 'Invalid credentials' } });
  expect((await entrarConta('miguel', 'errada')).sucesso).toBe(false);
  expect(mocks.setSession).not.toHaveBeenCalled();
});
