export const provedores = ['openai', 'gemini', 'claude'] as const;
export type Provedor = typeof provedores[number];

export function validarPedido(valor: unknown): { provedor: Provedor; pedido: string; anterior?: string } {
  if (!valor || typeof valor !== 'object') throw new Error('Pedido inválido.');
  const { provedor, pedido, anterior } = valor as Record<string, unknown>;
  if (!provedores.includes(provedor as Provedor)) throw new Error('IA inválida.');
  if (typeof pedido !== 'string' || !pedido.trim()) throw new Error('Descreva a história que você quer criar.');
  if (anterior !== undefined && typeof anterior !== 'string') throw new Error('Trecho anterior inválido.');
  return { provedor: provedor as Provedor, pedido: pedido.trim(), ...(anterior ? { anterior: anterior as string } : {}) };
}

export function requisicaoIA(provedor: Provedor, modelo: string, chave: string, pedido: string, anterior?: string): { url: string; headers: Record<string, string>; body: Record<string, unknown> } {
  if (!/^[a-zA-Z0-9._-]+$/.test(modelo)) throw new Error('Modelo inválido na configuração do servidor.');
  const instrucao = 'Escreva uma história em português baseada no pedido abaixo. Retorne somente o texto da história, sem explicações. Respeite a extensão pedida, sem impor um número fixo de palavras ou páginas. Para histórias longas, desenvolva a narrativa em partes: não resuma nem antecipe o final para caber em uma resposta.\n\nPEDIDO:\n' + pedido + (anterior ? '\n\nHISTÓRIA JÁ ESCRITA (contexto, não repita):\n' + anterior + '\n\nContinue a história exatamente de onde parou, completando eventual frase interrompida, sem repetir o trecho anterior nem adicionar prefácios.' : '');
  if (provedor === 'openai') return {
    url: 'https://api.openai.com/v1/responses',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${chave}` },
    body: { model: modelo, input: instrucao, max_output_tokens: 4000, store: false },
  };
  if (provedor === 'claude') return {
    url: 'https://api.anthropic.com/v1/messages',
    headers: { 'Content-Type': 'application/json', 'x-api-key': chave, 'anthropic-version': '2023-06-01' },
    body: { model: modelo, max_tokens: 4000, messages: [{ role: 'user', content: instrucao }] },
  };
  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chave },
    body: { contents: [{ parts: [{ text: instrucao }] }], generationConfig: { maxOutputTokens: 8192 } },
  };
}

export function extrairTextoIA(provedor: Provedor, resposta: any): string {
  let texto: string;
  if (provedor === 'openai') {
    if (resposta.status === 'incomplete') throw new Error('A história excedeu o limite da IA. Peça uma história mais curta.');
    texto = resposta.output?.flatMap((o: any) => o.content ?? []).filter((c: any) => c.type === 'output_text').map((c: any) => c.text).join('\n') ?? '';
  } else if (provedor === 'claude') {
    if (resposta.stop_reason === 'max_tokens') throw new Error('A história excedeu o limite da IA. Peça uma história mais curta.');
    texto = resposta.content?.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n') ?? '';
  } else {
    const candidato = resposta.candidates?.[0];
    if (candidato?.finishReason && !['STOP', 'MAX_TOKENS'].includes(candidato.finishReason)) throw new Error('A IA não concluiu a história. Reformule o pedido.');
    texto = candidato?.content?.parts?.filter((p: any) => !p.thought).map((p: any) => p.text ?? '').join('\n') ?? '';
  }
  if (!texto.trim() || texto.length > 150000) throw new Error('A IA não retornou uma história válida.');
  return texto;
}
