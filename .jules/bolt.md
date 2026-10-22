## 2025-10-22 - Filtragem Síncrona em Memória da Matriz de Permissão Local
**Learning:** No modo local (fallback localStorage), funções de listagem de livros iteravam em loops `for...of` chamando `await checarPermissaoLivroLocal()`, o que forçava múltiplos ticks no event loop e releituras repetidas do `localStorage` de `seguidores` para checar amizade mútua a cada livro.
**Action:** Pré-carregar o conjunto de IDs de amigos mútuos em um `Set<string>` O(1) e filtrar a lista síncronamente em memória antes de retornar.
