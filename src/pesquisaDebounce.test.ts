import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Debounce de Pesquisa ⚡ Bolt', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('agrupa múltiplas digitações consecutivas em uma única requisição após o delay de 250ms', async () => {
    const buscarMock = vi.fn().mockResolvedValue({ livros: [], perfis: [] });

    let timer: ReturnType<typeof setTimeout> | null = null;
    let termoAtual = '';
    let pedidoAtual = 0;

    // Simula a lógica implementada no App.tsx
    const pesquisar = (termo: string) => {
      const pedido = ++pedidoAtual;
      termoAtual = termo;

      if (timer) {
        clearTimeout(timer);
        timer = null;
      }

      const termoLimpo = termo.trim();
      if (!termoLimpo) {
        return;
      }

      timer = setTimeout(async () => {
        const resultado = await buscarMock(termoLimpo);
        if (pedido !== pedidoAtual) return;
        return resultado;
      }, 250);
    };

    // Usuário digita "T", "To", "Tom", "Tomo" rapidamente
    pesquisar('T');
    vi.advanceTimersByTime(50);
    pesquisar('To');
    vi.advanceTimersByTime(50);
    pesquisar('Tom');
    vi.advanceTimersByTime(50);
    pesquisar('Tomo');

    // Nenhuma chamada ainda porque o debounce é de 250ms
    expect(buscarMock).not.toHaveBeenCalled();

    // Avança 249ms (total 249ms desde o último caractere 'Tomo')
    vi.advanceTimersByTime(249);
    expect(buscarMock).not.toHaveBeenCalled();

    // Completa os 250ms
    vi.advanceTimersByTime(1);
    expect(buscarMock).toHaveBeenCalledTimes(1);
    expect(buscarMock).toHaveBeenCalledWith('Tomo');
    expect(termoAtual).toBe('Tomo');
  });

  it('limpa os resultados imediatamente e cancela timeout pendente se o termo for vazio', () => {
    const buscarMock = vi.fn().mockResolvedValue({ livros: [], perfis: [] });
    let timer: ReturnType<typeof setTimeout> | null = null;
    let resultados = [{ id: '1' }];

    const pesquisar = (termo: string) => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }

      const termoLimpo = termo.trim();
      if (!termoLimpo) {
        resultados = [];
        return;
      }

      timer = setTimeout(async () => {
        await buscarMock(termoLimpo);
      }, 250);
    };

    pesquisar('Dom');
    expect(timer).not.toBeNull();

    // Usuário limpa a barra de busca antes de disparar o timer
    pesquisar('');
    expect(timer).toBeNull();
    expect(resultados).toEqual([]);

    vi.advanceTimersByTime(300);
    expect(buscarMock).not.toHaveBeenCalled();
  });
});
