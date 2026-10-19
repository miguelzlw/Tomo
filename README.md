# Tomo — Cantinho Privado de Livros e Leitura

> **Versão 1.0** — Site de livros criados por usuários, para um grupo de amigos.  
> **Banco:** Supabase (Postgres) com Row Level Security (RLS) estrito em todas as tabelas.  
> **Desenvolvimento:** Vibe coding com arquitetura em camadas e isolamento de dados (**RNF-08**).

---

## 🏛️ Estrutura e Princípios Centrais

1. **Princípio Central:** Ninguém vê o que não tem permissão, nem por link direto. A segurança é aplicada no banco via **Postgres RLS**, e não apenas escondendo botões na interface.
2. **Isolamento de Dados (RNF-08):** Todo o frontend fala exclusivamente com o banco por meio da camada única em [`src/dados/`](./src/dados/index.ts). Nenhuma tela importa nem acessa o cliente do Supabase diretamente.
3. **Privacidade do Administrador (RNF-07):** O administrador modera livros (ocultar/exibir) e aprova contas, mas nunca lê o conteúdo privado de outros usuários ("só eu", rascunhos ou "amigos").

---

## 🗄️ Banco de Dados (Supabase / Postgres)

O script completo com as 9 tabelas, funções de segurança e políticas RLS está em:  
👉 [`supabase/schema.sql`](./supabase/schema.sql)

### Tabelas Criadas:
- `perfis`: Perfis de usuários (`pendente`, `aprovado`, `bloqueado`, papéis `usuario` e `admin`).
- `livros`: Livros com estados `rascunho` / `lancado` e visibilidades `privado` / `amigos` / `publico`.
- `paginas`: Páginas com texto limitado a 1.500 caracteres por página.
- `seguidores`: Relações sociais e verificação de amizade mútua.
- `progresso_leitura`: Marcador de página atual de leitura.
- `salvos`: Livros marcados em "Salvou para ler".
- `notificacoes`: Notificações de novos seguidores e novas amizades mútuas.
- `buscas_recentes`: Histórico de termos pesquisados pelo usuário.
- `sessoes`: Registro de entrada e último sinal de tempo online ativo (LGPD).

### Como aplicar no Supabase:
1. Acesse o painel do seu projeto no [Supabase](https://supabase.com).
2. Abra a aba **SQL Editor**.
3. Copie o conteúdo de [`supabase/schema.sql`](./supabase/schema.sql) e clique em **Run**.

---

## 🚀 Como Executar o Projeto Localmente

A criação de histórias com OpenAI, Gemini e Claude e o conector MCP estão
documentados em [Integrações de IA](docs/integracoes-ia.md), incluindo configuração
das APIs, autorização e publicação das funções do servidor.

### 1. Configurar Variáveis de Ambiente
Crie ou edite o arquivo `.env`:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica-anon
```
> *Nota: Enquanto o `.env` não estiver preenchido, a camada de acesso a dados executa em modo local persistente, permitindo testar toda a interface e regras imediatamente.*

### 2. Iniciar Servidor de Desenvolvimento
```bash
npm run dev
```

### 3. Rodar os Testes Automatizados (Seção 9)
```bash
npm test
```
Testa automaticamente:
- A **Matriz de Permissão da Seção 5** (Autor, Amigo com seguir mútuo, Seguidor não mútuo, Usuário aprovado qualquer, Pendente, Bloqueado e Admin).
- Bloqueio de URL direta para edição de livros alheios.
- Perda imediata de acesso a livros "amigos" quando o follow mútuo é desfeito.
- Bloqueio de páginas com mais de 1.500 caracteres.
- Moderação de ocultação de livros pelo administrador.
