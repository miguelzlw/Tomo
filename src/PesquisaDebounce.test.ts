import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Pesquisa debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('agrupa múltiplas digitações rápidas em uma única chamada após 300ms', () => {
    const buscarMock = vi.fn();
    let timerBusca: ReturnType<typeof setTimeout> | null = null;

    const pesquisarComDebounce = (termo: string) => {
      if (timerBusca) {
        clearTimeout(timerBusca);
        timerBusca = null;
      }
      const termoLimpo = termo.trim();
      if (!termoLimpo) {
        return;
      }
      timerBusca = setTimeout(() => {
        buscarMock(termoLimpo);
      }, 300);
    };

    // Usuário digita 'm', 'ma', 'mac', 'maca', 'macaco' rapidamente
    pesquisarComDebounce('m');
    vi.advanceTimersByTime(50);
    pesquisarComDebounce('ma');
    vi.advanceTimersByTime(50);
    pesquisarComDebounce('mac');
    vi.advanceTimersByTime(50);
    pesquisarComDebounce('maca');
    vi.advanceTimersByTime(50);
    pesquisarComDebounce('macaco');

    // Nenhuma chamada deve ter sido disparada ainda durante a digitação
    expect(buscarMock).not.toHaveBeenCalled();

    // Avança o tempo de debounce (300ms)
    vi.advanceTimersByTime(300);

    // Deve ter chamado exatamente 1 vez com o valor final
    expect(buscarMock).toHaveBeenCalledTimes(1);
    expect(buscarMock).toHaveBeenCalledWith('macaco');
  });

  it('cancela a busca pendente imediatamente quando o termo é esvaziado', () => {
    const buscarMock = vi.fn();
    const limparMock = vi.fn();
    let timerBusca: ReturnType<typeof setTimeout> | null = null;

    const pesquisarComDebounce = (termo: string) => {
      if (timerBusca) {
        clearTimeout(timerBusca);
        timerBusca = null;
      }
      const termoLimpo = termo.trim();
      if (!termoLimpo) {
        limparMock();
        return;
      }
      timerBusca = setTimeout(() => {
        buscarMock(termoLimpo);
      }, 300);
    };

    pesquisarComDebounce('livro');
    vi.advanceTimersByTime(100);
    expect(buscarMock).not.toHaveBeenCalled();

    // Usuário limpa o input
    pesquisarComDebounce('');
    expect(limparMock).toHaveBeenCalledTimes(1);

    // Passam 500ms
    vi.advanceTimersByTime(500);
    // A busca anterior deve ter sido cancelada e nunca executada
    expect(buscarMock).not.toHaveBeenCalled();
  });
});
