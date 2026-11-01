import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Debounce na pesquisa (Bolt ⚡)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('agrupa múltiplas digitações consecutivas em uma única execução após o delay', () => {
    let timerBusca: ReturnType<typeof setTimeout> | null = null;
    let pedidoAtual = 0;
    const buscarMock = vi.fn();

    const pesquisar = (termo: string) => {
      if (timerBusca) {
        clearTimeout(timerBusca);
        timerBusca = null;
      }
      const pedido = ++pedidoAtual;
      const termoLimpo = termo.trim();
      if (!termoLimpo) return;

      timerBusca = setTimeout(() => {
        if (pedido !== pedidoAtual) return;
        buscarMock(termoLimpo);
      }, 250);
    };

    // Usuário digita "t", "to", "tom", "tomo" rapidamente (intervalos de 50ms)
    pesquisar('t');
    vi.advanceTimersByTime(50);
    expect(buscarMock).not.toHaveBeenCalled();

    pesquisar('to');
    vi.advanceTimersByTime(50);
    expect(buscarMock).not.toHaveBeenCalled();

    pesquisar('tom');
    vi.advanceTimersByTime(50);
    expect(buscarMock).not.toHaveBeenCalled();

    pesquisar('tomo');
    vi.advanceTimersByTime(100);
    expect(buscarMock).not.toHaveBeenCalled();

    // Passam mais 150ms (totalizando 250ms desde a última tecla 'tomo')
    vi.advanceTimersByTime(150);
    expect(buscarMock).toHaveBeenCalledTimes(1);
    expect(buscarMock).toHaveBeenCalledWith('tomo');
  });

  it('cancela a busca pendente imediatamente quando o usuário limpa o termo', () => {
    let timerBusca: ReturnType<typeof setTimeout> | null = null;
    let pedidoAtual = 0;
    const buscarMock = vi.fn();
    const limparResultadosMock = vi.fn();

    const pesquisar = (termo: string) => {
      if (timerBusca) {
        clearTimeout(timerBusca);
        timerBusca = null;
      }
      const pedido = ++pedidoAtual;
      const termoLimpo = termo.trim();
      if (!termoLimpo) {
        limparResultadosMock();
        return;
      }

      timerBusca = setTimeout(() => {
        if (pedido !== pedidoAtual) return;
        buscarMock(termoLimpo);
      }, 250);
    };

    pesquisar('machado');
    vi.advanceTimersByTime(100);
    expect(buscarMock).not.toHaveBeenCalled();

    // Usuário clica no botão de limpar antes de 250ms
    pesquisar('');
    expect(limparResultadosMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(300);
    // Nenhuma busca deve ter sido efetuada
    expect(buscarMock).not.toHaveBeenCalled();
  });
});
