// Sobe UMA Edge Function do Tomo num servidor local, sem alterar o código dela.
// Uso: deno run -A launcher.ts <caminho/da/funcao/index.ts> <porta>
const [modulo, porta] = Deno.args;
const serveOriginal = Deno.serve.bind(Deno);
let handler: ((req: Request) => Response | Promise<Response>) | undefined;
(Deno as any).serve = (h: typeof handler) => { handler = h; return { finished: Promise.resolve() }; };
await import(new URL(modulo, `file://${Deno.cwd()}/`).href);
serveOriginal({ port: Number(porta), hostname: '127.0.0.1', onListen: () => console.log('pronto') }, handler!);
