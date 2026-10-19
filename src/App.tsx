import { BotaoTema } from './tema';
import { EntradaLivro } from './EntradaLivro';
import { useAnimacaoRolagem } from './useAnimacaoRolagem';
import { MarcaTomo } from './MarcaTomo';
import { BotaoConectarIA, JanelaConectarIA } from './ConectarIA';
import { CriarComIA } from './CriarComIA';
import { prepararInsercaoIA } from './ia';
import { ConsultasCompartilhadas } from './dados/consultasCompartilhadas';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { dividirTextoEmPaginas } from './paginacao';
import { DetalhesLivro } from './DetalhesLivro';
import { PerfilProprio } from './PerfilProprio';
import { Pesquisa } from './Pesquisa';
import { MeusLivros } from './MeusLivros';
import { Biblioteca } from './Biblioteca';
import { Inicio } from './Inicio';
import { TelaAutenticacao } from './TelaAutenticacao';
import {
  Heart,
  Bookmark,
  Menu,
  Shield,
  BookOpen,
  House,
  Pencil,
  LibraryBig,
  Search,
  User,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Check,
  X,
  AlertCircle,
  Sparkles,
  Plus,
  Trash2,
  Camera,
} from 'lucide-react';
import {
  atualizarMeuPerfil,
  cadastrarConta,
  entrarConta,
  sairConta,
  obterPerfilAtual,
  obterPerfilPorId,
  listarContasPendentes,
  atualizarStatusConta,
  criarLivro,
  atualizarLivro,
  obterLivroPorId,
  listarMeusLivros,
  listarMeusRascunhos,
  listarFeed,
  listarLivrosDoAutor,
  obterPaginasDoLivro,
  salvarPaginas,
  salvarProgressoLeitura,
  obterProgressoLeitura,
  listarContinuarLendo,
  listarSalvosParaLer,
  alternarSalvarParaLer,
  seguirUsuario,
  deixarDeSeguir,
  verificarSeguindo,
  listarNotificacoes,
  marcarNotificacaoComoLida,
  buscarLivrosEPerfis,
  adicionarBuscaRecente,
  listarBuscasRecentes,
  limparBuscasRecentes,
  registrarSinalSessao,
  listarAtividadeUsuarios,
  moverParaLixeira,
} from './dados';
import type {
  Perfil,
  Livro,
  Pagina,
  ProgressoLeitura,
  Notificacao,
  BuscaRecente,
  Sessao,
} from './dados';

function ResumoPerfil({ perfil, proprio = false }: { perfil: Perfil; proprio?: boolean }) {
  return <div className="profile-summary">
    <div>
      <span className="avatar">{perfil.foto_url ? <img src={perfil.foto_url} alt={proprio ? 'Sua foto de perfil' : `Foto de ${perfil.nome_usuario}`} /> : perfil.nome_usuario.charAt(0).toUpperCase()}</span>
      <div>
        <h2>{perfil.nome_usuario}</h2>
        {perfil.bio?.trim() && <p>{perfil.bio}</p>}
      </div>
    </div>
  </div>;
}

