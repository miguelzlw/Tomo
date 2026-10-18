/** Preserva o conteúdo colado, dividindo apenas em espaços ou quebras de linha. */
export function dividirTextoEmPaginas(texto: string, limite = 1500): string[] {
  if (!Number.isInteger(limite) || limite < 1) throw new Error('Limite inválido.');
  const paginas: string[] = [];
  let restante = texto;
  while (restante.length > limite) {
    let corte = limite;
    if (!/\s/.test(restante[limite]) && !/\s/.test(restante[limite - 1])) {
      corte = 0;
      for (let i = limite - 1; i >= 0; i--) {
        if (/\s/.test(restante[i])) { corte = i + 1; break; }
      }
      if (!corte) throw new Error(`Uma palavra ultrapassa ${limite} caracteres. Separe essa palavra antes de colar.`);
    }
    paginas.push(restante.slice(0, corte));
    restante = restante.slice(corte);
  }
  if (restante || paginas.length === 0) paginas.push(restante);
  return paginas;
}
