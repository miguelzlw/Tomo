import { describe, expect, it, vi } from 'vitest';

describe('Debounce na pesquisa de livros e autores', () => {
  it('agrupa digitação rápida e executa a busca apenas uma vez após 300ms', async () => {
    vi.useFakeTimers();

    const buscarMock = vi.fn().mockResolvedValue({ livros: [], perfis: [] });
    let timer: ReturnType<typeof setTimeout> | null = null;
    let termoAtual = '';

    const pesquisarComDebounce = (termo: string) => {
      termoAtual = termo;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      const normalizado = termo.trim();
      if (!normalizado) return;

      timer = setTimeout(() => {
        void buscarMock(normalizado);
      }, 300);
    };

    // Usuário digita "A", depois "Al", depois "Alg" rapidamente (intervalos de 50ms)
    pesquisarComDebounce('A');
    vi.advanceTimersByTime(50);
    expect(buscarMock).not.toHaveBeenCalled();

    pesquisarComDebounce('Al');
    vi.advanceTimersByTime(50);
    expect(buscarMock).not.toHaveBeenCalled();

    pesquisarComDebounce('Alg');
    vi.advanceTimersByTime(50);
    expect(buscarMock).not.toHaveBeenCalled();

    // Passam-se mais 300ms sem novas teclas
    vi.advanceTimersByTime(300);

    // Deve ter chamado apenas 1 vez com o último termo ("Alg")
    expect(buscarMock).toHaveBeenCalledTimes(1);
    expect(buscarMock).toHaveBeenCalledWith('Alg');
    expect(termoAtual).toBe('Alg');

    vi.useRealTimers();
  });

  it('cancela imediatamente busca pendente quando o termo é apagado/vazio', () => {
    vi.useFakeTimers();

    const buscarMock = vi.fn().mockResolvedValue({ livros: [], perfis: [] });
    let timer: ReturnType<typeof setTimeout> | null = null;
    let resultados = ['livro 1'];

    const pesquisarComDebounce = (termo: string) => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      const normalizado = termo.trim();
      if (!normalizado) {
        resultados = [];
        return;
      }

      timer = setTimeout(() => {
        void buscarMock(normalizado);
      }, 300);
    };

    pesquisarComDebounce('Liv');
    expect(timer).not.toBeNull();

    // Usuário limpa a barra de pesquisa
    pesquisarComDebounce('');
    expect(timer).toBeNull();
    expect(resultados).toEqual([]);

    vi.advanceTimersByTime(500);
    expect(buscarMock).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
