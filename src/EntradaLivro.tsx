import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { MarcaTomo } from './MarcaTomo';

export function EntradaLivro({ onPreparar, onConcluir }: { onPreparar?: () => void; onConcluir: () => void }) {
  const inicio = useRef(0);
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    inicio.current = Date.now();
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflowAnterior; };
  }, []);

  useEffect(() => {
    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduzido) { onPreparar?.(); onConcluir(); return; }
    let saida: number | undefined;
    let revelar: number | undefined;
    // Motion has its own deadline; authentication and dashboard data load separately.
    const minimo = window.setTimeout(() => {
      onPreparar?.();
      // Commit the destination beneath the opaque book before fading it out.
      revelar = window.setTimeout(() => {
        setSaindo(true);
        saida = window.setTimeout(onConcluir, 350);
      }, 50);
    }, Math.max(0, 1500 - (Date.now() - inicio.current)));
    return () => { window.clearTimeout(minimo); window.clearTimeout(revelar); window.clearTimeout(saida); };
  }, [onPreparar, onConcluir]);

  return <div className="login-book-entry" data-saindo={saindo} role="status" aria-label="Verificando seu acesso ao Tomo.">
    <div className="login-book-stage" aria-hidden="true">
      <div className="login-closed-book">
        <div className="login-book-volume">
        <div className="login-book-back" />
        <div className="login-book-spine" />
        <div className="login-book-edge login-book-edge-fore" />
        <div className="login-book-edge login-book-edge-bottom" />
        <div className="login-book-pages" />
        <div className="login-book-paper login-book-paper-base" />
        <div className="login-book-leaves">{Array.from({ length: 12 }, (_, i) => <div className="login-book-paper login-book-leaf" key={i} style={{ '--leaf': i } as CSSProperties}><span /><span /><span /><span /><span /></div>)}</div>
        <div className="login-book-cover">
          <div className="login-book-frame">
            <span className="login-book-ornament">✦</span>
            <MarcaTomo className="login-book-title" />
            <span className="login-book-rule" />
            <span className="login-book-subtitle">Sua próxima história</span>
            <span className="login-book-ornament">✦</span>
          </div>
        </div>
        </div>
      </div>
    </div>
  </div>;
}
