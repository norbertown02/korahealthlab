# Kora Health Lab BI

Aplicação web para publicar o dashboard do Kora Health Lab na internet, com URL privada, sincronização automática da EVO e banco histórico em Postgres.

## Arquitetura

- `app/`
  Frontend do dashboard e rotas de API.
- `lib/evo-client.ts`
  Cliente oficial da EVO no backend.
- `lib/sync-service.ts`
  Orquestra a sincronização.
- `lib/repository.ts`
  Persiste fatos e snapshots no Postgres.
- `db/schema.sql`
  Estrutura histórica do banco.
- `vercel.json`
  Cron para atualizar automaticamente.

## Como fica online

1. subir este projeto em Vercel
2. apontar um domínio como `bi.korahealthlab.com.br`
3. configurar as variáveis do `.env.example`
4. criar o banco Postgres e rodar `db/schema.sql`
5. chamar `/api/sync` uma primeira vez

## Como o histórico é salvo

- `fact_entries`: uma linha por entrada direta
- `fact_aggregator_checkins`: uma linha por check-in de agregador
- `fact_sales`: uma linha por venda
- `dashboard_snapshots`: snapshot consolidado por sincronização
- `sync_runs`: auditoria de execução

## Fluxo recomendado de produção

1. Vercel para frontend e backend
2. Postgres gerenciado para histórico
3. variáveis de ambiente protegidas
4. cron chamando `/api/sync` a cada 6 horas
5. futuramente: autenticação por e-mail ou senha compartilhada

## Próximas evoluções

- login de duas usuárias
- agenda, ocupação e professores
- filtros por período
- drill-down por cliente e contrato
- exportação CSV/PDF
