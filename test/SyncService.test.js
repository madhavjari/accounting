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
