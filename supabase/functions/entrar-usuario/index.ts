const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const responder = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const invalido = () => responder({ erro: 'Credenciais inválidas. Verifique seu login e senha.' }, 401);
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return responder({ erro: 'Método não permitido.' }, 405);
  try {
    const { usuario, senha } = await req.json();
    if (typeof usuario !== 'string' || typeof senha !== 'string' || !usuario.trim() || usuario.length > 200 || !senha || senha.length > 4096) return invalido();
    const url = Deno.env.get('SUPABASE_URL')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const headers = { apikey: service, Authorization: `Bearer ${service}` };
    const params = new URLSearchParams({ select: 'id', nome_usuario: `eq.${usuario.trim().toLowerCase()}`, limit: '1' });
    const perfis = await fetch(`${url}/rest/v1/perfis?${params}`, { headers });
    if (!perfis.ok) return responder({ erro: 'Não foi possível entrar agora. Tente novamente.' }, 503);
    const [perfil] = await perfis.json();
    if (!perfil) return invalido();
    const conta = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(perfil.id)}`, { headers });
    if (!conta.ok) return invalido();
    const { email } = await conta.json();
    if (!email) return invalido();
    // O e-mail permanece no servidor; somente uma senha válida recebe a sessão.
    const login = await fetch(`${url}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: anon, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: senha }) });
    const dados = await login.json();
    if (login.status === 429) return responder({ erro: 'Muitas tentativas. Aguarde um pouco antes de tentar novamente.' }, 429);
    if (!login.ok || !dados.access_token) return invalido();
    return responder({ access_token: dados.access_token, refresh_token: dados.refresh_token });
  } catch {
    return responder({ erro: 'Não foi possível entrar agora. Tente novamente.' }, 503);
  }
});
