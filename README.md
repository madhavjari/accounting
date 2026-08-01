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

Deletion detection is disabled by default. It can be enabled with
`SYNC_DETECT_DELETIONS=true`; delete events are retained in the outbox until a
remote delete protocol is implemented.
