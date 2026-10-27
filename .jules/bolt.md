## 2025-02-24 - Prevenção de re-renderizações desnecessárias em componentes puros de lista

**Learning:** Em componentes React de lista como `Biblioteca` e `MeusLivros`, re-renderizações desnecessárias disparadas por atualizações periódicas de estado no componente pai `App` (ex: timer a cada 60s do sinal de sessão) aumentam o consumo de recursos na thread principal.

**Action:** Usar `React.memo` em componentes puros de exibição para prevenir re-renders de listas inteiras quando as props principais (listas de livros) não forem alteradas.
