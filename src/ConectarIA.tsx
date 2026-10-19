import { useLayoutEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { ConexoesIA } from './ConexoesIA';
import { AutorizarMCP } from './AutorizarMCP';

export function ArteConexaoIA() {
  return <svg className="ia-connect-art" viewBox="0 0 104 76" fill="none" aria-hidden="true">
    <path d="M12 54C8 36 24 13 48 11c26-3 48 15 43 35-4 18-27 24-47 20-14-3-28 1-32-12Z" fill="currentColor" opacity=".10" />
    <path d="m17 30 29 5 1 27-29-6-1-26Z" fill="#e6c3a1" stroke="#a85b30" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="m47 35 29-8-1 28-28 7V35Z" fill="#fff6e7" stroke="#a85b30" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M21 27c12-3 19 0 26 5v25c-8-6-16-6-25-5l-1-25Z" fill="#fffbf3" stroke="#a85b30" strokeWidth="1.5" />
    <path d="M47 32c7-8 16-11 25-11v26c-11 1-18 5-25 10V32Z" fill="#fff1dc" stroke="#a85b30" strokeWidth="1.5" />
    <path d="m27 35 13 3m-13 4 13 3m14-10 11-5m-11 12 11-5" stroke="#b18d6d" strokeWidth="1.5" strokeLinecap="round" />
    <path d="m77 8 2.3 8.7L88 19l-8.7 2.3L77 30l-2.3-8.7L66 19l8.7-2.3L77 8Z" fill="#d57939" />
    <path d="m89 36 1.2 4.8L95 42l-4.8 1.2L89 48l-1.2-4.8L83 42l4.8-1.2L89 36Z" fill="#d57939" />
    <circle cx="25" cy="15" r="2" fill="#d57939" />
  </svg>;
}

export function BotaoConectarIA({ abrir }: { abrir: () => void }) {
  return <button className="ia-connect-button" onClick={abrir} aria-haspopup="dialog"><ArteConexaoIA /><span>Conectar com IA</span></button>;
}

export function JanelaConectarIA({ fechar }: { fechar: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const elemento = dialog.current!;
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    elemento.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; elemento.close(); anterior?.focus(); };
  }, []);
  return <dialog ref={dialog} className="ia-connect-dialog" aria-labelledby="ia-dialog-title" onCancel={fechar} onClick={e => { if (e.target === e.currentTarget) { const box = e.currentTarget.getBoundingClientRect(); if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) fechar(); } }}>
    <button className="ia-dialog-close" aria-label="Fechar conexões de IA" onClick={fechar} autoFocus><X size={22} /></button>
    <header className="ia-dialog-heading"><ArteConexaoIA /><div><span className="ia-dialog-eyebrow">Um novo capítulo</span><h1 id="ia-dialog-title">Conectar com IA</h1><p>Suas ideias, mais possibilidades de histórias.</p></div></header>
    <AutorizarMCP />
    <ConexoesIA />
  </dialog>;
}
