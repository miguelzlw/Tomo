import { movimentoEm, misturar, suave, type Movimento } from './animacaoMacaco';
import { useEffect, useRef } from 'react';

export interface CoresIlustracao {
  capa: string;
  papel: string;
  pelo: string;
  pele: string;
  tinta: string;
}

const coresPadrao: CoresIlustracao = {
  capa: '#303d82', papel: '#f5f5ef', pelo: '#98552f',
  pele: '#dba67e', tinta: '#444751',
};

type Ponto = [number, number];
type Curva = [number, number, number, number, number, number];
type Trecho = Ponto | Curva;

// All coordinates belong to a 402 × 456 drawing, matching the reference.
// Each body part has its own local pivot so future animation does not move
// unrelated parts. These are Canvas commands, with no image or SVG assets.
function forma(c: CanvasRenderingContext2D, inicio: Ponto, trechos: Trecho[],
  cor: string | CanvasGradient | null, contorno = '#543727', largura = 1.7, fechar = true) {
  c.beginPath();
  c.moveTo(...inicio);
  for (const trecho of trechos) {
    if (trecho.length === 2) c.lineTo(...trecho);
    else c.bezierCurveTo(...trecho);
  }
  if (fechar) c.closePath();
  if (cor) { c.fillStyle = cor; c.fill(); }
  if (largura) { c.strokeStyle = contorno; c.lineWidth = largura; c.stroke(); }
}

function elipse(c: CanvasRenderingContext2D, x: number, y: number,
  rx: number, ry: number, cor: string, contorno?: string, rotacao = 0) {
  c.beginPath(); c.ellipse(x, y, rx, ry, rotacao, 0, Math.PI * 2);
  c.fillStyle = cor; c.fill();
  if (contorno) { c.strokeStyle = contorno; c.lineWidth = 1.5; c.stroke(); }
}

function parte(c: CanvasRenderingContext2D, pivo: Ponto, angulo: number, desenhar: () => void) {
  c.save(); c.translate(...pivo); c.rotate(angulo);
  c.translate(-pivo[0], -pivo[1]); desenhar(); c.restore();
}

