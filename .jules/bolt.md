# Diário de Performance do Bolt ⚡

## 2026-10-19 - Debounce na busca integrada de livros e autores
**Learning:** No Tomo, `buscarLivrosEPerfis` dispara consultas simultâneas com `ilike` em duas tabelas (`livros` e `perfis`) e cascateia checagens sociais adicionais (`verificarSeguindo`) no hook `useEffect` a cada atualização do resultado. Sem debounce no `onChange`, cada caractere digitado ou apagado gerava rajadas de requisições paralelas à rede/banco.
**Action:** Aplicar debounce de 250ms na emissão da consulta preservando a atualização imediata do `termoBusca` para evitar atraso percebido na interface do usuário (input responsivo sem lag).
