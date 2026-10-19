import { supabase } from './supabaseCliente';

export type ProvedorIA = 'openai' | 'gemini' | 'claude';
export interface DisponibilidadeIA { provedores: ProvedorIA[]; mcpUrl: string; oauthDisponivel: boolean; conexao?: { ativo: boolean; expira_em: string | null } }

export async function consultarConexoesIA(): Promise<DisponibilidadeIA> {
  if (!supabase) throw new Error('As conexões de IA precisam do Supabase configurado.');
  const { data, error } = await supabase.functions.invoke('historias-ia', { body: { acao: 'status' } });
  if (error || data?.erro) throw new Error(data?.erro || 'O serviço de IA ainda não está disponível. Configure a função historias-ia no Supabase.');
  return data;
}

export async function gerarHistoriaIA(provedor: ProvedorIA, pedido: string): Promise<string> {
  if (!supabase) throw new Error('Configure o Supabase para criar histórias com IA.');
  const { data, error } = await supabase.functions.invoke('historias-ia', { body: { acao: 'gerar', provedor, pedido } });
  if (error || data?.erro) throw new Error(data?.erro || 'Não foi possível gerar a história. Confira a conexão e tente novamente.');
  if (typeof data?.texto !== 'string' || !data.texto.trim()) throw new Error('A IA não retornou texto.');
  return data.texto;
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

export async function consentimentoMCP(request: string, acao: 'detalhes' | 'aprovar' | 'negar'): Promise<{ nome?: string; destino?: string; redirect?: string }> {
  if (!supabase) throw new Error('Configure o Supabase para autorizar a conexão.');
  const { data, error } = await supabase.functions.invoke('mcp-oauth', { body: { request, acao } });
  if (error || data?.erro) throw new Error(data?.erro || 'Não foi possível autorizar. Inicie a conexão novamente.');
  return data;
}
