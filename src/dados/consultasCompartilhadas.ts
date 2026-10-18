/** Cache curto em memória: compartilha pedidos em andamento e descarta respostas invalidadas. */
export class ConsultasCompartilhadas {
  private entradas = new Map<string, { promessa: Promise<unknown>; expira: number }>();
  consultar<T>(chave: string, carregar: () => Promise<T>, validade = 10_000): Promise<T> {
    const existente = this.entradas.get(chave);
    if (existente && existente.expira > Date.now()) return existente.promessa as Promise<T>;
    const entrada = { promessa: Promise.resolve().then(carregar) as Promise<unknown>, expira: Infinity };
    this.entradas.set(chave, entrada);
    entrada.promessa.then(() => {
      if (this.entradas.get(chave) === entrada) entrada.expira = Date.now() + validade;
    }, () => {
      if (this.entradas.get(chave) === entrada) this.entradas.delete(chave);
    });
    return entrada.promessa as Promise<T>;
  }
  limpar() { this.entradas.clear(); }
}
