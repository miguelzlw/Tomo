import { MascoteLogin } from './MascoteLogin';
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
  const pagina = useRef<HTMLDivElement>(null);
  const abertura = useRef<HTMLDivElement>(null);
  const logoAbertura = useRef<HTMLDivElement>(null);
  const marca = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const media = gsap.matchMedia();
    media.add({ reduzido: '(prefers-reduced-motion: reduce)', animado: '(prefers-reduced-motion: no-preference)' }, (contextoMedia) => {
      let limite: number | undefined;
      const contexto = gsap.context(() => {
        const tela = pagina.current?.querySelector('#login-screen');
        if (contextoMedia.conditions?.reduzido) {
          gsap.set(abertura.current, { autoAlpha: 0, pointerEvents: 'none' });
          return;
        }
        gsap.set(tela!, { autoAlpha: 0 });
        gsap.set(marca.current, { opacity: 0 });
        const tl = gsap.timeline();
        tl.to(logoAbertura.current, { rotation: -360, duration: 1.1, ease: 'power2.inOut' }, 0)
          .to('.opening-morph', { attr: { d: 'M 22,20 L 78,20 M 50,20 L 50,85' }, duration: 1.1, ease: 'power2.inOut' }, 0)
          .to(logoAbertura.current, { x: -54, duration: 1, ease: 'power2.inOut' }, '+=0.05')
          .to('.opening-omo', { width: 'auto', opacity: 1, duration: 1, ease: 'power2.inOut' }, '<')
          .to({}, { duration: .45 })
          .to(logoAbertura.current, {
            scale: .38,
            x: () => {
              const origem = logoAbertura.current!.getBoundingClientRect();
              const destino = marca.current!.getBoundingClientRect();
              return Number(gsap.getProperty(logoAbertura.current, 'x')) + destino.left + destino.width / 2 - origem.left - origem.width / 2;
            },
            y: () => {
              const origem = logoAbertura.current!.getBoundingClientRect();
              const destino = marca.current!.getBoundingClientRect();
              return destino.top + destino.height / 2 - origem.top - origem.height / 2;
            },
            duration: 1, ease: 'power3.inOut',
          })
          .to(tela!, { autoAlpha: 1, duration: .6 }, '-=.5')
          .to(logoAbertura.current, { opacity: 0, duration: .2 }, '-=.1')
          .to(marca.current, { opacity: 1, duration: .2 }, '<')
          .to(abertura.current, { autoAlpha: 0, pointerEvents: 'none', duration: .3 }, '<');
        limite = window.setTimeout(() => tl.progress(1), 5500);
      }, pagina);
      return () => { window.clearTimeout(limite); contexto.revert(); };
    });
    return () => media.revert();
  }, []);

  const alternar = () => {
    setModoAuth(modoAuth === 'login' ? 'cadastro' : 'login');
    setAuthErro(null); setAuthAviso(null); setMostrarSenha(false);
  };

  return <div className="auth-shell" data-tema={tema} ref={pagina}>
    <div id="splash-screen" className="auth-opening" ref={abertura} aria-hidden="true">
      <div className="splash-logo-container" id="logo-wrapper" ref={logoAbertura}>
        <div className="svg-logo-box"><svg viewBox="0 0 100 100" width="100%" height="100%"><path className="opening-morph" d="M 50,10 A 40,40 0 1,1 49.9,10 Z" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
        <span className="text-omo opening-omo">omo</span>
      </div>
    </div>
    <div id="login-screen" className="auth-screen">
      <button type="button" className="auth-theme-toggle" onClick={trocarTema} aria-label={tema === 'claro' ? 'Ativar tema escuro' : 'Ativar tema claro'}>{tema === 'claro' ? <Moon size={18} /> : <Sun size={18} />}<span>{tema === 'claro' ? 'Escuro' : 'Claro'}</span></button>
      <main className="auth-main">
        <div className="auth-illustration" aria-hidden="true"><MascoteLogin /></div>
        <section className="auth-form-content" aria-labelledby="auth-title">
          <span className="auth-brand" ref={marca} aria-label="Tomo"><span className="brand-logo auth-brand-word">To<span>mo</span></span></span>
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
