import { useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import type { Livro, ProgressoLeitura } from './dados/tipos';

interface InicioProps {
  salvos: Livro[];
  leituras: ProgressoLeitura[];
  abrindoLivro: boolean;
  abrirLivro: (id: string) => void;
  detalhesLivro: (id: string) => void;
  explorar: () => void;
}

export function Inicio({ salvos, leituras, abrindoLivro, abrirLivro, detalhesLivro, explorar }: InicioProps) {
  const estante = useRef<HTMLDivElement>(null);
  const [capacidade, setCapacidade] = useState(4);
  const [verTodos, setVerTodos] = useState(false);

  useEffect(() => {
    const elemento = estante.current;
    if (!elemento) return;
    const observer = new ResizeObserver(([entry]) => {
      // A estante acompanha a largura real, inclusive ao redimensionar a janela.
      const largura = entry.contentRect.width;
      const minimo = largura >= 700 ? 156 : 100;
      setCapacidade(Math.max(1, Math.min(7, Math.floor((largura + 24) / (minimo + 24)))));
    });
    observer.observe(elemento);
    return () => observer.disconnect();
  }, []);

  const destaque = leituras[0];
  const livro = destaque?.livro;
  const total = livro?.total_paginas;
  const excedeEstante = salvos.length > capacidade;

  return <div className="dashboard-layout literary-home">
    <header className="home-intro">
      <h1>Suas leituras</h1>
    </header>

    {destaque ? <section className="reading-feature" aria-label="Continuar lendo">
      <button className="featured-cover" disabled={abrindoLivro} aria-busy={abrindoLivro} aria-label={`Continuar lendo ${livro?.titulo || 'livro'}`} onClick={() => abrirLivro(destaque.livro_id)}>
        {livro?.capa_url ? <img src={livro.capa_url} alt="" /> : <span className="typographic-cover"><BookOpen size={28} /><span>{livro?.titulo || 'Sua leitura'}</span></span>}
      </button>
      <div className="reading-details">
        <p className="reading-eyebrow">Continuar lendo</p>
        <h2>{livro?.titulo || 'Sua leitura'}</h2>
        {livro?.autor && <p className="reading-author">@{livro.autor.nome_usuario}</p>}
        {livro?.descricao && <p className="reading-description">{livro.descricao}</p>}
        <div className="reading-position">
          {total && total > 0 ? <progress value={Math.min(destaque.pagina_numero, total)} max={total} aria-label="Progresso da leitura" /> : null}
          <p>Página {destaque.pagina_numero}{total && total > 0 ? ` de ${total}` : ''}</p>
        </div>
        <button className="btn-primary resume-reading" disabled={abrindoLivro} aria-busy={abrindoLivro} onClick={() => abrirLivro(destaque.livro_id)}>{abrindoLivro ? 'Abrindo leitura…' : 'Retomar leitura'} <ArrowRight size={18} /></button>
      </div>
    </section> : <section className="reading-empty">
      <BookOpen size={30} aria-hidden="true" />
      <h2>Uma história espera por você.</h2>
      <p>Escolha um livro para começar. Sua leitura continua aqui.</p>
      <button className="btn-primary" onClick={explorar}>Explorar bibliotecas <ArrowRight size={18} /></button>
    </section>}

    {leituras.length > 1 && <section className="other-readings" aria-label="Outras leituras em andamento">
      <h2 className="section-title">Outras leituras</h2>
      <div className="other-reading-list">{leituras.slice(1).map((leitura) => <button key={leitura.livro_id} onClick={() => abrirLivro(leitura.livro_id)}>
        <BookOpen size={18} aria-hidden="true" /><span>{leitura.livro?.titulo || 'Continuar leitura'}</span><small>Pág. {leitura.pagina_numero}</small><ArrowRight size={16} aria-hidden="true" />
      </button>)}</div>
    </section>}

    <section className="home-shelf" id="minha-estante" tabIndex={-1}>
      <div className="section-header">
        <h2 className="section-title">Na sua estante</h2>
        {excedeEstante && <button className="shelf-toggle" aria-expanded={verTodos} aria-controls="saved-shelf" onClick={() => setVerTodos(!verTodos)}>{verTodos ? 'Ver menos' : 'Ver todos'} <ArrowRight size={16} aria-hidden="true" /></button>}
      </div>
      <div ref={estante} id="saved-shelf" className="home-saved-grid" style={{ '--shelf-columns': capacidade } as React.CSSProperties}>
        {(verTodos ? salvos : salvos.slice(0, capacidade)).map((salvo) => <button key={salvo.id} className="saved-book" onClick={() => detalhesLivro(salvo.id)}>
          <span className="saved-cover">{salvo.capa_url ? <img src={salvo.capa_url} alt="" loading="lazy" /> : <BookOpen size={30} aria-hidden="true" />}</span>
          <span className="saved-title">{salvo.titulo}</span>
          {salvo.autor && <span className="saved-author">@{salvo.autor.nome_usuario}</span>}
        </button>)}
      </div>
      {salvos.length === 0 && <p className="shelf-empty">Salve os livros que quer ler. Eles vão encontrar um lugar aqui.</p>}
    </section>
  </div>;
}
