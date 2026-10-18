import { describe, it, expect, beforeEach, vi } from 'vitest';

// Esta suíte valida o fallback local, independentemente das chaves do .env.
vi.mock('../supabaseCliente', () => ({
  supabase: null,
  isSupabaseConfigured: false,
  erroConfiguracaoSupabase: null,
}));
import {
  cadastrarConta,
  criarLivro,
  obterLivroPorId,
  atualizarLivro,
  seguirUsuario,
  deixarDeSeguir,
  atualizarStatusConta,
  moderarOcultarLivro,
  salvarPaginas,
  definirUsuarioSessao,
  entrarConta,
  listarNotificacoes,
} from '../index';

const memoryStore: Record<string, string> = {};

const mockLocalStorage = {
  getItem: (key: string) => memoryStore[key] ?? null,
  setItem: (key: string, value: string) => {
    memoryStore[key] = String(value);
  },
  removeItem: (key: string) => {
    delete memoryStore[key];
  },
  clear: () => {
    for (const k in memoryStore) {
      delete memoryStore[k];
    }
  },
};

// Configura global.localStorage caso não exista ou seja limitado
Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('US-00 & Seção 5 — Matriz de Permissões e Regras de Segurança', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('deve validar todas as regras da Matriz da Seção 5', async () => {
    // 1. Criar Autor (aprovado)
    const autorRes = await cadastrarConta('autor@tomo.com', 'senha123', 'autor');
    const autor = autorRes.perfil!;
    await atualizarStatusConta(autor.id, 'aprovado');

    // 2. Criar Amigo (aprovado e mútuo)
    const amigoRes = await cadastrarConta('amigo@tomo.com', 'senha123', 'amigo');
    const amigo = amigoRes.perfil!;
    await atualizarStatusConta(amigo.id, 'aprovado');

    // 3. Criar Seguidor Não Mútuo (aprovado, segue autor mas autor não segue ele)
    const seguidorRes = await cadastrarConta('seguidor@tomo.com', 'senha123', 'seguidor');
    const seguidor = seguidorRes.perfil!;
    await atualizarStatusConta(seguidor.id, 'aprovado');

    // 4. Criar Usuário Aprovado Qualquer (não segue ninguém)
    const aprovadoRes = await cadastrarConta('aprovado@tomo.com', 'senha123', 'aprovado');
    const aprovado = aprovadoRes.perfil!;
    await atualizarStatusConta(aprovado.id, 'aprovado');

    // 5. Criar Conta Pendente
    const pendenteRes = await cadastrarConta('pendente@tomo.com', 'senha123', 'pendente');
    const pendente = pendenteRes.perfil!; // status padrão: pendente

    // 6. Criar Conta Bloqueada
    const bloqueadoRes = await cadastrarConta('bloqueado@tomo.com', 'senha123', 'bloqueado');
    const bloqueado = bloqueadoRes.perfil!;
    await atualizarStatusConta(bloqueado.id, 'bloqueado');

    // 7. Criar Admin (papel: admin, aprovado)
    const adminRes = await cadastrarConta('admin@tomo.com', 'senha123', 'admin_user');
    const admin = adminRes.perfil!;
    await atualizarStatusConta(admin.id, 'aprovado');
    // Ajustar papel do admin
    const perfis = JSON.parse(localStorage.getItem('tomo_perfis') || '[]');
    const adminIdx = perfis.findIndex((p: any) => p.id === admin.id);
    perfis[adminIdx].papel = 'admin';
    localStorage.setItem('tomo_perfis', JSON.stringify(perfis));

    // Estabelecer relações sociais:
    // Autor e Amigo se seguem mutuamente
    definirUsuarioSessao(autor.id);
    await seguirUsuario(amigo.id);
    definirUsuarioSessao(amigo.id);
    await seguirUsuario(autor.id);

    // Seguidor segue autor (apenas unidirecional)
    definirUsuarioSessao(seguidor.id);
    await seguirUsuario(autor.id);

    // Agora Autor cria 4 livros: Rascunho, Lançado só eu, Lançado amigos, Lançado todos
    definirUsuarioSessao(autor.id);

    const livroRascunho = await criarLivro({
      titulo: 'Livro Rascunho',
      situacao: 'rascunho',
      visibilidade: 'privado',
    });

    const livroSoEu = await criarLivro({
      titulo: 'Livro Só Eu',
      situacao: 'lancado',
      visibilidade: 'privado',
    });

    const livroAmigos = await criarLivro({
      titulo: 'Livro Amigos',
      situacao: 'lancado',
      visibilidade: 'amigos',
    });

    const livroTodos = await criarLivro({
      titulo: 'Livro Público',
      situacao: 'lancado',
      visibilidade: 'publico',
    });

    // TESTES DA MATRIZ:
    // A) Autor pode abrir TODOS os 4
    definirUsuarioSessao(autor.id);
    expect(await obterLivroPorId(livroRascunho!.id)).toBeTruthy();
    expect(await obterLivroPorId(livroSoEu!.id)).toBeTruthy();
    expect(await obterLivroPorId(livroAmigos!.id)).toBeTruthy();
    expect(await obterLivroPorId(livroTodos!.id)).toBeTruthy();

    // B) Amigo (seguir mútuo): Não pode Rascunho, Não pode Só Eu, Sim para Amigos, Sim para Todos
    definirUsuarioSessao(amigo.id);
    expect(await obterLivroPorId(livroRascunho!.id)).toBeNull();
    expect(await obterLivroPorId(livroSoEu!.id)).toBeNull();
    expect(await obterLivroPorId(livroAmigos!.id)).toBeTruthy();
    expect(await obterLivroPorId(livroTodos!.id)).toBeTruthy();

    // C) Seguidor não mútuo: Não pode Rascunho, Não pode Só Eu, Não pode Amigos, Sim para Todos
    definirUsuarioSessao(seguidor.id);
    expect(await obterLivroPorId(livroRascunho!.id)).toBeNull();
    expect(await obterLivroPorId(livroSoEu!.id)).toBeNull();
    expect(await obterLivroPorId(livroAmigos!.id)).toBeNull();
    expect(await obterLivroPorId(livroTodos!.id)).toBeTruthy();

    // D) Usuário aprovado qualquer: Não pode Rascunho, Não pode Só Eu, Não pode Amigos, Sim para Todos
    definirUsuarioSessao(aprovado.id);
    expect(await obterLivroPorId(livroRascunho!.id)).toBeNull();
    expect(await obterLivroPorId(livroSoEu!.id)).toBeNull();
    expect(await obterLivroPorId(livroAmigos!.id)).toBeNull();
    expect(await obterLivroPorId(livroTodos!.id)).toBeTruthy();

    // E) Conta pendente: Não pode nenhum conteúdo
    definirUsuarioSessao(pendente.id);
    expect(await obterLivroPorId(livroRascunho!.id)).toBeNull();
    expect(await obterLivroPorId(livroSoEu!.id)).toBeNull();
    expect(await obterLivroPorId(livroAmigos!.id)).toBeNull();
    expect(await obterLivroPorId(livroTodos!.id)).toBeNull();

    // F) Conta bloqueada: Não pode nenhum conteúdo
    definirUsuarioSessao(bloqueado.id);
    expect(await obterLivroPorId(livroRascunho!.id)).toBeNull();
    expect(await obterLivroPorId(livroSoEu!.id)).toBeNull();
    expect(await obterLivroPorId(livroAmigos!.id)).toBeNull();
    expect(await obterLivroPorId(livroTodos!.id)).toBeNull();

    // G) Admin (livro de outro): Não lê rascunho, Não lê "só eu", Não lê "amigos", Lê "todos"
    // RNF-07: Privacidade do admin: o admin não lê conteúdo privado de outros usuários
    definirUsuarioSessao(admin.id);
    expect(await obterLivroPorId(livroRascunho!.id)).toBeNull();
    expect(await obterLivroPorId(livroSoEu!.id)).toBeNull();
    expect(await obterLivroPorId(livroAmigos!.id)).toBeNull();
    expect(await obterLivroPorId(livroTodos!.id)).toBeTruthy();
  });

  it('deve bloquear edição de livro alheio', async () => {
    const autorRes = await cadastrarConta('autor2@tomo.com', 'senha123', 'autor2');
    const autor = autorRes.perfil!;
    await atualizarStatusConta(autor.id, 'aprovado');

    localStorage.setItem('tomo_sessao_atual', JSON.stringify(autor.id));
    const livro = await criarLivro({ titulo: 'Meu Livro' });

    // Outro usuário tenta editar
    const invasorRes = await cadastrarConta('invasor@tomo.com', 'senha123', 'invasor');
    const invasor = invasorRes.perfil!;
    await atualizarStatusConta(invasor.id, 'aprovado');

    definirUsuarioSessao(invasor.id);
    await expect(atualizarLivro(livro!.id, { titulo: 'Hackeado' })).rejects.toThrow();
  });

  it('deve derrubar acesso a livros amigos se deixar de seguir', async () => {
    const userA = (await cadastrarConta('usera@tomo.com', 'senha123', 'usera')).perfil!;
    const userB = (await cadastrarConta('userb@tomo.com', 'senha123', 'userb')).perfil!;
    await atualizarStatusConta(userA.id, 'aprovado');
    await atualizarStatusConta(userB.id, 'aprovado');

    // Seguem-se mutuamente
    definirUsuarioSessao(userA.id);
    await seguirUsuario(userB.id);
    definirUsuarioSessao(userB.id);
    await seguirUsuario(userA.id);

    // B cria livro visibilidade 'amigos'
    const livroAmigos = await criarLivro({
      titulo: 'Segredo de Amigos',
      situacao: 'lancado',
      visibilidade: 'amigos',
    });

    // A consegue ver
    definirUsuarioSessao(userA.id);
    expect(await obterLivroPorId(livroAmigos!.id)).toBeTruthy();

    // B deixa de seguir A (amizade quebra)
    definirUsuarioSessao(userB.id);
    await deixarDeSeguir(userA.id);

    // Agora A NÃO consegue mais ver
    definirUsuarioSessao(userA.id);
    expect(await obterLivroPorId(livroAmigos!.id)).toBeNull();
  });

  it('deve bloquear páginas com mais de 1.500 caracteres', async () => {
    const autor = (await cadastrarConta('autor3@tomo.com', 'senha123', 'autor3')).perfil!;
    await atualizarStatusConta(autor.id, 'aprovado');
    definirUsuarioSessao(autor.id);

    const livro = await criarLivro({ titulo: 'Livro Limite' });
    const textoGigante = 'a'.repeat(1501);

    await expect(
      salvarPaginas(livro!.id, [{ numero: 1, texto: textoGigante }])
    ).rejects.toThrow('1.500 caracteres');
  });

  it('deve ocultar livro quando moderado pelo admin, exceto para o autor', async () => {
    const autor = (await cadastrarConta('autor4@tomo.com', 'senha123', 'autor4')).perfil!;
    const leitor = (await cadastrarConta('leitor4@tomo.com', 'senha123', 'leitor4')).perfil!;
    await atualizarStatusConta(autor.id, 'aprovado');
    await atualizarStatusConta(leitor.id, 'aprovado');

    definirUsuarioSessao(autor.id);
    const livro = await criarLivro({
      titulo: 'Livro Moderável',
      situacao: 'lancado',
      visibilidade: 'publico',
    });

    // Leitor vê
    definirUsuarioSessao(leitor.id);
    expect(await obterLivroPorId(livro!.id)).toBeTruthy();

    // Admin oculta livro
    await moderarOcultarLivro(livro!.id, true);

    // Leitor não vê mais
    expect(await obterLivroPorId(livro!.id)).toBeNull();

    // Mas o autor ainda vê
    definirUsuarioSessao(autor.id);
    const livroDoAutor = await obterLivroPorId(livro!.id);
    expect(livroDoAutor).toBeTruthy();
    expect(livroDoAutor?.oculto_admin).toBe(true);
  });

  it('deve promover o 1º usuário a admin, criar conta subsequente como pendente e notificar o admin', async () => {
    // 1º usuário: dono/admin
    const admRes = await cadastrarConta('adminmaster@tomo.com', 'adminpass', 'adminmaster');
    expect(admRes.sucesso).toBe(true);
    expect(admRes.perfil?.papel).toBe('admin');
    expect(admRes.perfil?.status).toBe('aprovado');

    // 2º usuário: visitante comum (deve ficar pendente)
    const visitanteRes = await cadastrarConta('visitante@tomo.com', 'visita123', 'visitante');
    expect(visitanteRes.sucesso).toBe(true);
    expect(visitanteRes.perfil?.papel).toBe('usuario');
    expect(visitanteRes.perfil?.status).toBe('pendente');

    // O admin deve ter recebido notificação sobre a nova conta pendente!
    definirUsuarioSessao(admRes.perfil!.id);
    const notifs = await listarNotificacoes();
    expect(notifs.some((n) => n.tipo === 'nova_conta_pendente' && n.origem_id === visitanteRes.perfil!.id)).toBe(true);

    // Teste de Login:
    // A) Login com e-mail correto e senha correta
    const loginEmail = await entrarConta('visitante@tomo.com', 'visita123');
    expect(loginEmail.sucesso).toBe(true);
    expect(loginEmail.perfil?.nome_usuario).toBe('visitante');

    // B) Login com nome de usuário e senha correta
    const loginUser = await entrarConta('visitante', 'visita123');
    expect(loginUser.sucesso).toBe(true);

    // C) Login com senha errada
    const loginSenhaErrada = await entrarConta('visitante', 'senhaerrada');
    expect(loginSenhaErrada.sucesso).toBe(false);
    expect(loginSenhaErrada.perfil).toBeUndefined();

    // D) Login com usuário inexistente
    const loginInexistente = await entrarConta('ninguem', 'qualquer');
    expect(loginInexistente.sucesso).toBe(false);
  });
});
