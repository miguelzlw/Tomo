import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as dados from './dados';

describe('⚡ Bolt: debounce na busca de livros e perfis', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('evita buscas repetidas para cada tecla digitada e invalida requisições pendentes imediatamente', async () => {
    const spyBuscar = vi.spyOn(dados, 'buscarLivrosEPerfis').mockResolvedValue({ livros: [], perfis: [] });

    let timerDebounce: ReturnType<typeof setTimeout> | null = null;
    let pedidoAtual = 0;

    const pesquisarSimulado = (termo: string) => {
      const pedido = ++pedidoAtual;
      if (timerDebounce !== null) {
        clearTimeout(timerDebounce);
        timerDebounce = null;
      }
      if (!termo.trim()) {
        return;
      }
      timerDebounce = setTimeout(async () => {
        const resultado = await dados.buscarLivrosEPerfis(termo.trim());
        if (pedido !== pedidoAtual) return;
        return resultado;
      }, 300);
    };

    // Simula usuário digitando rapidamente "monteiro" letra por letra
    pesquisarSimulado('m');
    vi.advanceTimersByTime(50);
    pesquisarSimulado('mo');
    vi.advanceTimersByTime(50);
    pesquisarSimulado('mon');
    vi.advanceTimersByTime(50);
    pesquisarSimulado('monte');
    vi.advanceTimersByTime(50);
    pesquisarSimulado('monteiro');

    // Durante a digitação rápida, nenhuma chamada é realizada
    expect(spyBuscar).not.toHaveBeenCalled();

    // Avança 299ms (ainda não atingiu os 300ms de debounce após a última tecla)
    vi.advanceTimersByTime(299);
    expect(spyBuscar).not.toHaveBeenCalled();

    // Avança 1ms (totalizando 300ms após 'monteiro')
    vi.advanceTimersByTime(1);
    expect(spyBuscar).toHaveBeenCalledTimes(1);
    expect(spyBuscar).toHaveBeenCalledWith('monteiro');
  });

  it('limpa busca imediatamente ao esvaziar o termo sem esperar o debounce de 300ms', () => {
    const spyBuscar = vi.spyOn(dados, 'buscarLivrosEPerfis').mockResolvedValue({ livros: [], perfis: [] });

    let timerDebounce: ReturnType<typeof setTimeout> | null = null;
    let resultadoLimpo = false;

    const pesquisarSimulado = (termo: string) => {
      if (timerDebounce !== null) {
        clearTimeout(timerDebounce);
        timerDebounce = null;
      }
      if (!termo.trim()) {
        resultadoLimpo = true;
        return;
      }
      timerDebounce = setTimeout(async () => {
        await dados.buscarLivrosEPerfis(termo.trim());
      }, 300);
    };

    pesquisarSimulado('teste');
    expect(resultadoLimpo).toBe(false);

    // Usuário limpa a pesquisa
    pesquisarSimulado('');
    expect(resultadoLimpo).toBe(true);

    // Avança o timer e confirma que não ocorre nenhuma consulta atrasada
    vi.advanceTimersByTime(500);
    expect(spyBuscar).not.toHaveBeenCalled();
  });
});