export function App() {
  // Estado de Autenticação
  const [usuario, setUsuario] = useState<Perfil | null>(null);
  const [carregandoAuth, setCarregandoAuth] = useState(true);
  const [modoAuth, setModoAuth] = useState<'login' | 'cadastro'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authSenha, setAuthSenha] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authErro, setAuthErro] = useState<string | null>(null);
  const [authAviso, setAuthAviso] = useState<string | null>(null);
  const [authEnviando, setAuthEnviando] = useState(false);
  const [entradaLogin, setEntradaLogin] = useState(false);
  const perfilAposEntrada = useRef<Perfil | null>(null);
  const prepararTelaAposEntrada = useCallback(() => {
    if (perfilAposEntrada.current) setUsuario(perfilAposEntrada.current);
    perfilAposEntrada.current = null;
  }, []);
  const concluirEntradaLogin = useCallback(() => setEntradaLogin(false), []);

  // Navegação Principal (5 ícones)
  const [abaAtual, setAbaAtual] = useState<'dashboard' | 'feed' | 'criar_editar' | 'pesquisa' | 'perfil'>('dashboard');
  const [conectandoIA, setConectandoIA] = useState(() => new URLSearchParams(window.location.search).has('mcp_authorize'));

  // Visões Modais / Telas Secundárias
  const [visaoAtiva, setVisaoAtiva] = useState<'principal' | 'editor' | 'leitor' | 'perfil_visitado' | 'notificacoes'>('principal');
  const conteudoRolagem = useRef<HTMLElement>(null);
  useAnimacaoRolagem(conteudoRolagem, `${carregandoAuth}:${usuario?.id}:${usuario?.status}:${abaAtual}:${visaoAtiva}`);
  const [livroDetalhes, setLivroDetalhes] = useState<Livro | null>(null);
  const [abrindoLivro, setAbrindoLivro] = useState(false);
  const leituraEmCurso = useRef(false);
  const [erroDetalhes, setErroDetalhes] = useState('');
  const [irEstante, setIrEstante] = useState(false);
  const pedidoDetalhes = useRef(0);
  useEffect(() => {
    if (!irEstante) return;
    document.getElementById('minha-estante')?.scrollIntoView({ block: 'start', behavior: 'instant' });
    document.getElementById('minha-estante')?.focus({ preventScroll: true });
    setIrEstante(false);
  }, [irEstante]);
  const [mostrarModalAdmin, setMostrarModalAdmin] = useState(false);

  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [perfilNome, setPerfilNome] = useState('');
  const [perfilBio, setPerfilBio] = useState('');
  const [perfilFoto, setPerfilFoto] = useState('');
  const [confirmarRemocaoFoto, setConfirmarRemocaoFoto] = useState(false);
  const fotoPerfilInput = useRef<HTMLInputElement>(null);
  const [perfilErro, setPerfilErro] = useState('');
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [seguindoBusca, setSeguindoBusca] = useState<Record<string, boolean>>({});
  const [confirmarDeixar, setConfirmarDeixar] = useState<Perfil | null>(null);
  const [confirmarSaida, setConfirmarSaida] = useState(false);
  const [acaoSocial, setAcaoSocial] = useState(false);
  const [livroJaLancado, setLivroJaLancado] = useState(false);
  const [voltandoRascunho, setVoltandoRascunho] = useState(false);
  const [erroRascunho, setErroRascunho] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);

  // Perfil Visitado (a partir da busca de autores)
  const [perfilVisitado, setPerfilVisitado] = useState<Perfil | null>(null);
  const [livrosPerfilVisitado, setLivrosPerfilVisitado] = useState<Livro[]>([]);
  const [seguindoPerfilVisitado, setSeguindoPerfilVisitado] = useState(false);
  const [menuPerfilAberto, setMenuPerfilAberto] = useState(false);
  const menuPerfilRef = useRef<HTMLDivElement>(null);

  // Estados de Dados do Dashboard
  const [continuarLendo, setContinuarLendo] = useState<ProgressoLeitura[]>([]);
  const [inicioCarregando, setInicioCarregando] = useState(true);
  const [erroInicio, setErroInicio] = useState('');
  const [tentativaInicio, setTentativaInicio] = useState(0);
  const [salvosParaLer, setSalvosParaLer] = useState<Livro[]>([]);
  const [salvandoParaLer, setSalvandoParaLer] = useState<string | null>(null);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);

  // Estados do Feed
  const [feedLivros, setFeedLivros] = useState<Livro[]>([]);

  // Estados de Criar/Editar
  const [meusRascunhos, setMeusRascunhos] = useState<Livro[]>([]);
  const [meusLivrosLancados, setMeusLivrosLancados] = useState<Livro[]>([]);


  // Estados do Editor
  const [editLivroId, setEditLivroId] = useState<string | null>(null);
  const [editTitulo, setEditTitulo] = useState('');
  const [editDescricao, setEditDescricao] = useState('');
  const [editCapaUrl, setEditCapaUrl] = useState('');
  const [editFundoUrl, setEditFundoUrl] = useState('');
  const [editVisibilidade, setEditVisibilidade] = useState<'privado' | 'amigos' | 'publico'>('privado');
  const [editSituacao, setEditSituacao] = useState<'rascunho' | 'lancado'>('rascunho');
  const [editPaginas, setEditPaginas] = useState<Array<{ numero: number; texto: string }>>([{ numero: 1, texto: '' }]);
  const [editPaginaAtual, setEditPaginaAtual] = useState(1);
  const [editStatusSalvo, setEditStatusSalvo] = useState<'salvo' | 'salvando' | 'alterado'>('salvo');
  const autoSaveTimerRef = useRef<number | null>(null);

  // Estados do Leitor
  const [livroLeitura, setLivroLeitura] = useState<Livro | null>(null);
  const [paginasLeitura, setPaginasLeitura] = useState<Pagina[]>([]);
  const [paginaLeituraAtual, setPaginaLeituraAtual] = useState(1);

  // Estados de Pesquisa
  const [termoBusca, setTermoBusca] = useState('');
  const [pesquisando, setPesquisando] = useState(false);
  const [erroPesquisa, setErroPesquisa] = useState('');
  const pesquisaAtual = useRef(0);
  const [resultadoLivros, setResultadoLivros] = useState<Livro[]>([]);
  const [resultadoPerfis, setResultadoPerfis] = useState<Perfil[]>([]);
  const [buscasRecentes, setBuscasRecentes] = useState<BuscaRecente[]>([]);

  // Estados de Admin
  const [contasPendentes, setContasPendentes] = useState<Perfil[]>([]);
  const [sessoesAtividade, setSessoesAtividade] = useState<Sessao[]>([]);

  // Carregamento Inicial do Usuário
  useEffect(() => {
    async function carregarSessao() {
      try {
        const p = await obterPerfilAtual();
        setUsuario(p);
      } catch (e) {
        console.error(e);
      } finally {
        setCarregandoAuth(false);
      }
    }
    carregarSessao();
  }, []);

  // Sinal de Sessão Periódico (Tempo online - US-18)
  useEffect(() => {
    if (!usuario || usuario.status !== 'aprovado') return;
    registrarSinalSessao();
    const interval = setInterval(() => {
      registrarSinalSessao();
    }, 60000); // A cada 1 minuto
    return () => clearInterval(interval);
  }, [usuario]);

  const consultasAbas = useRef(new ConsultasCompartilhadas());
  const donoConsultas = useRef<string | null>(null);
  const visaoAnterior = useRef(visaoAtiva);
  // Mantém os dados visíveis e prepara as outras abas sem esperar o primeiro clique.
  useEffect(() => {
    const anterior = visaoAnterior.current;
    visaoAnterior.current = visaoAtiva;
    if (!usuario || usuario.status !== 'aprovado') {
      consultasAbas.current.limpar(); donoConsultas.current = null;
      setSalvosParaLer([]); setContinuarLendo([]); setFeedLivros([]);
      setMeusRascunhos([]); setMeusLivrosLancados([]); setNotificacoes([]); setBuscasRecentes([]);
      setInicioCarregando(true); setErroInicio('');
      return;
    }
    const primeiro = donoConsultas.current !== usuario.id;
    if (primeiro || (anterior !== 'principal' && visaoAtiva === 'principal')) consultasAbas.current.limpar();
    donoConsultas.current = usuario.id;
    if (visaoAtiva !== 'principal') return;
    let ativo = true;
    const carregar = <T,>(chave: string, consulta: () => Promise<T>, aplicar: (valor: T) => void) => {
      return consultasAbas.current.consultar(chave, consulta).then((valor) => {
        if (ativo && donoConsultas.current === usuario.id) aplicar(valor);
        return true;
      }).catch((erro) => { console.error('Não foi possível atualizar ' + chave, erro); return false; });
    };
    if (primeiro || abaAtual === 'dashboard') {
      void Promise.all([
        carregar('salvos', listarSalvosParaLer, setSalvosParaLer),
        carregar('leituras', listarContinuarLendo, setContinuarLendo),
      ]).then((resultados) => {
        if (!ativo || donoConsultas.current !== usuario.id) return;
        setErroInicio(resultados.every(Boolean) ? '' : 'Não foi possível carregar suas leituras. Tente novamente.');
        setInicioCarregando(false);
      });
      carregar('notificacoes', listarNotificacoes, setNotificacoes);
      if (usuario.papel === 'admin') carregar('pendentes', listarContasPendentes, setContasPendentes);
    }
    if (primeiro || abaAtual === 'feed') carregar('biblioteca', listarFeed, setFeedLivros);
    if (primeiro || abaAtual === 'criar_editar') carregar('rascunhos', listarMeusRascunhos, setMeusRascunhos);
    if (primeiro || abaAtual === 'criar_editar' || abaAtual === 'perfil') carregar('publicados', listarMeusLivros, setMeusLivrosLancados);
    if (primeiro || abaAtual === 'pesquisa') carregar('buscas', listarBuscasRecentes, setBuscasRecentes);
    return () => { ativo = false; };
  }, [usuario, abaAtual, visaoAtiva, tentativaInicio]);

  useEffect(() => {
    let ativo = true;
    Promise.all(resultadoPerfis.map(async (p) => [p.id, await verificarSeguindo(p.id)] as const))
      .then((pares) => { if (ativo) setSeguindoBusca(Object.fromEntries(pares)); });
    return () => { ativo = false; };
  }, [resultadoPerfis]);

  useEffect(() => {
    if (!editandoPerfil && !confirmarDeixar && !confirmarSaida) return;
    const anterior = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focaveis = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled)') || []);
    focaveis()[0]?.focus();
    const teclado = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !acaoSocial && !salvandoPerfil) {
        setEditandoPerfil(false); setConfirmarDeixar(null); setConfirmarSaida(false);
      }
      if (e.key !== 'Tab') return;
      const itens = focaveis();
      const primeiro = itens[0]; const ultimo = itens[itens.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo?.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro?.focus(); }
    };
    document.addEventListener('keydown', teclado);
    return () => { document.removeEventListener('keydown', teclado); anterior?.focus(); };
  }, [editandoPerfil, confirmarDeixar, confirmarSaida, acaoSocial, salvandoPerfil]);

  useEffect(() => { setMenuPerfilAberto(false); }, [abaAtual, visaoAtiva]);

  useEffect(() => {
    if (!menuPerfilAberto) return;
    const fecharFora = (e: PointerEvent) => {
      if (!menuPerfilRef.current?.contains(e.target as Node)) setMenuPerfilAberto(false);
    };
    const fecharTeclado = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMenuPerfilAberto(false); menuPerfilRef.current?.querySelector('button')?.focus(); }
    };
    document.addEventListener('pointerdown', fecharFora);
    document.addEventListener('keydown', fecharTeclado);
    return () => { document.removeEventListener('pointerdown', fecharFora); document.removeEventListener('keydown', fecharTeclado); };
  }, [menuPerfilAberto]);

  const abrirNotificacoes = async () => {
    try {
      const lista = await listarNotificacoes();
      await Promise.all(lista.filter((n) => !n.lida).map((n) => marcarNotificacaoComoLida(n.id)));
      setNotificacoes(lista.map((n) => ({ ...n, lida: true })));
      setVisaoAtiva('notificacoes');
    } catch { alert('Não foi possível abrir as notificações. Tente novamente.'); }
  };

  const alternarSeguindo = async (perfil: Perfil, removendo = false) => {
    if (acaoSocial) return;
    setAcaoSocial(true);
    try {
      const sucesso = removendo ? await deixarDeSeguir(perfil.id) : await seguirUsuario(perfil.id);
      if (!sucesso) throw new Error('Não foi possível atualizar. Tente novamente.');
      setSeguindoBusca((anterior) => ({ ...anterior, [perfil.id]: !removendo }));
      if (perfilVisitado?.id === perfil.id) {
        setSeguindoPerfilVisitado(!removendo);
        setLivrosPerfilVisitado(await listarLivrosDoAutor(perfil.id));
      }
      setConfirmarDeixar(null);
    } catch (erro) { alert(erro instanceof Error ? erro.message : 'Erro ao atualizar.'); }
    finally { setAcaoSocial(false); }
  };

  const salvarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (salvandoPerfil) return;
    setSalvandoPerfil(true); setPerfilErro('');
    try {
      const atualizado = await atualizarMeuPerfil({ nome_usuario: perfilNome, bio: perfilBio, foto_url: perfilFoto });
      if (!atualizado) throw new Error('Não foi possível salvar o perfil.');
      setUsuario(atualizado); setEditandoPerfil(false);
    } catch (erro) { setPerfilErro(erro instanceof Error ? erro.message : 'Erro ao salvar perfil.'); }
    finally { setSalvandoPerfil(false); }
  };

  // Autosave a cada 30 segundos no Editor (RNF-02)
  useEffect(() => {
    if (visaoAtiva !== 'editor' || !editLivroId) return;

    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = window.setInterval(async () => {
      if (editStatusSalvo === 'alterado') {
        try {
          setEditStatusSalvo('salvando');
          await atualizarLivro(editLivroId, {
            titulo: editTitulo,
            descricao: editDescricao,
            capa_url: editCapaUrl,
            fundo_url: editFundoUrl,
            visibilidade: editVisibilidade,
            situacao: editSituacao,
          });
          await salvarPaginas(editLivroId, editPaginas);
          if (editSituacao === 'lancado') setLivroJaLancado(true);
          setEditStatusSalvo('salvo');
        } catch (err) {
          console.error('Erro no autosave:', err);
        }
      }
    }, 30000); // 30s

    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [visaoAtiva, editLivroId, editTitulo, editDescricao, editCapaUrl, editFundoUrl, editVisibilidade, editSituacao, editPaginas, editStatusSalvo]);

  // --- HANDLERS DE AUTH ---
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authEnviando || entradaLogin) return;
    setAuthErro(null);
    setAuthAviso(null);
    setAuthEnviando(true);
    if (modoAuth === 'login') {
      perfilAposEntrada.current = null;
      setEntradaLogin(true);
    }
    try {
      if (modoAuth === 'cadastro') {
        const res = await cadastrarConta(authEmail, authSenha, authUsername);
        if (!res.sucesso) {
          setAuthErro(res.mensagem || 'Erro ao criar conta.');
        } else {
          setAuthAviso(res.mensagem || 'Conta criada com sucesso!');
          if (res.perfil) setUsuario(res.perfil);
        }
      } else {
        const res = await entrarConta(authEmail || authUsername, authSenha);
        if (!res.sucesso) {
          setAuthErro(res.mensagem || 'Credenciais inválidas.');
        } else if (res.perfil) {
          perfilAposEntrada.current = res.perfil;
          setInicioCarregando(true);
          setErroInicio('');
          // Start the dashboard requests while the book is still opening.
          setUsuario(res.perfil);
          setAbaAtual('dashboard');
          setVisaoAtiva('principal');
        } else {
          setAuthErro('A conta foi autenticada, mas o perfil não foi encontrado. Verifique a configuração do Supabase.');
        }
      }
    } catch {
      setAuthErro('Não foi possível conectar ao serviço de acesso. Confira sua conexão e a configuração do Supabase no .env.');
    } finally {
      setAuthEnviando(false);
    }
  };

  const handleLogout = async () => {
    await sairConta();
    setUsuario(null);
    setVisaoAtiva('principal');
  };

  // --- ABERTURA DE TELAS ---
  const abrirNovoLivro = async () => {
    try {
      const novo = await criarLivro({
        titulo: 'Sem título',
        situacao: 'rascunho',
        visibilidade: 'privado',
      });
      if (novo) {
        setLivroJaLancado(false);
        setEditLivroId(novo.id);
        setEditTitulo(novo.titulo);
        setEditDescricao('');
        setEditCapaUrl('');
        setEditFundoUrl('');
        setEditVisibilidade(novo.visibilidade);
        setEditSituacao(novo.situacao);
        setEditPaginas([{ numero: 1, texto: '' }]);
        setEditPaginaAtual(1);
        setEditStatusSalvo('salvo');
        setVisaoAtiva('editor');
      }
    } catch (e: any) {
      alert(e.message || 'Erro ao criar livro.');
    }
  };

  const abrirEditorLivro = async (livro: Livro) => {
    try {
      const paginas = await obterPaginasDoLivro(livro.id);
      setErroRascunho('');
      setLivroJaLancado(livro.situacao === 'lancado');
      setEditLivroId(livro.id);
      setEditTitulo(livro.titulo);
      setEditDescricao(livro.descricao || '');
      setEditCapaUrl(livro.capa_url || '');
      setEditFundoUrl(livro.fundo_url || '');
      setEditVisibilidade(livro.visibilidade);
      setEditSituacao(livro.situacao);
      setEditPaginas(paginas.length > 0 ? paginas : [{ numero: 1, texto: '' }]);
      setEditPaginaAtual(1);
      setEditStatusSalvo('salvo');
      setVisaoAtiva('editor');
    } catch (e: any) {
      alert(e.message || 'Erro ao carregar livro.');
    }
  };

  const abrirDetalhes = async (livroId: string) => {
    const pedido = ++pedidoDetalhes.current;
    const existente = [...feedLivros, ...salvosParaLer, ...meusLivrosLancados, ...resultadoLivros, ...livrosPerfilVisitado,
      ...continuarLendo.flatMap((item) => item.livro ? [item.livro] : [])].find((livro) => livro.id === livroId);
    const autorConhecido = existente?.autor || [usuario, perfilVisitado, ...resultadoPerfis].find((perfil) => perfil?.id === existente?.autor_id) || undefined;
    setErroDetalhes('');
    if (existente) setLivroDetalhes({ ...existente, autor: autorConhecido });
    try {
      const livro = await obterLivroPorId(livroId);
      if (pedido !== pedidoDetalhes.current) return;
      if (!livro) { setLivroDetalhes(null); alert('Este livro não está disponível para você.'); return; }
      setLivroDetalhes({ ...livro, autor: livro.autor || autorConhecido });
      if (!livro.autor && !autorConhecido) {
        const autor = await obterPerfilPorId(livro.autor_id);
        if (pedido === pedidoDetalhes.current && autor) setLivroDetalhes({ ...livro, autor });
      }
    } catch {
      if (pedido !== pedidoDetalhes.current) return;
      if (existente) setErroDetalhes('Não foi possível atualizar os detalhes. Você pode tentar abrir a leitura novamente.');
      else alert('Não foi possível abrir os detalhes do livro. Tente novamente.');
    }
  };

  const abrirLeitura = async (livroId: string) => {
    if (leituraEmCurso.current) return;
    leituraEmCurso.current = true;
    setAbrindoLivro(true);
    try {
      const [livro, pgs, ultPag] = await Promise.all([
        obterLivroPorId(livroId),
        obterPaginasDoLivro(livroId),
        obterProgressoLeitura(livroId),
      ]);
      if (!livro) {
        alert('Você não tem permissão para ler este livro.');
        return;
      }
      setLivroLeitura(livro);
      setPaginasLeitura(pgs.length > 0 ? pgs : [{ livro_id: livroId, numero: 1, texto: 'Nenhum texto nesta página.' }]);
      setPaginaLeituraAtual(Number.isInteger(ultPag) && ultPag >= 1 && ultPag <= pgs.length ? ultPag : 1);
      setLivroDetalhes(null);
      setVisaoAtiva('leitor');
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    } catch (e) {
      console.error(e);
      alert('Erro ao carregar livro para leitura.');
    } finally {
      leituraEmCurso.current = false;
      setAbrindoLivro(false);
    }
  };

  const salvarParaDepois = async (livro: Livro) => {
    if (salvandoParaLer) return;
    setSalvandoParaLer(livro.id);
    try {
      const salvo = await alternarSalvarParaLer(livro.id);
      setSalvosParaLer((lista) => salvo ? [livro, ...lista.filter((l) => l.id !== livro.id)] : lista.filter((l) => l.id !== livro.id));
    } catch { alert('Não foi possível atualizar os livros salvos. Tente novamente.'); }
    finally { setSalvandoParaLer(null); }
  };

  const pesquisar = async (termo: string) => {
    const pedido = ++pesquisaAtual.current;
    setTermoBusca(termo);
    setErroPesquisa('');
    if (!termo.trim()) {
      setResultadoLivros([]); setResultadoPerfis([]); setPesquisando(false);
      return;
    }
    setPesquisando(true);
    try {
      const resultado = await buscarLivrosEPerfis(termo.trim());
      if (pedido !== pesquisaAtual.current) return;
      setResultadoLivros(resultado.livros); setResultadoPerfis(resultado.perfis);
    } catch {
      if (pedido === pesquisaAtual.current) setErroPesquisa('Não foi possível pesquisar. Tente novamente.');
    } finally {
      if (pedido === pesquisaAtual.current) setPesquisando(false);
    }
  };

  const botaoSalvarLivro = (livro: Livro, compacto = false) => {
    const salvo = salvosParaLer.some((l) => l.id === livro.id);
    const rotulo = salvo ? 'Remover dos salvos' : 'Salvar para ler depois';
    return <button className={`btn-secondary save-book-button ${compacto ? 'save-book-compact' : ''}`} aria-label={rotulo} title={rotulo} aria-pressed={salvo} disabled={salvandoParaLer !== null} onClick={(e) => { e.stopPropagation(); void salvarParaDepois(livro); }}>
      <Bookmark size={20} fill={salvo ? 'currentColor' : 'none'} />
      {!compacto && <span>{salvandoParaLer === livro.id ? 'Salvando…' : salvo ? 'Salvo' : 'Salvar para depois'}</span>}
    </button>;
  };

  const virarPaginaLeitura = async (delta: number) => {
    if (!livroLeitura) return;
    const novaPag = paginaLeituraAtual + delta;
    if (novaPag >= 1 && novaPag <= paginasLeitura.length) {
      setPaginaLeituraAtual(novaPag);
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      await salvarProgressoLeitura(livroLeitura.id, novaPag);
    }
  };

  const voltarParaRascunho = async () => {
    if (!editLivroId || voltandoRascunho || editStatusSalvo === 'salvando') return;
    if (autoSaveTimerRef.current) window.clearInterval(autoSaveTimerRef.current);
    setVoltandoRascunho(true); setEditStatusSalvo('salvando'); setErroRascunho('');
    try {
      await salvarPaginas(editLivroId, editPaginas);
      const livro = await atualizarLivro(editLivroId, {
        titulo: editTitulo, descricao: editDescricao, capa_url: editCapaUrl,
        fundo_url: editFundoUrl, situacao: 'rascunho', visibilidade: 'privado',
      });
      if (!livro) throw new Error('Não foi possível voltar para rascunho.');
      setEditSituacao('rascunho'); setEditVisibilidade('privado');
      setLivroJaLancado(false); setEditStatusSalvo('salvo');
    } catch (erro) {
      setErroRascunho(erro instanceof Error ? erro.message : 'Não foi possível voltar para rascunho.');
      setEditStatusSalvo('alterado');
    } finally { setVoltandoRascunho(false); }
  };

  const salvarEditorManual = async () => {
    if (!editLivroId || editStatusSalvo === 'salvando') return;
    try {
      setEditStatusSalvo('salvando');
      const atualizado = await atualizarLivro(editLivroId, {
        titulo: editTitulo,
        descricao: editDescricao,
        capa_url: editCapaUrl,
        fundo_url: editFundoUrl,
        visibilidade: editVisibilidade,
        situacao: editSituacao,
      });
      if (!atualizado) throw new Error('Não foi possível salvar o livro. Tente novamente.');
      await salvarPaginas(editLivroId, editPaginas);
      setEditStatusSalvo('salvo');
      setAbaAtual('criar_editar');
      setVisaoAtiva('principal');
    } catch (e: any) {
      alert(e.message || 'Erro ao salvar livro.');
      setEditStatusSalvo('alterado');
    }
  };

  const abrirPerfilVisitado = async (autor: Perfil) => {
    try {
      setPerfilVisitado(autor);
      const [livros, seguindo] = await Promise.all([
        listarLivrosDoAutor(autor.id),
        verificarSeguindo(autor.id),
      ]);
      setLivrosPerfilVisitado(livros);
      setSeguindoPerfilVisitado(seguindo);
      setVisaoAtiva('perfil_visitado');
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar perfil do autor.');
    }
  };

  const handleMoverParaLixeiraEditor = async () => {
    if (!editLivroId) return;
    if (confirm('Deseja mover este livro para a lixeira? Você poderá restaurá-lo depois se quiser.')) {
      await moverParaLixeira(editLivroId);
      setVisaoAtiva('principal');
      listarMeusRascunhos().then(setMeusRascunhos);
      listarMeusLivros().then(setMeusLivrosLancados);
    }
  };

  // --- HANDLER DE PASTE COM PAGINAÇÃO AUTOMÁTICA (RF-23) ---
  // Quando o usuário cola texto maior que 1500 chars, o sistema divide
  // automaticamente em múltiplas páginas de até 1500 chars cada.
  const handlePasteEditor = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const textoColar = e.clipboardData.getData('text');
    if (!textoColar) return;

    // Texto já existente na página atual (antes do cursor)
    const textarea = e.currentTarget;
    const inicio = textarea.selectionStart;
    const fim = textarea.selectionEnd;
    const textoAtual = editPaginas[editPaginaAtual - 1]?.texto || '';
    const textoResultante = textoAtual.substring(0, inicio) + textoColar + textoAtual.substring(fim);

    // Se cabe em 1500 chars, comportamento normal
    if (textoResultante.length <= 1500) return; // deixa o comportamento padrão

    // Precisa paginar
    e.preventDefault();
    let chunks: string[];
    try { chunks = dividirTextoEmPaginas(textoResultante); }
    catch (erro) { alert(erro instanceof Error ? erro.message : 'Não foi possível dividir o texto.'); return; }

    const novas = [...editPaginas];
    // Substitui a página atual pelo primeiro chunk
    novas[editPaginaAtual - 1] = { ...novas[editPaginaAtual - 1], texto: chunks[0] };
    // Insere as páginas extras logo após a página atual
    const paginasExtras = chunks.slice(1).map((texto, i) => ({
      numero: editPaginaAtual + i + 1,
      texto,
    }));
    novas.splice(editPaginaAtual, 0, ...paginasExtras);
    // Re-numera todas as páginas
    novas.forEach((pg, idx) => { pg.numero = idx + 1; });
    setEditPaginas(novas);
    setEditStatusSalvo('alterado');
    // Avança para a última página inserida
    if (chunks.length > 1) {
      setEditPaginaAtual(editPaginaAtual + chunks.length - 1);
    }
  };

  const comEntradaLogin = (conteudo: React.ReactNode) => <>
    {entradaLogin && <EntradaLivro aguardando={authEnviando || (usuario?.status === 'aprovado' && inicioCarregando)} onPreparar={prepararTelaAposEntrada} onConcluir={concluirEntradaLogin} />}
    <div inert={entradaLogin}>{conteudo}</div>
  </>;

  // --- SE TELA DE CARREGAMENTO INICIAL ---
  if (carregandoAuth) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--accent-amber)', display: 'flex', gap: 10, alignItems: 'center' }}>
          <Sparkles className="spin" /> Carregando Tomo...
        </div>
      </div>
    );
  }

  // --- TELA DE LOGIN / CADASTRO COM ANIMAÇÃO GSAP (US-01, US-03, RNF-05) ---
  if (!usuario) {
    return comEntradaLogin(
      <TelaAutenticacao
        modoAuth={modoAuth}
        setModoAuth={setModoAuth}
        authEmail={authEmail}
        setAuthEmail={setAuthEmail}
        authSenha={authSenha}
        setAuthSenha={setAuthSenha}
        authUsername={authUsername}
        setAuthUsername={setAuthUsername}
        authErro={authErro}
        authAviso={authAviso}
        authEnviando={authEnviando}
        setAuthErro={setAuthErro}
        setAuthAviso={setAuthAviso}
        onSubmit={handleAuthSubmit}
      />
    );
  }

  // --- SE CONTA PENDENTE OU BLOQUEADA (RF-02, RF-03, Seção 5) ---
  if (usuario.status !== 'aprovado') {
    return comEntradaLogin(
      <div className="app-container" style={{ padding: 20 }}>
        <header className="top-header">
          <div className="brand-badge">
            <h1><MarcaTomo /></h1>
          </div>
          <button className="btn-secondary" onClick={handleLogout} style={{ padding: '6px 12px' }}>
            <LogOut size={16} /> Sair
          </button>
        </header>

        <div className="banner-waiting">
          <AlertCircle size={48} color={usuario.status === 'pendente' ? 'var(--accent-amber)' : 'var(--accent-crimson)'} style={{ marginBottom: 16 }} />
          <h3>
            {usuario.status === 'pendente' ? 'Aguarde a liberação do administrador' : 'Conta suspensa'}
          </h3>
          <p>
            {usuario.status === 'pendente'
              ? `Olá @${usuario.nome_usuario}! Sua conta foi criada e está em análise pelo administrador. Você só poderá acessar os livros e recursos após a aprovação.`
              : `Sua conta @${usuario.nome_usuario} está bloqueada temporariamente. Entre em contato com o administrador.`}
          </p>
        </div>
      </div>
    );
  }

  // --- MODO EDITOR DE LIVRO (US-04, US-05, US-06, US-07, RF-23) ---
  if (visaoAtiva === 'editor') {
    const paginaAtualObj = editPaginas[editPaginaAtual - 1] || { numero: editPaginaAtual, texto: '' };
    const caracRestantes = 1500 - paginaAtualObj.texto.length;

    return (
      <div className="app-container book-editor-shell">
        <header className="top-header editor-topbar">
          <button className="btn-secondary" onClick={() => setVisaoAtiva('principal')} style={{ padding: '6px 12px' }}>
            <ChevronLeft size={16} /> Voltar
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BotaoTema />
            <span style={{ fontSize: '0.8rem', color: editStatusSalvo === 'salvo' ? 'var(--accent-success)' : 'var(--accent-amber)' }}>
              {editStatusSalvo === 'salvando' ? 'Salvando...' : editStatusSalvo === 'salvo' ? 'Salvo' : 'Alterações pendentes'}
            </span>
            <button className="btn-danger" onClick={handleMoverParaLixeiraEditor} style={{ padding: '6px 12px' }} title="Mover para a lixeira">
              <Trash2 size={16} /> Excluir
            </button>
            <button className="btn-primary" disabled={editStatusSalvo === 'salvando'} onClick={salvarEditorManual} style={{ padding: '6px 14px' }}>
              Salvar
            </button>
          </div>
        </header>

        <main className="main-view">
          <header className="editor-heading"><h1>Seu livro</h1><div className="editor-page-toolbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    className="btn-secondary"
                    aria-label="Página anterior" disabled={editPaginaAtual <= 1}
                    onClick={() => setEditPaginaAtual((p) => Math.max(1, p - 1))}
                    style={{ padding: '4px 8px' }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
                    Página {editPaginaAtual} de {editPaginas.length}
                  </span>
                  <button
                    className="btn-secondary"
                    aria-label="Próxima página" disabled={editPaginaAtual >= editPaginas.length}
                    onClick={() => setEditPaginaAtual((p) => Math.min(editPaginas.length, p + 1))}
                    style={{ padding: '4px 8px' }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      const novas = [...editPaginas];
                      novas.splice(editPaginaAtual, 0, { numero: editPaginas.length + 1, texto: '' });
                      // Re-numera
                      novas.forEach((pg, idx) => { pg.numero = idx + 1; });
                      setEditPaginas(novas);
                      setEditPaginaAtual(editPaginaAtual + 1);
                      setEditStatusSalvo('alterado');
                    }}
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  >
                    <Plus size={14} /> Nova Página
                  </button>

                  {editPaginas.length > 1 && (
                    <button
                      className="btn-danger"
                      onClick={() => {
                        const novas = editPaginas.filter((_, idx) => idx !== editPaginaAtual - 1);
                        novas.forEach((pg, idx) => { pg.numero = idx + 1; });
                        setEditPaginas(novas);
                        setEditPaginaAtual(Math.max(1, editPaginaAtual - 1));
                        setEditStatusSalvo('alterado');
                      }}
                      style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div></header>
          <CriarComIA key={editLivroId} inserir={(texto) => {
            const paginas = prepararInsercaoIA(editPaginas, texto);
            setEditPaginas(paginas);
            setEditPaginaAtual(editPaginas.length === 1 && !editPaginas[0].texto ? 1 : editPaginas.length + 1);
            setEditStatusSalvo('alterado');
          }} />
          <div className="book-editor-layout">
            {/* Metadados do Livro */}
            <div className="editor-metadata">
              <div className="editor-cover-preview"><div className="editor-cover-fallback"><BookOpen size={24} /><span>{editTitulo || 'Sem título'}</span></div>{editCapaUrl && <img key={editCapaUrl} src={editCapaUrl} alt="Prévia da capa" onError={(event) => { event.currentTarget.hidden = true; }} />}</div>
              <div className="form-group">
                <label className="form-label" htmlFor="editor-title">Título do Livro</label>
                <input id="editor-title"
                  type="text"
                  className="form-input"
                  style={{ fontSize: '1.2rem', fontWeight: 600 }}
                  value={editTitulo}
                  onChange={(e) => { setEditTitulo(e.target.value); setEditStatusSalvo('alterado'); }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="editor-description">Descrição (opcional)</label>
                <textarea id="editor-description"
                  rows={3}
                  className="form-input"
                  placeholder="Uma breve introdução sobre a obra..."
                  value={editDescricao}
                  onChange={(e) => { setEditDescricao(e.target.value); setEditStatusSalvo('alterado'); }}
                />
              </div>

              <div className="editor-field-pair">
                <div className="form-group">
                  <label className="form-label" htmlFor="editor-status">Situação</label>
                  {livroJaLancado ? <p id="editor-status" className="editor-static-status">Lançado</p> : <select id="editor-status"
                    className="form-select"
                    value={editSituacao}
                    onChange={(e) => { setEditSituacao(e.target.value as any); setEditStatusSalvo('alterado'); }}
                  >
                    {!livroJaLancado && <option value="rascunho">Rascunho</option>}
                    <option value="lancado">Lançado</option>
                  </select>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="editor-visibility">Visibilidade</label>
                  <select id="editor-visibility"
                    className="form-select"
                    value={editVisibilidade}
                    onChange={(e) => { setEditVisibilidade(e.target.value as any); setEditStatusSalvo('alterado'); }}
                  >
                    <option value="privado">Só eu</option>
                    <option value="amigos">Amigos</option>
                    <option value="publico">Público</option>
                  </select>
                </div>
              </div>

              <details className="editor-appearance"><summary>Capa e papel</summary><div className="editor-field-pair">
                <div className="form-group">
                  <label className="form-label" htmlFor="editor-cover">Link da capa</label>
                  <input id="editor-cover"
                    type="url"
                    className="form-input"
                    placeholder="https://exemplo.com/capa.jpg"
                    value={editCapaUrl}
                    onChange={(e) => { setEditCapaUrl(e.target.value); setEditStatusSalvo('alterado'); }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="editor-paper">Papel de fundo</label>
                  <input id="editor-paper"
                    type="text"
                    className="form-input"
                    placeholder="Cor hex (#f4ecd8) ou link de imagem"
                    value={editFundoUrl}
                    onChange={(e) => { setEditFundoUrl(e.target.value); setEditStatusSalvo('alterado'); }}
                  />
                </div>
              </div>
              </details>
              {livroJaLancado && <div className="return-draft-card">
                <h2>Voltar para rascunho</h2>
                <p>O livro deixa de ser publicado e fica visível só para você. Seu texto será mantido.</p>
                <button className="btn-secondary" disabled={voltandoRascunho || editStatusSalvo === 'salvando'} onClick={() => void voltarParaRascunho()}>{voltandoRascunho ? 'Salvando…' : 'Voltar para rascunho'}</button>
              </div>}
              {erroRascunho && <p role="alert" className="editor-draft-error">{erroRascunho}</p>}
            </div>

            {/* Editor de Páginas */}
            <section className="editor-writing" aria-label="Páginas do livro">
              <textarea
                className="form-textarea"
                rows={14}
                style={{
                  width: '100%',
                  fontFamily: 'var(--font-editorial)',
                  fontSize: '1.2rem',
                  lineHeight: 1.8,
                  padding: 20,
                  resize: 'vertical',
                }}
                aria-label="Texto da página" placeholder="Escreva sua história…"
                value={paginaAtualObj.texto}
                onPaste={handlePasteEditor}
                onChange={(e) => {
                  // Limitar digitação manual a 1500 chars
                  if (e.target.value.length > 1500) return;
                  const novas = [...editPaginas];
                  novas[editPaginaAtual - 1] = {
                    ...novas[editPaginaAtual - 1],
                    texto: e.target.value,
                  };
                  setEditPaginas(novas);
                  setEditStatusSalvo('alterado');
                }}
              />

              <div className={`char-counter ${caracRestantes < 100 ? (caracRestantes <= 0 ? 'limit' : 'warning') : ''}`}>
                {paginaAtualObj.texto.length} / 1.500 caracteres (restam {caracRestantes})
                {editPaginas.length > 1 && (
                  <span className="editor-page-count">
                    {editPaginas.length} páginas no total
                  </span>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    );
  }

  // --- MODO DE LEITURA VIRANDO PÁGINAS (US-08, US-09) ---
  if (visaoAtiva === 'leitor' && livroLeitura) {
    const paginaAtualObj = paginasLeitura[paginaLeituraAtual - 1] || { numero: paginaLeituraAtual, texto: '' };
    const fundoEstilo: React.CSSProperties = {
      backgroundColor: '#ffffff',
      color: '#1a1a1a',
      colorScheme: 'light',
    };

    return (
      <div className="app-container reader-view">
        <header className="top-header">
          <button className="btn-secondary" onClick={() => setVisaoAtiva('principal')} style={{ padding: '6px 12px' }}>
            <ChevronLeft size={16} /> Fechar Leitor
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-editorial)', fontWeight: 600, fontSize: '1.1rem' }}>
              {livroLeitura.titulo}
            </div>
          </div>
          <div className="reader-header-actions"><BotaoTema />{botaoSalvarLivro(livroLeitura, true)}</div>
        </header>

        <div className="reader-container" style={{ margin: '20px auto', maxWidth: 680, width: '100%' }}>
          <div className="reader-book-page" style={fundoEstilo}>
            <div className="reader-text">
              {paginaAtualObj.texto}
            </div>

            <div style={{ textAlign: 'center', marginTop: 32, fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#74685d' }}>
              — {paginaLeituraAtual} —
            </div>
          </div>

          <div className="reader-toolbar">
            <button
              className="btn-secondary"
              disabled={paginaLeituraAtual <= 1}
              onClick={() => virarPaginaLeitura(-1)}
            >
              <ChevronLeft size={18} /> Anterior
            </button>

            <span className="reader-page-indicator">
              Página {paginaLeituraAtual} de {paginasLeitura.length}
            </span>

            <button
              className="btn-secondary"
              disabled={paginaLeituraAtual >= paginasLeitura.length}
              onClick={() => virarPaginaLeitura(1)}
            >
              Próxima <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- TELA PRINCIPAL COM AS 5 ABAS (RF-04) ---
  return comEntradaLogin(
    <div className="app-container">
      {/* Top Header */}
      <header className="top-header">
        <button className="brand-badge brand-reload" aria-label="Recarregar Tomo" title="Recarregar Tomo" onClick={() => window.location.reload()}>
          <MarcaTomo />
        </button>

        <div className="header-navigation-group"><nav className="desktop-navigation" aria-label="Atalhos principais">
          <button aria-current={abaAtual === 'dashboard' && visaoAtiva === 'principal' ? 'page' : undefined} onClick={() => { setAbaAtual('dashboard'); setVisaoAtiva('principal'); window.scrollTo({ top: 0, behavior: 'instant' }); }}>Início</button>
          <button aria-current={abaAtual === 'feed' && visaoAtiva === 'principal' ? 'page' : undefined} onClick={() => { setAbaAtual('feed'); setVisaoAtiva('principal'); window.scrollTo({ top: 0, behavior: 'instant' }); }}>Explorar</button>
          <button onClick={() => { setAbaAtual('dashboard'); setVisaoAtiva('principal'); setIrEstante(true); }}>Minha estante</button>
        </nav><BotaoConectarIA abrir={() => setConectandoIA(true)} /></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BotaoTema />
          {usuario.papel === 'admin' && abaAtual === 'perfil' && visaoAtiva === 'principal' && (
            <button
              className="btn-secondary"
              aria-label="Painel Admin"
              title="Painel Admin"
              onClick={async () => {
                const pendentes = await listarContasPendentes();
                const sessoes = await listarAtividadeUsuarios();
                setContasPendentes(pendentes);
                setSessoesAtividade(sessoes);
                setMostrarModalAdmin(true);
              }}
              style={{
                padding: '6px 12px',
                borderColor: contasPendentes.length > 0 ? 'var(--accent-crimson)' : 'var(--accent-amber)',
                color: contasPendentes.length > 0 ? '#fca5a5' : 'var(--accent-amber)',
                background: contasPendentes.length > 0 ? 'rgba(239,68,68,0.12)' : undefined,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                animation: contasPendentes.length > 0 ? 'pulseAdmin 2s infinite' : undefined,
              }}
            >
              <Shield size={22} />
              {contasPendentes.length > 0 && (
                <span style={{ background: 'var(--accent-crimson)', color: '#fff', fontSize: '0.72rem', fontWeight: 700, padding: '1px 6px', borderRadius: '10px' }}>
                  {contasPendentes.length}
                </span>
              )}
            </button>
          )}

          {abaAtual === 'perfil' && visaoAtiva === 'principal' && <div className="profile-menu" ref={menuPerfilRef}>
            <button className="btn-secondary" aria-label="Menu do perfil" aria-expanded={menuPerfilAberto} aria-controls="profile-menu-options" onClick={() => setMenuPerfilAberto((aberto) => !aberto)}><Menu size={22} /></button>
            {menuPerfilAberto && <div id="profile-menu-options" className="profile-menu-options">
              <button className="btn-secondary" onClick={() => { setMenuPerfilAberto(false); setConfirmarSaida(true); }}><LogOut size={16} /> Sair</button>
            </div>}
          </div>}

          {abaAtual === 'dashboard' && visaoAtiva === 'principal' && <button className="btn-secondary notification-button" aria-label={`Notificações, ${notificacoes.filter((n) => !n.lida).length} não lidas`} onClick={abrirNotificacoes}>
            <Heart size={22} />
            {notificacoes.some((n) => !n.lida) && <span className="notification-dot" />}
          </button>}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-view" ref={conteudoRolagem}>
        {visaoAtiva === 'notificacoes' && <section>
          <button className="btn-secondary back-button" onClick={() => setVisaoAtiva('principal')}><ChevronLeft size={16} /> Voltar</button>
          <h1 className="section-title">Notificações</h1>
            {/* Notificações (quem seguiu, virou mútuo ou nova conta pendente) */}
            {notificacoes.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div className="section-header">
                  
                  <span className="section-tag">{notificacoes.length} notificações</span>
                </div>
                {notificacoes.map((n) => (
                  <div key={n.id} className={`notif-item ${n.lida ? 'notification-read' : 'notification-unread'}`}>
                    <div className="notif-text">
                      {n.tipo === 'nova_conta_pendente' ? (
                        <span>🔔 <strong>@{n.origem_perfil?.nome_usuario || 'Um visitante'}</strong> criou uma conta e aguarda liberação.</span>
                      ) : n.tipo === 'seguir_mutuo' ? (
                        <span>✨ <strong>@{n.origem_perfil?.nome_usuario || 'Alguém'}</strong> e você agora são amigos mútuos!</span>
                      ) : (
                        <span>👤 <strong>@{n.origem_perfil?.nome_usuario || 'Alguém'}</strong> começou a seguir você.</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {n.tipo === 'nova_conta_pendente' && usuario?.papel === 'admin' && contasPendentes.some((p) => p.id === n.origem_id) && (
                        <button
                          className="btn-primary"
                          onClick={async () => {
                            await atualizarStatusConta(n.origem_id, 'aprovado');
                            await marcarNotificacaoComoLida(n.id);
                            setNotificacoes((lista) => lista.map((item) => item.id === n.id ? { ...item, lida: true } : item));
                            setContasPendentes(contasPendentes.filter((item) => item.id !== n.origem_id));
                            alert('Conta aprovada com sucesso!');
                          }}
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        >
                          <Check size={14} /> Aprovar
                        </button>
                      )}

                    </div>
                  </div>
                ))}
              </div>
            )}

          {notificacoes.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Você ainda não tem notificações.</p>}
        </section>}
        {visaoAtiva === 'perfil_visitado' && perfilVisitado && <section className="profile-layout">
          <button className="btn-secondary back-button" aria-label="Voltar" title="Voltar" onClick={() => setVisaoAtiva('principal')}><ChevronLeft size={18} /></button>
          <ResumoPerfil perfil={perfilVisitado} />
          {perfilVisitado.id !== usuario.id && <div className="profile-actions"><button className="btn-secondary" disabled={acaoSocial} onClick={() => seguindoPerfilVisitado ? setConfirmarDeixar(perfilVisitado) : alternarSeguindo(perfilVisitado)}>{seguindoPerfilVisitado ? 'Seguindo' : 'Seguir'}</button></div>}
          <div className="section-header"><h2 className="section-title">Obras lançadas</h2></div>
          <div className="cards-grid">{livrosPerfilVisitado.map((livro) => <button className="book-card" key={livro.id} onClick={() => void abrirDetalhes(livro.id)}><div className="book-cover">{livro.capa_url ? <img src={livro.capa_url} alt="" /> : <BookOpen />}</div><div className="book-info"><div className="book-title">{livro.titulo}</div></div></button>)}</div>
        </section>}
        {/* 1. ABA DASHBOARD (US-09, US-16, US-17) */}
        {visaoAtiva === 'principal' && abaAtual === 'dashboard' && (
          <Inicio carregando={inicioCarregando} erro={erroInicio} tentarNovamente={() => {
            consultasAbas.current.limpar(); setInicioCarregando(true); setErroInicio(''); setTentativaInicio((valor) => valor + 1);
          }} salvos={salvosParaLer} leituras={continuarLendo} abrindoLivro={abrindoLivro} abrirLivro={abrirLeitura} detalhesLivro={abrirDetalhes} explorar={() => setAbaAtual('feed')} />
        )}

        {/* 2. ABA FEED (US-13, US-14) */}
        {visaoAtiva === 'principal' && abaAtual === 'feed' && (
          <Biblioteca livros={feedLivros} abrirLivro={abrirDetalhes} salvarLivro={botaoSalvarLivro} />
        )}

        {/* 3. ABA CRIAR / EDITAR (US-04, US-05, US-06, US-20) */}
        {visaoAtiva === 'principal' && abaAtual === 'criar_editar' && (
          <MeusLivros rascunhos={meusRascunhos} publicados={meusLivrosLancados} novoLivro={abrirNovoLivro} editarLivro={abrirEditorLivro} />
        )}

        {/* 4. ABA PESQUISA (US-15, US-17) */}
        {visaoAtiva === 'principal' && abaAtual === 'pesquisa' && (
          <Pesquisa termo={termoBusca} buscar={pesquisar} confirmarBusca={async () => {
            const termo = termoBusca.trim();
            if (!termo) return;
            try {
              await adicionarBuscaRecente(termo, 'livro');
              setBuscasRecentes(await listarBuscasRecentes());
            } catch { setErroPesquisa('Não foi possível salvar a busca no histórico. Tente novamente.'); }
          }} carregando={pesquisando} erro={erroPesquisa}
            livros={resultadoLivros} perfis={resultadoPerfis} recentes={buscasRecentes}
            limparHistorico={async () => { await limparBuscasRecentes(); setBuscasRecentes([]); }}
            abrirLivro={abrirDetalhes} abrirPerfil={abrirPerfilVisitado} salvarLivro={botaoSalvarLivro}
            seguirPerfil={(perfil) => seguindoBusca[perfil.id] ? setConfirmarDeixar(perfil) : void alternarSeguindo(perfil)}
            seguindo={seguindoBusca} acaoSocial={acaoSocial} usuarioId={usuario.id} />
        )}

        {/* 5. ABA PERFIL (US-10, US-18, US-19) */}
        {visaoAtiva === 'principal' && abaAtual === 'perfil' && (
          <PerfilProprio perfil={usuario} publicados={meusLivrosLancados} abrirLivro={abrirDetalhes}
            editar={() => { setPerfilNome(usuario.nome_usuario); setPerfilBio(usuario.bio || ''); setPerfilFoto(usuario.foto_url || ''); setPerfilErro(''); setConfirmarRemocaoFoto(false); setEditandoPerfil(true); }} />
        )}
      </main>

      {conectandoIA && <JanelaConectarIA key={usuario.id} fechar={() => {
        setConectandoIA(false);
        const url = new URL(window.location.href);
        url.searchParams.delete('mcp_authorize');
        window.history.replaceState(null, '', url);
      }} />}
      {(confirmarDeixar || confirmarSaida || editandoPerfil) && <div className="admin-modal-backdrop">
        <div ref={dialogRef} className={`admin-modal-content confirmation-dialog${editandoPerfil ? ' profile-edit-dialog' : ''}`} role="dialog" aria-modal="true" aria-labelledby="dialog-title">
          {editandoPerfil ? <form className="profile-edit-form" onSubmit={salvarPerfil}>
            <button type="button" className="profile-edit-close" aria-label="Fechar edição do perfil" disabled={salvandoPerfil} onClick={() => setEditandoPerfil(false)}><X size={22} /></button>
            <h2 id="dialog-title">Editar perfil</h2>
            <div className="profile-photo-edit">
              <button type="button" className="profile-photo-button" aria-label="Alterar foto de perfil" disabled={salvandoPerfil} onClick={() => fotoPerfilInput.current?.click()}>
                <span className="profile-photo-preview">{perfilFoto ? <img src={perfilFoto} alt="Prévia da foto" /> : perfilNome.charAt(0).toUpperCase()}</span>
                <span className="profile-camera"><Camera size={17} /></span>
              </button>
              <div className="profile-photo-actions"><button type="button" disabled={salvandoPerfil} onClick={() => fotoPerfilInput.current?.click()}>Alterar foto</button>{perfilFoto && <button type="button" disabled={salvandoPerfil} onClick={() => setConfirmarRemocaoFoto(true)}>Remover foto</button>}</div>
            </div>
            {confirmarRemocaoFoto && <div className="photo-remove-confirmation" role="group" aria-label="Confirmar remoção da foto">
              <p>Remover sua foto de perfil?</p><span>Você pode escolher outra foto depois.</span>
              <div><button type="button" className="btn-secondary" onClick={() => setConfirmarRemocaoFoto(false)}>Manter foto</button><button type="button" className="btn-danger" onClick={() => { setPerfilFoto(''); setConfirmarRemocaoFoto(false); }}>Sim, remover foto</button></div>
            </div>}
            <input ref={fotoPerfilInput} hidden id="profile-photo" aria-label="Selecionar foto de perfil" type="file" accept="image/png,image/jpeg,image/webp" disabled={salvandoPerfil} onChange={(e) => {
              const arquivo = e.target.files?.[0];
              e.target.value = '';
              setConfirmarRemocaoFoto(false);
              if (!arquivo) return;
              if (!['image/png', 'image/jpeg', 'image/webp'].includes(arquivo.type)) { setPerfilErro('Escolha uma imagem PNG, JPG ou WebP.'); return; }
              if (arquivo.size > 2 * 1024 * 1024) { setPerfilErro('Escolha uma foto de até 2 MB.'); return; }
              const leitor = new FileReader();
              leitor.onload = () => { setPerfilFoto(String(leitor.result)); setPerfilErro(''); };
              leitor.onerror = () => setPerfilErro('Não foi possível ler a foto.');
              leitor.readAsDataURL(arquivo);
            }} />
            <label className="form-label" htmlFor="profile-name">Nome de usuário</label>
            <input autoFocus id="profile-name" className="form-input" required value={perfilNome} disabled={salvandoPerfil} onChange={(e) => setPerfilNome(e.target.value)} />
            <label className="form-label" htmlFor="profile-bio">Bio</label>
            <textarea id="profile-bio" className="form-textarea" value={perfilBio} disabled={salvandoPerfil} onChange={(e) => setPerfilBio(e.target.value)} />
            {perfilErro && <p role="alert">{perfilErro}</p>}
            <div className="dialog-actions"><button type="button" className="btn-secondary" disabled={salvandoPerfil} onClick={() => setEditandoPerfil(false)}>Cancelar</button><button className="btn-primary" disabled={salvandoPerfil || confirmarRemocaoFoto}>{salvandoPerfil ? 'Salvando…' : 'Salvar'}</button></div>
          </form> : <>
            <h2 id="dialog-title">{confirmarDeixar ? `Deixar de seguir @${confirmarDeixar.nome_usuario}?` : 'Você realmente deseja sair?'}</h2>
            <div className="dialog-actions">
              <button autoFocus className="btn-secondary" disabled={acaoSocial} onClick={() => { setConfirmarDeixar(null); setConfirmarSaida(false); }}>Cancelar</button>
              <button className="btn-danger" disabled={acaoSocial} onClick={async () => { if (confirmarDeixar) await alternarSeguindo(confirmarDeixar, true); else { await handleLogout(); setConfirmarSaida(false); } }}>{confirmarDeixar ? 'Deixar de seguir' : 'Sair'}</button>
            </div>
          </>}
        </div>
      </div>}

      {/* MODAL DE ADMINISTRAÇÃO (Acesso exclusivo do admin - RF-19, US-02, US-18, US-19) */}
      {mostrarModalAdmin && (
        <div className="admin-modal-backdrop" onClick={() => setMostrarModalAdmin(false)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: 'var(--font-editorial)', fontSize: '1.4rem' }}>Painel do Administrador</h3>
              <button className="btn-secondary" onClick={() => setMostrarModalAdmin(false)} style={{ padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {/* Contas Pendentes */}
            <div style={{ marginBottom: 28 }}>
              <h4 style={{ color: 'var(--accent-amber)', marginBottom: 12 }}>Contas Pendentes ({contasPendentes.length})</h4>
              {contasPendentes.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhuma conta aguardando aprovação.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {contasPendentes.map((p) => (
                    <div key={p.id} className="notif-item">
                      <div>
                        <strong>@{p.nome_usuario}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>Cadastrado em {new Date(p.criado_em).toLocaleDateString()}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="btn-primary"
                          onClick={async () => {
                            await atualizarStatusConta(p.id, 'aprovado');
                            setContasPendentes(contasPendentes.filter((item) => item.id !== p.id));
                          }}
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        >
                          <Check size={14} /> Aprovar
                        </button>
                        <button
                          className="btn-danger"
                          onClick={async () => {
                            await atualizarStatusConta(p.id, 'bloqueado');
                            setContasPendentes(contasPendentes.filter((item) => item.id !== p.id));
                          }}
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        >
                          <X size={14} /> Bloquear
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Registro de Atividade & Tempo Online (US-18) */}
            <div>
              <h4 style={{ color: 'var(--text-main)', marginBottom: 12 }}>Atividade Recente dos Usuários</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
                {sessoesAtividade.map((s) => (
                  <div key={s.id} className="notif-item" style={{ fontSize: '0.82rem' }}>
                    <div>
                      <strong>@{s.perfil?.nome_usuario || 'usuario'}</strong>
                      <div style={{ color: 'var(--text-muted)' }}>
                        Último sinal: {new Date(s.ultimo_sinal).toLocaleTimeString()} ({new Date(s.ultimo_sinal).toLocaleDateString()})
                      </div>
                    </div>
                    <span className="badge-tag badge-public" style={{ position: 'static' }}>Ativo</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {livroDetalhes && <DetalhesLivro livro={livroDetalhes}
        continuar={continuarLendo.some((item) => item.livro_id === livroDetalhes.id)}
        salvo={salvosParaLer.some((item) => item.id === livroDetalhes.id)} salvando={salvandoParaLer !== null}
        lendo={abrindoLivro} erro={erroDetalhes} fechar={() => { pedidoDetalhes.current++; setLivroDetalhes(null); }}
        ler={() => { if (abrindoLivro) return; pedidoDetalhes.current++; void abrirLeitura(livroDetalhes.id); }}
        salvar={() => void salvarParaDepois(livroDetalhes)}
        autor={(perfil) => { pedidoDetalhes.current++; setLivroDetalhes(null); void abrirPerfilVisitado(perfil); }} />}

      {/* Barra de Navegação Inferior com 5 Ícones (Seção 4: Dashboard, Feed, Criar/Editar, Pesquisa, Perfil) */}
      <nav className="bottom-nav" aria-label="Navegação principal">
        <div className="nav-inner">
          <svg className="nav-wave" viewBox="0 0 500 64" preserveAspectRatio="none" aria-hidden="true">
            <g style={{ transform: `translateX(${['dashboard', 'feed', 'criar_editar', 'pesquisa', 'perfil'].indexOf(abaAtual) * 100}px)` }}>
              <path d="M -500 60 H 4 C 28 60 23 10 50 10 C 77 10 72 60 96 60 H 1000" />
            </g>
          </svg>
          <button
            className={`nav-button ${abaAtual === 'dashboard' ? 'active' : ''}`}
            aria-current={abaAtual === 'dashboard' ? 'page' : undefined}
            aria-label="Início" title="Início" onClick={() => { setAbaAtual('dashboard'); setVisaoAtiva('principal'); }}
          >
            <House />
            
          </button>

          <button
            className={`nav-button ${abaAtual === 'feed' ? 'active' : ''}`}
            aria-current={abaAtual === 'feed' ? 'page' : undefined}
            aria-label="Bibliotecas" title="Bibliotecas" onClick={() => { setAbaAtual('feed'); setVisaoAtiva('principal'); }}
          >
            <LibraryBig />
            
          </button>

          <button
            className={`nav-button ${abaAtual === 'criar_editar' ? 'active' : ''}`}
            aria-current={abaAtual === 'criar_editar' ? 'page' : undefined}
            aria-label="Criar / Editar" title="Criar / Editar" onClick={() => { setAbaAtual('criar_editar'); setVisaoAtiva('principal'); }}
          >
            <Pencil />
            
          </button>

          <button
            className={`nav-button ${abaAtual === 'pesquisa' ? 'active' : ''}`}
            aria-current={abaAtual === 'pesquisa' ? 'page' : undefined}
            aria-label="Pesquisa" title="Pesquisa" onClick={() => { setAbaAtual('pesquisa'); setVisaoAtiva('principal'); }}
          >
            <Search />
            
          </button>

          <button
            className={`nav-button ${abaAtual === 'perfil' ? 'active' : ''}`}
            aria-current={abaAtual === 'perfil' ? 'page' : undefined}
            aria-label="Perfil" title="Perfil" onClick={() => { setAbaAtual('perfil'); setVisaoAtiva('principal'); }}
          >
            <span className="nav-avatar" aria-hidden="true">
              {usuario.foto_url && <img src={usuario.foto_url} alt="" onError={(event) => { event.currentTarget.hidden = true; }} />}
              <User size={18} />
            </span>
            
          </button>
        </div>
      </nav>
    </div>
  );
}

export default App;
