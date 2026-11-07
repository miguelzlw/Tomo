import { afterEach, beforeEach, expect, it, vi } from 'vitest';

// Testes rápidos (sem Deno nem PostgreSQL) do que mudou em tomo-mcp: CORS, negociação de versão e erro de paginação.
let handler: (req: Request) => Promise<Response>;
let fetchMock: ReturnType<typeof vi.fn>;
const token = 'tomo_' + 'a'.repeat(64);
beforeEach(async () => {
  vi.resetModules();
  vi.stubGlobal('Deno', { env: { get: (k: string) => k === 'SUPABASE_URL' ? 'https://example.supabase.co' : k === 'SUPABASE_ANON_KEY' ? 'anon' : undefined }, serve: (h: typeof handler) => { handler = h; } });
  fetchMock = vi.fn().mockImplementation(async () => new Response('true'));
  vi.stubGlobal('fetch', fetchMock);
  await import('../tomo-mcp/index');
});
afterEach(() => vi.unstubAllGlobals());
const post = (body: unknown, auth: string | null = token) => new Request('https://example.supabase.co/functions/v1/tomo-mcp', { method: 'POST', headers: { ...(auth ? { Authorization: `Bearer ${auth}` } : {}), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

it('responde ao preflight CORS sem exigir token e sem consultar o banco', async () => {
  const r = await handler(new Request('https://example.supabase.co/functions/v1/tomo-mcp', { method: 'OPTIONS', headers: { Origin: 'https://inspector.local', 'Access-Control-Request-Method': 'POST' } }));
  expect(r.status).toBe(204);
  expect(r.headers.get('access-control-allow-origin')).toBe('*');
  const permitidos = r.headers.get('access-control-allow-headers')!;
  for (const h of ['authorization', 'content-type', 'mcp-protocol-version', 'mcp-session-id']) expect(permitidos).toContain(h);
  expect(r.headers.get('access-control-allow-methods')).toContain('DELETE');
  expect(fetchMock).not.toHaveBeenCalled();
});
it('inclui CORS no 401, no 405, no 202 e nas respostas JSON-RPC', async () => {
  const semToken = await handler(post({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, null));
  expect(semToken.status).toBe(401);
  expect(semToken.headers.get('access-control-expose-headers')).toContain('WWW-Authenticate');
  const get = await handler(new Request('https://example.supabase.co/functions/v1/tomo-mcp', { headers: { Authorization: `Bearer ${token}` } }));
  expect(get.status).toBe(405); expect(get.headers.get('access-control-allow-origin')).toBe('*');
  const notificacao = await handler(post({ jsonrpc: '2.0', method: 'notifications/initialized' }));
  expect(notificacao.status).toBe(202); expect(notificacao.headers.get('access-control-allow-origin')).toBe('*');
  const lista = await handler(post({ jsonrpc: '2.0', id: 2, method: 'tools/list' }));
  expect(lista.headers.get('access-control-allow-origin')).toBe('*');
});
it('negocia a versão do protocolo: devolve a pedida se suportada, senão a mais recente suportada', async () => {
  const versao = async (pedida: unknown) => (await (await handler(post({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: pedida } }))).json()).result.protocolVersion;
  expect(await versao('2025-06-18')).toBe('2025-06-18');
  expect(await versao('2025-03-26')).toBe('2025-03-26');
  expect(await versao('2024-11-05')).toBe('2024-11-05');
  expect(await versao('2099-01-01')).toBe('2025-06-18');
  expect(await versao(undefined)).toBe('2025-06-18');
});
it('devolve a mensagem real quando o texto não pode ser paginado (palavra maior que uma página)', async () => {
  const r = await (await handler(post({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'criar_rascunho', arguments: { titulo: 'X', texto: 'a'.repeat(1600) } } }))).json();
  expect(r.result.isError).toBe(true);
  expect(r.result.content[0].text).toMatch(/palavra ultrapassa 1500/i);
});
