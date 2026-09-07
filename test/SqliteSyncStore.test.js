const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const SqliteSyncStore = require("../src/infrastructure/sqlite/SqliteSyncStore");

test("adds deletion tracking to an existing sync database", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "accounting-sync-test-"));
  const databasePath = path.join(directory, "sync.sqlite");
  const legacy = new DatabaseSync(databasePath);
  legacy.exec(`
    CREATE TABLE current_entity (
      entity_type TEXT NOT NULL,
      source_key TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      current_hash TEXT NOT NULL,
      acknowledged_hash TEXT,
      last_seen_scan TEXT NOT NULL,
      deleted INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (entity_type, source_key)
    )
  `);
  legacy.close();

  const store = new SqliteSyncStore(databasePath);
  store.close();
  const migrated = new DatabaseSync(databasePath, { readOnly: true });
  const columns = migrated
    .prepare("PRAGMA table_info(current_entity)")
    .all()
    .map((column) => column.name);
  assert.ok(columns.includes("missing_scans"));
  migrated.close();
  fs.rmSync(directory, { recursive: true, force: true });
});

test("creates three sync tables and persists an acknowledged snapshot", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "accounting-sync-test-"));
  const databasePath = path.join(directory, "sync.sqlite");
  const store = new SqliteSyncStore(databasePath);

  store.startRun("scan-1", "bill");
  store.saveSnapshot("scan-1", "bill", [
    {
      sourceKey: '["source","bill",1,10]',
      hash: "hash-1",
      payload: { entryId: 10, compNo: 1 },
    },
  ]);
  store.completeRun("scan-1");

  const events = store.pendingEvents("bill", "UPSERT");
  assert.equal(events.length, 1);
  store.acknowledge(events);
  assert.equal(store.pendingEvents("bill", "UPSERT").length, 0);
  store.close();

  const database = new DatabaseSync(databasePath, { readOnly: true });
  const tables = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
    .map((row) => row.name);
  assert.deepEqual(tables, ["current_entity", "outbox", "sync_run"]);
  database.close();

  fs.rmSync(directory, { recursive: true, force: true });
});

test("supersedes an unacknowledged payload when its normalized value changes", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "accounting-sync-test-"));
  const databasePath = path.join(directory, "sync.sqlite");
  const store = new SqliteSyncStore(databasePath);
  const sourceKey = '["source","voucher",1,10]';

  store.startRun("scan-1", "voucher");
  store.saveSnapshot("scan-1", "voucher", [
    {
      sourceKey,
      hash: "numeric-hash",
      payload: { entryId: 10, compNo: 1, slipNo: 123 },
    },
  ]);
  store.completeRun("scan-1");

  store.startRun("scan-2", "voucher");
  store.saveSnapshot("scan-2", "voucher", [
    {
      sourceKey,
      hash: "text-hash",
      payload: { entryId: 10, compNo: 1, slipNo: "123" },
    },
  ]);
  store.completeRun("scan-2");

  const pending = store.pendingEvents("voucher", "UPSERT");
  assert.equal(pending.length, 1);
  assert.equal(pending[0].hash, "text-hash");
  assert.equal(JSON.parse(pending[0].payloadJson).slipNo, "123");

  store.close();
  fs.rmSync(directory, { recursive: true, force: true });
});

