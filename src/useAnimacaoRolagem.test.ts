import { afterEach, expect, it, vi } from 'vitest';
import { useAnimacaoRolagem } from './useAnimacaoRolagem';

const { efeitos } = vi.hoisted(() => ({ efeitos: [] as (() => void)[] }));
vi.mock('react', () => ({ useEffect: (executar: () => (() => void)) => efeitos.push(executar()) }));

afterEach(() => {
  efeitos.splice(0).forEach((limpar) => limpar());
  vi.unstubAllGlobals();
});

function preparar(reduzido = false) {
  const atributos = new Map<string, string>();
  const bloco = {
    parentElement: { closest: () => null },
    getBoundingClientRect: () => ({ top: 900 }),
    setAttribute: (nome: string, valor: string) => atributos.set(nome, valor),
    removeAttribute: (nome: string) => atributos.delete(nome),
  };
  let atualizar: (entradas: unknown[]) => void = () => {};
  const desconectar = vi.fn();
  vi.stubGlobal('window', { innerHeight: 800, IntersectionObserver: true, matchMedia: () => ({ matches: reduzido, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: typeof atualizar) { atualizar = callback; }
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = desconectar;
  });
  vi.stubGlobal('MutationObserver', class { observe = vi.fn(); disconnect = vi.fn(); });
  const raiz = { querySelectorAll: () => [bloco], contains: () => true };
  // React está simulado acima para executar o efeito e conferir sua limpeza sem montar uma tela.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useAnimacaoRolagem({ current: raiz as unknown as HTMLElement }, 'dashboard');
  return {
    atributos, desconectar,
    mover: (top: number, isIntersecting: boolean) => atualizar([{ target: bloco, isIntersecting, boundingClientRect: { top }, rootBounds: { bottom: 752 } }]),
  };
}

it('reveals on entry and hides again when scrolling back above the block', () => {
  const { atributos, mover } = preparar();
  expect(atributos.get('data-scroll-visible')).toBe('false');
  mover(700, true);
  expect(atributos.get('data-scroll-visible')).toBe('true');
  mover(770, false);
  expect(atributos.get('data-scroll-visible')).toBe('false');
  mover(700, true);
  expect(atributos.get('data-scroll-visible')).toBe('true');
});

it('hides blocks above the viewport, reveals them on return, and cleans up', () => {
  const { atributos, mover, desconectar } = preparar();
  mover(-300, false);
  expect(atributos.get('data-scroll-visible')).toBe('false');
  mover(100, true);
  expect(atributos.get('data-scroll-visible')).toBe('true');
  efeitos.pop()!();
  expect(desconectar).toHaveBeenCalledOnce();
  expect(atributos.has('data-scroll-visible')).toBe(false);
});

it('starts with visible content when reduced motion is preferred', () => {
  const { atributos, mover } = preparar(true);
  mover(-300, false);
  expect(atributos.get('data-scroll-visible')).toBe('true');
});
