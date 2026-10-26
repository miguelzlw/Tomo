import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buscarLivrosEPerfis } from '../dados';

vi.mock('../dados', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../dados')>();
  return {
    ...mod,
    buscarLivrosEPerfis: vi.fn().mockResolvedValue({ livros: [], perfis: [] }),
  };
});

describe('Debounce na função de pesquisa', () => {
  let timerBuscaRef: { current: number | null };
  let pesquisaAtual: { current: number };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    timerBuscaRef = { current: null };
    pesquisaAtual = { current: 0 };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Função `pesquisar` espelhando exatamente a implementação de `App.tsx`
  const criarPesquisar = () => {
    return (termo: string, imediato = false) => {
      if (timerBuscaRef.current) {
        clearTimeout(timerBuscaRef.current);
        timerBuscaRef.current = null;
      }

      if (!termo.trim()) {
        pesquisaAtual.current++;
        return;
      }

      const executar = async () => {
        const pedido = ++pesquisaAtual.current;
        try {
          const resultado = await buscarLivrosEPerfis(termo.trim());
          if (pedido !== pesquisaAtual.current) return;
          return resultado;
        } catch {
          // erro tratado
        }
      };

      if (imediato) {
        void executar();
      } else {
        timerBuscaRef.current = setTimeout(executar, 300) as unknown as number;
      }
    };
  };

  it('agrupa chamadas durante digitação rápida realizando apenas 1 chamada após 300ms', () => {
    const pesquisar = criarPesquisar();

    pesquisar('d');
    pesquisar('do');
    pesquisar('dom');

    expect(buscarLivrosEPerfis).not.toHaveBeenCalled();

    vi.advanceTimersByTime(290);
    expect(buscarLivrosEPerfis).not.toHaveBeenCalled();

    vi.advanceTimersByTime(15);
    expect(buscarLivrosEPerfis).toHaveBeenCalledTimes(1);
    expect(buscarLivrosEPerfis).toHaveBeenCalledWith('dom');
  });

  it('executa a busca imediatamente com o parâmetro imediato=true ao selecionar termo', () => {
    const pesquisar = criarPesquisar();

    pesquisar('Machado de Assis', true);

    expect(buscarLivrosEPerfis).toHaveBeenCalledTimes(1);
    expect(buscarLivrosEPerfis).toHaveBeenCalledWith('Machado de Assis');
  });
});
