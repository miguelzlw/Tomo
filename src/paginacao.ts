/** Preserva o conteúdo colado, dividindo apenas em espaços ou quebras de linha. */
export function dividirTextoEmPaginas(texto: string, limite = 1500): string[] {
  if (!Number.isInteger(limite) || limite < 1) throw new Error('Limite inválido.');
  const paginas: string[] = [];
  const len = texto.length;
  let inicio = 0;

  // ⚡ Bolt: Navega com índices sobre o texto original em vez de fatiar repetidamente
  // o 'restante' com slice(). Isso elimina cópias intermediárias na memória heap,
  // reduzindo a pressão do GC e tornando a paginação de livros longos mais rápida.
  while (len - inicio > limite) {
    let fim = inicio + limite;
    if (!/\s/.test(texto[fim]) && !/\s/.test(texto[fim - 1])) {
      let corte = 0;
      for (let i = fim - 1; i >= inicio; i--) {
        if (/\s/.test(texto[i])) { corte = i + 1; break; }
      }
      if (!corte) throw new Error(`Uma palavra ultrapassa ${limite} caracteres. Separe essa palavra antes de colar.`);
      fim = corte;
    }
    paginas.push(texto.slice(inicio, fim));
    inicio = fim;
  }
  if (inicio < len || paginas.length === 0) {
    paginas.push(texto.slice(inicio));
  }
  return paginas;
}
