import { dividirTextoEmPaginas } from '../../../src/paginacao.ts';
import { obterUrlTomo } from '../_shared/configuracao.ts';

const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { headers, status });
Deno.serve(async req => {
  const app = obterUrlTomo();
  const base = app ? new URL('/api/mcp', app).toString() : `${Deno.env.get('SUPABASE_URL')}/functions/v1/tomo-mcp`;
  const authServer = app ? new URL('/api/mcp-oauth', app).toString() : `${Deno.env.get('SUPABASE_URL')}/functions/v1/mcp-oauth`;
  if (req.method === 'GET' && new URL(req.url).pathname.includes('.well-known/oauth-protected-resource')) return json({ resource: base, authorization_servers: [authServer], scopes_supported: ['rascunhos:criar'], bearer_methods_supported: ['header'] });
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) return new Response(null, { status: 405 });
  const token = req.headers.get('authorization')?.replace(/^Bearer /i, '') || '';
  const negar = () => new Response(JSON.stringify({ error: 'invalid_token' }), { status: 401, headers: { ...headers, 'WWW-Authenticate': `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource", scope="rascunhos:criar"` } });
  if (!/^tomo_[a-f0-9]{64}$/.test(token)) return negar();
  try {
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const validacao = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/validar_token_mcp`, { method: 'POST', headers: { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ token }), signal: AbortSignal.timeout(10000) });
    if (!validacao.ok || await validacao.json() !== true) return negar();
  } catch { return json({ error: 'Serviço indisponível.' }, 503); }
  if (req.method === 'GET') return new Response(null, { status: 405, headers: { Allow: 'POST, DELETE' } });
  // Stateless Streamable HTTP: não mantém sessões nem oferece canal SSE.
  if (req.method === 'DELETE') return new Response(null, { status: 405 });
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
  if (body.id === undefined) return new Response(null, { status: 202 });
  if (body.method === 'initialize') return result({ protocolVersion: '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'tomo', version: '1.0.0' }, instructions: 'Crie histórias como rascunhos privados. Não publique nem leia livros. Peça autorização ao usuário antes de salvar.' });
  if (body.method === 'ping') return result({});
  if (body.method === 'tools/list') return result({ tools: [{ name: 'criar_rascunho', description: 'Salva uma nova história nos rascunhos privados do usuário conectado. Não publica. Máximo de 150.000 caracteres e 100 páginas.', inputSchema: { type: 'object', properties: { titulo: { type: 'string', minLength: 1, maxLength: 200 }, texto: { type: 'string', minLength: 1, maxLength: 150000 } }, required: ['titulo', 'texto'], additionalProperties: false }, annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } }] });
  if (body.method !== 'tools/call') return fail(-32601, 'Método desconhecido.');
  if (body.params?.name !== 'criar_rascunho') return fail(-32602, 'Ferramenta desconhecida.');
  try {
    const args = body.params.arguments;
    if (!args || Object.keys(args).some(k => !['titulo', 'texto'].includes(k)) || typeof args.titulo !== 'string' || !args.titulo.trim() || args.titulo.length > 200 || typeof args.texto !== 'string' || !args.texto.trim() || args.texto.length > 150000) return fail(-32602, 'Informe título e texto dentro dos limites.');
    const paginas = dividirTextoEmPaginas(args.texto);
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
