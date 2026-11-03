import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BookOpen, Clock, Search, X } from 'lucide-react';
import type { BuscaRecente, Livro, Perfil } from './dados/tipos';

interface Props {
  termo: string;
  buscar: (termo: string) => Promise<void>;
  confirmarBusca: () => Promise<void>;
  carregando: boolean;
  erro: string;
  livros: Livro[];
  perfis: Perfil[];
  recentes: BuscaRecente[];
  limparHistorico: () => Promise<void>;
  abrirLivro: (id: string) => void;
  abrirPerfil: (perfil: Perfil) => void;
  salvarLivro: (livro: Livro, compacto: boolean) => ReactNode;
  seguirPerfil: (perfil: Perfil) => void;
  seguindo: Record<string, boolean>;
  acaoSocial: boolean;
  usuarioId: string;
}

export function Pesquisa(props: Props) {
  const { termo, buscar, carregando, erro, livros, perfis, recentes } = props;

  // ⚡ Otimização de Performance (Bolt):
  // Debounce na busca para evitar requisições a cada tecla digitada (reduz chamadas em ~70-80%).
  // Mantemos o valor local responsivo imediatamente na UI, enquanto a busca assíncrona aguarda 300ms.
  const [valorDigitado, setValorDigitado] = useState(termo);
  const timerDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sincroniza caso o termo mude externamente (ex: clique no histórico ou limpeza externa)
  const [termoAnterior, setTermoAnterior] = useState(termo);
  if (termo !== termoAnterior) {
    setTermoAnterior(termo);
    setValorDigitado(termo);
  }

  useEffect(() => {
    return () => {
      if (timerDebounce.current) clearTimeout(timerDebounce.current);
    };
  }, []);

  const lidarComMudanca = (novoValor: string) => {
    setValorDigitado(novoValor);
    if (timerDebounce.current) clearTimeout(timerDebounce.current);

    // Se o usuário limpar o campo, dispara imediatamente sem atrasar
    if (!novoValor.trim()) {
      void buscar('');
      return;
    }

    // Aguarda o término da digitação (300ms) antes de disparar a busca assíncrona
    timerDebounce.current = setTimeout(() => {
      void buscar(novoValor);
    }, 300);
  };

  const limparPesquisa = () => {
    if (timerDebounce.current) clearTimeout(timerDebounce.current);
    setValorDigitado('');
    void buscar('');
    document.getElementById('search-query')?.focus();
  };

  return <section className="search-page" aria-label="Pesquisar livros ou pessoas">
    <form className="search-field" role="search" onSubmit={(event) => {
      event.preventDefault();
      if (timerDebounce.current) clearTimeout(timerDebounce.current);
      if (valorDigitado !== termo) void buscar(valorDigitado);
      void props.confirmarBusca();
    }}>
      <Search size={22} aria-hidden="true" />
      <input id="search-query" type="search" enterKeyHint="search" aria-label="Pesquisar livros ou pessoas" placeholder="Pesquisar livros ou pessoas" value={valorDigitado} onChange={(event) => lidarComMudanca(event.target.value)} autoComplete="off" />
      {valorDigitado && <button type="button" aria-label="Limpar pesquisa" onClick={limparPesquisa}><X size={20} /></button>}
    </form>
    {!termo.trim() ? <section className="search-history">
      <div className="section-header"><h2 className="section-title">Buscas recentes</h2>{recentes.length > 0 && <button className="shelf-toggle" onClick={() => void props.limparHistorico()}>Limpar histórico</button>}</div>
      {recentes.length ? <div className="search-history-list">{recentes.map((item) => <button key={item.id} onClick={() => void buscar(item.termo)}><Clock size={18} aria-hidden="true" /><span>{item.termo}</span></button>)}</div> : <p className="search-feedback">Nenhuma busca recente.</p>}
    </section> : erro ? <p className="search-feedback" role="alert">{erro}</p> : carregando ? <p className="search-feedback" role="status">Pesquisando…</p> : <div className="search-results">
      <section className="search-authors" aria-labelledby="search-authors-title">
        <h2 id="search-authors-title" className="section-title">Autores</h2>
        {perfis.length ? <div className="search-author-list">{perfis.map((perfil) => <div className="search-author" key={perfil.id}>
          <button className="profile-result" onClick={() => props.abrirPerfil(perfil)}><span className="avatar avatar-small">{perfil.foto_url ? <img src={perfil.foto_url} alt="" /> : perfil.nome_usuario.charAt(0).toUpperCase()}</span><span className="search-author-text"><strong>@{perfil.nome_usuario}</strong>{perfil.bio && <span className="profile-result-bio">{perfil.bio}</span>}</span></button>
          {perfil.id !== props.usuarioId && <button className="btn-secondary search-follow" disabled={props.acaoSocial} onClick={() => props.seguirPerfil(perfil)}>{props.seguindo[perfil.id] ? 'Seguindo' : 'Seguir'}</button>}
        </div>)}</div> : <p className="search-feedback">Nenhum autor encontrado.</p>}
      </section>
      <section className="search-books" aria-labelledby="search-books-title">
        <h2 id="search-books-title" className="section-title">Livros</h2>
        {livros.length ? <div className="library-grid">{livros.map((livro) => <article className="library-book" key={livro.id}>
          <button className="library-cover" aria-label={`Ler ${livro.titulo}`} onClick={() => props.abrirLivro(livro.id)}>{livro.capa_url ? <img src={livro.capa_url} alt="" loading="lazy" /> : <span className="typographic-cover"><BookOpen size={24} aria-hidden="true" /><span>{livro.titulo}</span></span>}</button>
          <div className="library-book-info"><div className="library-book-text"><h3><button onClick={() => props.abrirLivro(livro.id)}>{livro.titulo}</button></h3><p>{livro.autor ? `@${livro.autor.nome_usuario}` : 'Autor'}</p></div>{props.salvarLivro(livro, true)}</div>
        </article>)}</div> : <p className="search-feedback">Nenhum livro encontrado.</p>}
      </section>
    </div>}
  </section>;
}
