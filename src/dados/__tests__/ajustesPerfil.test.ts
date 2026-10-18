import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('../supabaseCliente', () => ({ supabase: null, isSupabaseConfigured: false, erroConfiguracaoSupabase: null }));
import { atualizarLivro, atualizarMeuPerfil, entrarConta, listarNotificacoes } from '../index';
const store = new Map<string, string>();
vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) });
beforeEach(() => {
  store.clear();
  store.set('tomo_sessao_atual', JSON.stringify('autor'));
  store.set('tomo_perfis', JSON.stringify([{ id: 'autor', nome_usuario: 'antigo', papel: 'admin', status: 'aprovado' }, { id: 'outro', nome_usuario: 'ocupado', papel: 'usuario', status: 'aprovado' }]));
  store.set('tomo_contas_auth', JSON.stringify([{ id: 'autor', nome_usuario: 'antigo', email: 'autor@teste.com', senha: '123456' }]));
});
it('mantém notificações lidas no histórico', async () => {
  store.set('tomo_notificacoes', JSON.stringify([{ id: 'n', usuario_id: 'autor', lida: true }]));
  expect(await listarNotificacoes()).toHaveLength(1);
});
it('permite ao autor voltar um publicado para rascunho privado sem perder páginas', async () => {
  store.set('tomo_livros', JSON.stringify([{ id: 'livro', autor_id: 'autor', titulo: 'Meu livro', situacao: 'lancado', visibilidade: 'publico' }]));
  const paginas = JSON.stringify([{ livro_id: 'livro', numero: 1, texto: 'Meu texto.' }]);
  store.set('tomo_paginas', paginas);
  expect(await atualizarLivro('livro', { situacao: 'rascunho' })).toMatchObject({ titulo: 'Meu livro', situacao: 'rascunho', visibilidade: 'privado' });
  expect(store.get('tomo_paginas')).toBe(paginas);
});
it('impede outro usuário de retirar a publicação', async () => {
  store.set('tomo_livros', JSON.stringify([{ id: 'livro', autor_id: 'outro', situacao: 'lancado', visibilidade: 'publico' }]));
  await expect(atualizarLivro('livro', { situacao: 'rascunho' })).rejects.toThrow('próprios livros');
  expect(JSON.parse(store.get('tomo_livros')!)[0].situacao).toBe('lancado');
});
it('atualiza o nome e permite entrar com o novo nome', async () => {
  await atualizarMeuPerfil({ nome_usuario: 'novo' });
  expect(JSON.parse(store.get('tomo_contas_auth')!)[0].nome_usuario).toBe('novo');
  expect((await entrarConta('novo', '123456')).sucesso).toBe(true);
  expect((await entrarConta('antigo', '123456')).sucesso).toBe(false);
});
it('recusa nome já usado por outra pessoa', async () => {
  await expect(atualizarMeuPerfil({ nome_usuario: 'ocupado' })).rejects.toThrow();
});

