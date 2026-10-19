# Inspeção do código do Tomo

Data: 19/10/2026. Base examinada: `main`, commit `15d6a71`.

O levantamento inicial abaixo foi feito por inspeção estática local, leitura de históricos relevantes e verificações automatizadas, antes de alterar a aplicação. A limpeza posteriormente autorizada está registrada ao final. Não equivale a uma validação de todas as interações no navegador, do banco implantado ou das conexões autenticadas em produção.

## Mapa do funcionamento atual

| Fluxo | Caminho principal | Relações a preservar |
| --- | --- | --- |
| Inicialização e navegação | `index.html` → `src/main.tsx` → `src/App.tsx` | A navegação usa estados da aplicação, incluindo abas, editor, leitor e perfil visitado. Não depende de um roteador separado. |
| Login e cadastro | `TelaAutenticacao.tsx` → ações do `App.tsx` → `dados/index.ts` | Sessão, nome de usuário/e-mail, aprovação e bloqueio; integração com Supabase e alternativa local. |
| Arte do login | `TelaAutenticacao.tsx` → `MascoteLogin.tsx` → `MovimentoMacaco.tsx` | Imagem `macaco-recorte.webp`, folhas e papéis em órbita; estilos em `index.css` e animação GSAP da autenticação. |
| Entrada após login | `App.tsx` → `EntradaLivro.tsx` | Animação aguarda autenticação e carregamento do dashboard; preservar preparação antecipada e conclusão. |
| Início | `App.tsx` → `Inicio.tsx` | Salvos para ler, continuar lendo, detalhes, progresso e atualização das listas. |
| Bibliotecas | `App.tsx` → `Biblioteca.tsx` → `listarFeed` | O nome interno `feed` ainda representa Bibliotecas; isso não indica código abandonado. |
| Autoria | `MeusLivros.tsx` → editor no `App.tsx` → `dados/index.ts` | Rascunhos, publicação, visibilidade, páginas e salvamento. |
| Paginação | colagem no editor e inserção de IA → `paginacao.ts` / `ia.ts` | Limite de 1500 caracteres e preservação de palavras. |
| Leitura | `DetalhesLivro.tsx` e leitor no `App.tsx` | Acesso ao livro, páginas, progresso, navegação e retorno. |
| Social e pesquisa | `Pesquisa.tsx`, `PerfilProprio.tsx`, perfil visitado e notificações no `App.tsx` | Seguir/deixar de seguir, amizade mútua, visibilidade, histórico de pesquisa e confirmações. |
| Administração | modal no `App.tsx` → funções de dados | Aprovação de contas e atividade. Não confundir função sem botão com regra de permissão sem utilidade. |
| Cache e pré-carregamento | `dados/consultasCompartilhadas.ts` usado no `App.tsx` e na camada de dados | Invalidação por usuário e mudança de sessão; evitar vazamento de estado entre contas e consultas duplicadas. |
| Tema e movimento | `tema.tsx`, `useAnimacaoRolagem.ts`, `index.css` | Preferência de tema, animações e tratamento de movimento reduzido. |
| IA pela aplicação | `CriarComIA.tsx` → `dados/ia.ts` → função `historias-ia` | Autenticação, limites, provedores e inserção do texto no editor. |
| IA externa por MCP | `ConectarIA.tsx`, `ConexoesIA.tsx`, `AutorizarMCP.tsx` → funções `mcp-oauth` e `tomo-mcp` | Tokens, consentimento, SQL/RPC, políticas e caminhos em `vercel.json`. Serviços externos são consumidores mesmo sem import no React. |
| Estúdio 3D separado | `macaco-3d.html` → `preview3d/viewer.ts` → `modelos/macaco3d.ts` | Segunda entrada declarada em `vite.config.ts`; usa Three.js e exportação GLB. |

## Sobras e candidatos

### Evidência forte de ausência de uso na aplicação atual

- `src/App.css`: não importado; contém estilos do modelo inicial. A aplicação importa `src/index.css`.
- `src/assets/react.svg`, `src/assets/vite.svg` e `src/assets/hero.png`: nenhuma referência encontrada no código e nas entradas examinadas.
- Imports não utilizados em `src/App.tsx`: `ArrowRight`, `RotateCcw`, `CheckSquare`, `Square`, `restaurarDaLixeira` e `excluirDefinitivamente`. Confirmados pela verificação adicional do TypeScript e pelo lint.
- Cadeia antiga do mascote: `MacacoLivro3D.tsx` não é chamado pelo login atual; ele carrega `modelos/cenaMacacoLivro.ts` e usa `IlustracaoMacacoLivro.tsx` como alternativa. Esses arquivos são candidatos como conjunto, após conferir consumidores externos ao aplicativo. O modelo `modelos/macaco3d.ts` continua necessário ao estúdio.
- `public/images/tomo-login-macaco.png`, `tomo-login-macaco.webp` e `tomo-login-macaco-escuro.webp`: nenhuma referência ativa encontrada nas telas; o login atual usa o recorte. A documentação ainda menciona imagens antigas. Arquivos em `public` também podem ter acessos por URL, que esta busca não prova ausentes.

