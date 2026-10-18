type Ponto = [number, number];

export type Movimento = {
  pagina: number | null;
  esquerda: Ponto;
  direita: Ponto;
  cabeca: number;
  salto: number;
  giro: number;
  agachar: number;
  encolher: number;
  tempo: number;
  respiracao: number;
  peso: number;
  tronco: number;
  dedosEsquerda: number;
  dedosDireita: number;
  punhoEsquerdo: number;
  punhoDireito: number;
  curvaturaDireita: number;
};

export const suave = (t: number) => {
  const p = Math.max(0, Math.min(1, t));
  return p * p * (3 - 2 * p);
};
export const misturar = (a: Ponto, b: Ponto, t: number): Ponto =>
  [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// One clock keeps the four-second reading beats and the sixteen-second
// celebration in sync, even after a suspended browser tab resumes.
export function movimentoEm(segundos: number): Movimento {
  const leitura = segundos % 4;
  const festa = segundos % 16;
  const esquerda: Ponto = [236 + Math.sin(segundos * .85) * 1.6, 290 + Math.sin(segundos * 1.1) * 2.2];
  const direita: Ponto = [337 + Math.sin(segundos * .7) * 1.3, 260 + Math.sin(segundos * 1.3 - .5) * 1.7];
  const movimento: Movimento = {
    pagina: segundos >= 4 && leitura < .72 ? leitura / .72 : null,
    cabeca: Math.sin(segundos * 1.5) * .022,
    salto: 0, giro: 0, agachar: 0, encolher: 0,
    esquerda, direita, tempo: segundos, respiracao: Math.sin(segundos * 2.1),
    peso: Math.sin(segundos * .8) * 1.2,
    tronco: Math.sin(segundos * .8 - .3) * .012,
    dedosEsquerda: .23 + Math.sin(segundos * 1.1) * .09,
    dedosDireita: .2 + Math.sin(segundos * 1.3 - .8) * .08,
    punhoEsquerdo: Math.sin(segundos * .9) * .045,
    punhoDireito: Math.sin(segundos * 1.2 - .4) * .035,
    curvaturaDireita: 1,
  };
  // The supporting hand occasionally loosens its grip and settles lower,
  // instead of remaining pinned in one pose between page turns.
  const apoio = segundos % 8;
  if (apoio > 5.2 && apoio < 6.8) {
    const ajustar = Math.sin((apoio - 5.2) / 1.6 * Math.PI) ** 2;
    movimento.esquerda = misturar(esquerda, [243, 301], ajustar);
    movimento.punhoEsquerdo += ajustar * .18;
    movimento.dedosEsquerda += ajustar * .35;
    movimento.tronco -= ajustar * .012;
  }
  if (leitura >= 3) {
    const t = leitura - 3;
    const envelope = suave(t / .18) * (1 - suave((t - .78) / .22));
    movimento.direita = misturar(direita,
      [300 + Math.sin(t * Math.PI * 8) * 2.4, 254 + Math.cos(t * Math.PI * 8) * 1.6], envelope);
    movimento.cabeca += Math.sin(t * Math.PI * 8) * .008 * envelope;
    movimento.dedosDireita = .2 + envelope * .6;
    movimento.punhoDireito -= envelope * .3;
    movimento.tronco += envelope * .015;
  } else if (movimento.pagina !== null) {
    const t = movimento.pagina;
    movimento.direita = t < .6
      ? misturar(direita, [249, 289], suave(t / .6))
      : misturar([249, 289], direita, suave((t - .6) / .4));
    const acompanhar = Math.sin(t * Math.PI);
    movimento.curvaturaDireita = 1 - acompanhar * 2;
    movimento.esquerda = misturar(esquerda, [233, 298], acompanhar * .7);
    movimento.dedosDireita = .2 + acompanhar * .6;
    movimento.dedosEsquerda += acompanhar * .2;
    movimento.tronco -= acompanhar * .027;
    movimento.cabeca -= Math.sin(t * Math.PI) * .06;
  }
  if (segundos >= 16 && festa >= .75 && festa < 3) {
    const t = festa - .75;
    if (t < 1.2) {
      const levantar = suave(t / .25);
      // Two separate close-open beats, with both palms meeting at x=300.
      const palma = Math.max(0, 1 - Math.abs(t - .43) / .14)
        + Math.max(0, 1 - Math.abs(t - .8) / .14);
      const abertura = 16 * (1 - suave(palma));
      movimento.esquerda = misturar(esquerda, [297 - abertura, 236], levantar);
      movimento.direita = misturar(direita, [303 + abertura, 236], levantar);
      const baixar = suave((t - .9) / .3);
      movimento.esquerda = misturar(movimento.esquerda, esquerda, baixar);
      movimento.direita = misturar(movimento.direita, direita, baixar);
      const gesto = levantar * (1 - baixar);
      movimento.dedosEsquerda += (.12 - movimento.dedosEsquerda) * gesto;
      movimento.dedosDireita += (.12 - movimento.dedosDireita) * gesto;
      movimento.punhoEsquerdo += (.1 - movimento.punhoEsquerdo) * gesto;
      movimento.punhoDireito += (-.1 - movimento.punhoDireito) * gesto;
      movimento.tronco += Math.sin(t * Math.PI * 2) * .012;
      movimento.cabeca += (-.035 - movimento.cabeca) * gesto;
    } else {
      const salto = (t - 1.2) / 1.05;
      const voo = Math.max(0, Math.min(1, (salto - .12) / .76));
      const recolher = Math.sin(Math.PI * voo);
      movimento.salto = Math.sin(Math.PI * voo) * 42;
      movimento.giro = suave(voo) * Math.PI * 2;
      movimento.encolher = recolher;
      movimento.agachar = salto < .12
        ? Math.sin(salto / .12 * Math.PI) * .1
        : salto > .88 ? Math.sin((salto - .88) / .12 * Math.PI) * .08 : 0;
      movimento.esquerda = misturar(esquerda, [283, 310], recolher);
      movimento.direita = misturar(direita, [316, 310], recolher);
      movimento.dedosEsquerda += recolher * .55;
      movimento.dedosDireita += recolher * .55;
    }
  }
  return movimento;
}

