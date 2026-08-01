const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const SCHEMA = require("./schema");

class SqliteSyncStore {
  constructor(databasePath) {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    this.database = new DatabaseSync(databasePath);
    this.database.exec(SCHEMA);
  }

  startRun(scanId, entityType) {
    this.database
      .prepare(`INSERT INTO sync_run (scan_id, entity_type, started_at, status)
                VALUES (?, ?, ?, 'running')`)
      .run(scanId, entityType, new Date().toISOString());
  }

  saveSnapshot(scanId, entityType, records, detectDeletions = false) {
    const findCurrent = this.database.prepare(
      "SELECT current_hash, acknowledged_hash, deleted FROM current_entity WHERE entity_type = ? AND source_key = ?",
    );
    const upsertCurrent = this.database.prepare(`
      INSERT INTO current_entity (
        entity_type, source_key, payload_json, current_hash,
        acknowledged_hash, last_seen_scan, deleted, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)
      ON CONFLICT(entity_type, source_key) DO UPDATE SET
        payload_json = excluded.payload_json,
        current_hash = excluded.current_hash,
        last_seen_scan = excluded.last_seen_scan,
        deleted = 0,
        updated_at = excluded.updated_at
    `);
    const enqueue = this.database.prepare(`
      INSERT OR IGNORE INTO outbox (
        entity_type, source_key, operation, hash, payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    this.#transaction(() => {
      for (const record of records) {
        const existing = findCurrent.get(entityType, record.sourceKey);
        const payloadJson = JSON.stringify(record.payload);
        const now = new Date().toISOString();

        upsertCurrent.run(
          entityType,
          record.sourceKey,
          payloadJson,
          record.hash,
          existing?.acknowledged_hash ?? null,
          scanId,
          now,
        );

        if (existing?.acknowledged_hash !== record.hash || existing?.deleted === 1) {
          enqueue.run(entityType, record.sourceKey, "UPSERT", record.hash, payloadJson, now);
        }
      }

      if (detectDeletions) {
        const missing = this.database
          .prepare(`SELECT source_key, current_hash
                    FROM current_entity
                    WHERE entity_type = ? AND last_seen_scan <> ? AND deleted = 0`)
          .all(entityType, scanId);

        const markDeleted = this.database.prepare(`
          UPDATE current_entity SET deleted = 1, updated_at = ?
          WHERE entity_type = ? AND source_key = ?
        `);

        for (const record of missing) {
          const now = new Date().toISOString();
          markDeleted.run(now, entityType, record.source_key);
          enqueue.run(entityType, record.source_key, "DELETE", record.current_hash, null, now);
        }
      }
    });
  }

  completeRun(scanId) {
    this.database
      .prepare("UPDATE sync_run SET status = 'completed', completed_at = ? WHERE scan_id = ?")
      .run(new Date().toISOString(), scanId);
  }

  failRun(scanId, error) {
    this.database
      .prepare(`UPDATE sync_run
                SET status = 'failed', completed_at = ?, error_message = ?
                WHERE scan_id = ?`)
      .run(new Date().toISOString(), String(error.message || error), scanId);
  }

  pendingEvents(entityType, operation) {
    return this.database
      .prepare(`SELECT event_id AS eventId, entity_type AS entityType,
                       source_key AS sourceKey, operation, hash,
                       payload_json AS payloadJson, attempts
                FROM outbox
                WHERE entity_type = ? AND operation = ? AND acknowledged_at IS NULL
                ORDER BY event_id`)
      .all(entityType, operation);
  }

  markAttempted(eventIds) {
    if (eventIds.length === 0) return;
    const statement = this.database.prepare(
      "UPDATE outbox SET attempts = attempts + 1 WHERE event_id = ?",
    );
    this.#transaction(() => eventIds.forEach((id) => statement.run(id)));
  }

  acknowledge(events) {
    if (events.length === 0) return;
    const acknowledgeEvent = this.database.prepare(
      "UPDATE outbox SET acknowledged_at = ? WHERE event_id = ?",
    );
    const acknowledgeEntity = this.database.prepare(`
      UPDATE current_entity SET acknowledged_hash = ?
      WHERE entity_type = ? AND source_key = ? AND current_hash = ?
    `);

    this.#transaction(() => {
      const now = new Date().toISOString();
      for (const event of events) {
        acknowledgeEvent.run(now, event.eventId);
        acknowledgeEntity.run(event.hash, event.entityType, event.sourceKey, event.hash);
      }
    });
  }

  close() {
    this.database.close();
  }

  #transaction(work) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      work();
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}

module.exports = SqliteSyncStore;
