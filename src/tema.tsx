import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
export type Tema = 'claro' | 'escuro';
function lerTema(): Tema {
  try { return (localStorage.getItem('tomo_tema') || localStorage.getItem('tomo_tema_login')) === 'escuro' ? 'escuro' : 'claro'; }
  catch { return 'claro'; }
}
let temaAtual = lerTema();
function aplicarTema() {
  if (typeof document !== 'undefined') { document.documentElement.dataset.tema = temaAtual; document.documentElement.style.colorScheme = temaAtual === 'claro' ? 'light' : 'dark'; }
}
aplicarTema();
function assinar(atualizar: () => void) {
  const local = () => atualizar();
  const externo = (e: StorageEvent) => {
    if (e.key === 'tomo_tema' || e.key === 'tomo_tema_login' || e.key === null) { temaAtual = lerTema(); aplicarTema(); atualizar(); }
  };
  window.addEventListener('tomo-tema', local); window.addEventListener('storage', externo);
  return () => { window.removeEventListener('tomo-tema', local); window.removeEventListener('storage', externo); };
}
export function useTema() {
  const tema = useSyncExternalStore(assinar, () => temaAtual, () => 'claro' as Tema);
  const trocarTema = () => {
    temaAtual = temaAtual === 'claro' ? 'escuro' : 'claro'; aplicarTema();
    try { localStorage.setItem('tomo_tema', temaAtual); } catch { /* Mantém a escolha nesta visita. */ }
    window.dispatchEvent(new Event('tomo-tema'));
  };
  return { tema, trocarTema };
}
export function BotaoTema() {
  const { tema, trocarTema } = useTema();
  return <button type="button" className="btn-secondary site-theme-toggle" aria-label={tema === 'claro' ? 'Ativar tema escuro' : 'Ativar tema claro'} title={tema === 'claro' ? 'Tema escuro' : 'Tema claro'} onClick={trocarTema}>{tema === 'claro' ? <Moon size={19} /> : <Sun size={19} />}</button>;
}
