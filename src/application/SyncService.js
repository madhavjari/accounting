const crypto = require("crypto");

const MAX_UPSERT_BATCH_SIZE = 500;

class SyncService {
  constructor({
    entityType,
    sourceId,
    syncScope = null,
    repository,
    hasher,
    syncStore,
    target,
    detectDeletions,
    batchSize = MAX_UPSERT_BATCH_SIZE,
  }) {
    if (
      !Number.isInteger(batchSize) ||
      batchSize < 1 ||
      batchSize > MAX_UPSERT_BATCH_SIZE
    ) {
      throw new Error(
        `batchSize must be between 1 and ${MAX_UPSERT_BATCH_SIZE}`,
      );
    }

    this.entityType = entityType;
    this.storeEntityType = syncScope
      ? `${entityType}:${syncScope}`
      : entityType;
    this.sourceId = sourceId;
    this.repository = repository;
    this.hasher = hasher;
    this.syncStore = syncStore;
    this.target = target;
    this.detectDeletions = detectDeletions;
    this.batchSize = batchSize;
  }

  async synchronize() {
    const scanId = crypto.randomUUID();
    this.syncStore.startRun(scanId, this.storeEntityType);

    let entities;
    try {
      entities = await this.repository.findAll();
      const records = entities.map((payload) => ({
        sourceKey: JSON.stringify([
          this.sourceId,
          this.entityType,
          payload.compNo,
          payload.entryId,
        ]),
        payload,
        hash: this.hasher.hash(payload),
      }));

      this.syncStore.saveSnapshot(
        scanId,
        this.storeEntityType,
        records,
        this.detectDeletions,
      );
      this.syncStore.completeRun(scanId);
    } catch (error) {
      this.syncStore.failRun(scanId, error);
      throw error;
    }

    const pendingUpserts = this.syncStore.pendingEvents(
      this.storeEntityType,
      "UPSERT",
    );
    let uploaded = 0;

    for (let start = 0; start < pendingUpserts.length; start += this.batchSize) {
      const batch = pendingUpserts.slice(start, start + this.batchSize);
      this.syncStore.markAttempted(batch.map((event) => event.eventId));
      await this.target.sendUpserts(this.entityType, batch);
      this.syncStore.acknowledge(batch);
      uploaded += batch.length;
    }

    return {
      extracted: entities.length,
      uploaded,
      pendingDeletes: this.syncStore.pendingEvents(
        this.storeEntityType,
        "DELETE",
      ).length,
    };
  }
}

module.exports = SyncService;
