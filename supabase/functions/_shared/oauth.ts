const encoder = new TextEncoder();
export const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
export const decode64 = (str: string) => Uint8Array.from(atob(str.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - str.length % 4) % 4)), c => c.charCodeAt(0));
export async function hash(value: string) { return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))); }
async function key(secret: string) { return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']); }
export async function assinar(payload: Record<string, unknown>, secret: string) {
  const texto = base64url(encoder.encode(JSON.stringify(payload)));
  return texto + '.' + base64url(new Uint8Array(await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(texto))));
}
export async function verificar(valor: string, secret: string, tipo: string): Promise<any> {
  const partes = valor.split('.');
  if (partes.length !== 2 || !await crypto.subtle.verify('HMAC', await key(secret), decode64(partes[1]), encoder.encode(partes[0]))) throw new Error('Autorização inválida.');
  const payload = JSON.parse(new TextDecoder().decode(decode64(partes[0])));
  if (payload.tipo !== tipo || typeof payload.exp !== 'number' || payload.exp < Date.now() / 1000) throw new Error('Autorização expirada ou inválida.');
  return payload;
}
export function redirectValido(valor: unknown): valor is string {
  if (typeof valor !== 'string' || valor.length > 2048) return false;
  try {
    const url = new URL(valor);
    return !url.username && !url.password && !url.hash && (url.protocol === 'https:' || url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
  } catch { return false; }
}
