import { supabase } from './supabaseCliente';

export type ProvedorIA = 'openai' | 'gemini' | 'claude';
export interface DisponibilidadeIA { provedores: ProvedorIA[]; mcpUrl: string; oauthDisponivel: boolean; mcpDisponivel?: boolean; conexao?: { ativo: boolean; expira_em: string | null } }

async function mensagemDaFuncao(data: unknown, error: unknown, padrao: string): Promise<string> {
  const mensagem = (valor: unknown) => {
    if (!valor || typeof valor !== 'object' || !('erro' in valor)) return null;
    return typeof valor.erro === 'string' && valor.erro.trim() ? valor.erro.slice(0, 500) : null;
  };
  const direta = mensagem(data);
  if (direta) return direta;
  const contexto = error && typeof error === 'object' && 'context' in error ? error.context : null;
  if (contexto instanceof Response) {
    try { return mensagem(await contexto.clone().json()) || padrao; } catch { /* Proxy/offline responses may not be JSON. */ }
  }
  return padrao;
}

export async function consultarConexoesIA(): Promise<DisponibilidadeIA> {
  if (!supabase) throw new Error('As conexões de IA precisam do Supabase configurado.');
  const { data, error } = await supabase.functions.invoke('historias-ia', { body: { acao: 'status' }, timeout: 15000 });
  if (error || data?.erro) throw new Error(await mensagemDaFuncao(data, error, 'Não foi possível consultar a IA. Confira sua conexão e tente novamente.'));
  return data;
}

export async function gerarHistoriaIA(provedor: ProvedorIA, pedido: string): Promise<string> {
  return (await gerarTrechoHistoriaIA(provedor, pedido)).texto;
}

export async function gerarTrechoHistoriaIA(provedor: ProvedorIA, pedido: string, anterior?: string): Promise<{ texto: string; continuar: boolean }> {
  if (!supabase) throw new Error('Configure o Supabase para criar histórias com IA.');
  const { data, error } = await supabase.functions.invoke('historias-ia', { body: { acao: 'gerar', provedor, pedido, ...(anterior ? { anterior } : {}) }, timeout: 70000 });
  if (error || data?.erro) throw new Error(await mensagemDaFuncao(data, error, 'Não foi possível gerar a história. Confira a conexão e tente novamente.'));
  if (typeof data?.texto !== 'string' || !data.texto.trim()) throw new Error('A IA não retornou texto.');
  return { texto: data.texto, continuar: data.continuar === true };
}

export async function criarTokenMCP(): Promise<string> {
  if (!supabase) throw new Error('Configure o Supabase para conectar por MCP.');
  const token = 'tomo_' + crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
  const bytes = new TextEncoder().encode(token);
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
  const { error } = await supabase.rpc('definir_token_mcp', { hash_token: hash });
  if (error) throw new Error('Não foi possível criar o acesso MCP. Verifique se a migração de integrações foi aplicada.');
  return token;
}

export async function revogarTokenMCP(): Promise<void> {
  if (!supabase) throw new Error('Configure o Supabase para gerenciar MCP.');
  const { error } = await supabase.rpc('revogar_token_mcp');
  if (error) throw new Error('Não foi possível revogar o acesso. Tente novamente.');
}

export interface ConexaoMCP { id: string; nome: string; origem: 'oauth' | 'manual' | 'migrada'; criado_em: string; expira_em: string; ultimo_uso_em: string | null }

export async function listarConexoesMCP(): Promise<ConexaoMCP[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('listar_conexoes_mcp');
  if (error) throw new Error('Não foi possível listar as conexões. Verifique se a migração de múltiplas conexões foi aplicada.');
  return (data ?? []) as ConexaoMCP[];
}

export async function revogarConexaoMCP(id: string): Promise<boolean> {
  if (!supabase) throw new Error('Configure o Supabase para gerenciar MCP.');
  const { data, error } = await supabase.rpc('revogar_conexao_mcp', { conexao_id: id });
  if (error) throw new Error('Não foi possível revogar a conexão. Tente novamente.');
  if (data !== true) throw new Error('A conexão não foi encontrada na sua conta. Atualize a lista e tente novamente.');
  return true;
}

export async function consentimentoMCP(request: string, acao: 'detalhes' | 'aprovar' | 'negar'): Promise<{ nome?: string; destino?: string; redirect?: string }> {
  if (!supabase) throw new Error('Configure o Supabase para autorizar a conexão.');
  const { data, error } = await supabase.functions.invoke('mcp-oauth', { body: { request, acao } });
  if (error || data?.erro) throw new Error(data?.erro || 'Não foi possível autorizar. Inicie a conexão novamente.');
  return data;
}
