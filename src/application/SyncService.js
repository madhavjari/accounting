const crypto = require("crypto");

class SyncService {
  constructor({ entityType, sourceId, repository, hasher, syncStore, target, detectDeletions }) {
    this.entityType = entityType;
    this.sourceId = sourceId;
    this.repository = repository;
    this.hasher = hasher;
    this.syncStore = syncStore;
    this.target = target;
    this.detectDeletions = detectDeletions;
  }

  async synchronize() {
    const scanId = crypto.randomUUID();
    this.syncStore.startRun(scanId, this.entityType);

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
        this.entityType,
        records,
        this.detectDeletions,
      );
      this.syncStore.completeRun(scanId);
    } catch (error) {
      this.syncStore.failRun(scanId, error);
      throw error;
    }

    const pendingUpserts = this.syncStore.pendingEvents(this.entityType, "UPSERT");
    this.syncStore.markAttempted(pendingUpserts.map((event) => event.eventId));
    await this.target.sendUpserts(this.entityType, pendingUpserts);
    this.syncStore.acknowledge(pendingUpserts);

    return {
      extracted: entities.length,
      uploaded: pendingUpserts.length,
      pendingDeletes: this.syncStore.pendingEvents(this.entityType, "DELETE").length,
    };
  }
}

module.exports = SyncService;
