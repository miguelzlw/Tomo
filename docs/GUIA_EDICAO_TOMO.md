# Onde mexer no Tomo
- `src/modelos/macaco3d.ts`: corpo, proporções, orelhas, mãos, rabo e cores dos materiais do macaco 3D.
- `src/modelos/cenaMacacoLivro.ts`: tamanho e posição do macaco, livro, câmera, iluminação e sombras da entrada.
- `src/animacaoMacaco.ts`: intervalos de 4 segundos para leitura e 16 segundos para as palmas e a cambalhota.
- `src/MacacoLivro3D.tsx`: carrega a cena no desktop e mantém a ilustração anterior como alternativa se o 3D falhar.
- `src/TelaAutenticacao.tsx`: campos, botões e mensagens do formulário; `src/App.tsx`: envio do cadastro e login.
- `.env`: URL da API e chave pública do Supabase; use os nomes `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` neste projeto Vite.
- Copie os valores dentro do projeto Supabase, em Connect ou Settings → API Keys; use publishable/anon, nunca senha ou service_role.
- Depois de salvar o `.env`, recarregue o site; se necessário, reinicie o servidor de desenvolvimento que já está rodando.
- `npm run build` compila o projeto e aponta erros de TypeScript; não altera contas no Supabase.
