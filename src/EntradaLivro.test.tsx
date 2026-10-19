import { afterEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EntradaLivro } from './EntradaLivro';

const { limparEfeitos } = vi.hoisted(() => ({ limparEfeitos: [] as (() => void)[] }));
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  useEffect: (executar: () => void | (() => void)) => {
    const limpar = executar();
    if (limpar) limparEfeitos.push(limpar);
  },
}));

afterEach(() => {
  limparEfeitos.splice(0).forEach((limpar) => limpar());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function preparar(reduzido = false, aguardando = false) {
  vi.useFakeTimers();
  const body = { style: { overflow: 'auto' } };
  vi.stubGlobal('document', { body });
  vi.stubGlobal('window', {
    matchMedia: () => ({ matches: reduzido, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    setTimeout, clearTimeout,
  });
  const concluir = vi.fn();
  const prepararTela = vi.fn();
  const html = renderToStaticMarkup(<EntradaLivro aguardando={aguardando} onPreparar={prepararTela} onConcluir={concluir} />);
  return { body, concluir, prepararTela, html };
}

it('renders a closed book and prevents background scrolling during entry', () => {
  const { body, html, concluir } = preparar();
  expect(html).toContain('login-book-cover');
  expect(html.match(/class="login-book-paper login-book-leaf"/g)).toHaveLength(12);
  expect(html).toContain('Verificando seu acesso ao Tomo.');
  expect(body.style.overflow).toBe('hidden');
  expect(concluir).not.toHaveBeenCalled();
});

it('finishes after opening and exit, and restores scrolling on unmount', () => {
  const { body, concluir } = preparar();
  vi.advanceTimersByTime(3850);
  expect(concluir).toHaveBeenCalledOnce();
  limparEfeitos.splice(0).forEach((limpar) => limpar());
  expect(body.style.overflow).toBe('auto');
  expect(vi.getTimerCount()).toBe(0);
});

it('skips motion once the response arrives for reduced motion', () => {
  const { body, concluir } = preparar(true);
  expect(concluir).toHaveBeenCalledOnce();
  limparEfeitos.splice(0).forEach((limpar) => limpar());
  expect(body.style.overflow).toBe('auto');
  expect(vi.getTimerCount()).toBe(0);
});

it('keeps the book visible for a slow authentication response', () => {
  const { concluir, body } = preparar(false, true);
  vi.advanceTimersByTime(20000);
  expect(concluir).not.toHaveBeenCalled();
  expect(body.style.overflow).toBe('hidden');
});

it('also waits for authentication in reduced motion mode', () => {
  const { concluir } = preparar(true, true);
  vi.advanceTimersByTime(20000);
  expect(concluir).not.toHaveBeenCalled();
});

it('mounts the destination before fading out so the login cannot flash underneath', () => {
  const { prepararTela, concluir } = preparar();
  vi.advanceTimersByTime(3400);
  expect(prepararTela).toHaveBeenCalledOnce();
  expect(concluir).not.toHaveBeenCalled();
  vi.advanceTimersByTime(49);
  expect(concluir).not.toHaveBeenCalled();
  vi.advanceTimersByTime(401);
  expect(concluir).toHaveBeenCalledOnce();
});