### Funcionalidade desconectada: decidir antes de apagar

- Lixeira: `abrirLixeiraModal`, `mostrarModalLixeira` e `itensLixeira` não têm interface consumidora encontrada. `handleExcluirRascunhosSelecionados` e o estado de seleção também estão desconectados.
- A ação individual de excluir no editor continua chamando `moverParaLixeira`. A confirmação diz que o livro poderá ser restaurado, mas não foi encontrado um caminho de restauração acessível na interface atual. Isso é uma lacuna de produto, não apenas uma sobra.
- `excluirLivro` é um atalho para `moverParaLixeira` sem consumidor encontrado. `verificarLivroSalvo`, `listarTodosUsuarios` e `liberarComoAdmin` também não apresentaram consumidores nas buscas realizadas. Conferir finalidade histórica antes da remoção.
- `definirUsuarioSessao` e `moderarOcultarLivro` têm consumidores nos testes de permissão. Não são equivalentes a exports sem uso em todo o projeto.
- O modo local em `dados/index.ts` é usado nos testes e permite funcionamento sem Supabase. Removê-lo mudaria a arquitetura e os testes; não é limpeza mecânica.
- `public/favicon.svg` e `public/icons.svg`: sem referência explícita encontrada. O ícone da entrada principal é SVG embutido em `index.html`; conferir uso por URL antes de excluir os arquivos públicos.

### Preservar

- Three.js e o estúdio 3D enquanto `/macaco-3d.html` continuar sendo uma entrega desejada. O estúdio é compilado separadamente; não concluir que Three.js está sem uso porque o login mudou.
- GSAP: usado pela autenticação atual.
- Migrações SQL, schema, funções do Supabase, reescritas da Vercel e páginas de privacidade, termos e suporte. Seus consumidores não dependem exclusivamente de imports locais.
- Regras de permissão, amizade mútua, aprovação, testes e confirmações, ainda que não apareçam na primeira tela.

## Documentação e verificações que precisam de atenção

- `docs/GUIA_EDICAO_TOMO.md` e `src/preview3d/README.md` ainda descrevem o mascote 3D como integrado ao login. Isso diverge da cadeia atual `TelaAutenticacao` → `MascoteLogin`.
- `tsconfig.app.json` desativa `noUnusedLocals` e `noUnusedParameters`. Uma execução adicional com ambos habilitados apontou 11 ocorrências em `App.tsx`, entre imports, estados e handlers sem uso.
- O lint atual falha em `src/useAnimacaoRolagem.test.ts:31`: chamada de hook dentro de função auxiliar chamada `preparar`. Há também avisos de imports/estados sem uso e de efeitos React. Não são todos candidatos automáticos à remoção.
- A descoberta de testes também alcançou cópias em `.tmp/tomo-mcp-codigo`. A pasta está ignorada pelo Git, mas isso não a exclui automaticamente do Vitest. Mesmo filtros por nomes de arquivos alcançaram essas cópias; a execução final excluiu `**/.tmp/**` explicitamente: **56 testes passaram em 13 arquivos**. A contagem anterior de 66 incluía 10 testes duplicados dessas cópias.
- `npm run build` passou, incluindo as duas entradas HTML. Houve aviso de arquivos JavaScript maiores que 500 kB; isso não prova que suas dependências estão sem uso.

## Histórico consultado

- Chat recente de ajustes visuais e animação: último envio relatado no commit `15d6a71`, confirmado no checkout atual.
- Chat de integrações MCP: há discussão pendente sobre conexões simultâneas, revogação individual e compatibilidade OAuth. O histórico não comprova implantação dessas propostas; não tratar os caminhos existentes como descartáveis.
- Registro anterior da instalação do Jules: CLI instalado via `@google/jules`. Nesta inspeção a execução foi confirmada, mas listar repositórios falhou por falta de autenticação. Nenhuma análise do Jules foi iniciada.

## Pedido preparado para o Google Jules

Executar contra o repositório `miguelzlw/Tomo`, na `main`, registrando o commit efetivamente analisado:

