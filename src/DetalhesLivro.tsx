import { useEffect, useRef } from 'react';
import { ArrowRight, Bookmark, BookOpen, Globe, Lock, Users, X } from 'lucide-react';
import type { Livro, Perfil } from './dados/tipos';

interface Props {
  livro: Livro;
  continuar: boolean;
  salvo: boolean;
  salvando: boolean;
  lendo: boolean;
  erro: string;
  fechar: () => void;
  ler: () => void;
  salvar: () => void;
  autor: (perfil: Perfil) => void;
}

export function DetalhesLivro(props: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { livro } = props;
  useEffect(() => {
    const elemento = dialog.current;
    if (!elemento) return;
    elemento.showModal();
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { elemento.close(); document.body.style.overflow = anterior; };
  }, []);

  const Visibilidade = livro.visibilidade === 'publico' ? Globe : livro.visibilidade === 'amigos' ? Users : Lock;
  return <dialog className="book-details-dialog" ref={dialog} aria-labelledby="book-details-title" onCancel={(event) => { event.preventDefault(); props.fechar(); }} onClick={(event) => { if (event.target === event.currentTarget) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) props.fechar(); } }}>
    <div className="book-details-content">
      <button className="book-details-close" aria-label="Fechar detalhes do livro" autoFocus onClick={props.fechar}><X size={24} /></button>
      <div className="book-details-cover">{livro.capa_url ? <img src={livro.capa_url} alt={`Capa de ${livro.titulo}`} /> : <span className="typographic-cover"><BookOpen size={30} aria-hidden="true" /><span>{livro.titulo}</span></span>}</div>
      <div className="book-details-info">
        <h2 id="book-details-title">{livro.titulo}</h2>
        {livro.autor && <button className="book-details-author" onClick={() => props.autor(livro.autor!)}>@{livro.autor.nome_usuario}</button>}
        {livro.descricao && <div className="book-details-description"><h3>Sobre o livro</h3><p>{livro.descricao}</p></div>}
        <p className="book-details-visibility"><Visibilidade size={18} aria-hidden="true" />{livro.visibilidade === 'publico' ? 'Público' : livro.visibilidade === 'amigos' ? 'Amigos' : 'Só eu'}</p>
        {props.erro && <p role="alert" className="book-details-error">{props.erro}</p>}
        <div className="book-details-actions">
          <button className="btn-primary" onClick={props.ler} disabled={props.lendo}>{props.lendo ? 'Abrindo…' : props.continuar ? 'Continuar lendo' : 'Começar leitura'}<ArrowRight size={18} /></button>
          <button className="btn-secondary" onClick={props.salvar} disabled={props.salvando} aria-pressed={props.salvo}><Bookmark size={18} fill={props.salvo ? 'currentColor' : 'none'} />{props.salvando ? 'Salvando…' : props.salvo ? 'Remover dos salvos' : 'Salvar para depois'}</button>
        </div>
      </div>
    </div>
  </dialog>;
}
