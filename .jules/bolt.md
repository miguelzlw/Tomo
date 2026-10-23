## 2026-10-23 - String Slicing Bottleneck in Pagination
**Learning:** Re-slicing a string repeatedly in a loop (`restante = restante.slice(corte)`) causes $O(N^2)$ memory allocations and copying when processing large texts. Tracking an index `offset` into the string avoids unnecessary allocations, reducing complexity to $O(N)$.
**Action:** When chunking or parsing strings, always use character index pointers instead of re-slicing the original buffer on every iteration.
