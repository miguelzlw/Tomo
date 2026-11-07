import { expect, it, vi } from 'vitest';
import { prepararInsercaoIA, gerarHistoriaEmPartes, contextoContinuidade } from './ia';

it('anexa a história sem alterar páginas existentes e sem cortar palavras', () => {
  const original = [{ numero: 1, texto: 'Texto escrito à mão.' }];
  const texto = 'Uma aventura inesquecível. '.repeat(160);
  const resultado = prepararInsercaoIA(original, texto);
  expect(resultado[0]).toEqual(original[0]);
  expect(resultado.slice(1).map(p => p.texto).join('')).toBe(texto);
  expect(resultado.every(p => p.texto.length <= 1500)).toBe(true);
  expect(original).toHaveLength(1);
});

it('continua automaticamente trechos limitados e preserva a ordem até concluir', async () => {
  const gerarTrecho = vi.fn().mockResolvedValueOnce({ texto: 'Abertura', continuar: true }).mockResolvedValueOnce({ texto: 'Desenvolvimento', continuar: true }).mockResolvedValueOnce({ texto: 'Final', continuar: false });
  const receber = vi.fn();
  await gerarHistoriaEmPartes({ inicial: '', gerarTrecho, receber, ativo: () => true, continuar: () => true });
  expect(gerarTrecho).toHaveBeenCalledTimes(3);
  expect(gerarTrecho.mock.calls[1][0]).toBe('Abertura');
  expect(receber).toHaveBeenLastCalledWith('Abertura\n\nDesenvolvimento\n\nFinal', 3);
});

it('pausa após o trecho em andamento e permite retomar uma prévia revisada', async () => {
  const gerarTrecho = vi.fn().mockResolvedValue({ texto: 'Novo capítulo', continuar: true });
  const receber = vi.fn();
  await gerarHistoriaEmPartes({ inicial: 'Texto revisado', gerarTrecho, receber, ativo: () => true, continuar: () => false });
  expect(gerarTrecho).toHaveBeenCalledOnce();
  expect(gerarTrecho).toHaveBeenCalledWith('Texto revisado');
  expect(receber).toHaveBeenCalledWith('Texto revisado\n\nNovo capítulo', 1);
});

it('mantém trechos recebidos se a próxima chamada falhar por cota, sem repetir', async () => {
  const gerarTrecho = vi.fn().mockResolvedValueOnce({ texto: 'Trecho preservado', continuar: true }).mockRejectedValueOnce(new Error('Cota esgotada'));
  const receber = vi.fn();
  await expect(gerarHistoriaEmPartes({ inicial: '', gerarTrecho, receber, ativo: () => true, continuar: () => true })).rejects.toThrow('Cota');
  expect(receber).toHaveBeenCalledOnce();
  expect(receber).toHaveBeenCalledWith('Trecho preservado', 1);
  expect(gerarTrecho).toHaveBeenCalledTimes(2);
});

it('não solicita novos trechos depois de desmontar a tela', async () => {
  let ativo = true;
  const gerarTrecho = vi.fn().mockImplementation(async () => { ativo = false; return { texto: 'Resposta tardia', continuar: true }; });
  const receber = vi.fn();
  await gerarHistoriaEmPartes({ inicial: '', gerarTrecho, receber, ativo: () => ativo, continuar: () => true });
  expect(gerarTrecho).toHaveBeenCalledOnce();
  expect(receber).not.toHaveBeenCalled();
});

it('reduz somente o contexto enviado, mantendo abertura e final de histórias extensas', () => {
  const texto = 'INÍCIO ' + 'história extensa. '.repeat(12000) + 'FINAL';
  const contexto = contextoContinuidade(texto);
  expect(contexto.startsWith('INÍCIO')).toBe(true);
  expect(contexto.endsWith('FINAL')).toBe(true);
  expect(contexto.length).toBeLessThan(81000);
  const paginas = prepararInsercaoIA([], texto);
  expect(paginas.length).toBeGreaterThan(100);
  expect(paginas.map(p => p.texto).join('')).toBe(texto);
});
it('aproveita a página inicial vazia e rejeita respostas vazias', () => {
  expect(prepararInsercaoIA([{ numero: 1, texto: '' }], 'Era uma vez.')).toEqual([{ numero: 1, texto: 'Era uma vez.' }]);
  expect(() => prepararInsercaoIA([], '   ')).toThrow();
});
