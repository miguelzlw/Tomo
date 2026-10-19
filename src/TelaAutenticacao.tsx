import { MascoteLogin } from './MascoteLogin';
import { MarcaTomo } from './MarcaTomo';
import { useTema } from './tema';
import { useLayoutEffect, useRef, useState } from 'react';
import type React from 'react';
import gsap from 'gsap';
import { AlertCircle, ArrowRight, Eye, EyeOff, Moon, Sun } from 'lucide-react';
import { erroConfiguracaoSupabase } from './dados';

interface TelaAutenticacaoProps {
  modoAuth: 'login' | 'cadastro';
  setModoAuth: (modo: 'login' | 'cadastro') => void;
  authEmail: string;
  setAuthEmail: (v: string) => void;
  authSenha: string;
  setAuthSenha: (v: string) => void;
  authUsername: string;
  setAuthUsername: (v: string) => void;
  authErro: string | null;
  authAviso: string | null;
  authEnviando: boolean;
  setAuthErro: (v: string | null) => void;
  setAuthAviso: (v: string | null) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function TelaAutenticacao(props: TelaAutenticacaoProps) {
  const { modoAuth, setModoAuth, authEmail, setAuthEmail, authSenha, setAuthSenha,
    authUsername, setAuthUsername, authErro, authAviso, authEnviando,
    setAuthErro, setAuthAviso, onSubmit } = props;
  const erroExibido = authErro || erroConfiguracaoSupabase;
  const { tema, trocarTema } = useTema();
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [emAbertura, setEmAbertura] = useState(true);
  const pagina = useRef<HTMLDivElement>(null);
  const abertura = useRef<HTMLDivElement>(null);
  const logoAbertura = useRef<HTMLDivElement>(null);
  const marca = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    let cancelado = false;
    let esperaFonte: number | undefined;
    const media = gsap.matchMedia();
    media.add({ reduzido: '(prefers-reduced-motion: reduce)', animado: '(prefers-reduced-motion: no-preference)' }, (contextoMedia) => {
      let canceladoMedia = false;
      const contexto = gsap.context(() => {
        const tela = pagina.current?.querySelector('#login-screen');
        if (contextoMedia.conditions?.reduzido) {
          gsap.set(abertura.current, { autoAlpha: 0, pointerEvents: 'none' });
          setEmAbertura(false);
          return;
        }
        gsap.set(tela!, { autoAlpha: 0 });
        gsap.set(marca.current, { opacity: 0 });
        gsap.set('.opening-word', { opacity: 0, y: 10, scale: .96 });
        // Mede as duas marcas uma vez, após a fonte, e anima só transform/opacity.
        const fontes = document.fonts?.load('700 64px Newsreader') ?? Promise.resolve();
        void Promise.race([fontes, new Promise(resolve => { esperaFonte = window.setTimeout(resolve, 900); })]).catch(() => {}).then(() => {
          if (cancelado || canceladoMedia) return;
          contexto.add(() => {
          if (!logoAbertura.current || !marca.current) return;
          window.clearTimeout(esperaFonte);
          const origem = logoAbertura.current.getBoundingClientRect();
          const destino = marca.current.getBoundingClientRect();
          const tl = gsap.timeline({ onComplete: () => setEmAbertura(false) });
          tl.to('.opening-ring', { rotation: 360, duration: .82, ease: 'power2.inOut' }, 0)
            .to('.opening-ring', { opacity: 0, scale: 1.12, duration: .24, ease: 'power2.out' }, .65)
            .to('.opening-word', { opacity: 1, y: 0, scale: 1, duration: .42, ease: 'power2.out' }, .65)
            .to(logoAbertura.current, {
              x: destino.left + destino.width / 2 - origem.left - origem.width / 2,
              y: destino.top + destino.height / 2 - origem.top - origem.height / 2,
              scale: destino.width / Math.max(1, origem.width),
              duration: .72, ease: 'power3.inOut',
            }, 1.3)
            .to(tela!, { autoAlpha: 1, duration: .38 }, 1.65)
            .to(logoAbertura.current, { opacity: 0, duration: .16 }, 1.98)
            .to(marca.current, { opacity: 1, duration: .16 }, 1.98)
            .to(abertura.current, { autoAlpha: 0, pointerEvents: 'none', duration: .22 }, 1.98);
          });
        });
      }, pagina);
      return () => { canceladoMedia = true; window.clearTimeout(esperaFonte); contexto.revert(); };
    });
    return () => { cancelado = true; media.revert(); };
  }, []);

  const alternar = () => {
    setModoAuth(modoAuth === 'login' ? 'cadastro' : 'login');
    setAuthErro(null); setAuthAviso(null); setMostrarSenha(false);
  };

  return <div className="auth-shell" data-tema={tema} data-abertura={emAbertura} ref={pagina}>
    <div id="splash-screen" className="auth-opening" ref={abertura} aria-hidden="true">
      <div className="splash-logo-container" id="logo-wrapper" ref={logoAbertura}>
        <span className="opening-ring" />
        <MarcaTomo className="opening-word" />
      </div>
    </div>
    <div id="login-screen" className="auth-screen">
      <button type="button" className="auth-theme-toggle" onClick={trocarTema} title={tema === 'claro' ? 'Ativar tema escuro' : 'Ativar tema claro'} aria-label={tema === 'claro' ? 'Ativar tema escuro' : 'Ativar tema claro'}>{tema === 'claro' ? <Moon size={22} aria-hidden="true" /> : <Sun size={22} aria-hidden="true" />}</button>
      <main className="auth-main">
        <div className="auth-illustration" aria-hidden="true"><MascoteLogin /></div>
        <section className="auth-form-content" aria-labelledby="auth-title">
          <span className="auth-brand" ref={marca} aria-label="Tomo"><MarcaTomo className="auth-brand-word" /></span>
          <h1 id="auth-title">{modoAuth === 'login' ? 'Entrar no Tomo' : 'Criar sua conta'}</h1>
          <form className="auth-form" onSubmit={onSubmit} aria-busy={authEnviando}>
            {modoAuth === 'cadastro' && <div className="auth-field">
              <label htmlFor="auth-username">Nome de usuário</label>
              <input id="auth-username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} disabled={authEnviando} required placeholder="Seu nome no Tomo" value={authUsername} onChange={(e) => setAuthUsername(e.target.value)} />
            </div>}
            <div className="auth-field">
              <label htmlFor="auth-email">{modoAuth === 'cadastro' ? 'E-mail' : 'E-mail ou nome de usuário'}</label>
              <input id="auth-email" type={modoAuth === 'cadastro' ? 'email' : 'text'} autoComplete={modoAuth === 'cadastro' ? 'email' : 'username'} autoCapitalize="none" spellCheck={false} disabled={authEnviando} required placeholder={modoAuth === 'cadastro' ? 'voce@exemplo.com' : 'Seu e-mail ou usuário'} value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} />
            </div>
            <div className="auth-field">
              <label htmlFor="auth-password">Senha</label>
              <div className="auth-password-wrap"><input id="auth-password" type={mostrarSenha ? 'text' : 'password'} autoComplete={modoAuth === 'cadastro' ? 'new-password' : 'current-password'} disabled={authEnviando} required placeholder="Sua senha" value={authSenha} onChange={(e) => setAuthSenha(e.target.value)} /><button className="auth-password-toggle" type="button" aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={mostrarSenha} onClick={() => setMostrarSenha((v) => !v)}>{mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
            </div>
            {modoAuth === 'login' && <button className="auth-recovery" type="button" disabled={authEnviando} onClick={() => { setAuthAviso('Para recuperar sua senha, entre em contato com o administrador do Tomo.'); setAuthErro(null); }}>Esqueceu a senha?</button>}
            {erroExibido && <p className="auth-message auth-message-error" role="alert"><AlertCircle size={18} aria-hidden="true" />{erroExibido}</p>}
            {authAviso && <p className="auth-message" role="status">{authAviso}</p>}
            <button type="submit" className="auth-submit" disabled={authEnviando}>{authEnviando ? 'Aguarde…' : modoAuth === 'login' ? 'Entrar' : 'Criar conta'}{!authEnviando && <ArrowRight size={18} aria-hidden="true" />}</button>
          </form>
          <p className="auth-switch">{modoAuth === 'login' ? 'Ainda não tem conta?' : 'Já tem uma conta?'} <button type="button" disabled={authEnviando} onClick={alternar}>{modoAuth === 'login' ? 'Criar conta' : 'Entrar'}</button></p>
        </section>
      </main>
    </div>
  </div>;
}
