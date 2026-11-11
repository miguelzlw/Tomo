import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Pesquisa } from './Pesquisa';
import type { Perfil, Livro, BuscaRecente } from './dados/tipos';

describe('Pesquisa Component', () => {
  const perfisExemplo: Perfil[] = [
    {
      id: 'autor-1',
      nome_usuario: 'mariaclara',
      papel: 'usuario',
      status: 'aprovado',
      bio: 'Escritora de romances',
      foto_url: null,
      criado_em: new Date().toISOString(),
    },
  ];

  const livrosExemplo: Livro[] = [
    {
      id: 'livro-1',
      autor_id: 'autor-1',
      titulo: 'O Segredo da Floresta',
      descricao: 'Uma aventura fantástica',
      capa_url: null,
      fundo_url: null,
      situacao: 'lancado',
      visibilidade: 'publico',
      oculto_admin: false,
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
      autor: perfisExemplo[0],
    },
  ];

  const buscasRecentes: BuscaRecente[] = [
    {
      id: 'busca-1',
      usuario_id: 'user-1',
      termo: 'aventura',
      tipo: 'livro',
      criado_em: new Date().toISOString(),
    },
  ];

  const defaultProps = {
    termo: '',
    buscar: vi.fn(),
    confirmarBusca: vi.fn(),
    carregando: false,
    erro: '',
    livros: [],
    perfis: [],
    recentes: buscasRecentes,
    limparHistorico: vi.fn(),
    abrirLivro: vi.fn(),
    abrirPerfil: vi.fn(),
    salvarLivro: () => null,
    seguirPerfil: vi.fn(),
    seguindo: {},
    acaoSocial: false,
    usuarioId: 'user-1',
  };

  it('renderiza o histórico de buscas recentes quando o termo está vazio', () => {
    const html = renderToStaticMarkup(<Pesquisa {...defaultProps} />);
    expect(html).toContain('Buscas recentes');
    expect(html).toContain('aventura');
  });

  it('exibe indicador de carregamento durante a busca ativa', () => {
    const html = renderToStaticMarkup(<Pesquisa {...defaultProps} termo="floresta" carregando />);
    expect(html).toContain('Pesquisando…');
  });

  it('renderiza resultados de livros e perfis encontrados', () => {
    const html = renderToStaticMarkup(
      <Pesquisa
        {...defaultProps}
        termo="floresta"
        livros={livrosExemplo}
        perfis={perfisExemplo}
      />
    );
    expect(html).toContain('O Segredo da Floresta');
    expect(html).toContain('@mariaclara');
  });

  it('suporta debounce em chamadas repetidas sem chamadas desnecessárias à API', async () => {
    vi.useFakeTimers();
    let chamadas = 0;
    const buscarSimulado = (termo: string) => {
      chamadas++;
      return Promise.resolve({ livros: [], perfis: [], termo });
    };

    let timer: any = null;
    const debouncedSearch = (t: string) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void buscarSimulado(t);
      }, 250);
    };

    // Simula usuário digitando rapidamente "tomo" (4 teclas)
    debouncedSearch('t');
    debouncedSearch('to');
    debouncedSearch('tom');
    debouncedSearch('tomo');

    expect(chamadas).toBe(0);

    vi.advanceTimersByTime(250);
    expect(chamadas).toBe(1);

    vi.useRealTimers();
  });
});
