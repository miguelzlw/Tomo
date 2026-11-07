import { createClient } from 'npm:@supabase/supabase-js@2';
import { extrairTextoIA, provedores, requisicaoIA, validarPedido } from '../_shared/ia.ts';
import { obterUrlTomo } from '../_shared/configuracao.ts';

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const responder = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return responder({ erro: 'Método não permitido.' }, 405);
  try {
    if (Number(req.headers.get('content-length')) > 4 * 1024 * 1024) return responder({ erro: 'Este pedido ultrapassa a capacidade de uma única requisição. Divida a ideia em partes.' }, 413);
    const auth = req.headers.get('authorization') || '';
    const url = Deno.env.get('SUPABASE_URL')!;
    const cliente = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: { user }, error } = await cliente.auth.getUser(auth.replace(/^Bearer /i, ''));
    if (error || !user) return responder({ erro: 'Entre novamente na sua conta.' }, 401);
    const { data: perfil, error: erroPerfil } = await cliente.from('perfis').select('status').eq('id', user.id).single();
    if (erroPerfil) return responder({ erro: 'Não foi possível verificar sua conta agora. Tente novamente mais tarde.' }, 503);
    if (perfil?.status !== 'aprovado') return responder({ erro: 'Sua conta precisa estar aprovada.' }, 403);
    const raw = await req.text();
    if (new TextEncoder().encode(raw).byteLength > 4 * 1024 * 1024) return responder({ erro: 'Este pedido ultrapassa a capacidade de uma única requisição. Divida a ideia em partes.' }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return responder({ erro: 'Pedido inválido.' }, 400); }
    const config = (p: string) => ({ chave: Deno.env.get(`${p.toUpperCase()}_API_KEY`), modelo: Deno.env.get(`${p.toUpperCase()}_MODEL`) });
    if (body?.acao === 'status') {
      const app = obterUrlTomo();
      const { data: conexao, error: erroConexao } = await cliente.rpc('obter_conexao_mcp');
      return responder({ provedores: provedores.filter(p => config(p).chave && config(p).modelo), mcpUrl: app ? new URL('/api/mcp', app).toString() : `${url}/functions/v1/tomo-mcp`, oauthDisponivel: Boolean(app), mcpDisponivel: !erroConexao, conexao: erroConexao ? undefined : conexao });
    }
    if (body?.acao !== 'gerar') return responder({ erro: 'Ação inválida.' }, 400);
    let pedido;
    try { pedido = validarPedido(body); } catch (e) { return responder({ erro: (e as Error).message }, 400); }
    const { chave, modelo } = config(pedido.provedor);
    if (!chave || !modelo) return responder({ erro: 'Esta IA ainda não foi configurada pelo administrador.' }, 503);
    const { error: limite } = await cliente.rpc('reservar_geracao_ia');
    if (limite) {
      if (limite.message === 'Limite diário de 20 gerações atingido') return responder({ erro: 'Você atingiu o limite de 20 tentativas de hoje. Volte amanhã para criar mais histórias.' }, 429);
      if (limite.message === 'Conta não aprovada') return responder({ erro: 'Sua conta precisa estar aprovada.' }, 403);
      return responder({ erro: 'Não foi possível verificar seu limite agora. Tente novamente mais tarde.' }, 503);
    }
    const chamada = requisicaoIA(pedido.provedor, modelo, chave, pedido.pedido, pedido.anterior);
    const resultado = await fetch(chamada.url, { method: 'POST', headers: chamada.headers, body: JSON.stringify(chamada.body), signal: AbortSignal.timeout(55000) });
    if (!resultado.ok) return responder({ erro: resultado.status === 429 ? 'A cota compartilhada da IA foi atingida. Tente novamente mais tarde.' : 'A IA não conseguiu gerar a história. Tente novamente mais tarde ou avise o administrador.' }, resultado.status === 429 ? 429 : 502);
    const resposta = await resultado.json();
    try { return responder({ texto: extrairTextoIA(pedido.provedor, resposta), ...(pedido.provedor === 'gemini' && resposta.candidates?.[0]?.finishReason === 'MAX_TOKENS' ? { continuar: true } : {}) }); }
    catch (e) { return responder({ erro: e instanceof Error ? e.message : 'A IA não concluiu a história. Reformule o pedido.' }, 422); }
  } catch {
    return responder({ erro: 'Não foi possível concluir a história. Tente um pedido mais curto ou tente novamente mais tarde.' }, 503);
  }
});
