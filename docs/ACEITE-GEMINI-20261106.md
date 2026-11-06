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

## Evidências locais

- Vitest: **20 arquivos, 89 testes aprovados**. Inclui erros HTTP, limites, extração, armazenamento, isolamento de prévias e falhas na gravação de páginas.
- `npm run build`: aprovado. Permanece aviso de tamanho de bundle, sem falha de compilação.
- Verificação TypeScript isolada da Edge Function: aprovada.
- Revisão independente, somente leitura: três rodadas; os caminhos de perda identificados foram corrigidos.
- Navegador com componentes reais e adaptador fictício: exemplo de pedido, geração em andamento, edição, recuperação da prévia, isolamento entre livros, inserção preservando texto anterior, falha de disponibilidade com nova tentativa e erro de cota.
- Aplicativo completo com armazenamento local fictício: atalho abre painel; gerar → editar → adicionar → voltar imediatamente → reabrir conserva o texto revisado. Descartar devolve foco ao pedido. Durante geração lenta, Voltar/Salvar/Excluir ficam desabilitados.
- Tela estreita: teste anterior do componente em 320 px sem rolagem horizontal; aplicativo completo conferido em 556 px. Simulação de viewport não equivale a teste em aparelho físico.

As simulações não consomem Google nem escrevem no banco de produção. Não se provocou esgotamento real da cota compartilhada para testar mensagens.

## Publicação e verificação real

- Backend `historias-ia`: versão 8 ativa no Supabase.
- Frontend e resultados reais serão registrados após a conferência da implantação.

## Limites do aceite

Não é possível garantir resposta perfeita para qualquer pedido nem disponibilidade ilimitada da cota gratuita. A chave continua somente no servidor. O trabalho não altera faturamento, políticas de aprovação, validação da sessão ou configuração MCP de produção.
