import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Check, CircleCheck, RotateCcw, Trash2, X } from 'lucide-react';
import type { Livro } from './dados/tipos';

export function LixeiraLivros({ livros, fechar, restaurar, excluirPermanente, carregando = false, erroCarregamento = '', tentarNovamente }: { livros: Livro[]; fechar: () => void; restaurar: (livro: Livro) => Promise<void>; excluirPermanente?: (ids: string[]) => Promise<void>; carregando?: boolean; erroCarregamento?: string; tentarNovamente?: () => void }) {
  const dialogo = useRef<HTMLDivElement>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  const [selecionando, setSelecionando] = useState(false);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const idsSelecionados = selecionados.filter((id) => livros.some((livro) => livro.id === id));
  const alternarSelecao = (id: string) => { if (!ocupado) setSelecionados((ids) => ids.includes(id) ? ids.filter((atual) => atual !== id) : [...ids, id]); };
  const excluirSelecao = async () => {
    if (ocupado || !idsSelecionados.length || !excluirPermanente) return;
    if (!confirm(`Excluir permanentemente ${idsSelecionados.length} livro(s) e todas as suas páginas? Essa ação não pode ser desfeita.`)) return;
    setOcupado('exclusao'); setErro('');
    try { await excluirPermanente(idsSelecionados); setSelecionados([]); setSelecionando(false); } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível excluir os livros.'); } finally { setOcupado(null); }
  };
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogo.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => { document.body.style.overflow = overflow; anterior?.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => {
    if (!dialogo.current?.contains(document.activeElement)) dialogo.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  }, [livros.length, ocupado]);
  const restaurarLivro = async (livro: Livro) => {
    if (ocupado) return;
    setOcupado(livro.id); setErro('');
    try { await restaurar(livro); } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível restaurar o livro.'); } finally { setOcupado(null); }
  };
  return createPortal(<div className="admin-modal-backdrop trash-backdrop" onClick={(event) => { if (event.target === event.currentTarget && !ocupado) fechar(); }}>
    <div ref={dialogo} className="admin-modal-content profile-edit-dialog trash-dialog" role="dialog" aria-modal="true" aria-labelledby="trash-title" aria-describedby="trash-description" onKeyDown={(event) => {
      if (event.key === 'Escape') { event.preventDefault(); if (!ocupado) fechar(); }
      if (event.key !== 'Tab') return;
      const botoes = Array.from(dialogo.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]') ?? []);
      if (!botoes.length) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === botoes[0]) { event.preventDefault(); botoes.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === botoes.at(-1)) { event.preventDefault(); botoes[0].focus(); }
    }}>
      <button className="bare-close trash-close" aria-label="Fechar lixeira" disabled={!!ocupado} onClick={fechar}><X size={23} strokeWidth={1.4} /></button>
      <p className="trash-eyebrow">Biblioteca pessoal</p>
      <header className="trash-heading"><h2 id="trash-title">Lixeira</h2><span className="trash-total">{livros.length}</span>
        {excluirPermanente && livros.length > 0 && <button className="drafts-select-trigger trash-select-trigger" disabled={!!ocupado || carregando} aria-label={selecionando ? 'Cancelar seleção' : 'Selecionar livros da lixeira'} onClick={() => { setSelecionando(!selecionando); setSelecionados([]); }}>{selecionando ? <X size={17} /> : <CircleCheck size={18} strokeWidth={1.5} />}<span>{selecionando ? 'Cancelar' : 'Selecionar'}</span></button>}
      </header>
      <p id="trash-description" className="trash-description">Restaure seus livros ou selecione os que deseja excluir permanentemente.</p>
      {carregando && <p className="trash-loading" role="status">Atualizando sua lixeira…</p>}
      {erroCarregamento && <div className="trash-error" role="alert"><p>{erroCarregamento}</p><button className="draft-select-all" onClick={tentarNovamente}>Tentar novamente</button></div>}
      {erro && <p className="trash-error" role="alert">{erro}</p>}
      {selecionando && <div className="draft-selection-toolbar trash-selection-toolbar"><span className="draft-selection-count" aria-live="polite">{idsSelecionados.length} selecionado{idsSelecionados.length === 1 ? '' : 's'}</span><button className="draft-select-all" disabled={!!ocupado || carregando} onClick={() => setSelecionados(idsSelecionados.length === livros.length ? [] : livros.map((livro) => livro.id))}>{idsSelecionados.length === livros.length ? 'Limpar seleção' : 'Selecionar todos'}</button><button className="draft-delete-selected" disabled={!!ocupado || carregando || !idsSelecionados.length} onClick={() => void excluirSelecao()}><Trash2 size={16} /><span>{ocupado === 'exclusao' ? 'Excluindo…' : 'Excluir permanentemente'}</span></button></div>}
      {livros.length ? <ul className="trash-book-list">{livros.map((livro) => <li className={`trash-book-row${selecionando ? ' trash-row-selectable' : ''}`} data-selected={idsSelecionados.includes(livro.id)} key={livro.id} role={selecionando ? 'checkbox' : undefined} aria-checked={selecionando ? idsSelecionados.includes(livro.id) : undefined} aria-label={selecionando ? `Selecionar ${livro.titulo}` : undefined} tabIndex={selecionando ? 0 : undefined} onClick={selecionando ? () => alternarSelecao(livro.id) : undefined} onKeyDown={selecionando ? (event) => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); alternarSelecao(livro.id); } } : undefined}>
        <span className="trash-book-cover" aria-hidden="true">{livro.capa_url ? <img src={livro.capa_url} alt="" /> : <BookOpen size={22} strokeWidth={1.3} />}{selecionando && <span className="trash-selection-circle">{idsSelecionados.includes(livro.id) && <Check size={12} strokeWidth={2.5} />}</span>}</span>
        <div className="trash-book-info"><h3>{livro.titulo}</h3><p>Livro publicado</p></div>
        {!selecionando && <button className="trash-restore" disabled={!!ocupado || carregando} aria-label={`Restaurar ${livro.titulo}`} onClick={() => void restaurarLivro(livro)}><RotateCcw size={17} strokeWidth={1.6} /><span>{ocupado === livro.id ? 'Restaurando…' : 'Restaurar'}</span></button>}
      </li>)}</ul> : !carregando && !erroCarregamento && <div className="trash-empty"><Trash2 size={32} strokeWidth={1} /><h3>Tudo no seu lugar.</h3><p>Nenhum livro na lixeira.</p></div>}
    </div>
  </div>, document.body);
}
