// Backend FALSO do Supabase só para testes: expõe os endpoints que as Edge Functions usam
// (/rest/v1/rpc/*, /rest/v1/perfis, /rest/v1/codigos_oauth_mcp, /auth/v1/user) e executa tudo
// no PostgreSQL REAL de teste, com o papel certo (anon, authenticated ou service_role).
// Chaves de teste: 'ANON', 'SERVICE'. Usuário logado: 'jwt-user-N' (N = último bloco do UUID).
import http from 'node:http';
import pg from 'pg';

const uid = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
function identidade(req) {
  const t = (req.headers.authorization || '').replace(/^Bearer /i, '');
  if (t === 'SERVICE') return { role: 'service_role' };
  const m = /^jwt-user-(\d+)$/.exec(t);
  if (m) return { role: 'authenticated', sub: uid(m[1]) };
  return { role: 'anon' };
}
export function iniciarBackend({ database, porta }) {
  const pool = new pg.Pool({ database, max: 4, user: process.env.PGUSER, host: process.env.PGHOST });
  async function comoPapel(id, fn) {
    const c = await pool.connect();
    try {
      await c.query('begin'); await c.query(`set local role ${id.role}`);
      if (id.sub) await c.query(`select set_config('request.jwt.claim.sub', $1, true)`, [id.sub]);
      const r = await fn(c); await c.query('commit'); return r;
    } catch (e) { await c.query('rollback').catch(() => {}); throw e; } finally { c.release(); }
  }
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x'); let corpo = '';
    for await (const parte of req) corpo += parte;
    const responder = (status, dado) => { if (process.env.DEBUG_BACKEND) console.error('[backend]', req.method, req.url, '->', status, JSON.stringify(dado)?.slice(0, 200)); res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(dado === undefined ? '' : JSON.stringify(dado)); };
    try {
      let m;
      if ((m = /^\/rest\/v1\/rpc\/([a-z_]+)$/.exec(url.pathname)) && req.method === 'POST') {
        const fn = m[1], args = corpo ? JSON.parse(corpo) : {}, chaves = Object.keys(args);
        const meta = await pool.query(`select proretset from pg_proc where proname = $1 and pronamespace = 'public'::regnamespace limit 1`, [fn]);
        if (!meta.rowCount) return responder(404, { code: 'PGRST202', message: `função ${fn} não existe` });
        const lista = chaves.map((k, i) => `${k} => $${i + 1}`).join(', ');
        const valores = chaves.map(k => (args[k] !== null && typeof args[k] === 'object') ? JSON.stringify(args[k]) : args[k]);
        const r = await comoPapel(identidade(req), c => c.query(meta.rows[0].proretset ? `select * from public.${fn}(${lista})` : `select public.${fn}(${lista}) as r`, valores));
        return responder(200, meta.rows[0].proretset ? r.rows : (r.rows[0]?.r ?? null));
      }
      if (url.pathname === '/rest/v1/perfis' && req.method === 'GET') {
        const id = (url.searchParams.get('id') || '').replace(/^eq\./, '');
        const r = await comoPapel(identidade(req), c => c.query('select status from public.perfis where id = $1', [id]));
        return r.rowCount ? responder(200, r.rows[0]) : responder(406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' });
      }
      if (url.pathname === '/rest/v1/codigos_oauth_mcp' && req.method === 'POST') {
        const b = JSON.parse(corpo);
        await comoPapel(identidade(req), c => c.query('insert into public.codigos_oauth_mcp(hash, usuario_id, expira_em) values ($1, $2, $3)', [b.hash, b.usuario_id, b.expira_em]));
        res.writeHead(201); return res.end();
      }
      if (url.pathname === '/auth/v1/user') {
        const id = identidade(req);
        return id.sub ? responder(200, { id: id.sub, aud: 'authenticated', role: 'authenticated', email: 'teste@tomo.local' }) : responder(401, { msg: 'invalid JWT' });
      }
      responder(404, { message: 'rota não simulada: ' + url.pathname });
    } catch (e) { responder(e.code === '42501' ? 403 : 400, { code: e.code, message: e.message }); }
  });
  return new Promise(ok => server.listen(porta, '127.0.0.1', () => ok({ fechar: () => { server.close(); return pool.end(); } })));
}
