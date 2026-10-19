import { useEffect, useState } from 'react';
import { consentimentoMCP } from './dados';

export function AutorizarMCP() {
  const [request] = useState(() => new URLSearchParams(window.location.search).get('mcp_authorize'));
  const [detalhes, setDetalhes] = useState<{ nome?: string; destino?: string } | null>(null);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [fechado, setFechado] = useState(false);
  useEffect(() => {
    if (!request) return;
    let ativo = true;
    consentimentoMCP(request, 'detalhes').then(d => { if (ativo) setDetalhes(d); }).catch(e => { if (ativo) setErro(e.message); });
    return () => { ativo = false; };
  }, [request]);
  if (!request || fechado) return null;
  async function responder(aprovar: boolean) {
    setOcupado(true); setErro('');
    try {
      const data = await consentimentoMCP(request!, aprovar ? 'aprovar' : 'negar');
      if (!data.redirect) throw new Error('O aplicativo não retornou um destino válido.');
      window.location.assign(data.redirect);
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível autorizar.'); setOcupado(false); }
  }
  return <section className="ia-panel" aria-labelledby="mcp-consent-title">
    <h2 id="mcp-consent-title">Autorizar conexão com IA</h2>
    {detalhes && <><p><strong>{detalhes.nome}</strong> solicita acesso para criar rascunhos privados na sua conta.</p><p>Retorno para: {detalhes.destino}</p><p>A conexão não poderá ler seus livros, alterar histórias existentes ou publicar. O acesso dura 30 dias e substitui sua conexão MCP anterior. Você pode revogá-lo nesta janela.</p><div className="ia-actions"><button className="btn-primary" disabled={ocupado} onClick={() => void responder(true)}>{ocupado ? 'Conectando…' : 'Autorizar criação de rascunhos'}</button><button className="btn-secondary" disabled={ocupado} onClick={() => void responder(false)}>Recusar</button></div></>}
    {!detalhes && !erro && <p role="status">Verificando solicitação…</p>}
    {erro && <p role="alert">{erro}</p>}
    <button className="btn-secondary" disabled={ocupado} onClick={() => { const url = new URL(window.location.href); url.searchParams.delete('mcp_authorize'); window.history.replaceState(null, '', url); setFechado(true); }}>Fechar solicitação</button>
  </section>;
}
