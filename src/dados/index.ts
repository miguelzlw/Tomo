import { ConsultasCompartilhadas } from './consultasCompartilhadas';
// ==============================================================================
// Tomo — Camada Única de Acesso a Dados (Data Access Layer)
// RNF-08: Nenhuma tela ou componente importa o Supabase diretamente.
// Todo acesso ao modelo de dados é centralizado e isolado aqui.
// ==============================================================================

import { supabase, isSupabaseConfigured, erroConfiguracaoSupabase } from './supabaseCliente';
import type {
  Perfil,
  Livro,
  Pagina,
  ProgressoLeitura,
  LivroSalvo,
  Notificacao,
  BuscaRecente,
  Sessao,
  StatusPerfil,
} from './tipos';

export * from './tipos';
export * from './ia';
export { isSupabaseConfigured, erroConfiguracaoSupabase };

// ------------------------------------------------------------------------------
// Fallback Local Storage para desenvolvimento/demonstração quando sem chaves
// ------------------------------------------------------------------------------
const STORAGE_PREFIX = 'tomo_';

function carregarLocal<T>(chave: string, padrao: T): T {
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + chave);
    return item ? JSON.parse(item) : padrao;
  } catch {
    return padrao;
  }
}

function salvarLocal<T>(chave: string, valor: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + chave, JSON.stringify(valor));
  } catch (err) {
    console.error(`Erro ao salvar no storage local (${chave}):`, err);
  }
}

