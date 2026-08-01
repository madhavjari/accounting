const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sync_run (
  scan_id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS current_entity (
  entity_type TEXT NOT NULL,
  source_key TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  current_hash TEXT NOT NULL,
  acknowledged_hash TEXT,
  last_seen_scan TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (entity_type, source_key),
  FOREIGN KEY (last_seen_scan) REFERENCES sync_run(scan_id)
);

CREATE TABLE IF NOT EXISTS outbox (
  event_id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  source_key TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('UPSERT', 'DELETE')),
  hash TEXT NOT NULL,
  payload_json TEXT,
  created_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  acknowledged_at TEXT,
  UNIQUE (entity_type, source_key, operation, hash)
);

CREATE INDEX IF NOT EXISTS idx_outbox_pending
  ON outbox(entity_type, operation, acknowledged_at, event_id);

CREATE INDEX IF NOT EXISTS idx_current_entity_scan
  ON current_entity(entity_type, last_seen_scan, deleted);
`;

module.exports = SCHEMA;
