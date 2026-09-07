# Accounting sync service

The service reads bills and vouchers from MSSQL, normalizes and hashes them,
records durable synchronization state in SQLite, and uploads pending records.

## Layout

- `src/domain`: deterministic entity transformation and hashing
- `src/application`: synchronization use case
- `src/infrastructure/mssql`: read repository and unchanged SQL queries
- `src/infrastructure/sqlite`: durable snapshot, outbox, and scan storage
- `src/infrastructure/http`: remote server adapter
- `src/config`: environment configuration
- `scripts`: operational commands

## Commands

Run `npm.cmd run init-db` to initialize the local SQLite database, then run
`npm.cmd start` to start the service. Set `SYNC_CRON` to enable scheduled runs.

Configure one dataset per MSSQL database with numbered environment values:

```text
MSSQL_DATABASE_1=<2025-2026 database>
MSSQL_FINANCIAL_YEAR_1=2025-2026
MSSQL_DATABASE_2=<2026-2027 database>
MSSQL_FINANCIAL_YEAR_2=2026-2027
MSSQL_COMPANY_DATABASE=MAIN
```

The company-name lookup reads `dbo.COMPANY` from `MSSQL_COMPANY_DATABASE`.
It defaults to `MAIN` when the variable is omitted.

Additional numbered database/year pairs are discovered automatically. If the
individual year values are omitted, consecutive years are inferred from
`MSSQL_FINANCIAL_YEAR_START`, which defaults to `2025`.

Set `SYNC_DATASET_INDEX` for a one-database run, such as `2` to synchronize
only `MSSQL_DATABASE_2`.

Return-adjustment extraction is disabled by default. After the backend
`BillReturnAdjustment` migration and ingestion support are deployed, set
`SYNC_RETURN_ADJUSTMENTS=true` to attach `BILLRETADJDET` rows to their original
bills. The enriched bill payloads are tracked by the existing SQLite snapshot
and outbox tables; no additional SQLite table is required.

Deletion detection is disabled by default. Deploy backend DELETE support before
enabling it with `SYNC_DETECT_DELETIONS=true`. A source record must be absent in
two consecutive successful scans before its exact financial year, company
number, and entry ID are deleted remotely. Empty scans are rejected. Each run
is limited to 25 deletions and 10 percent of the active dataset by default.
These safeguards can be configured with `SYNC_DELETE_CONFIRM_SCANS`,
`SYNC_DELETE_MAX_COUNT`, `SYNC_DELETE_MAX_PERCENT`, and
`SYNC_ALLOW_EMPTY_DELETE_SCAN`.
