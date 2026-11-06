import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn(), perfil: vi.fn() }));
vi.mock('npm:@supabase/supabase-js@2', () => ({
  createClient: () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc,
    from: () => ({ select: () => ({ eq: () => ({ single: mocks.perfil }) }) }) }),
}));
let handler: (req: Request) => Promise<Response>;
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(async () => {
  vi.resetModules(); vi.clearAllMocks();
  vi.stubGlobal('Deno', { env: { get: (key: string) => ({ SUPABASE_URL: 'https://teste.supabase.co', SUPABASE_ANON_KEY: 'anon', GEMINI_API_KEY: 'chave-apenas-de-teste', GEMINI_MODEL: 'gemini-3.5-flash-lite' } as Record<string, string>)[key] }, serve: (fn: typeof handler) => { handler = fn; } });
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'autor' } }, error: null });
  mocks.perfil.mockResolvedValue({ data: { status: 'aprovado' }, error: null });
  mocks.rpc.mockResolvedValue({ data: { ativo: false }, error: null });
  fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'Uma história curta.' }] } }] })));
  vi.stubGlobal('fetch', fetchMock);
  await import('../historias-ia/index');
});
afterEach(() => vi.unstubAllGlobals());
const pedido = (body: unknown) => new Request('https://teste.supabase.co/functions/v1/historias-ia', { method: 'POST', headers: { Authorization: 'Bearer sessao-de-teste', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
it('disponibiliza Gemini sem devolver sua chave ao navegador', async () => {
  const response = await handler(pedido({ acao: 'status' }));
  const texto = await response.text();
  expect(JSON.parse(texto).provedores).toEqual(['gemini']);
  expect(texto).not.toContain('chave-apenas-de-teste');
  expect(fetchMock).not.toHaveBeenCalled();
});
it('gera pelo Gemini após reservar a cota da conta', async () => {
  const response = await handler(pedido({ acao: 'gerar', provedor: 'gemini', pedido: 'Uma aventura' }));
  expect(await response.json()).toEqual({ texto: 'Uma história curta.' });
  expect(mocks.rpc).toHaveBeenCalledWith('reservar_geracao_ia');
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');
});
it('não faz chamada ao Google quando a conta esgota seu limite', async () => {
  mocks.rpc.mockResolvedValue({ error: { message: 'Limite diário de 20 gerações atingido' } });
  const response = await handler(pedido({ acao: 'gerar', provedor: 'gemini', pedido: 'Uma aventura' }));
  expect(response.status).toBe(429);
  expect(fetchMock).not.toHaveBeenCalled();
});
it('cota Google esgotada retorna 429 sem repetir nem trocar para outro provedor', async () => {
  fetchMock.mockResolvedValue(new Response('{}', { status: 429 }));
  const response = await handler(pedido({ acao: 'gerar', provedor: 'gemini', pedido: 'Uma aventura' }));
  expect(response.status).toBe(429);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it('não permite gerar para usuário não aprovado', async () => {
  mocks.perfil.mockResolvedValue({ data: { status: 'pendente' }, error: null });
  const response = await handler(pedido({ acao: 'gerar', provedor: 'gemini', pedido: 'Uma aventura' }));
  expect(response.status).toBe(403);
  expect(fetchMock).not.toHaveBeenCalled();
});

it('consulta Gemini mesmo se a consulta de conexões MCP falhar', async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: { message: 'MCP indisponível' } });
  const response = await handler(pedido({ acao: 'status' }));
  expect(response.status).toBe(200);
  expect((await response.json()).provedores).toEqual(['gemini']);
  expect(fetchMock).not.toHaveBeenCalled();
});

it('não apresenta erro técnico no banco como cota esgotada', async () => {
  mocks.rpc.mockResolvedValue({ error: { message: 'Database unavailable' } });
  const response = await handler(pedido({ acao: 'gerar', provedor: 'gemini', pedido: 'Uma aventura' }));
  expect(response.status).toBe(503);
  expect(fetchMock).not.toHaveBeenCalled();
});

it('explica bloqueio do provedor sem tratá-lo como indisponibilidade do servidor', async () => {
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ candidates: [{ finishReason: 'SAFETY' }] })));
  const response = await handler(pedido({ acao: 'gerar', provedor: 'gemini', pedido: 'Uma aventura' }));
  expect(response.status).toBe(422);
  expect((await response.json()).erro).toContain('Reformule');
  expect(fetchMock).toHaveBeenCalledOnce();
});
