import { useEffect, useRef, useState } from 'react';
import { IlustracaoMacacoLivro } from './IlustracaoMacacoLivro';

/** Carrega a cena 3D apenas quando a ilustração aparece no layout desktop. */
export function MacacoLivro3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [desktop, setDesktop] = useState(() => window.matchMedia('(min-width: 961px)').matches);
  const [pronto, setPronto] = useState(false);
  const [falha, setFalha] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 961px)');
    const mudar = () => setDesktop(media.matches);
    media.addEventListener('change', mudar);
    return () => media.removeEventListener('change', mudar);
  }, []);
  useEffect(() => {
    if (!desktop || !canvasRef.current) return;
    let cancelado = false; let limpar: (() => void) | undefined;
    const canvas = canvasRef.current;
    setPronto(false);
    setFalha(false);
    import('./modelos/cenaMacacoLivro').then(({ criarCenaMacacoLivro }) => {
      if (!cancelado) limpar = criarCenaMacacoLivro(canvas, () => setPronto(true), () => { setPronto(false); setFalha(true); });
    }).catch(error => { if (!cancelado) setFalha(true); console.error('A cena 3D não pôde ser carregada:', error); });
    return () => { cancelado = true; limpar?.(); };
  }, [desktop]);
  if (!desktop) return null;
  return <div className="monkey-book-scene">
    {falha && <IlustracaoMacacoLivro />}
    <canvas ref={canvasRef} className={`monkey-book-scene__canvas${pronto ? ' is-ready' : ''}`}
      role="img" aria-hidden={!pronto}
      aria-label="Nosso macaco em 3D lendo um grande livro azul, virando páginas, coçando a cabeça, batendo palmas e dando uma cambalhota" />
  </div>;
}