function gerarId(prefixo: string): string {
  return `${prefixo}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

export function definirUsuarioSessao(usuarioId: string | null): void {
  salvarLocal('sessao_atual', usuarioId);
}

function carregarPerfisComGarantiaAdmin(): Perfil[] {
  let perfis = carregarLocal<Perfil[]>('perfis', []);
  const perfisReais = perfis.filter((p) => p.id !== 'admin-id-demo');
  if (perfisReais.length > 0 && !perfisReais.some((p) => p.papel === 'admin')) {
    perfisReais[0].papel = 'admin';
    perfisReais[0].status = 'aprovado';
    salvarLocal('perfis', perfis);
  }
  return perfis;
}

interface CredencialAuth {
  id: string;
  email: string;
  senha: string;
  nome_usuario: string;
}

// ------------------------------------------------------------------------------
// 1. AUTENTICAÇÃO E PERFIS
// ------------------------------------------------------------------------------

export async function cadastrarConta(email: string, senha: string, nomeUsuario: string): Promise<{ sucesso: boolean; mensagem?: string; perfil?: Perfil | null }> {
  if (erroConfiguracaoSupabase) return { sucesso: false, mensagem: erroConfiguracaoSupabase };
  const nomeLimpo = nomeUsuario.trim().toLowerCase();
  const emailLimpo = email.trim().toLowerCase();

  if (!nomeLimpo) {
    return { sucesso: false, mensagem: 'Nome de usuário é obrigatório.' };
  }
  if (!emailLimpo) {
    return { sucesso: false, mensagem: 'E-mail é obrigatório.' };
  }
  if (!senha || senha.length < 3) {
    return { sucesso: false, mensagem: 'A senha deve ter pelo menos 3 caracteres.' };
  }

  if (isSupabaseConfigured && supabase) {
    // Checar unicidade de nome_usuario
    const { data: existente } = await supabase
      .from('perfis')
      .select('id')
      .eq('nome_usuario', nomeLimpo)
      .maybeSingle();

    if (existente) {
      return { sucesso: false, mensagem: 'Este nome de usuário já está em uso.' };
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: emailLimpo,
      password: senha,
      options: {
        data: {
          nome_usuario: nomeLimpo,
        },
      },
    });

    if (authError) {
      return { sucesso: false, mensagem: authError.message };
    }

    if (authData.user) {
      if (!authData.session) return {
        sucesso: true,
        mensagem: 'Conta criada. Confirme seu e-mail pelo link enviado pelo Supabase e depois entre na sua conta. A liberação do administrador continua necessária.',
        perfil: null,
      };
      const { data: perfil } = await supabase
        .from('perfis')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      return {
        sucesso: true,
        mensagem: 'Conta criada com sucesso! Aguarde a liberação do administrador.',
        perfil: perfil as Perfil | null,
      };
    }

    return { sucesso: true, mensagem: 'Conta criada! Aguarde a liberação do administrador.' };
  }

  // Fallback Local
  const perfis: Perfil[] = carregarPerfisComGarantiaAdmin();
  const contasAuth = carregarLocal<CredencialAuth[]>('contas_auth', []);

  // Verificar se nome ou email já existem
  if (perfis.some((p) => p.nome_usuario.toLowerCase() === nomeLimpo)) {
    return { sucesso: false, mensagem: 'Este nome de usuário já está em uso.' };
  }
  if (contasAuth.some((c) => c.email.toLowerCase() === emailLimpo)) {
    return { sucesso: false, mensagem: 'Este e-mail já está em uso.' };
  }

  // O primeiro usuário criado vira o Administrador Master (já aprovado)
  const perfisReais = perfis.filter((p) => p.id !== 'admin-id-demo');
  const isPrimeiroUsuario = perfisReais.length === 0;

  const novoPerfil: Perfil = {
    id: gerarId('user'),
    nome_usuario: nomeLimpo,
    papel: isPrimeiroUsuario ? 'admin' : 'usuario',
    status: isPrimeiroUsuario ? 'aprovado' : 'pendente', // RF-02: Visitante fica pendente
    bio: isPrimeiroUsuario ? 'Administrador do Tomo' : '',
    foto_url: null,
    criado_em: new Date().toISOString(),
  };

  // Salvar credencial de autenticação
  contasAuth.push({
    id: novoPerfil.id,
    email: emailLimpo,
    senha: senha,
    nome_usuario: nomeLimpo,
  });
  salvarLocal('contas_auth', contasAuth);

  perfis.push(novoPerfil);
  salvarLocal('perfis', perfis);
  salvarLocal('sessao_atual', novoPerfil.id);

  // Se for visitante pendente, notifica todos os administradores do sistema!
  if (!isPrimeiroUsuario) {
    const notificacoes = carregarLocal<Notificacao[]>('notificacoes', []);
    const admins = perfis.filter((p) => p.papel === 'admin');
    for (const adm of admins) {
      notificacoes.unshift({
        id: gerarId('notif'),
        usuario_id: adm.id,
        tipo: 'nova_conta_pendente',
        origem_id: novoPerfil.id,
        lida: false,
        criado_em: new Date().toISOString(),
      });
    }
    salvarLocal('notificacoes', notificacoes);
  }

  return {
    sucesso: true,
    mensagem: isPrimeiroUsuario
      ? 'Conta de Administrador criada com sucesso! Seu acesso está liberado.'
      : 'Conta criada com sucesso! Aguarde a liberação do administrador.',
    perfil: novoPerfil,
  };
}

export async function entrarConta(identificador: string, senha: string): Promise<{ sucesso: boolean; mensagem?: string; perfil?: Perfil | null }> {
  if (erroConfiguracaoSupabase) return { sucesso: false, mensagem: erroConfiguracaoSupabase };
  consultasPerfil.limpar();
  const limpo = identificador.trim().toLowerCase();

  if (isSupabaseConfigured && supabase) {
    const resultado = limpo.includes('@')
      ? await supabase.auth.signInWithPassword({ email: limpo, password: senha })
      : await (async () => {
          const { data: tokens, error: erroEntrada } = await supabase.functions.invoke('entrar-usuario', {
            body: { usuario: limpo, senha },
          });
          if (erroEntrada || !tokens?.access_token || !tokens?.refresh_token) {
            return { data: { user: null }, error: { code: 'invalid_credentials' } };
          }
          return supabase.auth.setSession({ access_token: tokens.access_token, refresh_token: tokens.refresh_token });
        })();
    const { data, error } = resultado;

    if (error?.code === 'email_not_confirmed') {
      return { sucesso: false, mensagem: 'Confirme seu e-mail pelo link enviado pelo Supabase antes de entrar.' };
    }
    if (error || !data.user) {
      return { sucesso: false, mensagem: 'Credenciais inválidas. Verifique seu login e senha.' };
    }

    const { data: perfil, error: erroPerfil } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    if (erroPerfil || !perfil) return { sucesso: false, mensagem: 'Sua conta foi autenticada, mas o perfil não pôde ser carregado. Verifique a tabela perfis e suas permissões no Supabase.' };
    return { sucesso: true, perfil: perfil as Perfil };
  }

  // Fallback Local
  const contasAuth = carregarLocal<CredencialAuth[]>('contas_auth', []);
  const perfis = carregarPerfisComGarantiaAdmin();

  // Procura por e-mail ou por nome de usuário nas credenciais
  const credencial = contasAuth.find(
    (c) => c.email.toLowerCase() === limpo || c.nome_usuario.toLowerCase() === limpo
  );

  let perfilEncontrado: Perfil | null = null;

  if (credencial) {
    if (credencial.senha !== senha) {
      return { sucesso: false, mensagem: 'Credenciais inválidas. Verifique seu login e senha.' };
    }
    perfilEncontrado = perfis.find((p) => p.id === credencial.id) || null;
  } else {
    const perfilLegado = perfis.find((p) => p.nome_usuario.toLowerCase() === limpo || p.id === limpo);
    if (!perfilLegado || senha.length < 3) {
      return { sucesso: false, mensagem: 'Credenciais inválidas. Verifique seu login e senha.' };
    }
    perfilEncontrado = perfilLegado;
  }

  if (!perfilEncontrado) {
    return { sucesso: false, mensagem: 'Credenciais inválidas. Verifique seu login e senha.' };
  }

  salvarLocal('sessao_atual', perfilEncontrado.id);
  await registrarSinalSessao(perfilEncontrado.id);
  return { sucesso: true, perfil: perfilEncontrado };
}

export async function sairConta(): Promise<void> {
  consultasPerfil.limpar();
  if (isSupabaseConfigured && supabase) {
    await supabase.auth.signOut();
    return;
  }
  salvarLocal('sessao_atual', null);
}

export async function liberarComoAdmin(usuarioId?: string): Promise<Perfil | null> {
  const perfis = carregarPerfisComGarantiaAdmin();
  const alvoId = usuarioId || carregarLocal<string | null>('sessao_atual', null);

  const index = perfis.findIndex((p) => p.id === alvoId);
  if (index >= 0) {
    perfis[index].status = 'aprovado';
    perfis[index].papel = 'admin';
    salvarLocal('perfis', perfis);
    return perfis[index];
  }
  return null;
}

const consultasPerfil = new ConsultasCompartilhadas();
// A autorização de cada consulta permanece protegida pelas políticas RLS no servidor.
supabase?.auth.onAuthStateChange?.((evento) => {
  if (evento !== 'INITIAL_SESSION' && evento !== 'TOKEN_REFRESHED') consultasPerfil.limpar();
});
export function obterPerfilAtual(): Promise<Perfil | null> {
  // O modo local não tem latência de rede e deve refletir alterações imediatamente.
  return isSupabaseConfigured ? consultasPerfil.consultar('perfil-atual', consultarPerfilAtual) : consultarPerfilAtual();
}
async function consultarPerfilAtual(): Promise<Perfil | null> {
  if (erroConfiguracaoSupabase) return null;
  if (isSupabaseConfigured && supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    return data as Perfil | null;
  }

  const userId = carregarLocal<string | null>('sessao_atual', null);
  if (!userId) return null;
  const perfis = carregarPerfisComGarantiaAdmin();
  return perfis.find((p) => p.id === userId) || null;
}

export async function obterPerfilPorId(usuarioId: string): Promise<Perfil | null> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', usuarioId)
      .maybeSingle();
    return data as Perfil | null;
  }

  const perfis = carregarLocal<Perfil[]>('perfis', []);
  return perfis.find((p) => p.id === usuarioId) || null;
}

export async function atualizarMeuPerfil(dados: { nome_usuario?: string; bio?: string; foto_url?: string }): Promise<Perfil | null> {
  const usuario = await obterPerfilAtual();
  if (!usuario) return null;
  const nome = dados.nome_usuario?.trim().toLowerCase();
  if (nome !== undefined) {
    if (!nome) throw new Error('Informe um nome de usuário.');
    dados = { ...dados, nome_usuario: nome };
  }


  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('perfis')
      .update(dados)
      .eq('id', usuario.id)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data as Perfil;
  }

  const perfis = carregarLocal<Perfil[]>('perfis', []);
  if (nome && perfis.some((p) => p.id !== usuario.id && p.nome_usuario.toLowerCase() === nome)) throw new Error('Esse nome de usuário já está em uso.');
  const index = perfis.findIndex((p) => p.id === usuario.id);
  if (index >= 0) {
    perfis[index] = { ...perfis[index], ...dados };
    salvarLocal('perfis', perfis);
    if (nome) {
      const contas = carregarLocal<CredencialAuth[]>('contas_auth', []);
      salvarLocal('contas_auth', contas.map((c) => c.id === usuario.id ? { ...c, nome_usuario: nome } : c));
    }
    return perfis[index];
  }
  return null;
}

// ------------------------------------------------------------------------------
// 2. ADMINISTRAÇÃO E MODERAÇÃO
// ------------------------------------------------------------------------------

export async function listarContasPendentes(): Promise<Perfil[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .eq('status', 'pendente')
      .order('criado_em', { ascending: false });
    if (error) throw error;
    return (data as Perfil[]) || [];
  }

  const perfis = carregarLocal<Perfil[]>('perfis', []);
  return perfis.filter((p) => p.status === 'pendente');
}

export async function listarTodosUsuarios(): Promise<Perfil[]> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase
      .from('perfis')
      .select('*')
      .order('criado_em', { ascending: false });
    return (data as Perfil[]) || [];
  }

  return carregarLocal<Perfil[]>('perfis', []);
}

export async function atualizarStatusConta(usuarioId: string, novoStatus: StatusPerfil): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('perfis')
      .update({ status: novoStatus })
      .eq('id', usuarioId);
    return !error;
  }

  const perfis = carregarLocal<Perfil[]>('perfis', []);
  const index = perfis.findIndex((p) => p.id === usuarioId);
  if (index >= 0) {
    perfis[index].status = novoStatus;
    salvarLocal('perfis', perfis);
    return true;
  }
  return false;
}

export async function moderarOcultarLivro(livroId: string, ocultar: boolean): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('livros')
      .update({ oculto_admin: ocultar })
      .eq('id', livroId);
    return !error;
  }

  const livros = carregarLocal<Livro[]>('livros', []);
  const index = livros.findIndex((l) => l.id === livroId);
  if (index >= 0) {
    livros[index].oculto_admin = ocultar;
    salvarLocal('livros', livros);
    return true;
  }
  return false;
}

// ------------------------------------------------------------------------------
// 3. LIVROS E PÁGINAS
// ------------------------------------------------------------------------------

export async function criarLivro(dados: {
  titulo: string;
  descricao?: string;
  capa_url?: string;
  fundo_url?: string;
  situacao?: 'rascunho' | 'lancado';
  visibilidade?: 'privado' | 'amigos' | 'publico';
}): Promise<Livro | null> {
  const usuario = await obterPerfilAtual();
  if (!usuario || usuario.status !== 'aprovado') {
    throw new Error('Apenas usuários aprovados podem criar livros.');
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('livros')
      .insert({
        autor_id: usuario.id,
        titulo: dados.titulo,
        descricao: dados.descricao || null,
        capa_url: dados.capa_url || null,
        fundo_url: dados.fundo_url || null,
        situacao: dados.situacao || 'rascunho',
        visibilidade: dados.visibilidade || 'privado',
        oculto_admin: false,
      })
      .select()
      .maybeSingle();

    if (error) throw error;
    return data as Livro;
  }

  const livros = carregarLocal<Livro[]>('livros', []);
  const novoLivro: Livro = {
    id: gerarId('livro'),
    autor_id: usuario.id,
    titulo: dados.titulo,
    descricao: dados.descricao || null,
    capa_url: dados.capa_url || null,
    fundo_url: dados.fundo_url || null,
    situacao: dados.situacao || 'rascunho',
    visibilidade: dados.visibilidade || 'privado',
    oculto_admin: false,
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
    autor: usuario,
  };

  livros.unshift(novoLivro);
  salvarLocal('livros', livros);
  return novoLivro;
}

export async function atualizarLivro(
  livroId: string,
  dados: Partial<Pick<Livro, 'titulo' | 'descricao' | 'capa_url' | 'fundo_url' | 'situacao' | 'visibilidade'>>
): Promise<Livro | null> {
  const usuario = await obterPerfilAtual();
  if (!usuario) throw new Error('Não autenticado.');

  if (dados.situacao === 'rascunho') {
    dados = { ...dados, visibilidade: 'privado' };
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('livros')
      .update({
        ...dados,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', livroId)
      .eq('autor_id', usuario.id) // Regra: só o autor edita
      .select()
      .maybeSingle();

    if (error) throw error;
    return data as Livro;
  }

  const livros = carregarLocal<Livro[]>('livros', []);
  const index = livros.findIndex((l) => l.id === livroId);
  if (index === -1) return null;
  if (livros[index].autor_id !== usuario.id) {
    throw new Error('Você só pode editar seus próprios livros.');
  }

  livros[index] = {
    ...livros[index],
    ...dados,
    atualizado_em: new Date().toISOString(),
  };
  salvarLocal('livros', livros);
  return livros[index];
}

export async function obterLivroPorId(livroId: string): Promise<Livro | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('livros')
      .select('*, autor:perfis!livros_autor_id_fkey(*)')
      .eq('id', livroId)
      .maybeSingle();

    if (error || !data) return null;
    return data as Livro;
  }

  const livros = carregarLocal<Livro[]>('livros', []);
  const livro = livros.find((l) => l.id === livroId);
  if (!livro) return null;

  // Checagem da Matriz de Permissão da Seção 5 no fallback
  const usuario = await obterPerfilAtual();
  const podeVer = await checarPermissaoLivroLocal(usuario, livro);
  if (!podeVer) return null;

  return livro;
}

export async function moverParaLixeira(livroId: string): Promise<boolean> {
  const usuario = await obterPerfilAtual();
  if (!usuario) return false;

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('livros')
      .update({ lixeira: true })
      .eq('id', livroId)
      .eq('autor_id', usuario.id);
    return !error;
  }

  const livros = carregarLocal<Livro[]>('livros', []);
  const index = livros.findIndex((l) => l.id === livroId && l.autor_id === usuario.id);
  if (index >= 0) {
    livros[index].lixeira = true;
    salvarLocal('livros', livros);
    return true;
  }
  return false;
}

export async function moverVariosParaLixeira(livroIds: string[]): Promise<boolean> {
  const usuario = await obterPerfilAtual();
  if (!usuario || livroIds.length === 0) return false;

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('livros')
      .update({ lixeira: true })
      .in('id', livroIds)
      .eq('autor_id', usuario.id);
    return !error;
  }

  const livros = carregarLocal<Livro[]>('livros', []);
  let modificou = false;
  for (const l of livros) {
    if (livroIds.includes(l.id) && l.autor_id === usuario.id) {
      l.lixeira = true;
      modificou = true;
    }
  }
  if (modificou) {
    salvarLocal('livros', livros);
  }
  return true;
}

export async function restaurarDaLixeira(livroId: string): Promise<boolean> {
  const usuario = await obterPerfilAtual();
  if (!usuario) return false;

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('livros')
      .update({ lixeira: false })
      .eq('id', livroId)
      .eq('autor_id', usuario.id);
    return !error;
  }

  const livros = carregarLocal<Livro[]>('livros', []);
  const index = livros.findIndex((l) => l.id === livroId && l.autor_id === usuario.id);
  if (index >= 0) {
    livros[index].lixeira = false;
    salvarLocal('livros', livros);
    return true;
  }
  return false;
}

export async function excluirDefinitivamente(livroId: string): Promise<boolean> {
  const usuario = await obterPerfilAtual();
  if (!usuario) return false;

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('livros')
      .delete()
      .eq('id', livroId)
      .eq('autor_id', usuario.id);
    return !error;
  }

  let livros = carregarLocal<Livro[]>('livros', []);
  const livro = livros.find((l) => l.id === livroId);
  if (!livro || livro.autor_id !== usuario.id) return false;

  livros = livros.filter((l) => l.id !== livroId);
  salvarLocal('livros', livros);

  // Remove páginas associadas
  let paginas = carregarLocal<Pagina[]>('paginas', []);
  paginas = paginas.filter((p) => p.livro_id !== livroId);
  salvarLocal('paginas', paginas);

  return true;
}

export async function listarLixeira(): Promise<Livro[]> {
  const usuario = await obterPerfilAtual();
  if (!usuario) return [];

  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase
      .from('livros')
      .select('*, autor:perfis!livros_autor_id_fkey(*)')
      .eq('autor_id', usuario.id)
      .eq('lixeira', true)
      .order('atualizado_em', { ascending: false });
    return (data as Livro[]) || [];
  }

  const livros = carregarLocal<Livro[]>('livros', []);
  return livros.filter((l) => l.autor_id === usuario.id && Boolean(l.lixeira));
}

export async function excluirLivro(livroId: string): Promise<boolean> {
  // Por padrão, excluir move para a lixeira para segurança contra exclusão acidental
  return moverParaLixeira(livroId);
}

export async function listarMeusLivros(): Promise<Livro[]> {
  const usuario = await obterPerfilAtual();
  if (!usuario) return [];

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('livros')
      .select('*, autor:perfis!livros_autor_id_fkey(*)')
      .eq('autor_id', usuario.id)
      .eq('situacao', 'lancado')
      .eq('lixeira', false)
      .order('atualizado_em', { ascending: false });
    if (error) throw error;
    return (data as Livro[]) || [];
  }

  const livros = carregarLocal<Livro[]>('livros', []);
  return livros.filter((l) => l.autor_id === usuario.id && l.situacao === 'lancado' && !l.lixeira);
}

export async function listarMeusRascunhos(): Promise<Livro[]> {
  const usuario = await obterPerfilAtual();
  if (!usuario) return [];

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('livros')
      .select('*, autor:perfis!livros_autor_id_fkey(*)')
      .eq('autor_id', usuario.id)
      .eq('situacao', 'rascunho')
      .eq('lixeira', false)
      .order('atualizado_em', { ascending: false });
    if (error) throw error;
    return (data as Livro[]) || [];
  }

  const livros = carregarLocal<Livro[]>('livros', []);
  return livros.filter((l) => l.autor_id === usuario.id && l.situacao === 'rascunho' && !l.lixeira);
}

export async function listarLivrosDoAutor(autorId: string): Promise<Livro[]> {
  const usuario = await obterPerfilAtual();
  if (!usuario || usuario.status !== 'aprovado') return [];

  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase
      .from('livros')
      .select('*, autor:perfis!livros_autor_id_fkey(*)')
      .eq('autor_id', autorId)
      .eq('situacao', 'lancado')
      .eq('lixeira', false)
      .order('criado_em', { ascending: false });
    return (data as Livro[]) || [];
  }

  const livros = carregarLocal<Livro[]>('livros', []);
  const filtrados: Livro[] = [];
  for (const l of livros) {
    if (l.autor_id === autorId && l.situacao === 'lancado' && !l.lixeira) {
      if (await checarPermissaoLivroLocal(usuario, l)) {
        filtrados.push(l);
      }
    }
  }
  return filtrados;
}

export async function listarFeed(): Promise<Livro[]> {
  const usuario = await obterPerfilAtual();
  if (!usuario || usuario.status !== 'aprovado') return [];

  if (isSupabaseConfigured && supabase) {
    // Graças ao RLS da tabela 'livros', a consulta direta já filtra rigorosamente
    const { data, error } = await supabase
      .from('livros')
      .select('*, autor:perfis!livros_autor_id_fkey(*)')
      .eq('situacao', 'lancado')
      .eq('lixeira', false)
      .order('criado_em', { ascending: false });
    if (error) throw error;
    return (data as Livro[]) || [];
  }

  const livros = carregarLocal<Livro[]>('livros', []);
  const filtrados: Livro[] = [];

  for (const livro of livros) {
    if (livro.situacao === 'lancado' && !livro.lixeira) {
      const ok = await checarPermissaoLivroLocal(usuario, livro);
      if (ok) filtrados.push(livro);
    }
  }

  return filtrados;
}

export async function obterPaginasDoLivro(livroId: string): Promise<Pagina[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('paginas')
      .select('*')
      .eq('livro_id', livroId)
      .order('numero', { ascending: true });

    if (error) throw error;
    return (data as Pagina[]) || [];
  }

  const paginas = carregarLocal<Pagina[]>('paginas', []);
  return paginas
    .filter((p) => p.livro_id === livroId)
    .sort((a, b) => a.numero - b.numero);
}

export async function salvarPaginas(livroId: string, paginas: Array<{ numero: number; texto: string }>): Promise<boolean> {
  const usuario = await obterPerfilAtual();
  if (!usuario) return false;

  // Validação: Máximo 1.500 caracteres por página
  for (const p of paginas) {
    if (p.texto.length > 1500) {
      throw new Error(`A página ${p.numero} ultrapassou o limite de 1.500 caracteres.`);
    }
  }

  if (isSupabaseConfigured && supabase) {
    // Substitui páginas do livro
    await supabase.from('paginas').delete().eq('livro_id', livroId);
    if (paginas.length > 0) {
      const registros = paginas.map((p) => ({
        livro_id: livroId,
        numero: p.numero,
        texto: p.texto,
      }));
      const { error } = await supabase.from('paginas').insert(registros);
      if (error) throw error;
    }
    return true;
  }

  let todas = carregarLocal<Pagina[]>('paginas', []);
  todas = todas.filter((p) => p.livro_id !== livroId);
  for (const p of paginas) {
    todas.push({
      id: 'pg-' + Math.random().toString(36).substring(2, 9),
      livro_id: livroId,
      numero: p.numero,
      texto: p.texto,
    });
  }
  salvarLocal('paginas', todas);
  return true;
}

// ------------------------------------------------------------------------------
// 4. LEITURA E PROGRESSO (US-08, US-09, US-16)
// ------------------------------------------------------------------------------

export async function salvarProgressoLeitura(livroId: string, paginaNumero: number): Promise<void> {
  const usuario = await obterPerfilAtual();
  if (!usuario) return;

  if (isSupabaseConfigured && supabase) {
    await supabase.from('progresso_leitura').upsert({
      usuario_id: usuario.id,
      livro_id: livroId,
      pagina_numero: paginaNumero,
      atualizado_em: new Date().toISOString(),
    });
    return;
  }

  const progresso = carregarLocal<ProgressoLeitura[]>('progresso_leitura', []);
  const index = progresso.findIndex((p) => p.usuario_id === usuario.id && p.livro_id === livroId);
  if (index >= 0) {
    progresso[index].pagina_numero = paginaNumero;
    progresso[index].atualizado_em = new Date().toISOString();
  } else {
    progresso.push({
      usuario_id: usuario.id,
      livro_id: livroId,
      pagina_numero: paginaNumero,
      atualizado_em: new Date().toISOString(),
    });
  }
  salvarLocal('progresso_leitura', progresso);
}

export async function obterProgressoLeitura(livroId: string): Promise<number> {
  if (isSupabaseConfigured && supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 1;
    const { data } = await supabase
      .from('progresso_leitura')
      .select('pagina_numero')
      .eq('usuario_id', user.id)
      .eq('livro_id', livroId)
      .maybeSingle();
    return data?.pagina_numero || 1;
  }

  const usuario = await obterPerfilAtual();
  if (!usuario) return 1;
  const progresso = carregarLocal<ProgressoLeitura[]>('progresso_leitura', []);
  const item = progresso.find((p) => p.usuario_id === usuario.id && p.livro_id === livroId);
  return item?.pagina_numero || 1;
}

export async function listarContinuarLendo(): Promise<ProgressoLeitura[]> {
  const usuario = await obterPerfilAtual();
  if (!usuario || usuario.status !== 'aprovado') return [];

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('progresso_leitura')
      .select('*, livro:livros(*, autor:perfis!livros_autor_id_fkey(*))')
      .eq('usuario_id', usuario.id)
      .order('atualizado_em', { ascending: false });
    if (error) throw error;
    return (data as ProgressoLeitura[]) || [];
  }

  const progresso = carregarLocal<ProgressoLeitura[]>('progresso_leitura', []);
  const livros = carregarLocal<Livro[]>('livros', []);
  const lista: ProgressoLeitura[] = [];

  for (const p of progresso.filter((item) => item.usuario_id === usuario.id)) {
    const livro = livros.find((l) => l.id === p.livro_id);
    if (livro && (await checarPermissaoLivroLocal(usuario, livro))) {
      lista.push({ ...p, livro });
    }
  }

  return lista.sort((a, b) => new Date(b.atualizado_em).getTime() - new Date(a.atualizado_em).getTime());
}

export async function alternarSalvarParaLer(livroId: string): Promise<boolean> {
  const usuario = await obterPerfilAtual();
  if (!usuario) return false;

  if (isSupabaseConfigured && supabase) {
    const { data, error: erroConsulta } = await supabase
      .from('salvos')
      .select('livro_id')
      .eq('usuario_id', usuario.id)
      .eq('livro_id', livroId)
      .maybeSingle();

    if (erroConsulta) throw erroConsulta;
    if (data) {
      const { error } = await supabase.from('salvos').delete().eq('usuario_id', usuario.id).eq('livro_id', livroId);
      if (error) throw error;
      return false; // removido
    } else {
      const { error } = await supabase.from('salvos').insert({ usuario_id: usuario.id, livro_id: livroId });
      if (error) throw error;
      return true; // adicionado
    }
  }

  let salvos = carregarLocal<LivroSalvo[]>('salvos', []);
  const index = salvos.findIndex((s) => s.usuario_id === usuario.id && s.livro_id === livroId);
  if (index >= 0) {
    salvos.splice(index, 1);
    salvarLocal('salvos', salvos);
    return false;
  } else {
    salvos.push({
      usuario_id: usuario.id,
      livro_id: livroId,
      criado_em: new Date().toISOString(),
    });
    salvarLocal('salvos', salvos);
    return true;
  }
}

export async function verificarLivroSalvo(livroId: string): Promise<boolean> {
  const usuario = await obterPerfilAtual();
  if (!usuario) return false;

  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase
      .from('salvos')
      .select('livro_id')
      .eq('usuario_id', usuario.id)
      .eq('livro_id', livroId)
      .maybeSingle();
    return Boolean(data);
  }

  const salvos = carregarLocal<LivroSalvo[]>('salvos', []);
  return salvos.some((s) => s.usuario_id === usuario.id && s.livro_id === livroId);
}

export async function listarSalvosParaLer(): Promise<Livro[]> {
  const usuario = await obterPerfilAtual();
  if (!usuario || usuario.status !== 'aprovado') return [];

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('salvos')
      .select('livro:livros(*, autor:perfis!livros_autor_id_fkey(*))')
      .eq('usuario_id', usuario.id)
      .order('criado_em', { ascending: false });
    if (error) throw error;
    return ((data || []).map((d: any) => d.livro).filter(Boolean) as Livro[]) || [];
  }

  const salvos = carregarLocal<LivroSalvo[]>('salvos', []);
  const livros = carregarLocal<Livro[]>('livros', []);
  const resultado: Livro[] = [];

  for (const s of salvos.filter((item) => item.usuario_id === usuario.id)) {
    const livro = livros.find((l) => l.id === s.livro_id);
    if (livro && (await checarPermissaoLivroLocal(usuario, livro))) {
      resultado.push(livro);
    }
  }

  return resultado;
}

// ------------------------------------------------------------------------------
// 5. SOCIAL E NOTIFICAÇÕES (US-11, US-12, US-16, US-17)
// ------------------------------------------------------------------------------

export async function seguirUsuario(alvoId: string): Promise<boolean> {
  const usuario = await obterPerfilAtual();
  if (!usuario || usuario.id === alvoId) return false;

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('seguidores').insert({
      seguidor_id: usuario.id,
      seguido_id: alvoId,
    });
    return !error;
  }

  const seguidores = carregarLocal<Array<{ seguidor_id: string; seguido_id: string; criado_em: string }>>('seguidores', []);
  if (!seguidores.some((s) => s.seguidor_id === usuario.id && s.seguido_id === alvoId)) {
    seguidores.push({
      seguidor_id: usuario.id,
      seguido_id: alvoId,
      criado_em: new Date().toISOString(),
    });
    salvarLocal('seguidores', seguidores);

    // Automatismo de notificações local
    const mutuo = seguidores.some((s) => s.seguidor_id === alvoId && s.seguido_id === usuario.id);
    const notificacoes = carregarLocal<Notificacao[]>('notificacoes', []);

    if (mutuo) {
      notificacoes.push({
        id: 'notif-' + Date.now() + '-1',
        usuario_id: alvoId,
        tipo: 'seguir_mutuo',
        origem_id: usuario.id,
        lida: false,
        criado_em: new Date().toISOString(),
      });
      notificacoes.push({
        id: 'notif-' + Date.now() + '-2',
        usuario_id: usuario.id,
        tipo: 'seguir_mutuo',
        origem_id: alvoId,
        lida: false,
        criado_em: new Date().toISOString(),
      });
    } else {
      notificacoes.push({
        id: 'notif-' + Date.now(),
        usuario_id: alvoId,
        tipo: 'novo_seguidor',
        origem_id: usuario.id,
        lida: false,
        criado_em: new Date().toISOString(),
      });
    }
    salvarLocal('notificacoes', notificacoes);
  }
  return true;
}

export async function deixarDeSeguir(alvoId: string): Promise<boolean> {
  const usuario = await obterPerfilAtual();
  if (!usuario) return false;

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('seguidores')
      .delete()
      .eq('seguidor_id', usuario.id)
      .eq('seguido_id', alvoId);
    return !error;
  }

  let seguidores = carregarLocal<Array<{ seguidor_id: string; seguido_id: string; criado_em: string }>>('seguidores', []);
  seguidores = seguidores.filter((s) => !(s.seguidor_id === usuario.id && s.seguido_id === alvoId));
  salvarLocal('seguidores', seguidores);
  return true;
}

export async function verificarSeguindo(alvoId: string): Promise<boolean> {
  const usuario = await obterPerfilAtual();
  if (!usuario) return false;

  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase
      .from('seguidores')
      .select('criado_em')
      .eq('seguidor_id', usuario.id)
      .eq('seguido_id', alvoId)
      .maybeSingle();
    return Boolean(data);
  }

  const seguidores = carregarLocal<Array<{ seguidor_id: string; seguido_id: string }>>('seguidores', []);
  return seguidores.some((s) => s.seguidor_id === usuario.id && s.seguido_id === alvoId);
}

export async function verificarAmizadeMutua(alvoId: string): Promise<boolean> {
  const usuario = await obterPerfilAtual();
  if (!usuario) return false;

  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.rpc('sao_amigos', { a: usuario.id, b: alvoId });
    return Boolean(data);
  }

  const seguidores = carregarLocal<Array<{ seguidor_id: string; seguido_id: string }>>('seguidores', []);
  const segue = seguidores.some((s) => s.seguidor_id === usuario.id && s.seguido_id === alvoId);
  const seguidoDeVolta = seguidores.some((s) => s.seguidor_id === alvoId && s.seguido_id === usuario.id);
  return segue && seguidoDeVolta;
}

export async function listarNotificacoes(): Promise<Notificacao[]> {
  const usuario = await obterPerfilAtual();
  if (!usuario) return [];

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('notificacoes')
      .select('*, origem_perfil:perfis!origem_id(*)')
      .eq('usuario_id', usuario.id)
      .order('criado_em', { ascending: false });
    if (error) throw error;
    return (data as Notificacao[]) || [];
  }

  const notifs = carregarLocal<Notificacao[]>('notificacoes', []);
  const perfis = carregarLocal<Perfil[]>('perfis', []);

  return notifs
    .filter((n) => n.usuario_id === usuario.id)
    .map((n) => ({
      ...n,
      origem_perfil: perfis.find((p) => p.id === n.origem_id),
    }))
    .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
}

export async function marcarNotificacaoComoLida(notificacaoId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('notificacoes').update({ lida: true }).eq('id', notificacaoId);
    if (error) throw error;
    return;
  }

  const notifs = carregarLocal<Notificacao[]>('notificacoes', []);
  const item = notifs.find((n) => n.id === notificacaoId);
  if (item) {
    item.lida = true;
    salvarLocal('notificacoes', notifs);
  }
}

// ------------------------------------------------------------------------------
// 6. BUSCA E HISTÓRICO (US-15)
// ------------------------------------------------------------------------------

export async function buscarLivrosEPerfis(termo: string): Promise<{ livros: Livro[]; perfis: Perfil[] }> {
  const termoLimpo = termo.trim();
  if (!termoLimpo) return { livros: [], perfis: [] };

  const usuario = await obterPerfilAtual();
  if (!usuario || usuario.status !== 'aprovado') return { livros: [], perfis: [] };

  if (isSupabaseConfigured && supabase) {
    // Busca com "contém" (ilike)
    const { data: livros } = await supabase
      .from('livros')
      .select('*, autor:perfis!livros_autor_id_fkey(*)')
      .ilike('titulo', `%${termoLimpo}%`)
      .eq('situacao', 'lancado')
      .eq('lixeira', false)
      .limit(30);

    const { data: perfis } = await supabase
      .from('perfis')
      .select('*')
      .ilike('nome_usuario', `%${termoLimpo}%`)
      .eq('status', 'aprovado')
      .limit(30);

    return {
      livros: (livros as Livro[]) || [],
      perfis: (perfis as Perfil[]) || [],
    };
  }

  const todosLivros = carregarLocal<Livro[]>('livros', []);
  const todosPerfis = carregarLocal<Perfil[]>('perfis', []);

  const livrosEncontrados: Livro[] = [];
  for (const livro of todosLivros) {
    if (livro.situacao === 'lancado' && !livro.lixeira && livro.titulo.toLowerCase().includes(termoLimpo.toLowerCase())) {
      if (await checarPermissaoLivroLocal(usuario, livro)) {
        livrosEncontrados.push(livro);
      }
    }
  }

  const perfisEncontrados = todosPerfis.filter(
    (p) => p.status === 'aprovado' && p.nome_usuario.toLowerCase().includes(termoLimpo.toLowerCase())
  );

  return { livros: livrosEncontrados, perfis: perfisEncontrados };
}

export async function listarBuscasRecentes(): Promise<BuscaRecente[]> {
  const usuario = await obterPerfilAtual();
  if (!usuario) return [];

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('buscas_recentes')
      .select('*')
      .eq('usuario_id', usuario.id)
      .order('criado_em', { ascending: false })
      .limit(10);
    if (error) throw error;
    return (data as BuscaRecente[]) || [];
  }

  const buscas = carregarLocal<BuscaRecente[]>('buscas_recentes', []);
  return buscas
    .filter((b) => b.usuario_id === usuario.id)
    .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
    .slice(0, 10);
}

export async function adicionarBuscaRecente(termo: string, tipo: 'livro' | 'perfil'): Promise<void> {
  const usuario = await obterPerfilAtual();
  if (!usuario) return;

  if (isSupabaseConfigured && supabase) {
    await supabase.from('buscas_recentes').insert({
      usuario_id: usuario.id,
      termo,
      tipo,
    });
    return;
  }

  let buscas = carregarLocal<BuscaRecente[]>('buscas_recentes', []);
  buscas = buscas.filter((b) => !(b.usuario_id === usuario.id && b.termo.toLowerCase() === termo.toLowerCase()));
  buscas.unshift({
    id: 'busca-' + Date.now(),
    usuario_id: usuario.id,
    termo,
    tipo,
    criado_em: new Date().toISOString(),
  });
  salvarLocal('buscas_recentes', buscas.slice(0, 20));
}

export async function limparBuscasRecentes(): Promise<void> {
  const usuario = await obterPerfilAtual();
  if (!usuario) return;

  if (isSupabaseConfigured && supabase) {
    await supabase.from('buscas_recentes').delete().eq('usuario_id', usuario.id);
    return;
  }

  let buscas = carregarLocal<BuscaRecente[]>('buscas_recentes', []);
  buscas = buscas.filter((b) => b.usuario_id !== usuario.id);
  salvarLocal('buscas_recentes', buscas);
}

// ------------------------------------------------------------------------------
// 7. SESSÕES E ATIVIDADE (US-18)
// ------------------------------------------------------------------------------

export async function registrarSinalSessao(customUserId?: string): Promise<void> {
  const usuario = customUserId ? await obterPerfilPorId(customUserId) : await obterPerfilAtual();
  if (!usuario) return;

  const agora = new Date().toISOString();

  if (isSupabaseConfigured && supabase) {
    // Procura sessão ativa recente (últimos 5 minutos)
    const { data: sessaoRecente } = await supabase
      .from('sessoes')
      .select('id')
      .eq('usuario_id', usuario.id)
      .order('ultimo_sinal', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessaoRecente) {
      await supabase.from('sessoes').update({ ultimo_sinal: agora }).eq('id', sessaoRecente.id);
    } else {
      await supabase.from('sessoes').insert({
        usuario_id: usuario.id,
        entrada: agora,
        ultimo_sinal: agora,
      });
    }
    return;
  }

  const sessoes = carregarLocal<Sessao[]>('sessoes', []);
  const index = sessoes.findIndex((s) => s.usuario_id === usuario.id);
  if (index >= 0) {
    sessoes[index].ultimo_sinal = agora;
  } else {
    sessoes.push({
      id: 'sessao-' + Date.now(),
      usuario_id: usuario.id,
      entrada: agora,
      ultimo_sinal: agora,
    });
  }
  salvarLocal('sessoes', sessoes);
}

export async function listarAtividadeUsuarios(): Promise<Sessao[]> {
  const usuario = await obterPerfilAtual();
  if (!usuario || usuario.papel !== 'admin') return [];

  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase
      .from('sessoes')
      .select('*, perfil:perfis(*)')
      .order('ultimo_sinal', { ascending: false });
    return (data as Sessao[]) || [];
  }

  const sessoes = carregarLocal<Sessao[]>('sessoes', []);
  const perfis = carregarLocal<Perfil[]>('perfis', []);

  return sessoes
    .map((s) => ({
      ...s,
      perfil: perfis.find((p) => p.id === s.usuario_id),
    }))
    .sort((a, b) => new Date(b.ultimo_sinal).getTime() - new Date(a.ultimo_sinal).getTime());
}

// ------------------------------------------------------------------------------
// FUNÇÃO AUXILIAR DE MATRIZ DE PERMISSÃO (SEÇÃO 5)
// ------------------------------------------------------------------------------
async function checarPermissaoLivroLocal(usuario: Perfil | null, livro: Livro): Promise<boolean> {
  // Sem usuário logado: ninguém vê nada
  if (!usuario) return false;

  // Autor sempre pode abrir
  if (usuario.id === livro.autor_id) return true;

  // Contas não aprovadas não veem nada
  if (usuario.status !== 'aprovado') return false;

  // Livro oculto pelo admin: invisível para terceiros
  if (livro.oculto_admin) return false;

  // Rascunhos: somente o autor
  if (livro.situacao === 'rascunho') return false;

  // Lançado "só eu" (privado): somente o autor (admin NÃO lê)
  if (livro.visibilidade === 'privado') return false;

  // Lançado "amigos": somente se houver follow mútuo
  if (livro.visibilidade === 'amigos') {
    const mutuo = await verificarAmizadeMutua(livro.autor_id);
    return mutuo;
  }

  // Lançado "todos" (publico): visível para qualquer usuário aprovado (e admin)
  if (livro.visibilidade === 'publico') {
    return true;
  }

  return false;
}
