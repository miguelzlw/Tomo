import { useEffect, type RefObject } from 'react';

// Reveal blocks without changing the page height.
export function useAnimacaoRolagem(ref: RefObject<HTMLElement | null>, pagina: string) {
  useEffect(() => {
    const raiz = ref.current;
    if (!raiz || !('IntersectionObserver' in window)) return;
    const preferencia = window.matchMedia('(prefers-reduced-motion: reduce)');
    const elementos = new Set<HTMLElement>();
    const observer = new IntersectionObserver((entradas) => {
      entradas.forEach(({ target, isIntersecting }) => {
        target.setAttribute('data-scroll-visible', String(preferencia.matches || isIntersecting));
      });
    }, { rootMargin: '0px 0px -48px 0px', threshold: 0 });
    const registrar = () => {
      raiz.querySelectorAll<HTMLElement>('.home-intro, .reading-feature, .reading-empty, .other-readings, .home-shelf, .my-books-heading, .draft-section, .published-section, .library-heading, .library-count, .library-book, .library-empty, .profile-summary, .notif-item').forEach((elemento) => {
        // Avoid stacking opacity and movement on nested animated blocks.
        if (elemento.parentElement?.closest('[data-scroll-visible]')) return;
        if (elementos.has(elemento)) return;
        elementos.add(elemento);
        elemento.setAttribute('data-scroll-visible', String(preferencia.matches || elemento.getBoundingClientRect().top < window.innerHeight - 48));
        observer.observe(elemento);
      });
      elementos.forEach((elemento) => {
        if (!raiz.contains(elemento)) { observer.unobserve(elemento); elementos.delete(elemento); }
      });
    };
    const atualizarPreferencia = () => {
      elementos.forEach((elemento) => {
        elemento.setAttribute('data-scroll-visible', String(preferencia.matches || elemento.getBoundingClientRect().top < window.innerHeight - 48));
      });
    };
    registrar();
    const mutacoes = new MutationObserver(registrar);
    mutacoes.observe(raiz, { childList: true, subtree: true });
    preferencia.addEventListener('change', atualizarPreferencia);
    return () => {
      observer.disconnect();
      mutacoes.disconnect();
      preferencia.removeEventListener('change', atualizarPreferencia);
      elementos.forEach((elemento) => elemento.removeAttribute('data-scroll-visible'));
    };
  }, [ref, pagina]);
}
