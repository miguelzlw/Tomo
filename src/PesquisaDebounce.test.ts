import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Debounce de pesquisa no cliente', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('agrupa múltiplas digitações consecutivas em apenas 1 chamada de busca', () => {
    const executarBusca = vi.fn();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const pesquisar = (termo: string, imediato = false) => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (!termo.trim() || imediato) {
        executarBusca(termo);
        return;
      }
      timer = setTimeout(() => {
        executarBusca(termo);
      }, 250);
    };

    // Simula usuário digitando rapidamente "t", "te", "tes", "test", "teste" (5 digitações em 200ms)
    pesquisar('t');
    vi.advanceTimersByTime(40);
    pesquisar('te');
    vi.advanceTimersByTime(40);
    pesquisar('tes');
    vi.advanceTimersByTime(40);
    pesquisar('test');
    vi.advanceTimersByTime(40);
    pesquisar('teste');

    // Nenhuma chamada ainda antes de completar o debounce
    expect(executarBusca).toHaveBeenCalledTimes(0);

    // Avança 250ms após a última digitação
    vi.advanceTimersByTime(250);

    // Apenas 1 chamada executada com o termo completo
    expect(executarBusca).toHaveBeenCalledTimes(1);
    expect(executarBusca).toHaveBeenCalledWith('teste');
  });

  it('executa imediatamente se a pesquisa for cancelada ou submetida com imediato=true', () => {
    const executarBusca = vi.fn();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const pesquisar = (termo: string, imediato = false) => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (!termo.trim() || imediato) {
        executarBusca(termo);
        return;
      }
      timer = setTimeout(() => {
        executarBusca(termo);
      }, 250);
    };

    pesquisar('livro');
    expect(executarBusca).toHaveBeenCalledTimes(0);

    // Usuário aperta Enter (confirmação imediata)
    pesquisar('livro', true);
    expect(executarBusca).toHaveBeenCalledTimes(1);
    expect(executarBusca).toHaveBeenCalledWith('livro');

    // Ao avançar o tempo do timer que foi cancelado, nenhuma nova chamada deve ocorrer
    vi.advanceTimersByTime(300);
    expect(executarBusca).toHaveBeenCalledTimes(1);
  });
});
