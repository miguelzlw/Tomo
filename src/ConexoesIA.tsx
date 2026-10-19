import { useEffect, useState } from 'react';
import { CircleCheck, Link2, ArrowUpRight, Copy } from 'lucide-react';
import { consultarConexoesIA, criarTokenMCP, revogarTokenMCP } from './dados';
import type { DisponibilidadeIA } from './dados';

export function ConexoesIA() {
  const [status, setStatus] = useState<DisponibilidadeIA | null>(null);
  const [erro, setErro] = useState('');
  const [token, setToken] = useState('');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [escolha, setEscolha] = useState<'claude' | 'openai' | null>(null);
  const endereco = status?.mcpUrl || `${window.location.origin}/api/mcp`;
  const nomeIA = escolha === 'claude' ? 'Claude' : 'ChatGPT';
  const fichaPublicada = escolha === 'claude' ? import.meta.env.VITE_CLAUDE_CONNECTOR_URL : import.meta.env.VITE_CHATGPT_PLUGIN_URL;
  const paginaConexao = fichaPublicada || (escolha === 'claude' ? 'https://claude.ai/customize/connectors' : 'https://chatgpt.com/plugins');
  async function copiarEndereco() {
    try { await navigator.clipboard.writeText(endereco); setAviso('Endereço copiado! Cole no campo de URL do conector.'); }
    catch { setAviso('Não foi possível copiar automaticamente. Selecione e copie o endereço abaixo.'); }
  }
  useEffect(() => { let ativo = true; consultarConexoesIA().then(s => { if (ativo) setStatus(s); }).catch(e => { if (ativo) setErro(e.message); }); return () => { ativo = false; }; }, []);
  async function executar(revogar: boolean) {
    setOcupado(true); setErro(''); setAviso('');
    try {
      if (revogar) { await revogarTokenMCP(); setToken(''); setAviso('Conexão revogada. A IA não poderá mais salvar histórias no Tomo.'); }
      else { setToken(await criarTokenMCP()); setAviso('Acesso criado! Adicione o token no seu aplicativo de IA para começar.'); }
      setStatus(await consultarConexoesIA());
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível atualizar a conexão.'); }
    finally { setOcupado(false); }
  }
  return <section className="ia-panel" aria-labelledby="ia-conexoes-titulo">
    <h2 id="ia-conexoes-titulo">Escreva com sua IA favorita</h2>
    <p>Escolha onde você quer criar suas histórias. Depois de conectar, peça à IA para salvar no Tomo como rascunho.</p>
    {status && <div className="ia-connection-status" role="status">{status.conexao?.ativo ? <><CircleCheck size={20} /><span><strong>Acesso à IA ativado</strong><br />Seu aplicativo conectado pode salvar histórias nos seus rascunhos.{status.conexao.expira_em && <> Válido até {new Date(status.conexao.expira_em).toLocaleDateString('pt-BR')}.</>}</span></> : <><Link2 size={20} /><span>Nenhum aplicativo conectado. Escolha abaixo como começar.</span></>}</div>}
    <div className="ia-provider-choices" aria-label="Escolher aplicativo de IA">
      <button className="ia-provider-choice" aria-pressed={escolha === 'claude'} onClick={() => { setEscolha('claude'); setAviso(''); }}><img className="ia-provider-logo" src="/images/claude-logo.png" width="42" height="42" alt="" /><span><strong>Conectar com Claude</strong><small>Crie histórias no Claude e salve aqui.</small></span><ArrowUpRight size={19} aria-hidden="true" /></button>
      <button className="ia-provider-choice" aria-pressed={escolha === 'openai'} onClick={() => { setEscolha('openai'); setAviso(''); }}><img className="ia-provider-logo" src="/images/chatgpt-logo.png" width="42" height="42" alt="" /><span><strong>Conectar com ChatGPT</strong><small>Leve suas ideias do ChatGPT ao Tomo.</small></span><ArrowUpRight size={19} aria-hidden="true" /></button>
    </div>
    {escolha && <section className="ia-quick-connect" aria-labelledby="ia-passos-titulo">
      <h3 id="ia-passos-titulo">Conectar no {nomeIA}</h3>
      <ol>{fichaPublicada ? <><li>Abra a ficha do Tomo pelo botão abaixo.</li><li>Na ficha, escolha a opção de instalar ou conectar o Tomo à sua conta.</li></> : escolha === 'claude' ? <><li>Abra Conectores no Claude e escolha <strong>Adicionar conector personalizado</strong>.</li><li>Use o nome <strong>Tomo</strong> e cole o endereço abaixo. Se aparecer a opção de cliente OAuth, escolha <strong>Registrar automaticamente</strong>.</li></> : <><li>No ChatGPT, abra <strong>Plugins</strong> (ou Apps) e escolha adicionar um servidor MCP personalizado.</li><li>Use o nome <strong>Tomo</strong>, cole o endereço abaixo e escolha autenticação <strong>OAuth</strong>.</li></>}<li>Conclua a conexão e autorize o acesso na tela do Tomo.</li></ol>
      <label className="form-label">Endereço para conectar<input className="form-input" readOnly value={endereco} onFocus={e => e.target.select()} /></label>
      <div className="ia-actions"><a className="btn-primary" href={paginaConexao} target="_blank" rel="noopener noreferrer" onClick={() => { if (!fichaPublicada) void copiarEndereco(); }}>{fichaPublicada ? `Abrir ficha do Tomo no ${nomeIA}` : escolha === 'claude' ? 'Abrir Conectores do Claude' : 'Abrir Plugins do ChatGPT'}<ArrowUpRight size={17} aria-hidden="true" /></a><button className="btn-secondary" onClick={() => void copiarEndereco()}><Copy size={16} aria-hidden="true" />Copiar endereço</button></div>
      {!fichaPublicada && <p className="ia-note">O Tomo ainda não está listado no catálogo. Adicione uma conexão personalizada usando o endereço acima.</p>}
      <p className="ia-note">A autorização é feita no aplicativo escolhido. A disponibilidade de conectores depende da sua conta. Não cole esse endereço em uma conversa comum.</p>
    </section>}
    <details><summary>Opções avançadas e gerenciamento</summary>
      <p>Este acesso permite somente criar rascunhos privados, sem ler seus livros ou publicar.</p>
      {status && !status.oauthDisponivel && <p role="status">A conexão OAuth ainda precisa do endereço público do Tomo configurado pelo administrador.</p>}
      <details><summary>Configuração manual e gerenciamento do acesso</summary><p>Para clientes com cabeçalhos configuráveis, gere um token e envie-o em Authorization: Bearer. Ele expira em 30 dias e substitui a conexão anterior.</p>
      <div className="ia-actions"><button className="btn-secondary" disabled={!status || ocupado} onClick={() => void executar(false)}>Gerar novo acesso MCP</button><button className="btn-secondary" disabled={!status || ocupado} onClick={() => void executar(true)}>Revogar acesso MCP</button></div>
      {token && <label className="form-label">Token: copie agora e guarde em segurança. Ele não será mostrado novamente.<textarea className="form-input" readOnly value={token} onFocus={e => e.target.select()} /></label>}</details>
    </details>
    <p className="ia-note"><a href="/suporte/" target="_blank" rel="noopener noreferrer">Suporte</a> · <a href="/privacidade/" target="_blank" rel="noopener noreferrer">Privacidade</a> · <a href="/termos/" target="_blank" rel="noopener noreferrer">Termos de uso</a></p>
    {erro && <p role="alert">{erro}</p>}{aviso && <p role="status">{aviso}</p>}
  </section>;
}
