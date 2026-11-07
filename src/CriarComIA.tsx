import { useCallback, useEffect, useRef, useState } from 'react';
import { consultarConexoesIA, gerarTrechoHistoriaIA } from './dados';
import { carregarPreviaIA, salvarPreviaIA } from './rascunhoIA';
import { gerarHistoriaEmPartes } from './ia';

const provedor = 'gemini' as const;
const exemplos = [
  { nome: 'Aventura', pedido: 'Uma aventura de cerca de 500 palavras sobre dois amigos que descobrem uma biblioteca escondida. Use um tom divertido e um final esperançoso.' },
  { nome: 'Mistério', pedido: 'Um mistério de cerca de 500 palavras em uma cidade litorânea, com uma carta sem remetente e um final surpreendente, sem violência explícita.' },
  { nome: 'Infantil', pedido: 'Uma história infantil de cerca de 300 palavras sobre uma raposa que aprende a pedir ajuda. Use linguagem simples e um final acolhedor.' },
];

export function CriarComIA({ inserir, iniciarAberto = false, chaveRascunho, aoGerar, salvando = false }: { inserir: (texto: string) => void; iniciarAberto?: boolean; chaveRascunho?: string; aoGerar?: (gerando: boolean) => void; salvando?: boolean }) {
  const [restaurada] = useState(() => carregarPreviaIA(chaveRascunho));
  const [aberto, setAberto] = useState(iniciarAberto || Boolean(restaurada?.texto));
  const [disponivel, setDisponivel] = useState(false);
  const [pedido, setPedido] = useState(restaurada?.pedido || '');
  const [texto, setTexto] = useState(restaurada?.texto || '');
  const [erro, setErro] = useState('');
  const [erroDisponibilidade, setErroDisponibilidade] = useState('');
  const [aviso, setAviso] = useState(restaurada?.texto ? 'Sua prévia anterior foi recuperada nesta aba.' : '');
  const [carregando, setCarregando] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [parando, setParando] = useState(false);
  const [cacheDisponivel, setCacheDisponivel] = useState(true);
  const ativo = useRef(true);
  const pedidoEmCurso = useRef(false);
  const continuarGerando = useRef(false);
  const consultaAtual = useRef(0);
  const botaoGerar = useRef<HTMLButtonElement>(null);
  const campoPedido = useRef<HTMLTextAreaElement>(null);
  const previa = useRef<HTMLTextAreaElement>(null);
  const novaPrevia = useRef(false);

  const consultar = useCallback(async () => {
    const id = ++consultaAtual.current;
    setCarregando(true); setErroDisponibilidade('');
    try {
      const status = await consultarConexoesIA();
      if (!ativo.current || id !== consultaAtual.current) return;
      setDisponivel(status.provedores.includes('gemini'));
    } catch (e) { if (ativo.current && id === consultaAtual.current) setErroDisponibilidade(e instanceof Error ? e.message : 'Não foi possível consultar a IA.'); }
    finally { if (ativo.current && id === consultaAtual.current) setCarregando(false); }
  }, []);
  useEffect(() => { ativo.current = true; void consultar(); return () => { ativo.current = false; }; }, [consultar]);
  useEffect(() => { if (iniciarAberto) setAberto(true); }, [iniciarAberto]);
  useEffect(() => { setCacheDisponivel(salvarPreviaIA(chaveRascunho, { pedido, texto, provedor })); }, [chaveRascunho, pedido, texto, provedor]);
  useEffect(() => {
    if (!texto || !novaPrevia.current || salvando || gerando) return;
    novaPrevia.current = false;
    previa.current?.focus({ preventScroll: true });
    previa.current?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }, [texto, salvando, gerando]);

  async function gerar(continuacao = false) {
    if (pedidoEmCurso.current || (!continuacao && texto) || !pedido.trim() || carregando || erroDisponibilidade || !disponivel) return;
    pedidoEmCurso.current = true; continuarGerando.current = true; setParando(false); setGerando(true); aoGerar?.(true); setErro(''); setAviso('');
    try {
      await gerarHistoriaEmPartes({
        inicial: continuacao ? texto : '',
        gerarTrecho: anterior => gerarTrechoHistoriaIA(provedor, pedido, anterior),
        ativo: () => ativo.current,
        continuar: () => continuarGerando.current,
        receber: (acumulado, partes) => {
          novaPrevia.current = true; setTexto(acumulado);
          setAviso(`${partes} ${partes === 1 ? 'trecho recebido' : 'trechos recebidos'} nesta geração. O texto está preservado na prévia.`);
        },
      });
    }
    catch (e) { if (ativo.current) setErro(e instanceof Error ? e.message : 'Não foi possível gerar a história.'); }
    finally { pedidoEmCurso.current = false; aoGerar?.(false); if (ativo.current) setGerando(false); }
  }
  function adicionar() {
    if (gerando || !texto.trim()) return;
    try { inserir(texto); setTexto(''); setErro(''); setAviso('História adicionada às páginas do livro. Revise e salve quando terminar.'); }
    catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível adicionar o texto. Sua prévia foi mantida.'); }
  }
  function descartar() { setTexto(''); setErro(''); setAviso('Prévia descartada. Você pode criar outra história.'); campoPedido.current?.focus(); }

  return <details className="ia-panel ia-writing-panel" open={aberto} onToggle={e => setAberto(e.currentTarget.open)}>
    <summary>Criar com IA</summary>
    <p>Conte sua ideia, gere uma prévia e escolha o que entra no livro. Nada é publicado automaticamente.</p>
    {carregando && <p role="status">Consultando a IA disponível…</p>}
    {erroDisponibilidade && <div role="alert"><p>{erroDisponibilidade}</p><button className="btn-secondary" onClick={() => void consultar()}>Tentar consultar novamente</button></div>}
    {!carregando && !erroDisponibilidade && !disponivel && <><p role="status">A geração de histórias ainda não está disponível. Você pode continuar escrevendo e consultar novamente mais tarde.</p><button className="btn-secondary" onClick={() => void consultar()}>Consultar disponibilidade</button></>}
    <label className="form-label" htmlFor="ia-pedido">Que história você quer criar?</label>
    <p id="ia-orientacao" className="ia-note">Diga os personagens, o lugar e o tom da história. Para continuar um texto, inclua o trecho no pedido.</p>
    {!texto && <div className="ia-examples" aria-label="Exemplos de pedidos">{exemplos.map(exemplo => <button type="button" key={exemplo.nome} disabled={gerando} onClick={() => { setPedido(exemplo.pedido); setErro(''); }}>{exemplo.nome}</button>)}</div>}
    <textarea ref={campoPedido} id="ia-pedido" className="form-input" value={pedido} rows={4} disabled={gerando} aria-describedby="ia-orientacao ia-contagem" placeholder="Uma aventura sobre dois amigos que descobrem uma biblioteca escondida…" onChange={e => setPedido(e.target.value)} />
    <p id="ia-contagem" className="ia-note">{pedido.length.toLocaleString('pt-BR')} caracteres</p>
    <button ref={botaoGerar} className="btn-primary" disabled={gerando || carregando || Boolean(erroDisponibilidade) || !disponivel || !pedido.trim() || Boolean(texto)} onClick={() => void gerar()}>{gerando ? 'Criando história…' : 'Gerar história'}</button>
    {gerando && <><p role="status">{parando ? 'Terminando o trecho atual. Os trechos recebidos serão mantidos.' : 'Sua história está sendo escrita em trechos. Cada trecho pode levar até um minuto. Evite sair do editor enquanto aguarda.'}</p><button className="btn-secondary" disabled={parando} onClick={() => { continuarGerando.current = false; setParando(true); }}>Parar após este trecho</button></>}
    {erro && <p role="alert">{erro}</p>}{aviso && <p role="status">{aviso}</p>}
    {texto && <><label className="form-label" htmlFor="ia-previa">Revise a história</label><textarea ref={previa} id="ia-previa" className="form-input ia-preview" rows={10} disabled={gerando} value={texto} onChange={e => setTexto(e.target.value)} /><div className="ia-actions"><button className="btn-primary" disabled={gerando || !texto.trim()} onClick={adicionar}>Adicionar ao livro</button><button className="btn-secondary" disabled={gerando || carregando || Boolean(erroDisponibilidade) || !disponivel || !pedido.trim() || !texto.trim()} onClick={() => void gerar(true)}>Continuar história</button><button className="btn-secondary" disabled={gerando} onClick={descartar}>Descartar prévia</button></div><p>O texto será adicionado em novas páginas, preservando o que você já escreveu. Você pode continuar esta história antes de adicioná-la ao livro.</p>{chaveRascunho && cacheDisponivel && <p className="ia-note">Esta prévia fica guardada nesta aba ao sair e voltar ao editor. Para guardá-la no livro, use Adicionar ao livro e salve.</p>}</>}
    <details className="ia-usage-info"><summary>Limites e dicas para os pedidos</summary><p className="ia-note">Não há um teto fixo de páginas no Tomo. Quando uma resposta atinge o limite técnico, a geração continua em outro trecho. Use Parar após este trecho para pausar e Continuar história para retomar. A IA recebe seu pedido e o contexto da prévia, sem ler automaticamente as páginas do livro. Em histórias extensas, usa a abertura e os acontecimentos mais recentes como contexto.</p><p className="ia-note">Cada trecho usa uma tentativa da cota: são até 20 por pessoa ao dia, compartilhando a cota gratuita da IA do Tomo. Falhas depois da reserva também podem contar. Ao atingir um limite, os trechos recebidos são mantidos e a geração para, sem trocar para uma IA paga.</p></details>
    {!cacheDisponivel && <p role="alert">Seu navegador não permitiu guardar a prévia nesta aba. Adicione ao livro ou copie o texto antes de sair.</p>}
  </details>;
}
