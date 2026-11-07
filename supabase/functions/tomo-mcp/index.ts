import { dividirTextoEmPaginas } from '../../../src/paginacao.ts';
import { obterUrlTomo } from '../_shared/configuracao.ts';

// CORS: o acesso é por token Bearer (sem cookies), então qualquer origem pode chamar; o token continua obrigatório.
// Clientes em navegador (ex.: MCP Inspector) precisam do preflight OPTIONS e dos cabeçalhos do protocolo MCP.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, accept, mcp-protocol-version, mcp-session-id, last-event-id, apikey, x-client-info',
  'Access-Control-Expose-Headers': 'WWW-Authenticate, Mcp-Session-Id',
  'Access-Control-Max-Age': '86400',
};
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { headers, status });
const vazio = (status: number, extra: Record<string, string> = {}) => new Response(null, { status, headers: { ...CORS, ...extra } });
// Versões do protocolo que este servidor (somente tools, sem sessão) atende.
const VERSOES_MCP = ['2025-06-18', '2025-03-26', '2024-11-05'];
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  const app = obterUrlTomo();
  const base = app ? new URL('/api/mcp', app).toString() : `${Deno.env.get('SUPABASE_URL')}/functions/v1/tomo-mcp`;
  const authServer = app ? new URL('/api/mcp-oauth', app).toString() : `${Deno.env.get('SUPABASE_URL')}/functions/v1/mcp-oauth`;
  if (req.method === 'GET' && new URL(req.url).pathname.includes('.well-known/oauth-protected-resource')) return json({ resource: base, authorization_servers: [authServer], scopes_supported: ['rascunhos:criar'], bearer_methods_supported: ['header'] });
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) return vazio(405);
  const token = req.headers.get('authorization')?.replace(/^Bearer /i, '') || '';
  const negar = () => new Response(JSON.stringify({ error: 'invalid_token' }), { status: 401, headers: { ...headers, 'WWW-Authenticate': `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource", scope="rascunhos:criar"` } });
  if (!/^tomo_[a-f0-9]{64}$/.test(token)) return negar();
  try {
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const validacao = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/validar_token_mcp`, { method: 'POST', headers: { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ token }), signal: AbortSignal.timeout(10000) });
    if (!validacao.ok || await validacao.json() !== true) return negar();
  } catch { return json({ error: 'Serviço indisponível.' }, 503); }
  if (req.method === 'GET') return vazio(405, { Allow: 'POST, DELETE' });
  // Stateless Streamable HTTP: não mantém sessões nem oferece canal SSE.
  if (req.method === 'DELETE') return vazio(405);
  let body: any;
  try {
    const raw = await req.text();
    if (raw.length > 200000) return json({ error: 'Pedido muito grande.' }, 413);
    body = JSON.parse(raw);
  } catch { return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON inválido.' } }); }
  const id = body?.id ?? null;
  const result = (result: unknown) => json({ jsonrpc: '2.0', id, result });
  const fail = (code: number, message: string) => json({ jsonrpc: '2.0', id, error: { code, message } });
  if (!body || Array.isArray(body) || body.jsonrpc !== '2.0' || typeof body.method !== 'string') return fail(-32600, 'Pedido inválido.');
  if (body.id === undefined) return vazio(202);
  if (body.method === 'initialize') return result({ protocolVersion: VERSOES_MCP.includes(body.params?.protocolVersion) ? body.params.protocolVersion : VERSOES_MCP[0], capabilities: { tools: {} }, serverInfo: { name: 'tomo', version: '1.0.0' }, instructions: 'Crie histórias como rascunhos privados. Não publique nem leia livros. Peça autorização ao usuário antes de salvar.' });
  if (body.method === 'ping') return result({});
  if (body.method === 'tools/list') return result({ tools: [{ name: 'criar_rascunho', description: 'Salva uma nova história nos rascunhos privados do usuário conectado. Não publica. Máximo de 150.000 caracteres e 100 páginas.', inputSchema: { type: 'object', properties: { titulo: { type: 'string', minLength: 1, maxLength: 200 }, texto: { type: 'string', minLength: 1, maxLength: 150000 } }, required: ['titulo', 'texto'], additionalProperties: false }, annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } }] });
  if (body.method !== 'tools/call') return fail(-32601, 'Método desconhecido.');
  if (body.params?.name !== 'criar_rascunho') return fail(-32602, 'Ferramenta desconhecida.');
  try {
    const args = body.params.arguments;
    if (!args || Object.keys(args).some(k => !['titulo', 'texto'].includes(k)) || typeof args.titulo !== 'string' || !args.titulo.trim() || args.titulo.length > 200 || typeof args.texto !== 'string' || !args.texto.trim() || args.texto.length > 150000) return fail(-32602, 'Informe título e texto dentro dos limites.');
    let paginas: string[];
    try { paginas = dividirTextoEmPaginas(args.texto); }
    catch (e) { return result({ isError: true, content: [{ type: 'text', text: e instanceof Error ? e.message : 'Não foi possível dividir o texto em páginas.' }] }); }
    if (paginas.length > 100) return fail(-32602, 'A história excede 100 páginas.');
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const resposta = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/criar_rascunho_mcp`, { method: 'POST', headers: { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ token, titulo: args.titulo, paginas }), signal: AbortSignal.timeout(20000) });
    if (!resposta.ok) return result({ isError: true, content: [{ type: 'text', text: 'Não foi possível salvar. Verifique se o token está ativo, a conta está aprovada e o limite de 50 histórias por dia não foi atingido.' }] });
    const livroId = await resposta.json();
    return result({ content: [{ type: 'text', text: JSON.stringify({ livro_id: livroId, situacao: 'rascunho', visibilidade: 'privado', paginas: paginas.length }) }] });
  } catch {
    return result({ isError: true, content: [{ type: 'text', text: 'Não foi possível salvar a história. Revise o tamanho do texto e tente novamente.' }] });
  }
});
