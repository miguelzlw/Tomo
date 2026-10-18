import type { ReactNode } from 'react';
import { BookOpen } from 'lucide-react';
import type { Livro } from './dados/tipos';

interface BibliotecaProps {
  livros: Livro[];
  abrirLivro: (id: string) => void;
  salvarLivro: (livro: Livro, compacto: boolean) => ReactNode;
}

export function Biblioteca({ livros, abrirLivro, salvarLivro }: BibliotecaProps) {
  return <section className="library-page" aria-labelledby="library-title">
    <header className="library-heading"><h1 id="library-title">Biblioteca</h1></header>
    <p className="library-count">{livros.length} {livros.length === 1 ? 'livro' : 'livros'}</p>
    {livros.length === 0 ? <div className="library-empty">
      <BookOpen size={32} aria-hidden="true" />
      <h2>A biblioteca ainda está vazia.</h2>
      <p>Os livros disponíveis para você aparecem aqui.</p>
    </div> : <div className="library-grid">
      {livros.map((livro) => <article className="library-book" key={livro.id}>
        <button className="library-cover" aria-label={`Ler ${livro.titulo}`} onClick={() => abrirLivro(livro.id)}>
          {livro.capa_url ? <img src={livro.capa_url} alt="" loading="lazy" /> : <span className="typographic-cover"><BookOpen size={24} aria-hidden="true" /><span>{livro.titulo}</span></span>}
        </button>
        <div className="library-book-info">
          <div className="library-book-text">
            <h2><button onClick={() => abrirLivro(livro.id)}>{livro.titulo}</button></h2>
            <p>{livro.autor ? `@${livro.autor.nome_usuario}` : 'Autor'}</p>
          </div>
          {salvarLivro(livro, true)}
        </div>
      </article>)}
    </div>}
  </section>;
}
