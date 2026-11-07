# Aceite da geração Gemini — 06/11/2026

## Escopo autorizado

Testar a experiência de iniciantes, pedidos, revisão, inserção, limites e falhas; corrigir problemas demonstrados. Publicação em produção autorizada por Miguel. Não habilitar faturamento nem adicionar provedor pago como alternativa automática.

## Correções desta rodada

- Mensagens reais de erro HTTP da função chegam ao usuário, incluindo sessão, aprovação e cota.
- Disponibilidade Gemini independe da consulta de conexões MCP. Falha de banco na reserva não é apresentada como cota esgotada.
- Respostas incompletas ou bloqueadas não são inseridas silenciosamente.
- Atalho principal inicia um livro com o painel IA aberto; exemplos e instruções explicam a revisão antes da inserção.
- Prévia editada não pode ser substituída por outra geração. Recuperação na mesma aba é separada por usuário/livro e removida no logout.
- Controles de saída ficam bloqueados durante a geração; foco acompanha o resultado e o descarte.
- Voltar salva alterações pendentes. Autosave verifica o sucesso das páginas e preserva alterações posteriores à revisão capturada.
- `salvarPaginas` faz upsert antes de limpar páginas excedentes; rejeita numeração inválida antes da escrita. Não representa transação atômica entre as duas requisições.
- Consulta de disponibilidade encerra em 15 segundos e geração em 70 segundos se a rede não responder; sem repetição automática.
- Falha de banco ao consultar o perfil retorna indisponibilidade temporária, sem informar incorretamente que a conta está pendente.

## Evidências locais

- Última suíte completa: **21 arquivos, 91 testes aprovados**. Depois da correção adicional de consulta do perfil, os **9 testes do backend e 2 de timeout** passaram novamente. Inclui erros HTTP, limites, extração, armazenamento, isolamento de prévias e falhas na gravação de páginas.
- `npm run build`: aprovado. Permanece aviso de tamanho de bundle, sem falha de compilação.
- Verificação TypeScript isolada da Edge Function: aprovada.
- Revisão independente, somente leitura: três rodadas; os caminhos de perda identificados foram corrigidos.
- Navegador com componentes reais e adaptador fictício: exemplo de pedido, geração em andamento, edição, recuperação da prévia, isolamento entre livros, inserção preservando texto anterior, falha de disponibilidade com nova tentativa e erro de cota.
- Aplicativo completo com armazenamento local fictício: atalho abre painel; gerar → editar → adicionar → voltar imediatamente → reabrir conserva o texto revisado. Descartar devolve foco ao pedido. Durante geração lenta, Voltar/Salvar/Excluir ficam desabilitados.
- Tela estreita: componente em 320 px sem rolagem horizontal; janela do aplicativo completo também conferida em 320 px, com botão inicial visível. Escape fecha a janela e devolve foco ao botão de origem. Simulação de viewport não equivale a teste em aparelho físico.
- Falha de inserção mantém a prévia; pedido só com espaços não habilita geração. Uma tentativa adicional de simular falha de salvamento no aplicativo completo ficou inconclusiva porque o alerta nativo bloqueou o navegador de teste; a aba fictícia foi encerrada. Não contar esse cenário como aprovado no navegador.

As simulações não consomem Google nem escrevem no banco de produção. Não se provocou esgotamento real da cota compartilhada para testar mensagens.

## Publicação e verificação real

- Backend `historias-ia`: versão 9 ativa; inclui a atualização final da mensagem de consulta do perfil.
- Frontend inicial desta rodada: implantação `dpl_FWqYypvpD9sEMprVPzHNmqexHhsg`, Ready, domínio `https://tomobooks.vercel.app`.
- Verificações públicas reais: OPTIONS 200 com CORS, GET 405, POST sem sessão 401. Nenhuma chamada ao Google nesses testes.
- O teste real de geração da implementação anterior foi bem-sucedido. A sessão expirou ao iniciar o aceite autenticado desta rodada; Miguel escolheu continuar apenas os testes locais por enquanto. A geração autenticada e o salvamento real da versão nova permanecem pendentes.

| Critério | Resultado | Evidência |
| --- | --- | --- |
| Gerar, revisar, adicionar e reabrir | Passou localmente | Aplicativo real com adaptador fictício |
| Preservar prévia e texto anterior | Passou localmente | Navegador e testes de armazenamento |
| Falhas HTTP, cota e timeout | Passou em testes | Vitest com SDK real e rede simulada |
| Compilação e função | Passou | Build e TypeScript isolado |
| Publicação e recusa sem sessão | Passou | Vercel Ready e HTTP reais |
| Geração/salvamento autenticados da nova versão | Pendente | Sessão expirada; testes locais escolhidos por Miguel |

Rodada encerrada no limite de horário solicitado, sem novos pedidos reais ao Google nesta rodada e sem habilitar faturamento.

## Limites do aceite

Não é possível garantir resposta perfeita para qualquer pedido nem disponibilidade ilimitada da cota gratuita. A chave continua somente no servidor. O trabalho não altera faturamento, políticas de aprovação, validação da sessão ou configuração MCP de produção.
