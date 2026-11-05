/**
 * Preserva o conteúdo colado, dividindo apenas em espaços ou quebras de linha.
 * ⚡ Otimização Bolt: Usa cursor de deslocamento (offset) sobre a string original
 * em vez de criar repetidamente substrings do restante com slice(corte).
 * Isso reduz a complexidade de fatiamento de O(n²) para O(n) e economiza
 * alocações de memória e pausas de Garbage Collection em textos longos.
 */
export function dividirTextoEmPaginas(texto: string, limite = 1500): string[] {
  if (!Number.isInteger(limite) || limite < 1) throw new Error('Limite inválido.');
  const paginas: string[] = [];
  const tamanho = texto.length;
  let offset = 0;

  while (tamanho - offset > limite) {
    let corte = offset + limite;
    // Se a quebra cai no meio de uma palavra, busca retroativamente o último espaço
    if (!/\s/.test(texto[corte]) && !/\s/.test(texto[corte - 1])) {
      let recuo = 0;
      for (let i = corte - 1; i >= offset; i--) {
        if (/\s/.test(texto[i])) {
          recuo = i + 1;
          break;
        }
      }
      if (!recuo) {
        throw new Error(`Uma palavra ultrapassa ${limite} caracteres. Separe essa palavra antes de colar.`);
      }
      corte = recuo;
    }
    paginas.push(texto.slice(offset, corte));
    offset = corte;
  }

  if (offset < tamanho || paginas.length === 0) {
    paginas.push(texto.slice(offset));
  }

  return paginas;
}
