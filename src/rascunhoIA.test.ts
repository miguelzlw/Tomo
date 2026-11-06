import { afterEach, expect, it, vi } from 'vitest';
import { carregarPreviaIA, salvarPreviaIA, limparPreviasIA } from './rascunhoIA';

function armazenamento() {
  const itens = new Map<string, string>();
  const storage = { get length() { return itens.size; }, key: (i: number) => [...itens.keys()][i] ?? null, getItem: (k: string) => itens.get(k) ?? null, setItem: (k: string, v: string) => { itens.set(k, v); }, removeItem: (k: string) => { itens.delete(k); } };
  vi.stubGlobal('sessionStorage', storage);
  return { itens, storage };
}
afterEach(() => vi.unstubAllGlobals());

it('preserva prévia separadamente por usuário e livro', () => {
  armazenamento();
  salvarPreviaIA('autor:livro-a', { pedido: 'Uma aventura', texto: 'Texto revisado', provedor: 'gemini' });
  expect(carregarPreviaIA('autor:livro-a')?.texto).toBe('Texto revisado');
  expect(carregarPreviaIA('autor:livro-b')).toBeNull();
  expect(carregarPreviaIA('outro:livro-a')).toBeNull();
});
it('ignora cache corrompido sem impedir a criação de histórias', () => {
  const { itens } = armazenamento();
  itens.set('tomo:previa-ia:autor:livro-a', '{invalido');
  expect(carregarPreviaIA('autor:livro-a')).toBeNull();
});
it('limpa apenas as prévias do usuário que sai da conta', () => {
  armazenamento();
  salvarPreviaIA('autor:livro-a', { pedido: 'Pedido', texto: 'A', provedor: 'gemini' });
  salvarPreviaIA('outro:livro-a', { pedido: 'Pedido', texto: 'B', provedor: 'gemini' });
  limparPreviasIA('autor');
  expect(carregarPreviaIA('autor:livro-a')).toBeNull();
  expect(carregarPreviaIA('outro:livro-a')?.texto).toBe('B');
});
it('pode funcionar sem armazenamento disponível no navegador', () => {
  vi.stubGlobal('sessionStorage', { getItem: () => { throw new Error('bloqueado'); } });
  expect(carregarPreviaIA('autor:livro-a')).toBeNull();
});
