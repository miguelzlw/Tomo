import { expect, it } from 'vitest';
import { dividirTextoEmPaginas } from './paginacao';

it('leva a palavra inteira à próxima página quando ela não cabe', () => {
  expect(dividirTextoEmPaginas('12345678 comer', 11)).toEqual(['12345678 ', 'comer']);
});
it('preserva texto, espaços e parágrafos sem exceder o limite', () => {
  const texto = 'Uma história com acentos.\n\nMais palavras e  espaços. '.repeat(100);
  const paginas = dividirTextoEmPaginas(texto);
  expect(paginas.join('')).toBe(texto);
  expect(paginas.every((p) => p.length <= 1500)).toBe(true);
  for (let i = 1; i < paginas.length; i++) {
    expect(/\s$/.test(paginas[i - 1]) || /^\s/.test(paginas[i])).toBe(true);
  }
});
it('mantém a palavra que termina exatamente no limite', () => {
  expect(dividirTextoEmPaginas('comer hoje', 5)).toEqual(['comer', ' hoje']);
});
it('avisa sem truncar quando uma palavra sozinha excede o limite', () => {
  expect(() => dividirTextoEmPaginas('a'.repeat(1501))).toThrow('palavra');
});

it('retorna array com string vazia para texto vazio', () => {
  expect(dividirTextoEmPaginas('')).toEqual(['']);
});

it('lida eficientemente com textos longos preservando integridade (benchmark)', () => {
  const paragrafo = 'Capítulo longo de literatura com parágrafos ricos em detalhes descritivos e diálogos. ';
  // ~860.000 caracteres (~573 páginas)
  const textoLongo = paragrafo.repeat(10000);
  const inicio = performance.now();
  const paginas = dividirTextoEmPaginas(textoLongo, 1500);
  const duracao = performance.now() - inicio;

  expect(paginas.length).toBeGreaterThan(500);
  expect(paginas.join('')).toBe(textoLongo);
  expect(paginas.every((p) => p.length <= 1500)).toBe(true);
  // Garante que o processamento em O(n) execute em tempo adequado (< 250ms)
  expect(duracao).toBeLessThan(250);
});
