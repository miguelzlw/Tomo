import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('../supabaseCliente', () => ({ supabase: null, isSupabaseConfigured: false, erroConfiguracaoSupabase: null }));
import { excluirRascunhosDefinitivamente, excluirDaLixeiraDefinitivamente, moverParaLixeira, restaurarDaLixeira, listarLixeira } from '../index';
const store = new Map<string, string>();
vi.stubGlobal('localStorage', { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key, value) });
beforeEach(() => {
  store.clear();
  store.set('tomo_sessao_atual', JSON.stringify('autor'));
  store.set('tomo_perfis', JSON.stringify([{ id: 'autor', status: 'aprovado', papel: 'usuario' }]));
  store.set('tomo_livros', JSON.stringify([{ id: 'r1', autor_id: 'autor', situacao: 'rascunho' }, { id: 'r2', autor_id: 'autor', situacao: 'rascunho' }, { id: 'p1', autor_id: 'autor', situacao: 'lancado' }, { id: 'outro', autor_id: 'outra-pessoa', situacao: 'rascunho' }]));
  store.set('tomo_paginas', JSON.stringify([{ livro_id: 'r1' }, { livro_id: 'r2' }, { livro_id: 'p1' }]));
});
it('deletes multiple drafts and their pages without sending them to trash', async () => {
  expect(await excluirRascunhosDefinitivamente(['r1', 'r2'])).toBe(true);
  expect(JSON.parse(store.get('tomo_livros')!).map((livro: { id: string }) => livro.id)).toEqual(['p1', 'outro']);
  expect(JSON.parse(store.get('tomo_paginas')!)).toEqual([{ livro_id: 'p1' }]);
  expect(await listarLixeira()).toEqual([]);
});
it('rejects published books and foreign drafts without deleting any selected draft', async () => {
  const antes = store.get('tomo_livros');
  expect(await excluirRascunhosDefinitivamente(['r1', 'p1'])).toBe(false);
  expect(await excluirRascunhosDefinitivamente(['r1', 'outro'])).toBe(false);
  expect(store.get('tomo_livros')).toBe(antes);
});
it('moves a published book to trash and restores it with its pages intact', async () => {
  const paginas = store.get('tomo_paginas');
  expect(await moverParaLixeira('p1')).toBe(true);
  expect((await listarLixeira()).map((livro) => livro.id)).toEqual(['p1']);
  expect(await restaurarDaLixeira('p1')).toBe(true);
  expect(await listarLixeira()).toEqual([]);
  expect(store.get('tomo_paginas')).toBe(paginas);
});

it('permanently deletes a selected trashed publication and its associated local data', async () => {
  await moverParaLixeira('p1');
  store.set('tomo_salvos', JSON.stringify([{ livro_id: 'p1' }, { livro_id: 'r1' }]));
  store.set('tomo_progresso_leitura', JSON.stringify([{ livro_id: 'p1' }]));
  expect(await excluirDaLixeiraDefinitivamente(['p1', 'p1'])).toBe(true);
  expect(await listarLixeira()).toEqual([]);
  expect(JSON.parse(store.get('tomo_livros')!).some((livro: { id: string }) => livro.id === 'p1')).toBe(false);
  expect(JSON.parse(store.get('tomo_paginas')!).some((pagina: { livro_id: string }) => pagina.livro_id === 'p1')).toBe(false);
  expect(JSON.parse(store.get('tomo_salvos')!)).toEqual([{ livro_id: 'r1' }]);
  expect(JSON.parse(store.get('tomo_progresso_leitura')!)).toEqual([]);
});

it('rejects permanent trash deletion for active publications, drafts or another author', async () => {
  const antes = store.get('tomo_livros');
  expect(await excluirDaLixeiraDefinitivamente(['p1'])).toBe(false);
  expect(await excluirDaLixeiraDefinitivamente(['r1'])).toBe(false);
  expect(await excluirDaLixeiraDefinitivamente(['outro'])).toBe(false);
  expect(store.get('tomo_livros')).toBe(antes);
});

it('deletes several trashed books together and rejects mixed valid and active selections', async () => {
  const livros = JSON.parse(store.get('tomo_livros')!);
  livros.push({ id: 'p2', autor_id: 'autor', situacao: 'lancado', lixeira: true });
  store.set('tomo_livros', JSON.stringify(livros));
  const antes = store.get('tomo_livros');
  expect(await excluirDaLixeiraDefinitivamente(['p2', 'p1'])).toBe(false);
  expect(store.get('tomo_livros')).toBe(antes);
  await moverParaLixeira('p1');
  expect(await excluirDaLixeiraDefinitivamente(['p1', 'p2'])).toBe(true);
  expect(await listarLixeira()).toEqual([]);
});
