export const provedores = ['openai', 'gemini', 'claude'] as const;
export type Provedor = typeof provedores[number];

export function validarPedido(valor: unknown): { provedor: Provedor; pedido: string } {
  if (!valor || typeof valor !== 'object') throw new Error('Pedido inválido.');
  const { provedor, pedido } = valor as Record<string, unknown>;
  if (!provedores.includes(provedor as Provedor)) throw new Error('IA inválida.');
  if (typeof pedido !== 'string' || !pedido.trim() || pedido.length > 6000) throw new Error('Descreva a história em até 6.000 caracteres.');
  return { provedor: provedor as Provedor, pedido: pedido.trim() };
}

export function requisicaoIA(provedor: Provedor, modelo: string, chave: string, pedido: string): { url: string; headers: Record<string, string>; body: Record<string, unknown> } {
  if (!/^[a-zA-Z0-9._-]+$/.test(modelo)) throw new Error('Modelo inválido na configuração do servidor.');
  const instrucao = 'Escreva uma história em português baseada no pedido abaixo. Retorne somente o texto da história, sem explicações. Limite a história a aproximadamente 1200 palavras.\n\n' + pedido;
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
    body: { contents: [{ parts: [{ text: instrucao }] }], generationConfig: { maxOutputTokens: 4000 } },
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
    if (candidato?.finishReason && candidato.finishReason !== 'STOP') throw new Error('A IA não concluiu a história. Reformule o pedido ou peça um texto mais curto.');
    texto = candidato?.content?.parts?.filter((p: any) => !p.thought).map((p: any) => p.text ?? '').join('\n') ?? '';
  }
  if (!texto.trim() || texto.length > 150000) throw new Error('A IA não retornou uma história válida.');
  return texto;
}
