import { useEffect, useState } from 'react';
import { consultarConexoesIA, gerarHistoriaIA } from './dados';
import type { ProvedorIA } from './dados';

export function CriarComIA({ inserir }: { inserir: (texto: string) => void }) {
  const [provedores, setProvedores] = useState<ProvedorIA[]>([]);
  const [provedor, setProvedor] = useState<ProvedorIA>('openai');
  const [pedido, setPedido] = useState('');
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState('');
  const [gerando, setGerando] = useState(false);
  useEffect(() => { let ativo = true; consultarConexoesIA().then(s => { if (ativo) { const disponiveis = s.provedores.filter(p => p === 'openai' || p === 'claude'); setProvedores(disponiveis); if (disponiveis[0]) setProvedor(disponiveis[0]); } }).catch(e => { if (ativo) setErro(e.message); }); return () => { ativo = false; }; }, []);
  async function gerar() {
    setGerando(true); setErro('');
    try { setTexto(await gerarHistoriaIA(provedor, pedido)); }
    catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao gerar a história.'); }
    finally { setGerando(false); }
  }
  return <details className="ia-panel"><summary>Criar com IA</summary>
    <p>Descreva sua ideia. Somente esse pedido será enviado à IA escolhida. A história aparecerá aqui para revisão.</p>
    <label className="form-label" htmlFor="ia-provider">IA</label>
    <select id="ia-provider" className="form-input" value={provedor} disabled={gerando || !provedores.length} onChange={e => setProvedor(e.target.value as ProvedorIA)}>
      {(['openai', 'claude'] as const).map(p => <option key={p} value={p} disabled={!provedores.includes(p)}>{p === 'openai' ? 'ChatGPT / OpenAI' : 'Claude'}{!provedores.includes(p) ? ' — indisponível' : ''}</option>)}
    </select>
    <label className="form-label" htmlFor="ia-pedido">Que história você quer criar?</label>
    <textarea id="ia-pedido" className="form-input" value={pedido} maxLength={6000} rows={4} disabled={gerando} placeholder="Uma aventura sobre dois amigos que descobrem uma biblioteca escondida…" onChange={e => setPedido(e.target.value)} />
    <button className="btn-secondary" disabled={gerando || !provedores.length || !pedido.trim()} onClick={() => void gerar()}>{gerando ? 'Criando história…' : 'Gerar história'}</button>
    <p className="ia-note">A geração usa créditos da API configurada pelo administrador do Tomo. Veja a disponibilidade em Conectar com IA, no topo do site.</p>
    {texto && <><label className="form-label" htmlFor="ia-previa">Revise a história</label><textarea id="ia-previa" className="form-input ia-preview" rows={10} value={texto} onChange={e => setTexto(e.target.value)} /><div className="ia-actions"><button className="btn-primary" disabled={gerando || !texto.trim()} onClick={() => { try { inserir(texto); setTexto(''); setErro(''); } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível inserir.'); } }}>Adicionar ao livro</button><button className="btn-secondary" disabled={gerando} onClick={() => setTexto('')}>Descartar prévia</button></div><p>O texto será adicionado em novas páginas, preservando o que você já escreveu.</p></>}
    {erro && <p role="alert">{erro}</p>}
  </details>;
}
