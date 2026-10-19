import { expect, it } from 'vitest';
import { extrairTextoIA, requisicaoIA, validarPedido } from '../_shared/ia';
import { assinar, verificar, hash, redirectValido } from '../_shared/oauth';

it('valida provedor e tamanho antes de fazer qualquer chamada paga', () => {
  expect(() => validarPedido({ provedor: 'outro', pedido: 'Olá' })).toThrow();
  expect(() => validarPedido({ provedor: 'openai', pedido: 'x'.repeat(6001) })).toThrow();
  expect(() => validarPedido({ provedor: 'openai', pedido: ' ' })).toThrow();
  expect(validarPedido({ provedor: 'gemini', pedido: ' Uma aventura ' }).pedido).toBe('Uma aventura');
});
it('envia chaves somente aos endpoints oficiais e não permite alterar a URL com o modelo', () => {
  expect(requisicaoIA('openai', 'modelo', 'segredo', 'Olá').headers.Authorization).toBe('Bearer segredo');
  expect(requisicaoIA('claude', 'modelo', 'segredo', 'Olá').url).toBe('https://api.anthropic.com/v1/messages');
  expect(requisicaoIA('gemini', 'modelo', 'segredo', 'Olá').headers['x-goog-api-key']).toBe('segredo');
  expect(() => requisicaoIA('gemini', '../../outro', 'segredo', 'Olá')).toThrow();
});
it('extrai histórias dos três provedores e ignora raciocínio e outros blocos', () => {
  expect(extrairTextoIA('openai', { output: [{ content: [{ type: 'output_text', text: 'História' }] }] })).toBe('História');
  expect(extrairTextoIA('claude', { content: [{ type: 'thinking', text: 'Não exibir' }, { type: 'text', text: 'História' }] })).toBe('História');
  expect(extrairTextoIA('gemini', { candidates: [{ finishReason: 'STOP', content: { parts: [{ thought: true, text: 'Não exibir' }, { text: 'História' }] } }] })).toBe('História');
});
it('rejeita respostas vazias, interrompidas ou bloqueadas', () => {
  expect(() => extrairTextoIA('openai', { status: 'incomplete' })).toThrow();
  expect(() => extrairTextoIA('claude', { stop_reason: 'max_tokens' })).toThrow();
  expect(() => extrairTextoIA('gemini', { candidates: [{ finishReason: 'SAFETY' }] })).toThrow();
  expect(() => extrairTextoIA('openai', {})).toThrow();
});
it('recusa consentimento adulterado, expirado ou de outra finalidade', async () => {
  const payload = { tipo: 'consent', exp: Math.floor(Date.now() / 1000) + 60, nome: 'Aplicativo' };
  const token = await assinar(payload, 'segredo');
  expect((await verificar(token, 'segredo', 'consent')).nome).toBe('Aplicativo');
  await expect(verificar(token, 'outro', 'consent')).rejects.toThrow();
  await expect(verificar(token, 'segredo', 'code')).rejects.toThrow();
  await expect(verificar(await assinar({ ...payload, exp: 1 }, 'segredo'), 'segredo', 'consent')).rejects.toThrow();
});
it('usa SHA-256 compatível com PKCE S256 e impede redirecionamentos inseguros', async () => {
  expect(await hash('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  expect(redirectValido('javascript:alert(1)')).toBe(false);
  expect(redirectValido('http://example.com/retorno')).toBe(false);
  expect(redirectValido('https://user:pass@example.com/retorno')).toBe(false);
  expect(redirectValido('https://example.com/retorno')).toBe(true);
  expect(redirectValido('http://localhost:8000/callback')).toBe(true);
});