test("queues an exact delete payload only after consecutive missing scans", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "accounting-sync-test-"));
  const databasePath = path.join(directory, "sync.sqlite");
  const store = new SqliteSyncStore(databasePath);
  const missing = {
    sourceKey: '["source","bill",1,10]',
    hash: "hash-10",
    payload: {
      financialYear: "2025-2026",
      entryId: 10,
      compNo: 1,
      billNo: "1R",
    },
  };
  const retained = {
    sourceKey: '["source","bill",1,11]',
    hash: "hash-11",
    payload: { financialYear: "2025-2026", entryId: 11, compNo: 1 },
  };
  const policy = {
    enabled: true,
    confirmationScans: 2,
    maxCount: 5,
    maxPercent: 60,
  };

  store.startRun("scan-1", "bill");
  store.saveSnapshot("scan-1", "bill", [missing, retained], policy);
  store.completeRun("scan-1");
  store.acknowledge(store.pendingEvents("bill", "UPSERT"));

  store.startRun("scan-2", "bill");
  store.saveSnapshot("scan-2", "bill", [retained], policy);
  store.completeRun("scan-2");
  assert.equal(store.pendingEvents("bill", "DELETE").length, 0);

  store.startRun("scan-3", "bill");
  store.saveSnapshot("scan-3", "bill", [retained], policy);
  store.completeRun("scan-3");
  const deletes = store.pendingEvents("bill", "DELETE");
  assert.equal(deletes.length, 1);
  assert.deepEqual(JSON.parse(deletes[0].payloadJson), missing.payload);

  store.close();
  fs.rmSync(directory, { recursive: true, force: true });
});

test("blocks empty scans and deletion batches above the safety limit", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "accounting-sync-test-"));
  const databasePath = path.join(directory, "sync.sqlite");
  const store = new SqliteSyncStore(databasePath);
  const records = Array.from({ length: 10 }, (_, index) => ({
    sourceKey: `["source","bill",1,${index + 1}]`,
    hash: `hash-${index + 1}`,
    payload: {
      financialYear: "2025-2026",
      entryId: index + 1,
      compNo: 1,
    },
  }));

  store.startRun("scan-1", "bill");
  store.saveSnapshot("scan-1", "bill", records);
  store.completeRun("scan-1");
  store.startRun("empty", "bill");
  assert.throws(
    () => store.saveSnapshot("empty", "bill", [], { enabled: true }),
    /source scan returned no records/,
  );

  const retained = records.slice(2);
  const policy = {
    enabled: true,
    confirmationScans: 2,
    maxCount: 25,
    maxPercent: 10,
  };
  store.startRun("scan-2", "bill");
  store.saveSnapshot("scan-2", "bill", retained, policy);
  store.startRun("scan-3", "bill");
  assert.throws(
    () => store.saveSnapshot("scan-3", "bill", retained, policy),
    /exceed configured limits/,
  );
  assert.equal(store.pendingEvents("bill", "DELETE").length, 0);

  store.close();
  fs.rmSync(directory, { recursive: true, force: true });
});

test("cancels an unsent delete when the source record reappears", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "accounting-sync-test-"));
  const databasePath = path.join(directory, "sync.sqlite");
  const store = new SqliteSyncStore(databasePath);
  const record = {
    sourceKey: '["source","bill",1,10]',
    hash: "same-hash",
    payload: { financialYear: "2025-2026", entryId: 10, compNo: 1 },
  };
  const retained = {
    sourceKey: '["source","bill",1,11]',
    hash: "retained-hash",
    payload: { financialYear: "2025-2026", entryId: 11, compNo: 1 },
  };
  const policy = {
    enabled: true,
    confirmationScans: 1,
    maxCount: 5,
    maxPercent: 60,
  };

  store.startRun("scan-1", "bill");
  store.saveSnapshot("scan-1", "bill", [record, retained]);
  store.completeRun("scan-1");
  store.acknowledge(store.pendingEvents("bill", "UPSERT"));
  store.startRun("scan-2", "bill");
  store.saveSnapshot("scan-2", "bill", [retained], policy);
  assert.equal(store.pendingEvents("bill", "DELETE").length, 1);

  store.startRun("scan-3", "bill");
  store.saveSnapshot("scan-3", "bill", [record, retained], policy);
  assert.equal(store.pendingEvents("bill", "DELETE").length, 0);
  assert.equal(store.pendingEvents("bill", "UPSERT").length, 1);

  store.close();
  fs.rmSync(directory, { recursive: true, force: true });
});
