// Teste ponta a ponta LOCAL: Edge Functions reais (Deno) + PostgreSQL real com a migration.
// Simula Claude e ChatGPT na MESMA conta do Tomo: DCR + OAuth/PKCE + MCP, salva um rascunho por cliente,
// revoga uma conexão e confirma que a outra continua funcionando.
// NÃO substitui o teste com os clientes reais (veja LEIA-ME-IMPLANTACAO.md).
import { spawn, execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
import pg from 'pg';
import { iniciarBackend } from './backend-falso.mjs';

const DENO = process.env.DENO || 'deno';
const raiz = new URL('../../../', import.meta.url).pathname;
const sqlDir = new URL('../', import.meta.url).pathname;
const DB = `tomo_e2e_${process.pid}`;
const P = { backend: 54321, oauth: 54331, mcp: 54332, oauthSubstitui: 54333 };
const RESOURCE = 'https://tomobooks.vercel.app/api/mcp';
const OAUTH = `http://127.0.0.1:${P.oauth}`, MCP = `http://127.0.0.1:${P.mcp}`, OAUTH_SUB = `http://127.0.0.1:${P.oauthSubstitui}`;
const b64u = b => Buffer.from(b).toString('base64url');
const psql = f => execFileSync('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-f', f], { env: { ...process.env, PGDATABASE: DB }, stdio: ['ignore', 'ignore', 'inherit'] });

let falhas = 0, total = 0;
async function passo(nome, fn) { total++; try { await fn(); console.log('  ok  ', nome); } catch (e) { falhas++; console.log('  FALHA', nome, '\n       ', e.message.split('\n').slice(0, 4).join('\n        ')); } }

