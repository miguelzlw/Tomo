// Expressão regular reaproveitada para evitar re-instanciação em chamadas frequentes ou dentro de loops
const REGEX_ESPACO = /\s/;

/**
 * Preserva o conteúdo colado, dividindo apenas em espaços ou quebras de linha.
 * Otimizado de O(N²) para O(N) utilizando um ponteiro de índice (offset) em vez de fatiar repetidamente a string.
 */
export function dividirTextoEmPaginas(texto: string, limite = 1500): string[] {
  if (!Number.isInteger(limite) || limite < 1) throw new Error('Limite inválido.');
  const paginas: string[] = [];
  let offset = 0;
  const tamanho = texto.length;

  // Percorre o texto usando offset para evitar re-fatiamentos caros O(N^2)
  while (tamanho - offset > limite) {
    let corte = offset + limite;

    // Se o ponto de corte estiver no meio de uma palavra (sem espaço antes ou depois)
    if (!REGEX_ESPACO.test(texto[corte]) && !REGEX_ESPACO.test(texto[corte - 1])) {
      let pontoQuebra = 0;
      for (let i = corte - 1; i >= offset; i--) {
        if (REGEX_ESPACO.test(texto[i])) {
          pontoQuebra = i + 1;
          break;
        }
      }
      if (!pontoQuebra) {
        throw new Error(`Uma palavra ultrapassa ${limite} caracteres. Separe essa palavra antes de colar.`);
      }
      corte = pontoQuebra;
    }

    paginas.push(texto.slice(offset, corte));
    offset = corte;
  }

  if (offset < tamanho || paginas.length === 0) {
    paginas.push(texto.slice(offset));
  }

  return paginas;
}
