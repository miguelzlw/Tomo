import { useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Pencil, Plus } from 'lucide-react';
import type { Livro } from './dados/tipos';

interface Props {
  rascunhos: Livro[];
  publicados: Livro[];
  novoLivro: () => void;
  editarLivro: (livro: Livro) => void;
}

function Capa({ livro }: { livro: Livro }) {
  return livro.capa_url ? <img src={livro.capa_url} alt="" draggable={false} /> : <span className="typographic-cover"><BookOpen size={24} aria-hidden="true" /><span>{livro.titulo}</span></span>;
}

export function MeusLivros({ rascunhos, publicados, novoLivro, editarLivro }: Props) {
  const trilho = useRef<HTMLDivElement>(null);
  const arraste = useRef({ inicio: 0, topo: 0, scroll: 0, ativo: false, moveu: false });
  const [posicao, setPosicao] = useState(0);
  const [expandido, setExpandido] = useState(false);
  const quantidade = rascunhos.length;
  const atual = Math.max(0, Math.min(quantidade - 1, Math.round(posicao)));
  const passo = () => trilho.current?.querySelector<HTMLElement>('.draft-slot')?.getBoundingClientRect().width || 72;
  useLayoutEffect(() => {
    const elemento = trilho.current;
    if (!elemento) return;
    const centrar = () => { elemento.scrollLeft = Math.min(2, Math.floor(quantidade / 2)) * passo(); };
    centrar();
    const observer = new ResizeObserver(centrar);
    observer.observe(elemento);
    return () => observer.disconnect();
  }, [expandido, quantidade]);
  const irPara = (destino: number) => {
    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    trilho.current?.scrollTo({ left: Math.max(0, Math.min(quantidade - 1, destino)) * passo(), behavior: reduzido ? 'instant' : 'smooth' });
  };
  const iniciar = (event: PointerEvent<HTMLDivElement>) => {
    arraste.current.moveu = false;
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    arraste.current = { inicio: event.clientX, topo: event.clientY, scroll: event.currentTarget.scrollLeft, ativo: true, moveu: false };
  };
  const mover = (event: PointerEvent<HTMLDivElement>) => {
    const a = arraste.current;
    if (!a.ativo) return;
    const delta = event.clientX - a.inicio;
    if (!a.moveu && Math.abs(delta) < 7) return;
    if (!a.moveu && Math.abs(event.clientY - a.topo) > Math.abs(delta)) return;
    a.moveu = true;
    event.currentTarget.dataset.dragging = 'true';
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.scrollLeft = a.scroll - delta;
  };
  const terminar = (event: PointerEvent<HTMLDivElement>) => {
    const a = arraste.current;
    if (!a.ativo) return;
    a.ativo = false;
    event.currentTarget.dataset.dragging = 'false';
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (a.moveu) irPara(Math.round(event.currentTarget.scrollLeft / passo()));
  };

  const cartao = (livro: Livro) => <article className="library-book" key={livro.id}>
    <button className="library-cover" aria-label={`Editar ${livro.titulo}`} onClick={() => editarLivro(livro)}><Capa livro={livro} /></button>
    <div className="library-book-info"><div className="library-book-text"><h3><button onClick={() => editarLivro(livro)}>{livro.titulo}</button></h3><p>{livro.situacao === 'rascunho' ? 'Rascunho' : livro.visibilidade === 'publico' ? 'Público' : livro.visibilidade === 'amigos' ? 'Amigos' : 'Só eu'}</p></div><button className="edit-book-icon" aria-label={`Editar ${livro.titulo}`} onClick={() => editarLivro(livro)}><Pencil size={18} /></button></div>
  </article>;

  if (expandido) return <section className="my-books-page drafts-only" aria-label="Todos os rascunhos">
    <button className="btn-secondary back-button" onClick={() => setExpandido(false)}><ChevronLeft size={18} /> Voltar</button>
    <header className="my-books-heading"><h1>Rascunhos</h1></header>
    {rascunhos.length ? <div className="library-grid">{rascunhos.map(cartao)}</div> : <p className="shelf-empty">Você ainda não tem rascunhos.</p>}
  </section>;

  return <div className="my-books-page">
    <header className="my-books-heading"><h1>Seus livros</h1><button className="btn-primary" onClick={novoLivro}><Plus size={18} /> Novo livro</button></header>
    <section className="draft-section" aria-labelledby="draft-heading">
      <div className="section-header"><h2 id="draft-heading" className="section-title">Rascunhos</h2>{rascunhos.length > 1 && <button className="shelf-toggle" onClick={() => setExpandido(true)}>Ver todos os rascunhos</button>}</div>
      <div id="draft-content">
        {rascunhos.length === 0 ? <p className="shelf-empty">Seus rascunhos aparecem aqui. Comece um novo livro quando quiser.</p> : expandido ? <div className="library-grid">{rascunhos.map(cartao)}</div> : <>
          <div className="draft-stack draft-focus-stack" ref={trilho} role="region" aria-label="Rascunhos em capas sobrepostas, use as setas do teclado para navegar" tabIndex={0}
            onPointerDown={iniciar} onPointerMove={mover} onPointerUp={terminar} onPointerCancel={terminar}
            onLostPointerCapture={() => { arraste.current.ativo = false; }}
            onScroll={(event) => { setPosicao(event.currentTarget.scrollLeft / passo()); }}
            onKeyDown={(event) => { if (event.target !== event.currentTarget) return; const atual = Math.round(event.currentTarget.scrollLeft / passo()); if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); irPara(atual + (event.key === 'ArrowRight' ? 1 : -1)); } if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); irPara(event.key === 'Home' ? 0 : quantidade - 1); } }}>
            {rascunhos.map((livro, i) => {
              const distancia = Math.abs(i - posicao);
              return <div className="draft-slot" key={livro.id} style={{ zIndex: Math.round(1000 - distancia * 100) }}><button className="draft-cover" style={{ transform: `translate(-50%, -50%) scale(${Math.max(.7, 1 - distancia * .18)})`, opacity: Math.max(0, 1 - Math.min(distancia, 2) * .25) * Math.max(0, Math.min(1, 3 - distancia)), filter: `blur(${Math.min(distancia, 2) * .65}px)`, pointerEvents: distancia >= 3 ? 'none' : undefined }} aria-label={i === atual ? `Editar rascunho ${livro.titulo}` : `Selecionar rascunho ${livro.titulo}`} aria-current={i === atual ? 'true' : undefined} onClick={(event) => { if (arraste.current.moveu && event.detail > 0) { event.preventDefault(); arraste.current.moveu = false; return; } if (i !== atual) irPara(i); else editarLivro(livro); }}><Capa livro={livro} /></button></div>;
            })}
          </div>
          <div className="draft-caption"><div aria-live="polite" aria-atomic="true"><h3>{rascunhos[atual]?.titulo}</h3><p>Rascunho · {atual + 1} de {quantidade}</p></div><div className="draft-controls"><button aria-label="Rascunho anterior" disabled={atual === 0} onClick={() => irPara(atual - 1)}><ChevronLeft size={20} /></button><button aria-label="Próximo rascunho" disabled={atual === quantidade - 1} onClick={() => irPara(atual + 1)}><ChevronRight size={20} /></button></div></div>
        </>}
      </div>
    </section>
    <section className="published-section"><div className="section-header"><h2 className="section-title">Publicados</h2></div>{publicados.length ? <div className="library-grid">{publicados.map(cartao)}</div> : <p className="shelf-empty">Você ainda não publicou nenhum livro.</p>}</section>
  </div>;
}
