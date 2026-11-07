import { dividirTextoEmPaginas } from './paginacao';

// Keep the opening and recent events in the model context without truncating
// the actual preview or imposing a maximum number of generated pages.
export function contextoContinuidade(texto: string): string {
  if (texto.length <= 80000) return texto;
  return texto.slice(0, 12000) + '\n\n[Partes intermediárias omitidas do contexto. Preserve personagens e continue o trecho final abaixo.]\n\n' + texto.slice(-68000);
}

export async function gerarHistoriaEmPartes(opcoes: {
  inicial: string;
  gerarTrecho: (contexto?: string) => Promise<{ texto: string; continuar: boolean }>;
  receber: (texto: string, partes: number) => void;
  ativo: () => boolean;
  continuar: () => boolean;
}): Promise<void> {
  let texto = opcoes.inicial;
  let partes = 0;
  while (opcoes.ativo()) {
    const resposta = await opcoes.gerarTrecho(texto ? contextoContinuidade(texto) : undefined);
    if (!opcoes.ativo()) return;
    texto = texto ? texto + '\n\n' + resposta.texto : resposta.texto;
    opcoes.receber(texto, ++partes);
    if (!resposta.continuar || !opcoes.continuar()) return;
  }
}

export function prepararInsercaoIA(atuais: Array<{ numero: number; texto: string }>, texto: string) {
  if (!texto.trim()) throw new Error('A IA não retornou uma história. Tente novamente.');
  const anteriores = atuais.length === 1 && !atuais[0].texto ? [] : atuais;
  return [...anteriores, ...dividirTextoEmPaginas(texto).map(texto => ({ numero: 0, texto }))]
    .map((pagina, indice) => ({ ...pagina, numero: indice + 1 }));
}
