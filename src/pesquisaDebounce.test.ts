import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Debounce da pesquisa (⚡ Bolt Performance)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('agrupa múltiplas digitações rápidas em apenas uma chamada após o tempo limite de 250ms', () => {
    const executarBusca = vi.fn();
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const pesquisar = (termo: string) => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      if (!termo.trim()) {
        executarBusca('');
        return;
      }
      debounceTimer = setTimeout(() => {
        executarBusca(termo);
      }, 250);
    };

    // Usuário digita 'm', 'ma', 'mac', 'maca', 'macaco' rapidamente (intervalos de 50ms)
    pesquisar('m');
    vi.advanceTimersByTime(50);
    pesquisar('ma');
    vi.advanceTimersByTime(50);
    pesquisar('mac');
    vi.advanceTimersByTime(50);
    pesquisar('maca');
    vi.advanceTimersByTime(50);
    pesquisar('macaco');

    // Nenhuma chamada deve ter sido disparada ainda antes do debounce expirar
    expect(executarBusca).not.toHaveBeenCalled();

    // Avança 249ms
    vi.advanceTimersByTime(249);
    expect(executarBusca).not.toHaveBeenCalled();

    // Avança 1ms (totalizando 250ms desde a última tecla digitada)
    vi.advanceTimersByTime(1);
    expect(executarBusca).toHaveBeenCalledTimes(1);
    expect(executarBusca).toHaveBeenCalledWith('macaco');
  });

  it('executa a limpeza de busca imediatamente sem aguardar o debounce de 250ms', () => {
    const executarBusca = vi.fn();
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const pesquisar = (termo: string) => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      if (!termo.trim()) {
        executarBusca('');
        return;
      }
      debounceTimer = setTimeout(() => {
        executarBusca(termo);
      }, 250);
    };

    pesquisar('livro');
    // Usuário clica no botão de limpar antes de 250ms
    vi.advanceTimersByTime(100);
    pesquisar('');

    // A busca vazia/limpeza é disparada imediatamente
    expect(executarBusca).toHaveBeenCalledTimes(1);
    expect(executarBusca).toHaveBeenCalledWith('');

    // E mesmo após os 250ms originais, a busca por 'livro' não deve ser chamada
    vi.advanceTimersByTime(300);
    expect(executarBusca).toHaveBeenCalledTimes(1);
  });
});
