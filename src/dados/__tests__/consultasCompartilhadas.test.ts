import { afterEach, expect, it, vi } from 'vitest';
import { ConsultasCompartilhadas } from '../consultasCompartilhadas';
afterEach(() => vi.useRealTimers());
it('reutiliza pedidos simultâneos e expira após o intervalo', async () => {
  vi.useFakeTimers();
  const cache = new ConsultasCompartilhadas(); const carregar = vi.fn(async () => ['livro']);
  await Promise.all([cache.consultar('lista', carregar), cache.consultar('lista', carregar)]);
  expect(carregar).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(10_001); await cache.consultar('lista', carregar);
  expect(carregar).toHaveBeenCalledTimes(2);
});
it('falhas podem ser tentadas novamente', async () => {
  const cache = new ConsultasCompartilhadas(); const carregar = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(['livro']);
  await expect(cache.consultar('lista', carregar)).rejects.toThrow('offline');
  expect(await cache.consultar('lista', carregar)).toEqual(['livro']);
});
it('uma resposta antiga não substitui a consulta de uma nova sessão', async () => {
  const cache = new ConsultasCompartilhadas(); let resolver!: (v: string) => void;
  const anterior = cache.consultar('perfil', () => new Promise<string>(r => { resolver = r; }));
  await Promise.resolve(); cache.limpar();
  await cache.consultar('perfil', async () => 'nova conta'); resolver('conta antiga'); await anterior;
  expect(await cache.consultar('perfil', async () => 'errado')).toBe('nova conta');
});
