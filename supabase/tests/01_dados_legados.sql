-- Dados no formato ANTIGO (um token por usuário), antes da migration nova.
insert into public.perfis(id, status) values
  ('00000000-0000-0000-0000-000000000001', 'aprovado'),
  ('00000000-0000-0000-0000-000000000002', 'aprovado'),
  ('00000000-0000-0000-0000-000000000003', 'pendente'),
  ('00000000-0000-0000-0000-000000000005', 'aprovado');
-- token legado do usuário 1 = 'tomo_' || 64 vezes '1'; do usuário 2 = 64 vezes '2'
insert into public.tokens_mcp(usuario_id, hash, usos, dia) values
  ('00000000-0000-0000-0000-000000000001', encode(sha256(convert_to('tomo_' || repeat('1', 64), 'UTF8')), 'hex'), 3, current_date),
  ('00000000-0000-0000-0000-000000000002', encode(sha256(convert_to('tomo_' || repeat('2', 64), 'UTF8')), 'hex'), 0, current_date - 3);
