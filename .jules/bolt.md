# Bolt's Journal - Critical Learnings

## 2025-05-15 - React.memo for Top-level View Components
**Learning:** Top-level view components in `App.tsx` (like `Biblioteca`) re-render on every background timer tick (e.g. 60s session heartbeat `registrarSinalSessao`) even when props like `livros` remain unchanged. Wrapping pure presentation components with `React.memo` prevents unnecessary Virtual DOM diffs for large list components.
**Action:** Memoize large feed/grid list components when they only depend on stable props or callbacks.
