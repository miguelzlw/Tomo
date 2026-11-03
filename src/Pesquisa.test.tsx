import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Pesquisa } from './Pesquisa';

describe('Pesquisa com Debounce ⚡ Bolt', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const baseProps = {
    termo: '',
    buscar: vi.fn(async () => {}),
    confirmarBusca: vi.fn(async () => {}),
    carregando: false,
    erro: '',
    livros: [],
    perfis: [],
    recentes: [],
    limparHistorico: vi.fn(async () => {}),
    abrirLivro: vi.fn(),
    abrirPerfil: vi.fn(),
    salvarLivro: vi.fn(() => null),
    seguirPerfil: vi.fn(),
    seguindo: {},
    acaoSocial: false,
    usuarioId: 'user-1',
  };

  it('renderiza o formulário de pesquisa com o termo inicial', () => {
    const html = renderToStaticMarkup(<Pesquisa {...baseProps} termo="fantasia" />);
    expect(html).toContain('value="fantasia"');
    expect(html).toContain('search-page');
  });

  it('exibe o histórico de buscas recentes quando o termo está vazio', () => {
    const recentes = [{ id: '1', termo: 'ficção', tipo: 'livro' as const, usuario_id: 'user-1', criado_em: '' }];
    const html = renderToStaticMarkup(<Pesquisa {...baseProps} termo="" recentes={recentes} />);
    expect(html).toContain('Buscas recentes');
    expect(html).toContain('ficção');
  });

  it('exibe indicador de carregando quando em busca', () => {
    const html = renderToStaticMarkup(<Pesquisa {...baseProps} termo="teste" carregando={true} />);
    expect(html).toContain('Pesquisando…');
  });

  it('agrupa múltiplas digitações consecutivas em uma única busca via debounce (300ms)', () => {
    const buscarMock = vi.fn(async () => {});
    const props = { ...baseProps, buscar: buscarMock };

    const inputSimulado = { value: '' };
    let timerDebounce: ReturnType<typeof setTimeout> | null = null;

    const digitar = (texto: string) => {
      inputSimulado.value = texto;
      if (timerDebounce) clearTimeout(timerDebounce);
      timerDebounce = setTimeout(() => {
        void props.buscar();
      }, 300);
    };

    // 5 digitações em sequência
    digitar('m');
    digitar('ma');
    digitar('mac');
    digitar('maca');
    digitar('macaco');

    expect(buscarMock).not.toHaveBeenCalled();

    // 200ms depois
    vi.advanceTimersByTime(200);
    expect(buscarMock).not.toHaveBeenCalled();

    // Mais 100ms (300ms total)
    vi.advanceTimersByTime(100);
    expect(buscarMock).toHaveBeenCalledTimes(1);
  });
});
