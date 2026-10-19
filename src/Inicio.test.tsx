import { expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Inicio } from './Inicio';
import type { ProgressoLeitura } from './dados/tipos';

const props = { salvos: [], leituras: [], abrindoLivro: false, abrirLivro: vi.fn(), detalhesLivro: vi.fn(), explorar: vi.fn() };

it('does not claim there are no readings while the first response is pending', () => {
  const html = renderToStaticMarkup(<Inicio {...props} carregando />);
  expect(html).toContain('aria-busy="true"');
  expect(html).not.toContain('Uma história espera por você.');
  expect(html).not.toContain('Explorar bibliotecas');
});

it('shows the empty state only once loading has finished', () => {
  const html = renderToStaticMarkup(<Inicio {...props} carregando={false} />);
  expect(html).toContain('Uma história espera por você.');
});

it('shows the latest reading as soon as the data is ready', () => {
  const leitura = { livro_id: 'livro-1', pagina_numero: 8, livro: { titulo: 'Minha leitura', total_paginas: 30 } } as ProgressoLeitura;
  const html = renderToStaticMarkup(<Inicio {...props} leituras={[leitura]} />);
  expect(html).toContain('Minha leitura');
  expect(html).toContain('Retomar leitura');
  expect(html).not.toContain('Uma história espera por você.');
});

it('distinguishes a request failure from an empty library', () => {
  const html = renderToStaticMarkup(<Inicio {...props} erro="Não foi possível carregar suas leituras." tentarNovamente={vi.fn()} />);
  expect(html).toContain('Tentar novamente');
  expect(html).not.toContain('Uma história espera por você.');
});
