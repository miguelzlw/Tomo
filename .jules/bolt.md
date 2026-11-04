# Bolt's Performance Journal

Critical learnings only.

## 2025-05-18 - Debounce na pesquisa e isolamento da camada de dados
**Learning:** O input de busca em `src/Pesquisa.tsx` acionava a função `buscar` do `App.tsx` a cada evento `onChange`. Como as consultas passam pela camada `src/dados/index.ts` e executam `buscarLivrosEPerfis` (que envolve múltiplas queries no Supabase ou varredura de localStorage), digitar uma palavra de 6 letras gerava 6 consultas concorrentes que precisavam ser descartadas via race-condition handling (`pesquisaAtual.current`). A adição de debounce com atraso de 300ms reduziu as chamadas em mais de 70% durante a digitação típica, mantendo a atualização do valor do input instantânea para não causar lag no teclado.
**Action:** Sempre preservar a atualização síncrona do valor de inputs controlados enquanto se adia a execução da chamada de rede/busca via debounce com timer limpo no unmount.
