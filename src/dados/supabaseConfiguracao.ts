/** Valida a configuração sem incluir a chave nas mensagens exibidas. */
export function validarConfiguracaoSupabase(urlOriginal: string, chaveOriginal: string) {
  const url = urlOriginal.trim(); const chave = chaveOriginal.trim();
  const local = { configurado: false, erro: null as string | null };
  if ((!url && !chave) || (url === 'https://seu-projeto.supabase.co' && chave === 'sua-chave-anon-publica-aqui')) return local;
  const invalido = (erro: string) => ({ configurado: false, erro });
  if (!url) return invalido('Falta a URL da API do projeto Supabase no arquivo .env.');
  let endereco: URL;
  try { endereco = new URL(url); } catch { return invalido('A URL do Supabase no .env não é válida.'); }
  if (endereco.hostname === 'supabase.com' || endereco.pathname.includes('/dashboard')) {
    return invalido('O .env aponta para o painel do Supabase. Use a URL da API do projeto (https://SEU-PROJETO.supabase.co) e a chave pública publishable/anon.');
  }
  if (!['https:', 'http:'].includes(endereco.protocol) || endereco.username || endereco.password || endereco.search || endereco.hash) {
    return invalido('Use a URL da API do projeto Supabase, sem credenciais ou parâmetros no endereço.');
  }
  if (!chave) return invalido('Falta a chave pública publishable/anon do projeto Supabase no .env.');
  if (chave.startsWith('sb_secret_')) return invalido('Use apenas a chave pública publishable/anon no frontend, nunca uma chave secreta.');
  if (chave.startsWith('sb_publishable_') && chave.length > 20) return { configurado: true, erro: null };
  if (/^[\w-]+\.[\w-]+\.[\w-]+$/.test(chave)) {
    try {
      const payload = JSON.parse(atob(chave.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.role === 'anon') return { configurado: true, erro: null };
    } catch { /* A mensagem abaixo cobre chaves truncadas ou inválidas. */ }
  }
  return invalido('A chave do Supabase no .env não parece uma chave pública publishable/anon. Copie a chave pública nas configurações de API do projeto.');
}