// Elliptical falloff stays soft at every canvas resolution. Dark, transparent
// pigment blends with the page background instead of forming a pale platform.
function sombraSuave(c: CanvasRenderingContext2D, centro: Ponto,
  raios: Ponto, intensidade: number, rotacao = 0) {
  c.save();
  c.translate(...centro);
  c.rotate(rotacao);
  c.scale(...raios);
  const gradiente = c.createRadialGradient(0, 0, 0, 0, 0, 1);
  gradiente.addColorStop(0, `rgba(5, 7, 12, ${intensidade})`);
  gradiente.addColorStop(.3, `rgba(5, 7, 12, ${intensidade * .72})`);
  gradiente.addColorStop(.65, `rgba(5, 7, 12, ${intensidade * .25})`);
  gradiente.addColorStop(1, 'rgba(5, 7, 12, 0)');
  c.fillStyle = gradiente;
  c.beginPath();
  c.arc(0, 0, 1, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function luzRebatida(c: CanvasRenderingContext2D, centro: Ponto,
  raios: Ponto, intensidade: number, rotacao = 0) {
  c.save();
  c.translate(...centro);
  c.rotate(rotacao);
  c.scale(...raios);
  const gradiente = c.createRadialGradient(0, 0, 0, 0, 0, 1);
  gradiente.addColorStop(0, `rgba(105, 123, 165, ${intensidade})`);
  gradiente.addColorStop(.42, `rgba(105, 123, 165, ${intensidade * .48})`);
  gradiente.addColorStop(1, 'rgba(105, 123, 165, 0)');
  c.fillStyle = gradiente;
  c.beginPath();
  c.arc(0, 0, 1, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function desenharSombras(c: CanvasRenderingContext2D, alturaSalto = 0) {
  // A cool, low-contrast bounce light gives the dark floor a subtle plane
  // beneath the illustration without creating a visible oval or platform.
  luzRebatida(c, [194, 394], [160, 34], .24, -.04);

  // Light comes from the upper right; the cast shadows trail to the left.
  // The book's base runs diagonally from its spine to the open page corner.
  sombraSuave(c, [95, 376], [79, 14], .43, .27);
  sombraSuave(c, [82, 381], [35, 4.5], .68, .48);
  sombraSuave(c, [108, 392], [17, 3.5], .58, -.22);

  // A wide, faint penumbra unites both feet. Small contact shadows anchor
  // each sole, rather than putting the monkey on one opaque oval.
  c.save();
  c.globalAlpha = 1 - alturaSalto / 42 * .65;
  sombraSuave(c, [285, 413], [42 + alturaSalto * .2, 9 + alturaSalto * .1], .4, .08);
  sombraSuave(c, [278, 415], [17, 3.5], .72, .2);
  sombraSuave(c, [311, 405], [13, 3], .64, .3);
  c.restore();
}

// Hand-drawn stroke glyphs avoid platform font substitutions. The small marks
// reproduce the reference's vertical calligraphic texture, not a transcription.
function glifo(c: CanvasRenderingContext2D, x: number, y: number, s: number, variante: number) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.lineWidth = .62; c.strokeStyle = '#454954';
  c.beginPath();
  c.moveTo(0, -3.3); c.lineTo(.2, 3.2);
  c.moveTo(-2.1, -1.9); c.lineTo(2.1, -2.1);
  c.moveTo(-1.8, .1); c.lineTo(1.9, -.1);
  if (variante % 3 === 0) {
    c.moveTo(-1.6, -2); c.lineTo(-1.5, 1.5); c.lineTo(1.4, 1.4); c.lineTo(1.5, -1.8);
    c.moveTo(-.3, .5); c.lineTo(-2.3, 3.1);
    c.moveTo(.4, .7); c.lineTo(2.1, 3);
  } else if (variante % 3 === 1) {
    c.moveTo(-2.4, -3); c.lineTo(-1.1, -2.3);
    c.moveTo(-1.8, -.5); c.lineTo(-2.3, 2.5);
    c.moveTo(.2, -.7); c.lineTo(2.3, 1.7);
    c.moveTo(-.9, 2.4); c.lineTo(1.8, 2.3);
  } else {
    c.moveTo(-2.4, -.8); c.lineTo(2.4, -.8);
    c.moveTo(-1.4, .6); c.lineTo(-1.4, 2.5); c.lineTo(1.7, 2.5); c.lineTo(1.7, .5); c.lineTo(-1.4, .6);
    c.moveTo(.7, -3.5); c.lineTo(1.8, -2.6);
  }
  c.stroke(); c.restore();
}

function desenharLivro(c: CanvasRenderingContext2D, cores: CoresIlustracao, pagina = 0) {
  const borda = '#343a57';
  forma(c, [50, 160], [[154, 88], [158, 74, 169, 71, 186, 74], [326, 53],
    [331, 52, 334, 56, 334, 62], [335, 86], [190, 104], [63, 374],
    [56, 379, 49, 374, 49, 369]], cores.capa, '#202c59', 2);
  forma(c, [56, 162], [[162, 89], [169, 80, 177, 81, 190, 81], [328, 59]],
    null, '#53639b', 2, false);
  const folhas = [
    { x: 62, y: 167, topo: 68, base: 375 },
    { x: 68, y: 171, topo: 74, base: 379 },
    { x: 74, y: 176, topo: 80, base: 383 },
    { x: 81, y: 180, topo: 86, base: 387 },
    { x: 88, y: 184, topo: 91, base: 390 },
  ];
  for (const f of folhas) {
    forma(c, [f.x, f.y], [[139, 130, 165, 108, 188, 94],
      [234, 90, 290, 79, 329, f.topo], [336, f.topo + 13],
      [337, 309], [190, 314], [166, 347, 130, 378, 108, 395],
      [f.x, f.base]], cores.papel, '#737786', 1.2);
  }
  // Open right page: the upper and lower edges bow toward the binding.
  forma(c, [189, 98], [[235, 104, 292, 96, 340, 91], [340, 307],
    [292, 317, 235, 313, 190, 307]], cores.papel, borda, 1.5);
  const papelSombra = c.createLinearGradient(188, 0, 220, 0);
  papelSombra.addColorStop(0, '#dce0e0'); papelSombra.addColorStop(.55, '#f0f1eb');
  papelSombra.addColorStop(1, cores.papel);
  forma(c, [108, 191], [[139, 170, 167, 146, 189, 98], [190, 307],
    [178, 344, 140, 377, 108, 395]], papelSombra, borda, 1.5);
  // Red printed frames follow each page's perspective.
  forma(c, [201, 111], [[245, 117, 290, 110, 327, 105], [327, 296],
    [283, 302, 242, 298, 201, 293]], null, '#b88b96', 1);
  forma(c, [120, 202], [[142, 184, 165, 163, 182, 126], [182, 303],
    [169, 329, 141, 358, 120, 373]], null, '#b88b96', 1);
  for (let col = 0; col < 9; col++) {
    const x = 209 + col * 14.1;
    const top = 119 - Math.max(0, col - 2) * 1.25;
    forma(c, [x + 6, top - 6], [[x + 6, 293 - col * .15]], null, '#c2a0a7', .6, false);
    for (let row = 0; row < 22; row++) glifo(c, x, top + row * 7.8, .93, col * 7 + row * 11 + pagina);
  }
  // Left page is curved, so each column has its own top, bottom and scale.
  for (let col = 0; col < 10; col++) {
    const t = col / 9;
    const x = 124 + t * 54;
    const top = 204 - 64 * t - 9 * t * t;
    const bottom = 362 - 49 * t;
    forma(c, [x + 3.2, top - 6], [[x + 3.2, bottom + 5]], null, '#c5a1a8', .55, false);
    for (let row = 0; row < 24; row++) {
      glifo(c, x, top + row * (bottom - top) / 23, .56 + t * .17, col + row * 7 + pagina);
    }
  }
  // Narrow marginal notes and red seals on the folded left leaf.
  forma(c, [99, 188], [[105, 184], [105, 212], [99, 217]], '#b94d69', '#b94d69', .6);
  forma(c, [108, 224], [[108, 199]], null, '#b94d69', 2, false);
  forma(c, [108, 247], [[114, 244], [114, 252], [108, 255]], '#b94d69', '#b94d69', .6);
  for (let j = 0; j < 11; j++) {
    const y = 229 + j * 6;
    forma(c, [94, y], [[101, y - 3], [105, y - 4]], null, '#626979', .7, false);
  }
  for (let j = 0; j < 8; j++) glifo(c, 113, 206 + j * 8, .65, j);
  // Tiny line illustration at the foot of the marginal column.
  forma(c, [93, 358], [[99, 346], [96, 341], [99, 329], [104, 335],
    [104, 309], [108, 307], [106, 322], [111, 328], [108, 339],
    [102, 344], [106, 353], [99, 359], [93, 358]], null, '#667384', .8, false);
  forma(c, [94, 363], [[105, 358], [108, 349], [102, 351], [97, 345],
    [92, 352], [97, 354]], null, '#667384', .7, false);
  // Visible binding crease.
  forma(c, [188, 100], [[184, 176, 189, 249, 188, 302]], null, '#9c9fa9', 1, false);
}

function desenharCauda(c: CanvasRenderingContext2D, cores: CoresIlustracao,
  angulo: number, tempo: number, impulso: number) {
  // The wave travels along the tail: the tip follows the pelvis with a delay.
  const meio = Math.sin(tempo * 1.25 - .7) * 2.8 + impulso * 2;
  const ponta = Math.sin(tempo * 1.25 - 1.5) * 4.5 + Math.sin(tempo * 2.1) * 1.2 + impulso * 4;
  const segmentos: [Ponto, Ponto, Ponto, Ponto][] = [
    [[309, 351], [335, 372], [365 + meio, 355], [350 + meio, 326]],
    [[350 + meio, 326], [343 + meio, 310], [338 + ponta, 296], [352 + ponta, 292]],
    [[352 + ponta, 292], [368 + ponta, 286], [377 + ponta, 302], [365 + ponta, 307]],
    [[365 + ponta, 307], [359 + ponta, 310], [358 + ponta, 303], [363 + ponta, 300]],
  ];
  const pontos: Ponto[] = [];
  for (const [a, b, d, e] of segmentos) {
    for (let passo = 0; passo < 18; passo++) {
      const t = passo / 18; const u = 1 - t;
      pontos.push([u ** 3 * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * d[0] + t ** 3 * e[0],
        u ** 3 * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * d[1] + t ** 3 * e[1]]);
    }
  }
  pontos.push(segmentos[3][3]);
  const lados: [Ponto[], Ponto[]] = [[], []];
  pontos.forEach((ponto, i) => {
    const antes = pontos[Math.max(0, i - 1)]; const depois = pontos[Math.min(pontos.length - 1, i + 1)];
    const anguloNormal = Math.atan2(depois[1] - antes[1], depois[0] - antes[0]) + Math.PI / 2;
    const raio = 5.7 - i / (pontos.length - 1) * 3.4;
    for (let lado = 0; lado < 2; lado++) {
      const sinal = lado === 0 ? 1 : -1;
      lados[lado].push([ponto[0] + Math.cos(anguloNormal) * raio * sinal,
        ponto[1] + Math.sin(anguloNormal) * raio * sinal]);
    }
  });
  parte(c, [310, 351], angulo, () => {
    const luz = c.createLinearGradient(332, 300, 365, 355);
    luz.addColorStop(0, '#bf8052'); luz.addColorStop(.48, cores.pelo); luz.addColorStop(1, '#71402b');
    forma(c, lados[0][0], [...lados[0].slice(1), ...lados[1].reverse()], luz, '#573928', 1.3);
    forma(c, pontos[3], pontos.slice(4, 65).map(([x, y]): Ponto => [x - 1, y - .8]),
      null, '#cd9160', .85, false);
  });
}

function desenharPernas(c: CanvasRenderingContext2D, cores: CoresIlustracao) {
  const pelo = c.createLinearGradient(277, 355, 312, 405);
  pelo.addColorStop(0, '#af7448'); pelo.addColorStop(.5, cores.pelo); pelo.addColorStop(1, '#78432b');
  forma(c, [300, 348], [[311, 350, 313, 365, 310, 375], [313, 394],
    [321, 402, 321, 409, 313, 408], [300, 403], [299, 399, 300, 396, 303, 396],
    [295, 372], [286, 364]], pelo, '#63412d', 1.3);
  forma(c, [302, 395], [[307, 395, 307, 401, 315, 403], [316, 407],
    [303, 402], [300, 399]], cores.pele, '#62412f', 1.1);
  forma(c, [290, 346], [[276, 359, 272, 379, 277, 396], [279, 407],
    [267, 402, 264, 404, 265, 409], [273, 415, 283, 419, 289, 416],
    [292, 413, 287, 408, 287, 405], [284, 388, 293, 374, 302, 364],
    [310, 359, 306, 351, 301, 349]], pelo, '#63412d', 1.3);
  forma(c, [282, 367], [[278, 377, 279, 388, 282, 396]], null, '#bd8454', .75, false);
  forma(c, [277, 404], [[281, 407], [282, 412], [288, 414],
    [287, 418, 274, 415, 266, 410], [264, 406, 269, 405, 273, 408],
    [268, 404, 272, 403, 277, 407]], cores.pele, '#62412f', 1.1);
  for (let i = 0; i < 3; i++) {
    forma(c, [269 + i * 4, 408 + i], [[274 + i * 3, 412 + i]], null, '#79513a', .7, false);
  }
}

type PoseMacaco = { cabeca: number; bracoEsquerdo: number; bracoDireito: number; cauda: number };
function desenharPagina(c: CanvasRenderingContext2D, cores: CoresIlustracao, progresso: number) {
  const t = suave(progresso);
  const angulo = t * Math.PI;
  const lado = Math.cos(angulo);
  const largura = lado >= 0 ? 150 : 81;
  const topo: Ponto = [189 + lado * largura,
    98 + Math.max(0, -lado) * 93 - Math.max(0, lado) * 7 - Math.sin(angulo) * 24];
  const base: Ponto = [190 + lado * largura, 307 + Math.max(0, -lado) * 88 + Math.sin(angulo) * 10];
  c.save();
  sombraSuave(c, [190 + lado * largura * .5, 232], [Math.abs(lado) * largura * .6 + 3, 83], .16);
  const papel = c.createLinearGradient(188, 0, topo[0], 0);
  papel.addColorStop(0, '#d9ddd9');
  papel.addColorStop(.25, cores.papel);
  papel.addColorStop(1, lado > 0 ? '#fafaf5' : '#e9eae3');
  forma(c, [189, 98], [[topo[0], topo[1]],
    [topo[0] + Math.sin(angulo) * 8, topo[1] + 70,
      base[0] + Math.sin(angulo) * 8, base[1] - 65, base[0], base[1]],
    [190, 307]], papel, '#737786', 1);
  c.clip();
  for (let coluna = 1; coluna < 9; coluna++) {
    const u = coluna / 10;
    const a = misturar([189, 98], topo, u);
    const b = misturar([190, 307], base, u);
    for (let linha = 0; linha < 21; linha++) {
      const ponto = misturar(a, b, .07 + linha * .042);
      c.save(); c.translate(...ponto); c.scale(Math.max(.04, Math.abs(lado)), 1);
      glifo(c, 0, 0, .8, linha * 3 + coluna);
      c.restore();
    }
  }
  c.restore();
}

type ArticulacaoBraco = { ombro: Ponto; cotovelo: Ponto; mao: Ponto };

function articularBraco(esquerdo: boolean, destino: Ponto, rotacao: number,
  curvatura = 1): ArticulacaoBraco {
  const ombro: Ponto = esquerdo ? [286, 313] : [310, 312];
  const dx = destino[0] - ombro[0]; const dy = destino[1] - ombro[1];
  const distancia = Math.max(1, Math.min(79, Math.hypot(dx, dy)));
  const direcao = Math.atan2(dy, dx) + rotacao;
  const mao: Ponto = [ombro[0] + Math.cos(direcao) * distancia,
    ombro[1] + Math.sin(direcao) * distancia];
  const meio = misturar(ombro, mao, .5);
  // Blend the elbow's bend instead of flipping its side at a hard threshold.
  const lado = esquerdo ? -1 : curvatura;
  const altura = Math.sqrt(40 ** 2 - (distancia / 2) ** 2) * lado;
  return { ombro, mao, cotovelo: [meio[0] - Math.sin(direcao) * altura,
    meio[1] + Math.cos(direcao) * altura] };
}

function desenharBracoArticulado(c: CanvasRenderingContext2D, cores: CoresIlustracao,
  { ombro, cotovelo, mao }: ArticulacaoBraco) {
  const a = misturar(ombro, cotovelo, .9);
  const b = misturar(mao, cotovelo, .9);
  const bordas: [Ponto[], Ponto[]] = [[], []];
  const reflexo: Ponto[] = [];
  for (let i = 0; i <= 28; i++) {
    const t = i / 28; const u = 1 - t;
    const x = u ** 3 * ombro[0] + 3 * u * u * t * a[0] + 3 * u * t * t * b[0] + t ** 3 * mao[0];
    const y = u ** 3 * ombro[1] + 3 * u * u * t * a[1] + 3 * u * t * t * b[1] + t ** 3 * mao[1];
    const vx = 3 * u * u * (a[0] - ombro[0]) + 6 * u * t * (b[0] - a[0]) + 3 * t * t * (mao[0] - b[0]);
    const vy = 3 * u * u * (a[1] - ombro[1]) + 6 * u * t * (b[1] - a[1]) + 3 * t * t * (mao[1] - b[1]);
    const normal = Math.atan2(vy, vx) + Math.PI / 2;
    // A soft biceps, narrower elbow and tapered wrist replace uniform tubes.
    const raio = 2.7 + 3.5 * u + Math.sin(t * Math.PI * 2) * .65;
    for (let lado = 0; lado < 2; lado++) {
      const sinal = lado === 0 ? 1 : -1;
      bordas[lado].push([x + Math.cos(normal) * raio * sinal, y + Math.sin(normal) * raio * sinal]);
    }
    reflexo.push([x - raio * .25, y - raio * .35]);
  }
  const luz = c.createLinearGradient(ombro[0] - 8, ombro[1] - 12, mao[0] + 8, mao[1] + 8);
  luz.addColorStop(0, '#b77849'); luz.addColorStop(.45, cores.pelo); luz.addColorStop(1, '#854a2e');
  c.save();
  forma(c, bordas[0][0], [...bordas[0].slice(1), ...bordas[1].reverse()], luz, '#63412d', 1.15);
  c.clip();
  forma(c, reflexo[3], reflexo.slice(4, 25), null, '#c58a59', .85, false);
  c.restore();
}

function desenharMao(c: CanvasRenderingContext2D, cores: CoresIlustracao,
  { cotovelo, mao }: ArticulacaoBraco, flexao: number, punho: number) {
  c.save(); c.translate(...mao);
  c.rotate(Math.atan2(mao[1] - cotovelo[1], mao[0] - cotovelo[0]) + Math.PI / 2 + punho);
  c.scale(.85, .85);
  const dobrarY = (y: number) => y < -7 ? -7 + (y + 7) * (1 - flexao * .5) : y;
  const dobrar = (trecho: Trecho): Trecho => trecho.length === 2
    ? [trecho[0], dobrarY(trecho[1])]
    : [trecho[0], dobrarY(trecho[1]), trecho[2], dobrarY(trecho[3]), trecho[4], dobrarY(trecho[5])];
  const contorno: Trecho[] = [
    [-5, 0, -4, -2, -6, -4], [-9, -7, -8, -9, -6, -7], [-4, -5],
    [-5, -9, -6, -14, -4.5, -15], [-2.5, -16, -2, -11, -1.8, -9],
    [-2.5, -16, -2, -18.5, -.3, -18.4], [1.4, -18.5, 1, -13, 1.3, -10],
    [1.2, -16, 2.5, -17.5, 3.8, -16.3], [5, -15, 3.7, -11, 3.5, -9],
    [5.2, -14, 6.8, -14, 7, -12.4], [7.7, -10, 5.5, -5, 5, -2],
    [4.8, 0, 4, 2, 3, 3],
  ];
  const pele = c.createLinearGradient(-5, -14, 5, 4);
  pele.addColorStop(0, '#f0c29b'); pele.addColorStop(.5, cores.pele); pele.addColorStop(1, '#b67a53');
  forma(c, [-3, 3], contorno.map(dobrar), pele, '#714b34', .95);
  forma(c, [-3, -4], [[-.5, -6, 2, -5, 3, -3]], null, '#b58059', .55, false);
  forma(c, [-1, -1], [[1, -1, 2, 0, 2, 1]], null, '#b58059', .45, false);
  c.restore();
}

function desenharMacaco(c: CanvasRenderingContext2D, cores: CoresIlustracao,
  pose: PoseMacaco, movimento: Movimento) {
  c.save(); c.translate(movimento.peso, 0);
  desenharCauda(c, cores, pose.cauda, movimento.tempo,
    movimento.encolher + Math.sin(movimento.giro) * .6 + movimento.tronco * 8);
  c.restore();
  c.save();
  // Shift the hips while keeping the soles planted on the same ground plane.
  c.transform(1, 0, -movimento.peso / 61, 1, movimento.peso * 415 / 61, 0);
  c.translate(296, 354);
  c.rotate(-movimento.encolher * .25);
  c.scale(1, 1 - movimento.encolher * .45);
  c.translate(-296, -354);
  desenharPernas(c, cores);
  c.restore();
  c.save();
  c.translate(297 + movimento.peso, 355);
  c.rotate(movimento.tronco);
  c.scale(1 + movimento.respiracao * .012, 1 + movimento.respiracao * .009);
  c.translate(-297, -355);
  const esquerda = articularBraco(true, movimento.esquerda, pose.bracoEsquerdo);
  const direita = articularBraco(false, movimento.direita, pose.bracoDireito, movimento.curvaturaDireita);
  // Draw the arm roots under the torso and the hands over the head/book.
  // This makes the shoulders continuous instead of exposed circular joints.
  desenharBracoArticulado(c, cores, direita);
  desenharBracoArticulado(c, cores, esquerda);
  const pelo = c.createRadialGradient(286, 317, 2, 303, 334, 37);
  pelo.addColorStop(0, '#bd8050'); pelo.addColorStop(.56, cores.pelo); pelo.addColorStop(1, '#77422a');
  forma(c, [288, 302], [[296, 297, 310, 300, 315, 309],
    [318, 317, 312, 331, 317, 345], [322, 358, 314, 367, 304, 366],
    [296, 362, 286, 360, 282, 351], [277, 340, 281, 322, 282, 315],
    [282, 309, 283, 305, 288, 302]], pelo, '#63412d', 1.3);
  forma(c, [287, 322], [[283, 333, 283, 345, 289, 351]], null, '#cf9560', .9, false);
  forma(c, [307, 339], [[309, 350, 311, 355, 307, 361]], null, '#80482d', .75, false);
  forma(c, [292, 313], [[295, 319, 294, 325, 293, 329]], null, '#c28752', .6, false);
  parte(c, [298, 298], pose.cabeca, () => {
    elipse(c, 320, 276, 9, 13, cores.pele, '#744a30', .25);
    elipse(c, 321, 277, 4.5, 8, '#bc825a', undefined, .25);
    const cabeca = c.createRadialGradient(286, 264, 3, 305, 282, 34);
    cabeca.addColorStop(0, '#bf8050'); cabeca.addColorStop(.5, cores.pelo); cabeca.addColorStop(1, '#744028');
    forma(c, [278, 272], [[278, 258, 289, 251, 302, 252],
      [315, 252, 323, 263, 323, 277], [323, 294, 311, 307, 294, 307],
      [278, 305, 270, 295, 273, 283]], cabeca, '#65402b', 1.3);
    forma(c, [304, 255], [[319, 259, 324, 280, 313, 293],
      [306, 303, 294, 306, 284, 301], [298, 304, 314, 287, 315, 274],
      [316, 264, 310, 257, 304, 255]], '#854b2d', '#854b2d', .4);
    elipse(c, 279, 288, 8, 12, cores.pele, '#643e28', -.25);
    forma(c, [275, 282], [[271, 289, 278, 298, 282, 293]], null, '#bc865d', .9, false);
    forma(c, [281, 263], [[283, 259], [286, 257]], null, '#bd7b50', 1, false);
    forma(c, [288, 258], [[292, 255, 296, 254, 299, 255]], null, '#d29862', .7, false);
    // The source shows the back of the head; there are no invented facial features.
  });
  // The wrist and forearm pass in front of the crown when scratching;
  // the shoulder stays concealed beneath the torso.
  c.save(); c.beginPath(); c.rect(0, 0, 402, 303); c.clip();
  desenharBracoArticulado(c, cores, direita);
  c.restore();
  desenharMao(c, cores, esquerda, movimento.dedosEsquerda, movimento.punhoEsquerdo);
  desenharMao(c, cores, direita, movimento.dedosDireita, movimento.punhoDireito);
  c.restore();
}

export interface IlustracaoMacacoLivroProps {
  cores?: Partial<CoresIlustracao>;
  pose?: Partial<{ cabeca: number; bracoEsquerdo: number; bracoDireito: number; cauda: number }>;
}

export function IlustracaoMacacoLivro({ cores, pose }: IlustracaoMacacoLivroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext('2d');
    if (!c) return;
    const paleta = { ...coresPadrao, ...cores };
    const livro = document.createElement('canvas');
    const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');
    let quadro = 0;
    let inicio = performance.now();
    let ultimoTempo = inicio;
    let visivel = true;
    let paginaCache = -1;
    const desenhar = (tempo: number) => {
      ultimoTempo = tempo;
      c.clearRect(0, 0, 402, 456);
      const segundos = reduzirMovimento.matches ? 0 : Math.max(0, (tempo - inicio) / 1000);
      const movimento = movimentoEm(segundos);
      const paginaAtual = Math.floor(segundos / 4);
      if (paginaCache !== paginaAtual) {
        const contextoLivro = livro.getContext('2d');
        if (contextoLivro) {
          contextoLivro.clearRect(0, 0, 402, 456);
          desenharLivro(contextoLivro, paleta, paginaAtual);
          paginaCache = paginaAtual;
        }
      }
      desenharSombras(c, movimento.salto);
      c.drawImage(livro, 0, 0, 402, 456);
      if (movimento.pagina !== null) desenharPagina(c, paleta, movimento.pagina);
      c.save();
      c.translate(300, 337 - movimento.salto + movimento.agachar * 60);
      c.rotate(movimento.giro);
      c.scale(1 + movimento.agachar * .3, 1 - movimento.agachar);
      c.translate(-300, -337);
      desenharMacaco(c, paleta, {
        cabeca: movimento.cabeca, bracoEsquerdo: 0, bracoDireito: 0,
        cauda: 0, ...pose,
      }, movimento);
      c.restore();
    };
    const redimensionar = () => {
      const largura = canvas.getBoundingClientRect().width;
      if (!largura) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(largura * dpr);
      canvas.height = Math.round(largura * 456 / 402 * dpr);
      c.setTransform(canvas.width / 402, 0, 0, canvas.height / 456, 0, 0);
      c.lineCap = 'round'; c.lineJoin = 'round';
      livro.width = canvas.width; livro.height = canvas.height;
      paginaCache = -1;
      const contextoLivro = livro.getContext('2d');
      if (contextoLivro) {
        contextoLivro.setTransform(canvas.width / 402, 0, 0, canvas.height / 456, 0, 0);
        contextoLivro.lineCap = 'round'; contextoLivro.lineJoin = 'round';
      }
      desenhar(ultimoTempo);
    };
    const animar = (tempo: number) => {
      if (visivel && !document.hidden) desenhar(tempo);
      quadro = requestAnimationFrame(animar);
    };
    const atualizarPreferencia = () => {
      cancelAnimationFrame(quadro);
      desenhar(performance.now());
      if (!reduzirMovimento.matches) quadro = requestAnimationFrame(animar);
    };
    const atualizarVisibilidade = () => {
      // Resume in the reading pose rather than halfway through a somersault.
      if (!document.hidden) inicio = performance.now();
    };
    const observer = new ResizeObserver(redimensionar);
    const intersecao = new IntersectionObserver(([entrada]) => { visivel = entrada.isIntersecting; });
    observer.observe(canvas); intersecao.observe(canvas); redimensionar(); atualizarPreferencia();
    reduzirMovimento.addEventListener('change', atualizarPreferencia);
    document.addEventListener('visibilitychange', atualizarVisibilidade);
    return () => {
      cancelAnimationFrame(quadro); observer.disconnect(); intersecao.disconnect();
      reduzirMovimento.removeEventListener('change', atualizarPreferencia);
      document.removeEventListener('visibilitychange', atualizarVisibilidade);
    };
  }, [cores, pose]);
  return <canvas ref={canvasRef} className="monkey-book-illustration" role="img"
    aria-label="Macaco lendo um livro, virando páginas, coçando a cabeça e ocasionalmente batendo palmas e dando uma cambalhota">
    Macaco com um livro aberto.
  </canvas>;
}
