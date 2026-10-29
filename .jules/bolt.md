# Bolt's Journal - Critical Learnings

## 2025-05-18 - Local Storage Parsing Caching in Fallback DAL
**Learning:** Frequent calls to `carregarLocal` in `src/dados/index.ts` during fallback/mock mode trigger synchronous `localStorage.getItem` and `JSON.parse` operations repeatedly on every read (e.g. lists, auth checks, permissions). In-memory caching with invalidation on `salvarLocal` eliminates redundant JSON parsing and synchronous DOM storage access without altering data consistency.
**Action:** Always maintain an in-memory Map cache for storage reads when dealing with local storage backed state layers, invalidating keys when writes occur.
