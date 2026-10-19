import { afterEach, beforeEach, expect, it, vi } from 'vitest';

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
const request = (body: unknown, auth = token) => new Request('https://example.supabase.co/functions/v1/tomo-mcp', { method: 'POST', headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
it('informa como autenticar ao consultar o MCP por GET sem token', async () => {
  const resposta = await handler(new Request('https://example.supabase.co/functions/v1/tomo-mcp'));
  expect(resposta.status).toBe(401);
  expect(resposta.headers.get('www-authenticate')).toContain('resource_metadata=');
});
it('exige um token válido e recusa tokens revogados antes de listar ferramentas', async () => {
  expect((await handler(request({ method: 'tools/list' }, 'inválido'))).status).toBe(401);
  fetchMock.mockResolvedValueOnce(new Response('false'));
  expect((await handler(request({ jsonrpc: '2.0', id: 1, method: 'tools/list' }))).status).toBe(401);
});
it('expõe somente criação de rascunhos e impede ferramentas de publicação', async () => {
  const resposta = await (await handler(request({ jsonrpc: '2.0', id: 1, method: 'tools/list' }))).json();
  expect(resposta.result.tools.map((t: any) => t.name)).toEqual(['criar_rascunho']);
  const proibido = await (await handler(request({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'publicar' } }))).json();
  expect(proibido.error.code).toBe(-32602);
});
it('salva páginas inteiras e retorna o identificador do rascunho privado', async () => {
  fetchMock.mockResolvedValueOnce(new Response('true')).mockResolvedValueOnce(new Response('"livro-id"'));
  const texto = 'Uma história. '.repeat(200);
  const resposta = await (await handler(request({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'criar_rascunho', arguments: { titulo: 'Aventura', texto } } }))).json();
  const enviado = JSON.parse(fetchMock.mock.calls[1][1].body);
  expect(enviado.paginas.join('')).toBe(texto);
  expect(enviado.paginas.every((p: string) => p.length <= 1500)).toBe(true);
  expect(JSON.parse(resposta.result.content[0].text)).toMatchObject({ livro_id: 'livro-id', situacao: 'rascunho', visibilidade: 'privado' });
});
