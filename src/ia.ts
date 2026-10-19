import { dividirTextoEmPaginas } from './paginacao';

export function prepararInsercaoIA(atuais: Array<{ numero: number; texto: string }>, texto: string) {
  if (!texto.trim()) throw new Error('A IA não retornou uma história. Tente novamente.');
  const anteriores = atuais.length === 1 && !atuais[0].texto ? [] : atuais;
  return [...anteriores, ...dividirTextoEmPaginas(texto).map(texto => ({ numero: 0, texto }))]
    .map((pagina, indice) => ({ ...pagina, numero: indice + 1 }));
}
