# IA dentro do Tomo — requisitos e auditoria

Data: 05/11/2026. Método: skill engenheiro-requisitos-sênior, modos B/C.
Origem: pedido de Miguel nesta conversa e gravação do Siga Pregão.
Status: análise concluída; login com plano ChatGPT depende de acesso do provedor. Não confundir com MCP.

## Objetivo e atores

Miguel quer que amigos, principalmente no celular, criem histórias dentro do Tomo usando autorização da própria conta de IA, sem cobrança adicional ao usuário ou ao responsável pelo Tomo. O usuário continua responsável pela revisão e publicação de suas histórias.
Atores: leitor/autor com conta Tomo, administrador Miguel, Supabase e provedor de IA.

## Achados e correções

| Achado | Gravidade | Evidência | Requisito corrigido |
|---|---|---|---|
| MCP e geração dentro do site foram tratados como a mesma integração | Alta | `tomo-mcp` recebe título/texto e cria rascunho; `historias-ia` gera texto usando API | RF-01: identificar separadamente geração interna e acesso externo por MCP |
| Um botão de autorização foi proposto antes de confirmar acesso do provedor | Alta | OpenAI exige contato para apps hospedados; não há acesso de parceiro confirmado para Tomo | RF-02: iniciar login apenas com registro próprio e modalidade autorizada |
| API do administrador contraria custo adicional zero solicitado | Alta | `historias-ia` usa chaves e modelos de ambiente | RNF-01: não ativar API paga, contratar serviço ou habilitar fallback pago para cumprir este pedido |
| Falha de listagem aparece como nenhuma conexão | Média | `ConexoesIA` capturava erro e substituía lista por `[]` | RF-06: exibir carregamento, erro com repetição e vazio como estados distintos |
| Revogação podia anunciar sucesso sem exclusão | Média | `revogarConexaoMCP` devolvia false e interface ignorava o retorno | RF-07: sucesso só com confirmação positiva do servidor |

## Escopo e prioridades

Must: custo adicional zero; autorização oficial; separar MCP de geração; não simular conexão; revisão antes de inserir texto; não expor credenciais; erros verificáveis.
Should: retorno HTTPS automático e interface utilizável a partir de 320 px.
Could: catálogo de plugin MCP como projeto separado.
Fora: usar client_id de outro aplicativo, coletar login/sessão Claude, receber links localhost de outro produto, liberar cobrança por API, publicar catálogo sem aprovação ou prometer uso ilimitado.

## Requisitos e aceite

Todos os requisitos abaixo são derivados do pedido, exceto métricas de teste marcadas como propostas técnicas.

| ID / prioridade | Requisito | Aceite verificável | Destino / estado |
|---|---|---|---|
| RF-01 / Must | Distinguir criar dentro do Tomo de usar Tomo no assistente externo | Cada fluxo declara onde a história é gerada e qual conta/cota usa | `CriarComIA`, `ConexoesIA`; separação a aperfeiçoar após liberação |
| RF-02 / Must | Login ChatGPT apenas mediante integração própria autorizada para site hospedado | Cadastro de parceiro confirmado, client_id e redirects do Tomo registrados; nenhuma credencial emprestada | Dependência externa; candidatura em `SOLICITACAO-OPENAI-SIWC.md` |
| RF-03 / Should | Voltar ao Tomo automaticamente após autorização | Em dispositivo real, login e consentimento retornam para callback HTTPS registrado sem copiar URL | A implementar após contrato técnico de parceiro |
| RF-04 / Must | Confirmar conexão apenas depois de validação no servidor | Cancelamento, código expirado, reutilização e state divergente não exibem conectado | A implementar e testar após acesso |
| RF-05 / Must | Revisar história antes de inserção | Texto gerado não publica nem sobrescreve páginas; inserir requer ação explícita | `CriarComIA`, `prepararInsercaoIA`; fluxo de assinatura pendente |
| RF-06 / Must | Distinguir consulta pendente, falha e lista vazia | Rejeição da consulta mostra erro e Tentar novamente; vazio só com consulta bem-sucedida | `ConexoesIA`; correção local |
| RF-07 / Must | Confirmar revogação somente com resposta positiva | RPC false ou erro não produz aviso de sucesso | `dados/ia.ts`, `conexoesIA.test.ts`; correção local |
| RNF-01 / Must | Não gerar cobrança adicional a Miguel ou usuários | Não configurar API paga nem recorrer automaticamente a API quando cota termina; condições do parceiro precisam confirmar ausência de cobrança extra | Bloqueio de ativação; custo do plano preexistente também precisa ser esclarecido |
| RNF-02 / Must | Preservar autenticação e dados privados | Conta Tomo aprovada; tokens fora de logs e front-end; servidor valida state, PKCE e redirect exato; credenciais inacessíveis a outro usuário | Testes negativos obrigatórios antes de ativação |
| RNF-03 / Should | Funcionar em celular | [Proposta técnica] testar 320, 390 e 844 px; teclado e foco acessíveis; nenhuma rolagem horizontal | Testes de tela e aparelho real pendentes para login |
| RNF-04 / Must | Erros externos não acionam cobrança alternativa | Simular 401, 403, 429, timeout e cancelamento: mensagem acionável, sem retentativa infinita nem fallback pago | Pendente para provedor |
| RNF-05 / Must | Enviar somente dados necessários à geração | Tela informa que pedido vai ao provedor; histórico/livros não são enviados sem ação explícita; atualizar privacidade antes da ativação | Revisão final pendente |
| RNF-06 / Should | Delimitar esperas | [Proposta técnica] início de autorização com timeout de 15 s; erro recuperável; não prometer prazo para a página externa | A validar com API de parceiro |

## Sequência e gates

1. Solicitação de Sign in with ChatGPT enviada em 05/11/2026, com opção de uso do plano para requisições de IA. Recebimento confirmado; aprovação pendente.
2. Obter resposta sobre elegibilidade, custos, cotas, usuários e URLs HTTPS permitidas. Nenhum prazo de aprovação presumido.
3. Com acesso confirmado, registrar client_id próprio, redirects de desenvolvimento/produção e requisitos de renovação/revogação; implementar servidor primeiro.
4. Testar autorização, recusa, expiração, isolamento de contas, geração, limites e desconexão; depois testar celular real.
5. Atualizar privacidade e suporte com o comportamento efetivo, publicar e repetir aceite real. Build verde não equivale a integração aprovada.

Nenhum SLA de disponibilidade ou gratuidade do provedor foi confirmado. A definição de “sem custo” não deve ser substituída por crédito promocional temporário.

## Fontes consultadas em 05/11/2026

- OpenAI: https://developers.openai.com/siwc/request-client-id — acesso para parceiros selecionados e formulário de interesse.
- OpenAI: https://developers.openai.com/siwc/token-sharing-open-source — apps remotamente hospedados devem entrar em contato; fluxo OSS não é autorização para implantar um serviço hospedado.
- Formulário: https://openai.com/form/sign-in-with-chatgpt-interest/ — distingue identidade de uso do plano para IA.
- Anthropic: https://code.claude.com/docs/en/legal-and-compliance#authentication-and-credential-use — proíbe oferecer login Claude.ai próprio e intermediar tokens de assinatura; autenticação de aplicações segue canais suportados.

## Controle de mudança

Qualquer mudança que introduza custo, novo provedor, leitura de livros ou publicação automática exige nova decisão explícita de Miguel. Registrar evidência, requisito afetado e teste antes de ativar. Aprovação de interesse não substitui teste técnico ou revisão das condições recebidas.
