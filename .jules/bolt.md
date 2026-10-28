## 2025-05-18 - Batching MutationObserver Callbacks with requestAnimationFrame
**Learning:** Frequent DOM updates trigger multiple synchronous MutationObserver callbacks, causing redundant querySelectorAll and layout calculations (O(N) layout thrashing).
**Action:** Use requestAnimationFrame to batch DOM query updates to a single frame.
