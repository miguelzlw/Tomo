import type { ProvedorIA } from './dados/ia';

export interface PreviaIA { pedido: string; texto: string; provedor: ProvedorIA }
const prefixo = 'tomo:previa-ia:';

export function carregarPreviaIA(chave?: string): PreviaIA | null {
  if (!chave) return null;
  try {
    const valor = JSON.parse(sessionStorage.getItem(prefixo + chave) || 'null');
    if (!valor || typeof valor.pedido !== 'string' || typeof valor.texto !== 'string' || !['gemini', 'openai', 'claude'].includes(valor.provedor)) return null;
    return { pedido: valor.pedido, texto: valor.texto, provedor: valor.provedor };
  } catch { return null; }
}

export function salvarPreviaIA(chave: string | undefined, previa: PreviaIA): boolean {
  if (!chave) return true;
  try {
    if (!previa.pedido && !previa.texto) sessionStorage.removeItem(prefixo + chave);
    else sessionStorage.setItem(prefixo + chave, JSON.stringify(previa));
    return true;
  } catch { return false; }
}

export function limparPreviasIA(usuario: string): void {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const chave = sessionStorage.key(i);
      if (chave?.startsWith(`${prefixo}${usuario}:`)) sessionStorage.removeItem(chave);
    }
  } catch { /* Private browsing may disable session storage. */ }
}
