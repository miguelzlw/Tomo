#!/usr/bin/env bash
# Roda os testes SQL num banco PostgreSQL TEMPORÁRIO (nunca no banco real).
# Uso: ./rodar-testes-sql.sh   (precisa de psql e de um servidor PostgreSQL local acessível)
set -euo pipefail
cd "$(dirname "$0")"
PSQL=${PSQL:-"psql -X -q -v ON_ERROR_STOP=1"}
DB=tomo_teste_$$
export PGDATABASE=postgres
createdb "$DB"; trap 'dropdb --if-exists "$DB"' EXIT
export PGDATABASE=$DB
$PSQL -f 00_esquema_minimo.sql
$PSQL -f ../migrations/202610180001_integracoes_ia.sql
$PSQL -f ../migrations/202610180002_status_conexao_mcp.sql
$PSQL -f 01_dados_legados.sql            # dados no formato ANTIGO, antes da migration nova
$PSQL -f ../migrations/202610190001_multiplas_conexoes_mcp.sql
$PSQL -f ../migrations/202610190001_multiplas_conexoes_mcp.sql   # 2ª execução: tem de ser idempotente
$PSQL -f 02_multiplas_conexoes.test.sql
$PSQL -f 03_rollback.test.sql
echo "TODOS OS TESTES SQL PASSARAM"
