/** Domínio público do Tomo; TOMO_APP_URL permite substituir em outro ambiente. */
export function obterUrlTomo(): string {
  return Deno.env.get('TOMO_APP_URL') || 'https://tomobooks.vercel.app';
}
