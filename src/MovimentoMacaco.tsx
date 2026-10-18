/** Sobreposições alinhadas ao recorte 900×675; nenhum quadro troca o personagem inteiro. */
export function MovimentoMacaco() {
  return <svg className="mascot-character-motion" viewBox="0 0 900 675" aria-hidden="true">
    <defs>
      {/* A capa fica à frente: só a parte da folha acima do miolo é visível. */}
      <clipPath id="mascot-book-interior"><path d="M410 220 H700 V270 L677 277 Q622 289 575 335 Q515 310 440 304 L410 300 Z" /></clipPath>
      <radialGradient id="mascot-eye-skin"><stop stopColor="#ffcea0" /><stop offset="1" stopColor="#f6bd8d" /></radialGradient>
      <radialGradient id="mascot-iris"><stop stopColor="#572a15" /><stop offset=".72" stopColor="#301409" /><stop offset="1" stopColor="#1e0b05" /></radialGradient>
      <linearGradient id="mascot-turn-paper" x1="0" x2="1"><stop stopColor="#d7be94" /><stop offset=".42" stopColor="#fff2d4" /><stop offset="1" stopColor="#f5dfba" /></linearGradient>
    </defs>
    {([{ x: 403, y: 195 }, { x: 508, y: 166 }]).map(({ x, y }, i) => <g key={i} transform={`translate(${x} ${y}) rotate(-16)`}>
      <ellipse rx="21" ry="24" fill="url(#mascot-eye-skin)" />
      <g className="mascot-eye-open">
        <ellipse rx="16.5" ry="19" fill="#ffe0b5" />
        <ellipse cx="3" cy="5" rx="13.5" ry="16" fill="url(#mascot-iris)" />
        <ellipse cx="0" cy="-2" rx="3.4" ry="4" fill="#fff9ea" />
      </g>
      <path className="mascot-eye-closed" d="M-15 1 Q0 12 15 1" fill="none" stroke="#713a21" strokeWidth="3.5" strokeLinecap="round" />
    </g>)}
    <g clipPath="url(#mascot-book-interior)">
      <path className="mascot-page-turn" fill="url(#mascot-turn-paper)" stroke="#d7bd95" strokeWidth=".8" d="M574 333 C602 303 634 281 666 274 C638 275 602 300 574 333 Z" />
    </g>
  </svg>;
}
