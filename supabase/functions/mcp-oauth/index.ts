import { createClient } from 'npm:@supabase/supabase-js@2';
import { assinar, verificar, hash, redirectValido } from '../_shared/oauth.ts';
import { obterUrlTomo } from '../_shared/configuracao.ts';

const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, mcp-protocol-version', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
// Logs estruturados para diagnóstico (aparecem nos logs da Edge Function). NUNCA registre códigos, tokens, verifiers ou segredos.
const registrar = (evento: string, dados: Record<string, unknown> = {}) => console.log(JSON.stringify({ evento, ...dados }));
const origemSegura = (valor: unknown) => { try { return new URL(String(valor)).origin; } catch { return 'inválida'; } };
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  const url = new URL(req.url);
  const app = obterUrlTomo();
  const base = app ? new URL('/api/mcp-oauth', app).toString() : `${Deno.env.get('SUPABASE_URL')}/functions/v1/mcp-oauth`;
  const resource = app ? new URL('/api/mcp', app).toString() : `${Deno.env.get('SUPABASE_URL')}/functions/v1/tomo-mcp`;
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const exp = (minutes: number) => Math.floor(Date.now() / 1000) + minutes * 60;
  const cliente = createClient(Deno.env.get('SUPABASE_URL')!, secret);
  try {
    if (req.method === 'GET' && url.pathname.includes('.well-known/oauth-authorization-server')) return json({ issuer: base, authorization_endpoint: `${base}/authorize`, token_endpoint: `${base}/token`, registration_endpoint: `${base}/register`, response_types_supported: ['code'], grant_types_supported: ['authorization_code'], code_challenge_methods_supported: ['S256'], token_endpoint_auth_methods_supported: ['none'], scopes_supported: ['rascunhos:criar'] });
    if (req.method === 'GET' && url.pathname.endsWith('/authorize')) {
      const p = Object.fromEntries(url.searchParams);
      const client = await verificar(p.client_id || '', secret, 'client');
      const motivo = p.response_type !== 'code' ? 'response_type deve ser code'
        : p.code_challenge_method !== 'S256' ? 'PKCE com code_challenge_method=S256 é obrigatório'
        : !/^[A-Za-z0-9_-]{43}$/.test(p.code_challenge || '') ? 'code_challenge inválido'
        : !client.redirects.includes(p.redirect_uri) ? 'redirect_uri não está registrada para este cliente'
        : (p.resource && p.resource !== resource) ? 'resource não corresponde a este servidor'
        : (p.scope && p.scope !== 'rascunhos:criar') ? 'scope não suportado (use rascunhos:criar)'
        : (p.state?.length ?? 0) > 2048 ? 'state muito longo' : '';
      if (motivo) { registrar('authorize_recusado', { motivo, cliente: client.nome, destino: origemSegura(p.redirect_uri) }); return json({ error: 'invalid_request', error_description: motivo }, 400); }
      if (!app || !redirectValido(app)) return json({ error: 'server_error', error_description: 'Configure TOMO_APP_URL no servidor.' }, 503);
      const request = await assinar({ tipo: 'consent', exp: exp(10), client_id: p.client_id, nome: client.nome, redirect_uri: p.redirect_uri, challenge: p.code_challenge, state: p.state || '', resource }, secret);
      const destino = new URL(app); destino.searchParams.set('mcp_authorize', request);
      return Response.redirect(destino.toString(), 302);
    }
    if (req.method !== 'POST') return json({ error: 'invalid_request' }, 405);
    const raw = await req.text();
    if (raw.length > 20000) return json({ error: 'invalid_request' }, 413);
    const body = req.headers.get('content-type')?.includes('application/x-www-form-urlencoded') ? Object.fromEntries(new URLSearchParams(raw)) : JSON.parse(raw);
    if (url.pathname.endsWith('/register')) {
      // Diagnóstico: o que cada cliente (Claude, ChatGPT, outros) pede ao se registrar. Só metadados públicos.
      registrar('registro_recebido', { cliente: typeof body.client_name === 'string' ? body.client_name.slice(0, 100) : null, auth_method: body.token_endpoint_auth_method ?? null, grant_types: body.grant_types ?? null, response_types: body.response_types ?? null, scope: body.scope ?? null, destinos: Array.isArray(body.redirect_uris) ? body.redirect_uris.map(origemSegura) : null });
      if (!Array.isArray(body.redirect_uris) || !body.redirect_uris.length || body.redirect_uris.length > 10 || !body.redirect_uris.every(redirectValido)) return json({ error: 'invalid_redirect_uri', error_description: 'Informe de 1 a 10 redirect_uris https (ou http em localhost) sem usuário, senha ou fragmento.' }, 400);
      // O Tomo só aceita clientes públicos com PKCE (token_endpoint_auth_method=none). Se um cliente pedir outro método
      // (ex.: client_secret_post) o padrão é RECUSAR. A RFC 7591 §3.2.1 permite o servidor substituir o valor e responder
      // com o que foi registrado, mas só ative MCP_DCR_SUBSTITUIR_AUTH_POR_NONE=1 depois de confirmar, com o cliente real,
      // que ele conclui o fluxo com a substituição (veja LEIA-ME-IMPLANTACAO.md).
      const metodo = body.token_endpoint_auth_method;
      const substituir = Deno.env.get('MCP_DCR_SUBSTITUIR_AUTH_POR_NONE') === '1';
      if (metodo && metodo !== 'none') {
        if (!substituir) return json({ error: 'invalid_client_metadata', error_description: 'token_endpoint_auth_method suportado: none (cliente público com PKCE S256).' }, 400);
        registrar('registro_metodo_substituido', { pedido: metodo, registrado: 'none' });
      }
      const client_id = await assinar({ tipo: 'client', exp: exp(525600), redirects: body.redirect_uris, nome: typeof body.client_name === 'string' ? body.client_name.slice(0, 100) : 'Aplicativo de IA' }, secret);
      return json({ client_id, client_name: body.client_name, redirect_uris: body.redirect_uris, token_endpoint_auth_method: 'none', grant_types: ['authorization_code'], response_types: ['code'] }, 201);
    }
    if (url.pathname.endsWith('/token')) {
      const recusarToken = (motivo: string) => { registrar('token_recusado', { motivo, grant_type: body.grant_type ?? null }); return json({ error: 'invalid_grant', error_description: motivo }, 400); };
      if (body.grant_type !== 'authorization_code') return recusarToken('grant_type suportado: authorization_code');
      if (typeof body.code_verifier !== 'string' || !/^[A-Za-z0-9._~-]{43,128}$/.test(body.code_verifier)) return recusarToken('code_verifier inválido');
      let code: any;
      try { code = await verificar(body.code || '', secret, 'code'); } catch { return recusarToken('código inválido ou expirado'); }
      if (body.client_id !== code.client_id) return recusarToken('client_id não corresponde ao código');
      if (body.redirect_uri !== code.redirect_uri) return recusarToken('redirect_uri não corresponde ao código');
      if (await hash(body.code_verifier) !== code.challenge) return recusarToken('code_verifier não confere com o code_challenge (PKCE)');
      if (body.resource && body.resource !== resource) return recusarToken('resource não corresponde a este servidor');
      const token = 'tomo_' + crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
      const hex = async (v: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v))), b => b.toString(16).padStart(2, '0')).join('');
      const { data, error } = await cliente.rpc('trocar_codigo_oauth_mcp', { hash_codigo: await hash(body.code), hash_token: await hex(token), nome_conexao: typeof code.nome === 'string' ? code.nome : null });
      if (error || data !== true) return recusarToken(error ? 'não foi possível concluir a conexão' : 'código já usado, expirado ou conta não aprovada');
      registrar('token_emitido', { cliente: typeof code.nome === 'string' ? code.nome : null });
      return json({ access_token: token, token_type: 'Bearer', expires_in: 2592000, scope: 'rascunhos:criar' });
    }
    // Consentimento exige a sessão real do usuário e uma conta aprovada.
    const { data: { user }, error } = await cliente.auth.getUser((req.headers.get('authorization') || '').replace(/^Bearer /i, ''));
    if (error || !user) return json({ erro: 'Entre no Tomo para conectar a IA.' }, 401);
    const { data: perfil } = await cliente.from('perfis').select('status').eq('id', user.id).single();
    if (perfil?.status !== 'aprovado') return json({ erro: 'Sua conta precisa estar aprovada.' }, 403);
    const consent = await verificar(body.request || '', secret, 'consent');
    if (body.acao === 'detalhes') return json({ nome: consent.nome, destino: new URL(consent.redirect_uri).origin });
    if (!['aprovar', 'negar'].includes(body.acao)) return json({ erro: 'Ação inválida.' }, 400);
    const destino = new URL(consent.redirect_uri); destino.searchParams.set('state', consent.state);
    if (body.acao === 'negar') destino.searchParams.set('error', 'access_denied');
    else {
      const code = await assinar({ tipo: 'code', exp: exp(5), nonce: crypto.randomUUID(), client_id: consent.client_id, nome: consent.nome, redirect_uri: consent.redirect_uri, challenge: consent.challenge, resource }, secret);
      const { error } = await cliente.from('codigos_oauth_mcp').insert({ hash: await hash(code), usuario_id: user.id, expira_em: new Date(Date.now() + 300000).toISOString() });
      if (error) return json({ erro: 'Não foi possível autorizar a conexão.' }, 503);
      destino.searchParams.set('code', code);
    }
    return json({ redirect: destino.toString() });
  } catch (e) { registrar('erro_oauth', { rota: url.pathname.split('/').pop(), motivo: e instanceof Error ? e.message : 'erro' }); return json({ error: 'invalid_request', erro: 'A autorização é inválida ou expirou. Inicie a conexão novamente.' }, 400); }
});
