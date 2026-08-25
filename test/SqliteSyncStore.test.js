const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const SqliteSyncStore = require("../src/infrastructure/sqlite/SqliteSyncStore");

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
