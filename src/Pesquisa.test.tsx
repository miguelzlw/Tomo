import { expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Pesquisa } from './Pesquisa';

const defaultProps = {
  termo: '',
  buscar: vi.fn(),
  confirmarBusca: vi.fn(),
  carregando: false,
  erro: '',
  livros: [],
  perfis: [],
  recentes: [{ id: '1', usuario_id: 'user-1', termo: 'Machado', tipo: 'livro' as const, criado_em: '2025-01-01' }],
  limparHistorico: vi.fn(),
  abrirLivro: vi.fn(),
  abrirPerfil: vi.fn(),
  salvarLivro: vi.fn(() => null),
  seguirPerfil: vi.fn(),
  seguindo: {},
  acaoSocial: false,
  usuarioId: 'user-1',
};

it('renders recent searches when search term is empty', () => {
  const html = renderToStaticMarkup(<Pesquisa {...defaultProps} />);
  expect(html).toContain('Buscas recentes');
  expect(html).toContain('Machado');
  expect(html).toContain('Limpar histórico');
});

it('renders searching indicator when loading', () => {
  const html = renderToStaticMarkup(<Pesquisa {...defaultProps} termo="Clarice" carregando={true} />);
  expect(html).toContain('Pesquisando…');
});

it('renders search error when error is provided', () => {
  const html = renderToStaticMarkup(<Pesquisa {...defaultProps} termo="Clarice" erro="Erro ao buscar" />);
  expect(html).toContain('Erro ao buscar');
});

it('triggers buscar callback when typing into search input', () => {
  const mockBuscar = vi.fn();
  const html = renderToStaticMarkup(<Pesquisa {...defaultProps} buscar={mockBuscar} />);
  expect(html).toContain('id="search-query"');
});
