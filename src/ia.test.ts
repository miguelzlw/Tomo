import { expect, it } from 'vitest';
import { prepararInsercaoIA } from './ia';

it('anexa a história sem alterar páginas existentes e sem cortar palavras', () => {
  const original = [{ numero: 1, texto: 'Texto escrito à mão.' }];
  const texto = 'Uma aventura inesquecível. '.repeat(160);
  const resultado = prepararInsercaoIA(original, texto);
  expect(resultado[0]).toEqual(original[0]);
  expect(resultado.slice(1).map(p => p.texto).join('')).toBe(texto);
  expect(resultado.every(p => p.texto.length <= 1500)).toBe(true);
  expect(original).toHaveLength(1);
});
it('aproveita a página inicial vazia e rejeita respostas vazias', () => {
  expect(prepararInsercaoIA([{ numero: 1, texto: '' }], 'Era uma vez.')).toEqual([{ numero: 1, texto: 'Era uma vez.' }]);
  expect(() => prepararInsercaoIA([], '   ')).toThrow();
});
