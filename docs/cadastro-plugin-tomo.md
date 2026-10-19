# Cadastro do Tomo nos diretórios de IA

O servidor está publicado. Foi confirmado no gerenciador do usuário que o plugin
`plugin_asdk_app_6ad4f52d0cc881918c93f0c3bbc5b67e` existe, na versão 1.0.0,
com escopo USER e visibilidade PRIVATE. Está vinculado ao App
`asdk_app_6ad4f52d0cc881918c93f0c3bbc5b67e`. Essa é uma conexão de desenvolvimento
pessoal, não uma ficha publicada no diretório. Não recriar nem substituir esse
plugin para tentar corrigir o link. A visibilidade privada não explica sozinha
um erro de acesso do próprio dono; verificar a conta usada e a mensagem exibida.

Uma ficha pública nos diretórios do ChatGPT e Claude ainda não foi cadastrada
nem aprovada. Uma ficha criada só na conta de um usuário não se torna
automaticamente pública para os amigos.

## Dados para cadastrar a conexão

### Publicação pública — informações confirmadas pelo responsável

- Responsável informado: **Miguel** (identidade ainda precisa ser verificada no portal).
- Cobrança: **gratuito**.
- País de disponibilidade: **Brasil**.
- Contato público de suporte autorizado: **joaotse@gmail.com**.
- Página pública de suporte: **https://tomobooks.vercel.app/suporte/**.
- Privacidade: **https://tomobooks.vercel.app/privacidade/**.
- Termos: **https://tomobooks.vercel.app/termos/**.
- As três páginas foram publicadas e verificadas sem login, com HTTP 200 e contato correto.
- Metadados iniciais e oito casos de revisão: `docs/plugin-publico/` (ainda não executados; pacote incompleto).
- Publicação: preparação pendente; não submetida nem aprovada.

### Conexão

- Nome: **Tomo**
- Site: **https://tomobooks.vercel.app**
- Endereço MCP: **https://tomobooks.vercel.app/api/mcp**
- Autenticação: **OAuth**, com registro automático de cliente (DCR).
- Permissão: **rascunhos:criar**.
- Descrição: **Crie histórias com IA e salve como rascunhos privados no Tomo. Revise e publique pelo site ou pelo com a IA mesmo.**
- Ferramenta: **criar_rascunho/lançar_livro_publico**, com título e texto da história.
- Exemplos: **Crie um conto de aventura e salve nos meus rascunhos do Tomo.**
  **Salve esta história no Tomo com o título A biblioteca escondida.**

## Publicar uma ficha como a do print

No ChatGPT, o diretório público exige cadastro de desenvolvedor, verificação da
identidade, preparação dos materiais solicitados e aprovação pela OpenAI.
O dono da conta deve completar a verificação. Não basta hospedar o endpoint.
O portal também pode pedir verificação do domínio, políticas, conta de teste
dedicada e demonstração. Esses materiais e aprovações ainda estão pendentes.

Referência: https://developers.openai.com/plugins/deploy/submission

No Claude, adicionar por URL à própria conta é diferente de publicar no diretório.
Referência: https://claude.com/docs/connectors/custom/add-unlisted

## Vincular os botões à ficha criada

Depois que houver um link real da ficha, configure na Vercel, no projeto Tomo:

- `VITE_CHATGPT_PLUGIN_URL`: URL da ficha do Tomo no ChatGPT.
- `VITE_CLAUDE_CONNECTOR_URL`: URL da ficha do Tomo no Claude, quando disponível.

Publique uma nova versão. Os botões passam a abrir essas fichas diretamente.
Sem elas, abrem a página de Plugins do ChatGPT ou Conectores do Claude, com
instruções para adicionar por endereço. Nenhum link de ficha é inventado.
