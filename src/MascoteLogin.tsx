import { MovimentoMacaco } from './MovimentoMacaco';
import type { CSSProperties } from 'react';
const folhas = [
  { papel: false, atraso: -1, tempo: 18, tamanho: 54, x: '-36cqw', y: '-12cqw', giro: -30 },
  { papel: true, atraso: -5, tempo: 22, tamanho: 78, x: '32cqw', y: '13cqw', giro: 15 },
  { papel: false, atraso: -8, tempo: 18, tamanho: 66, x: '36cqw', y: '-18cqw', giro: 50 },
  { papel: false, atraso: -12, tempo: 20, tamanho: 44, x: '-23cqw', y: '20cqw', giro: -65 },
  { papel: true, atraso: -16, tempo: 22, tamanho: 66, x: '-34cqw', y: '9cqw', giro: -20 },
  { papel: false, atraso: -15, tempo: 18, tamanho: 50, x: '25cqw', y: '22cqw', giro: 20 },
  { papel: true, atraso: -10, tempo: 24, tamanho: 58, x: '-10cqw', y: '-28cqw', giro: 35 },
];
/** Camadas transparentes: movimento por CSS, sem canvas ou atualizações React por quadro. */
export function MascoteLogin() {
  return <div className="mascot-stage">
    <div className="mascot-character"><img className="auth-mascot" src="/images/macaco-recorte.webp" width="900" height="675" alt="" fetchPriority="high" decoding="async" /><MovimentoMacaco /></div>
    {folhas.map((folha, i) => <span key={i} className={`mascot-orbit ${folha.papel ? 'mascot-orbit-paper' : ''}`} style={{
      '--atraso': `${folha.atraso}s`, '--tempo': `${folha.tempo}s`, '--tamanho': `${folha.tamanho}px`,
      '--repouso-x': folha.x, '--repouso-y': folha.y, '--giro': `${folha.giro}deg`,
    } as CSSProperties}><img src={folha.papel ? '/images/papel-orbita.webp' : '/images/folha-orbita.webp'} width="180" height="180" alt="" draggable={false} /></span>)}
  </div>;
}