> Faça uma inspeção somente de leitura do projeto inteiro. Não altere, exclua, publique ou aplique arquivos, não abra PR e não acesse dados reais de usuários. Entregue o relatório na conversa.
>
> Mapeie as entradas index.html e macaco-3d.html, React, CSS, assets públicos, scripts, testes, funções Supabase, SQL/RPC, OAuth/MCP e reescritas da Vercel. Para cada candidato a remoção, apresente arquivo e linhas, consumidores diretos e indiretos, imports dinâmicos, usos por URL e risco. Classifique como sobra confirmada, funcionalidade desconectada ou decisão de produto. Ausência de import não basta para provar ausência de uso.
>
> Verifique especialmente App.css e assets do Vite; a cadeia antiga MacacoLivro3D/cenaMacacoLivro/IlustracaoMacacoLivro; imagens antigas do login; imports e estados sem uso em App.tsx; lixeira e seleção de rascunhos desconectadas; exports da camada de dados; documentação desatualizada; e descoberta de testes dentro de .tmp. Preserve o estúdio 3D, GSAP usado na autenticação, paginação sem cortar palavras, cache por usuário, confirmações, permissões e integrações externas. Não remova fallback local ou dependências sem explicitar os consumidores afetados.
>
> Relacione cada recomendação aos fluxos que precisariam de validação: login/cadastro/aprovação, dashboard, salvos, Bibliotecas, pesquisa, perfis, seguir e deixar de seguir, edição/publicação/visibilidade, leitura/progresso, lixeira, administração e IA/MCP. Distinga evidência estática, testes executados e validação real ainda pendente.

## Ordem sugerida para uma futura limpeza

1. Comparar este levantamento com a análise independente do Jules após autenticação.
2. Resolver a intenção da lixeira e do estúdio 3D; registrar o que permanece.
3. Remover em pequenos grupos os imports e arquivos comprovadamente desconectados, com revisão dos caminhos públicos.
4. Atualizar documentação e exclusões de descoberta de testes.
5. Validar build, testes e fluxos reais antes de enviar qualquer limpeza ao GitHub. Testes unitários aprovados não garantem sozinhos todas as interações.

## Limpeza autorizada em 19/10/2026

Branch local: `codex/limpeza-codigo-sem-uso`.

- Autenticação no Google Jules concluída. Inspeção independente iniciada em https://jules.google.com/session/3210246802642133809, com instruções de somente leitura e relatório na conversa.
- Removidos `src/App.css`, os três assets do template Vite e a cadeia desconectada `MacacoLivro3D.tsx` → `cenaMacacoLivro.ts` / `IlustracaoMacacoLivro.tsx` → `animacaoMacaco.ts`.
- Removidos de `App.tsx` imports, estados e handlers que não eram consumidos, incluindo os controles desconectados da seleção em lote e do modal da lixeira. A exclusão individual e as funções de restauração na camada de dados foram preservadas.
- Atualizados os guias do login e do estúdio 3D, que continua sendo uma entrada independente da compilação.
- Habilitados `noUnusedLocals` e `noUnusedParameters`; adicionada configuração do Vitest que exclui `.tmp` sem substituir as exclusões padrão. Registrada no teste de rolagem a chamada intencional do hook com React simulado.
- Preservadas as imagens públicas antigas, que podem servir como referências de arte ou por URL; não há registros de acesso que permitam afirmar ausência de consumidores externos. Preservados os exports de dados classificados como decisões pendentes, o fallback local, SQL, serviços externos, páginas públicas e dependências usadas pelo estúdio.

Essa limpeza não adiciona uma interface de restauração de livros: a lacuna identificada na lixeira permanece registrada para uma alteração de funcionalidade separada.

### Cruzamento com o relatório concluído do Jules

O Jules declarou analisar o commit `15d6a71052205b1e431de522cbda003f7ad1e0ac`, na branch de trabalho remota `jules-3210246802642133809-e80528bd`. O relatório final está na sessão vinculada acima. Confirmou a remoção do template Vite, da cadeia antiga do mascote e dos imports, estados e handlers desconectados, preservando o estúdio 3D e a camada de dados da lixeira.

Correções após conferir as evidências do relatório remoto:

- O relatório afirmou que `src/main.tsx:3` importava `App.css`; o arquivo real importa `index.css`. `App.css` foi removido justamente por não fazer parte da cadeia de imports. Alguns intervalos de linhas citados pelo Jules também não correspondem ao tamanho completo dos arquivos; não foram usados como base automática para remoção.
- O Jules não encontrou `.tmp` no clone remoto e concluiu que não havia risco de descoberta de testes temporários. Isso não se aplica ao checkout local: a pasta ignorada existe aqui e continha cópias que acrescentavam 10 testes duplicados. A exclusão explícita foi mantida.
- A ausência de chamadas JSX às imagens antigas não demonstra ausência de acessos externos por URL. As imagens originais foram preservadas como referência, apesar da recomendação de remoção do Jules.
- A declaração geral do Jules de que as funcionalidades estão íntegras foi tratada como avaliação estática, sem substituir validação real de autenticação, banco ou clientes MCP.

Verificação final local: **56 testes em 13 arquivos aprovados**, build aprovado para a aplicação e o estúdio, e lint sem erros. Permanecem quatro avisos anteriores de React (um de Fast Refresh em `tema.tsx` e três de atualizações de estado em efeitos no `App.tsx`), além do aviso de tamanho dos bundles. Nenhuma alteração foi aplicada ao banco ou publicada.