// ---- infraestrutura -------------------------------------------------------------------------------------------------
execFileSync('createdb', [DB]);
for (const f of ['tests/00_esquema_minimo.sql', 'migrations/202610180001_integracoes_ia.sql', 'migrations/202610180002_status_conexao_mcp.sql', 'tests/01_dados_legados.sql', 'migrations/202610190001_multiplas_conexoes_mcp.sql']) psql(sqlDir + '../' + f.replace(/^tests\//, 'tests/'));
const db = new pg.Pool({ database: DB, max: 2, user: process.env.PGUSER, host: process.env.PGHOST });
const backend = await iniciarBackend({ database: DB, porta: P.backend });
const logs = { oauth: '', oauthSub: '' };
function subir(modulo, porta, extraEnv, destinoLog) {
  const proc = spawn(DENO, ['run', '-A', '--node-modules-dir=none', new URL('launcher.ts', import.meta.url).pathname, raiz + modulo, String(porta)], {
    env: { ...process.env, SUPABASE_URL: `http://127.0.0.1:${P.backend}`, SUPABASE_ANON_KEY: 'ANON', SUPABASE_SERVICE_ROLE_KEY: 'SERVICE', TOMO_APP_URL: 'https://tomobooks.vercel.app', ...extraEnv }, cwd: raiz });
  proc.stderr.on('data', d => { if (destinoLog) logs[destinoLog] += d; });
  return new Promise((ok, erro) => { proc.stdout.on('data', d => { if (destinoLog) logs[destinoLog] += d; if (String(d).includes('pronto')) ok(proc); }); proc.on('exit', c => erro(new Error('processo encerrou ' + c))); setTimeout(() => erro(new Error('timeout ao subir ' + modulo)), 60000); });
}
const procs = await Promise.all([
  subir('supabase/functions/mcp-oauth/index.ts', P.oauth, {}, 'oauth'),
  subir('supabase/functions/mcp-oauth/index.ts', P.oauthSubstitui, { MCP_DCR_SUBSTITUIR_AUTH_POR_NONE: '1' }, 'oauthSub'),
  subir('supabase/functions/tomo-mcp/index.ts', P.mcp, {}),
]);

// ---- utilitários de protocolo ---------------------------------------------------------------------------------------------
const JWT1 = 'Bearer jwt-user-1';
const consentimento = async (request, acao, auth = JWT1) => (await fetch(`${OAUTH}/functions/v1/mcp-oauth`, { method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ request, acao }) })).json();
const registrar = async (nome, redirect, extra = {}, base = OAUTH) => fetch(`${base}/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_name: nome, redirect_uris: [redirect], token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], ...extra }) });
const pkce = () => { const verifier = b64u(randomBytes(32)); return { verifier, challenge: b64u(createHash('sha256').update(verifier).digest()) }; };
const autorizar = (cliente, redirect, challenge, extra = {}) => {
  const q = new URLSearchParams({ response_type: 'code', client_id: cliente, redirect_uri: redirect, code_challenge: challenge, code_challenge_method: 'S256', state: 'estado-123', resource: RESOURCE, scope: 'rascunhos:criar', ...extra });
  for (const [k, v] of [...q]) if (v === '') q.delete(k);
  return fetch(`${OAUTH}/authorize?${q}`, { redirect: 'manual' });
};
async function obterCodigo(cliente, redirect, challenge) {
  const r = await autorizar(cliente, redirect, challenge);
  assert.equal(r.status, 302, 'authorize deve redirecionar ao app do Tomo');
  const pedido = new URL(r.headers.get('location')).searchParams.get('mcp_authorize'); assert.ok(pedido);
  const aprovado = await consentimento(pedido, 'aprovar'); assert.ok(aprovado.redirect, JSON.stringify(aprovado));
  const volta = new URL(aprovado.redirect); assert.equal(volta.searchParams.get('state'), 'estado-123');
  return { codigo: volta.searchParams.get('code'), pedido };
}
const trocar = (campos) => fetch(`${OAUTH}/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(campos) });
async function conectar(nome, redirect) {
  const reg = await registrar(nome, redirect); assert.equal(reg.status, 201); const { client_id } = await reg.json();
  const { verifier, challenge } = pkce(); const { codigo, pedido } = await obterCodigo(client_id, redirect, challenge);
  const detalhes = await consentimento(pedido, 'detalhes'); assert.equal(detalhes.nome, nome); assert.equal(detalhes.destino, new URL(redirect).origin);
  const t = await trocar({ grant_type: 'authorization_code', code: codigo, redirect_uri: redirect, client_id, code_verifier: verifier, resource: RESOURCE });
  assert.equal(t.status, 200); const corpo = await t.json(); assert.match(corpo.access_token, /^tomo_[a-f0-9]{64}$/); assert.equal(corpo.token_type, 'Bearer');
  return { token: corpo.access_token, client_id, redirect };
}
const mcp = (token, body, extra = {}) => fetch(MCP + '/', { method: 'POST', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...extra }, body: JSON.stringify(body) });
const rpc = async (token, method, params, id = 1) => (await mcp(token, { jsonrpc: '2.0', id, method, params })).json();
const salvar = (token, titulo, texto = 'Era uma vez uma história curta.') => rpc(token, 'tools/call', { name: 'criar_rascunho', arguments: { titulo, texto } });
const rest = async (fn, args = {}, auth = JWT1) => (await fetch(`http://127.0.0.1:${P.backend}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: 'ANON', Authorization: auth, 'Content-Type': 'application/json' }, body: JSON.stringify(args) })).json();
const REDIR = { claude: 'https://claude.ai/api/mcp/auth_callback', chatgpt: 'https://chatgpt.com/connector/oauth/cb_abc123' };
let claude, chatgpt;

// ---- descoberta e transporte ---------------------------------------------------------------------------------------------------
console.log('\nDescoberta e transporte');
await passo('401 sem token traz WWW-Authenticate com resource_metadata e CORS', async () => {
  const r = await mcp(null, { jsonrpc: '2.0', id: 1, method: 'tools/list' });
  assert.equal(r.status, 401); assert.match(r.headers.get('www-authenticate'), /resource_metadata="https:\/\/tomobooks\.vercel\.app\/api\/mcp\/\.well-known\/oauth-protected-resource"/);
  assert.equal(r.headers.get('access-control-allow-origin'), '*'); assert.match(r.headers.get('access-control-expose-headers'), /WWW-Authenticate/i);
});
await passo('metadados do recurso protegido (RFC 9728) coerentes', async () => {
  const j = await (await fetch(`${MCP}/.well-known/oauth-protected-resource`)).json();
  assert.equal(j.resource, RESOURCE); assert.deepEqual(j.authorization_servers, ['https://tomobooks.vercel.app/api/mcp-oauth']); assert.deepEqual(j.scopes_supported, ['rascunhos:criar']);
});
await passo('metadados do servidor de autorização (RFC 8414): PKCE S256, none, DCR', async () => {
  const j = await (await fetch(`${OAUTH}/.well-known/oauth-authorization-server`)).json();
  assert.equal(j.issuer, 'https://tomobooks.vercel.app/api/mcp-oauth'); assert.deepEqual(j.code_challenge_methods_supported, ['S256']); assert.deepEqual(j.token_endpoint_auth_methods_supported, ['none']);
  assert.equal(j.registration_endpoint, 'https://tomobooks.vercel.app/api/mcp-oauth/register'); assert.deepEqual(j.grant_types_supported, ['authorization_code']);
});
await passo('preflight CORS (OPTIONS) responde 204 sem exigir token', async () => {
  const r = await fetch(MCP + '/', { method: 'OPTIONS', headers: { Origin: 'https://inspector.local', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type,mcp-protocol-version' } });
  assert.equal(r.status, 204); assert.equal(r.headers.get('access-control-allow-origin'), '*');
  const h = r.headers.get('access-control-allow-headers'); for (const x of ['authorization', 'content-type', 'mcp-protocol-version', 'mcp-session-id']) assert.ok(h.includes(x), x);
  assert.match(r.headers.get('access-control-allow-methods'), /POST/);
});
await passo('preflight CORS também no servidor OAuth', async () => {
  const r = await fetch(`${OAUTH}/token`, { method: 'OPTIONS' }); assert.equal(r.status, 200); assert.match(r.headers.get('access-control-allow-headers'), /mcp-protocol-version/);
});

// ---- registro e autorização (negativos) --------------------------------------------------------------------------------------------
console.log('\nSegurança do OAuth (o que NÃO pode passar)');
await passo('DCR: client_secret_post é recusado por padrão (sem substituição silenciosa)', async () => {
  const r = await registrar('Cliente com segredo', REDIR.chatgpt, { token_endpoint_auth_method: 'client_secret_post' });
  assert.equal(r.status, 400); const j = await r.json(); assert.equal(j.error, 'invalid_client_metadata'); assert.match(j.error_description, /none/);
});
await passo('DCR: redirect_uri insegura (http fora de localhost) é recusada', async () => { const r = await registrar('X', 'http://evil.example/cb'); assert.equal(r.status, 400); assert.equal((await r.json()).error, 'invalid_redirect_uri'); });
await passo('DCR: redirect_uri com fragmento ou credenciais é recusada', async () => { for (const u of ['https://a.example/cb#x', 'https://user:senha@a.example/cb']) assert.equal((await registrar('X', u)).status, 400, u); });
const cl = await (await registrar('Teste', REDIR.claude)).json();
await passo('authorize recusa redirect_uri não registrada (correspondência exata)', async () => {
  for (const r of ['https://claude.ai/api/mcp/auth_callback/', 'https://claude.ai/api/mcp/auth_callback2', 'https://evil.example/cb']) { const x = await autorizar(cl.client_id, r, pkce().challenge); assert.equal(x.status, 400, r); assert.match((await x.json()).error_description, /redirect_uri/); }
});
await passo('authorize exige PKCE S256 (sem challenge, plain ou challenge curto)', async () => {
  const base = `${OAUTH}/authorize?response_type=code&client_id=${encodeURIComponent(cl.client_id)}&redirect_uri=${encodeURIComponent(REDIR.claude)}&state=s`;
  for (const extra of ['', '&code_challenge=' + pkce().challenge, '&code_challenge_method=plain&code_challenge=' + pkce().challenge, '&code_challenge_method=S256&code_challenge=curto']) assert.equal((await fetch(base + extra, { redirect: 'manual' })).status, 400, extra);
});
await passo('authorize recusa resource de outro servidor e scope desconhecido', async () => {
  assert.equal((await autorizar(cl.client_id, REDIR.claude, pkce().challenge, { resource: 'https://evil.example/mcp' })).status, 400);
  assert.equal((await autorizar(cl.client_id, REDIR.claude, pkce().challenge, { scope: 'admin' })).status, 400);
});
await passo('authorize recusa client_id adulterado', async () => { const [a, b] = cl.client_id.split('.'); assert.equal((await autorizar(a + 'x.' + b, REDIR.claude, pkce().challenge)).status, 400); });
await passo('consentimento exige sessão do Tomo (sem login → 401) e conta aprovada (pendente → 403)', async () => {
  const r = await autorizar(cl.client_id, REDIR.claude, pkce().challenge); const pedido = new URL(r.headers.get('location')).searchParams.get('mcp_authorize');
  assert.equal((await fetch(`${OAUTH}/functions/v1/mcp-oauth`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request: pedido, acao: 'aprovar' }) })).status, 401);
  assert.equal((await fetch(`${OAUTH}/functions/v1/mcp-oauth`, { method: 'POST', headers: { Authorization: 'Bearer jwt-user-3', 'Content-Type': 'application/json' }, body: JSON.stringify({ request: pedido, acao: 'aprovar' }) })).status, 403);
});
await passo('negar o consentimento devolve access_denied sem código', async () => {
  const r = await autorizar(cl.client_id, REDIR.claude, pkce().challenge); const pedido = new URL(r.headers.get('location')).searchParams.get('mcp_authorize');
  const j = await consentimento(pedido, 'negar'); const u = new URL(j.redirect); assert.equal(u.searchParams.get('error'), 'access_denied'); assert.equal(u.searchParams.get('code'), null);
});
await passo('token: verifier errado, redirect/client/resource diferentes e reuso do código → invalid_grant', async () => {
  const { verifier, challenge } = pkce(); const ok = { grant_type: 'authorization_code', redirect_uri: REDIR.claude, client_id: cl.client_id, code_verifier: verifier, resource: RESOURCE };
  for (const [rotulo, mudanca] of [['verifier errado', { code_verifier: pkce().verifier }], ['redirect diferente', { redirect_uri: 'https://claude.ai/outra' }], ['client diferente', { client_id: 'outro' }], ['resource diferente', { resource: 'https://evil.example/mcp' }]]) {
    const { codigo } = await obterCodigo(cl.client_id, REDIR.claude, challenge);
    const r = await trocar({ ...ok, code: codigo, ...mudanca }); assert.equal(r.status, 400, rotulo); assert.equal((await r.json()).error, 'invalid_grant', rotulo);
  }
  const { codigo } = await obterCodigo(cl.client_id, REDIR.claude, challenge);
  assert.equal((await trocar({ ...ok, code: codigo })).status, 200); const reuso = await trocar({ ...ok, code: codigo }); assert.equal(reuso.status, 400); assert.equal((await reuso.json()).error, 'invalid_grant');
});
await passo('token: código inventado, sem verifier e grant refresh_token → invalid_grant', async () => {
  for (const campos of [{ grant_type: 'authorization_code', code: 'inventado.xxx', code_verifier: pkce().verifier }, { grant_type: 'authorization_code', code: 'x' }, { grant_type: 'refresh_token', refresh_token: 'x' }]) { const r = await trocar(campos); assert.equal(r.status, 400); assert.equal((await r.json()).error, 'invalid_grant'); }
});

// ---- ACEITE: Claude e ChatGPT na mesma conta ---------------------------------------------------------------------------------------------
console.log('\nACEITE: Claude e ChatGPT na mesma conta do Tomo');
await passo('Claude conecta (DCR + OAuth/PKCE + consentimento)', async () => { claude = await conectar('Claude', REDIR.claude); });
await passo('ChatGPT conecta na mesma conta', async () => { chatgpt = await conectar('ChatGPT', REDIR.chatgpt); });
await passo('os dois tokens são diferentes e AMBOS valem ao mesmo tempo', async () => {
  assert.notEqual(claude.token, chatgpt.token);
  for (const c of [claude, chatgpt]) { const j = await rpc(c.token, 'tools/list'); assert.deepEqual(j.result.tools.map(t => t.name), ['criar_rascunho']); }
});
await passo('initialize negocia a versão do protocolo', async () => {
  for (const [pedida, esperada] of [['2025-06-18', '2025-06-18'], ['2025-03-26', '2025-03-26'], ['2099-01-01', '2025-06-18']]) {
    const j = await rpc(claude.token, 'initialize', { protocolVersion: pedida, capabilities: {}, clientInfo: { name: 't', version: '1' } }); assert.equal(j.result.protocolVersion, esperada);
  }
});
let livroClaude, livroChatgpt;
await passo('Claude salva um rascunho', async () => { const j = await salvar(claude.token, 'História do Claude'); assert.ok(!j.result.isError, JSON.stringify(j)); livroClaude = JSON.parse(j.result.content[0].text); });
await passo('ChatGPT salva um rascunho', async () => { const j = await salvar(chatgpt.token, 'História do ChatGPT'); assert.ok(!j.result.isError, JSON.stringify(j)); livroChatgpt = JSON.parse(j.result.content[0].text); });
await passo('os dois rascunhos são privados, da mesma conta, e têm páginas', async () => {
  for (const [l, titulo] of [[livroClaude, 'História do Claude'], [livroChatgpt, 'História do ChatGPT']]) {
    const r = await db.query('select autor_id, titulo, situacao, visibilidade, (select count(*) from public.paginas p where p.livro_id = l.id)::int as n from public.livros l where id = $1', [l.livro_id]);
    assert.deepEqual({ ...r.rows[0] }, { autor_id: '00000000-0000-0000-0000-000000000001', titulo, situacao: 'rascunho', visibilidade: 'privado', n: 1 });
  }
});
let conexoes;
await passo('a conta lista as conexões com nome e último uso (hash nunca exposto)', async () => {
  conexoes = await rest('listar_conexoes_mcp'); const nomes = conexoes.map(c => c.nome).sort();
  assert.deepEqual(nomes, ['ChatGPT', 'Claude', 'Conexão anterior', 'Teste']); // 'Teste' veio do teste de segurança do /token assert.ok(conexoes.every(c => !('hash' in c)));
  assert.ok(conexoes.filter(c => ['Claude', 'ChatGPT'].includes(c.nome)).every(c => c.ultimo_uso_em), 'último uso preenchido');
});
await passo('outro usuário não vê nem revoga as conexões desta conta', async () => {
  const doOutro = await rest('listar_conexoes_mcp', {}, 'Bearer jwt-user-2'); assert.equal(doOutro.length, 1); assert.equal(doOutro[0].nome, 'Conexão anterior'); assert.ok(!('hash' in doOutro[0]));
  assert.equal(await rest('revogar_conexao_mcp', { conexao_id: conexoes.find(c => c.nome === 'Claude').id }, 'Bearer jwt-user-2'), false);
  assert.equal((await rpc(claude.token, 'tools/list')).result.tools.length, 1);
});
await passo('REVOGAR o ChatGPT: ele recebe 401, o Claude continua funcionando', async () => {
  assert.equal(await rest('revogar_conexao_mcp', { conexao_id: conexoes.find(c => c.nome === 'ChatGPT').id }), true);
  const negado = await mcp(chatgpt.token, { jsonrpc: '2.0', id: 9, method: 'tools/list' }); assert.equal(negado.status, 401); assert.match(negado.headers.get('www-authenticate'), /resource_metadata=/);
  const j = await salvar(claude.token, 'Claude depois da revogação'); assert.ok(!j.result.isError, JSON.stringify(j));
  const novo = await db.query(`select count(*)::int n from public.livros where titulo = 'Claude depois da revogação' and visibilidade = 'privado'`); assert.equal(novo.rows[0].n, 1);
});
await passo('o ChatGPT revogado NÃO consegue salvar nada', async () => {
  const r = await mcp(chatgpt.token, { jsonrpc: '2.0', id: 10, method: 'tools/call', params: { name: 'criar_rascunho', arguments: { titulo: 'Não pode', texto: 'x' } } }); assert.equal(r.status, 401);
  assert.equal((await db.query(`select count(*)::int n from public.livros where titulo = 'Não pode'`)).rows[0].n, 0);
});
await passo('reconectar o ChatGPT cria uma nova conexão sem derrubar o Claude', async () => {
  chatgpt = await conectar('ChatGPT', REDIR.chatgpt);
  assert.ok(!(await salvar(chatgpt.token, 'ChatGPT reconectado')).result.isError); assert.ok(!(await salvar(claude.token, 'Claude segue')).result.isError);
});
await passo('limite diário de 50 é SOMADO entre Claude e ChatGPT e respondido como erro de ferramenta', async () => {
  await db.query(`update public.uso_mcp_diario set dia = current_date, usos = 48 where usuario_id = '00000000-0000-0000-0000-000000000001'`);
  assert.ok(!(await salvar(claude.token, 'Limite 49')).result.isError); assert.ok(!(await salvar(chatgpt.token, 'Limite 50')).result.isError);
  for (const c of [claude, chatgpt]) { const j = await salvar(c.token, 'Limite 51'); assert.equal(j.result.isError, true); assert.match(j.result.content[0].text, /limite de 50/i); }
  assert.equal((await db.query(`select count(*)::int n from public.livros where titulo = 'Limite 51'`)).rows[0].n, 0);
  await db.query(`update public.uso_mcp_diario set usos = 0 where usuario_id = '00000000-0000-0000-0000-000000000001'`);
});
await passo('erro de paginação chega ao cliente com a mensagem real (palavra gigante)', async () => {
  const j = await salvar(claude.token, 'Palavra gigante', 'a'.repeat(1600)); assert.equal(j.result.isError, true); assert.match(j.result.content[0].text, /palavra ultrapassa 1500/i);
});
await passo('revogar TUDO (botão antigo) derruba todas as conexões da conta, e só dela', async () => {
  await rest('revogar_token_mcp'); for (const c of [claude, chatgpt]) assert.equal((await mcp(c.token, { jsonrpc: '2.0', id: 1, method: 'tools/list' })).status, 401);
  assert.equal((await db.query(`select count(*)::int n from public.conexoes_mcp where usuario_id = '00000000-0000-0000-0000-000000000002'`)).rows[0].n, 1);
});

// ---- DCR com client_secret_post: só com a flag ----------------------------------------------------------------------------------------------------
console.log('\nNegociação opcional de DCR (flag MCP_DCR_SUBSTITUIR_AUTH_POR_NONE)');
await passo('com a flag, client_secret_post é registrado como none e o log registra a substituição', async () => {
  const r = await registrar('Cliente com segredo', REDIR.chatgpt, { token_endpoint_auth_method: 'client_secret_post' }, OAUTH_SUB);
  assert.equal(r.status, 201); const j = await r.json(); assert.equal(j.token_endpoint_auth_method, 'none'); assert.equal(j.client_secret, undefined);
  assert.match(logs.oauthSub, /registro_metodo_substituido/);
});
await passo('os logs registram o que cada cliente pede no DCR, sem vazar códigos nem tokens', async () => {
  assert.match(logs.oauth, /"evento":"registro_recebido"[^\n]*"auth_method":"client_secret_post"/); assert.match(logs.oauth, /"evento":"token_emitido"/);
  for (const segredo of [claude.token, chatgpt.token, claude.client_id.split('.')[1]]) assert.ok(!logs.oauth.includes(segredo), 'segredo apareceu nos logs');
});

// ---- encerramento -------------------------------------------------------------------------------------------------------------------------------------------------
procs.forEach(p => p.kill()); await backend.fechar(); await db.end();
execFileSync('dropdb', ['--if-exists', DB]);
console.log(`\n${total - falhas}/${total} verificações passaram`);
process.exit(falhas ? 1 : 0);
