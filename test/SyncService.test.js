const test = require("node:test");
const assert = require("node:assert/strict");
const SyncService = require("../src/application/SyncService");

function createFixture({ eventCount = 5, failBatch = null } = {}) {
  const events = Array.from({ length: eventCount }, (_, index) => ({
    eventId: index + 1,
    payloadJson: JSON.stringify({ entryId: index + 1, compNo: "1" }),
  }));
  const attemptedBatches = [];
  const acknowledgedBatches = [];
  const uploadedBatches = [];

  const syncStore = {
    startRun() {},
    saveSnapshot() {},
    completeRun() {},
    failRun() {},
    pendingEvents(_entityType, operation) {
      return operation === "UPSERT" ? events : [];
    },
    markAttempted(eventIds) {
      attemptedBatches.push(eventIds);
    },
    acknowledge(batch) {
      acknowledgedBatches.push(batch.map((event) => event.eventId));
    },
  };

  const target = {
    async sendUpserts(_entityType, batch) {
      uploadedBatches.push(batch.map((event) => event.eventId));
      if (uploadedBatches.length === failBatch) {
        throw new Error("simulated upload failure");
      }
    },
  };

  const service = new SyncService({
    entityType: "bill",
    sourceId: "source-1",
    repository: {
      async findAll() {
        return events.map((event) => JSON.parse(event.payloadJson));
      },
    },
    hasher: { hash: (payload) => `hash-${payload.entryId}` },
    syncStore,
    target,
    detectDeletions: false,
    batchSize: 2,
  });

  return {
    service,
    attemptedBatches,
    acknowledgedBatches,
    uploadedBatches,
  };
}

test("uploads and acknowledges pending records one batch at a time", async () => {
  const fixture = createFixture();

  const result = await fixture.service.synchronize();

  assert.deepEqual(fixture.uploadedBatches, [[1, 2], [3, 4], [5]]);
  assert.deepEqual(fixture.attemptedBatches, [[1, 2], [3, 4], [5]]);
  assert.deepEqual(fixture.acknowledgedBatches, [[1, 2], [3, 4], [5]]);
  assert.equal(result.uploaded, 5);
});

test("keeps completed batches acknowledged when a later batch fails", async () => {
  const fixture = createFixture({ failBatch: 2 });

  await assert.rejects(
    fixture.service.synchronize(),
    /simulated upload failure/,
  );

  assert.deepEqual(fixture.uploadedBatches, [[1, 2], [3, 4]]);
  assert.deepEqual(fixture.attemptedBatches, [[1, 2], [3, 4]]);
  assert.deepEqual(fixture.acknowledgedBatches, [[1, 2]]);
});

test("uses an isolated local outbox namespace for another database", async () => {
  const calls = [];
  const service = new SyncService({
    entityType: "bill",
    sourceId: "office-pc:database-2",
    syncScope: "database-2",
    repository: { async findAll() { return []; } },
    hasher: { hash() { return "hash"; } },
    syncStore: {
      startRun(_scanId, entityType) { calls.push(entityType); },
      saveSnapshot(_scanId, entityType) { calls.push(entityType); },
      completeRun() {},
      failRun() {},
      pendingEvents(entityType) { calls.push(entityType); return []; },
    },
    target: { async sendUpserts() {} },
    detectDeletions: true,
  });

  await service.synchronize();

  assert.deepEqual(calls, [
    "bill:database-2",
    "bill:database-2",
    "bill:database-2",
    "bill:database-2",
    "bill:database-2",
  ]);
});

test("uploads and acknowledges delete events only when deletion is enabled", async () => {
  const deleteEvents = [{
    eventId: 9,
    payloadJson: JSON.stringify({
      financialYear: "2025-2026",
      compNo: 1,
      entryId: 100,
    }),
  }];
  const acknowledged = [];
  const deleted = [];
  const service = new SyncService({
    entityType: "bill",
    sourceId: "source-1",
    repository: { async findAll() { return []; } },
    hasher: { hash() { return "hash"; } },
    syncStore: {
      startRun() {}, saveSnapshot() {}, completeRun() {}, failRun() {},
      pendingEvents(_entityType, operation) {
        return operation === "DELETE" ? deleteEvents : [];
      },
      markAttempted() {},
      acknowledge(events) { acknowledged.push(...events); },
    },
    target: {
      async sendUpserts() {},
      async sendDeletes(_entityType, events) { deleted.push(...events); },
    },
    detectDeletions: true,
  });

  const result = await service.synchronize();
  assert.equal(result.deleted, 1);
  assert.deepEqual(deleted, deleteEvents);
  assert.deepEqual(acknowledged, deleteEvents);
});

test("leaves delete events pending when the remote delete fails", async () => {
  const deleteEvents = [{ eventId: 9, payloadJson: "{}" }];
  let acknowledged = false;
  const service = new SyncService({
    entityType: "bill",
    sourceId: "source-1",
    repository: { async findAll() { return []; } },
    hasher: { hash() { return "hash"; } },
    syncStore: {
      startRun() {}, saveSnapshot() {}, completeRun() {}, failRun() {},
      pendingEvents(_entityType, operation) {
        return operation === "DELETE" ? deleteEvents : [];
      },
      markAttempted() {},
      acknowledge() { acknowledged = true; },
    },
    target: {
      async sendUpserts() {},
      async sendDeletes() { throw new Error("remote unavailable"); },
    },
    detectDeletions: true,
  });

  await assert.rejects(service.synchronize(), /remote unavailable/);
  assert.equal(acknowledged, false);
});
