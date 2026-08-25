const sql = require("mssql");
const cron = require("node-cron");
const express = require("express");
const loadConfig = require("./config/loadConfig");
const CanonicalHasher = require("./domain/CanonicalHasher");
const groupBills = require("./domain/groupBills");
const groupVouchers = require("./domain/groupVouchers");
const SyncService = require("./application/SyncService");
const MssqlReadRepository = require("./infrastructure/mssql/MssqlReadRepository");
const { BILLS_QUERY, VOUCHERS_QUERY } = require("./infrastructure/mssql/queries");
const SqliteSyncStore = require("./infrastructure/sqlite/SqliteSyncStore");
const HttpSyncTarget = require("./infrastructure/http/HttpSyncTarget");

async function bootstrap() {
  const config = loadConfig();
  const syncStore = new SqliteSyncStore(config.sqlitePath);
  const target = new HttpSyncTarget(config.targetBaseUrl, config.syncApiKey);
  const hasher = new CanonicalHasher();
  const pools = [];
  const services = [];

  for (const dataset of config.datasets) {
    const pool = await new sql.ConnectionPool(dataset.mssql).connect();
    pools.push(pool);
    const addFinancialYear = (groupRows) => (rows) =>
      groupRows(rows).map((record) => ({
        ...record,
        financialYear: dataset.financialYear,
      }));

    services.push(
      new SyncService({
        entityType: "bill",
        sourceId: dataset.sourceId,
        syncScope: dataset.storageScope,
        repository: new MssqlReadRepository(
          pool,
          BILLS_QUERY,
          addFinancialYear(groupBills),
        ),
        hasher,
        syncStore,
        target,
        detectDeletions: config.detectDeletions,
      }),
      new SyncService({
        entityType: "voucher",
        sourceId: dataset.sourceId,
        syncScope: dataset.storageScope,
        repository: new MssqlReadRepository(
          pool,
          VOUCHERS_QUERY,
          addFinancialYear(groupVouchers),
        ),
        hasher,
        syncStore,
        target,
        detectDeletions: config.detectDeletions,
      }),
    );
  }

  let running = false;
  const runAll = async () => {
    if (running) return;
    running = true;
    try {
      for (const service of services) {
        const result = await service.synchronize();
        console.log(`${service.storeEntityType} sync:`, result);
      }
    } catch (error) {
      console.error("Synchronization failed:", error.message);
    } finally {
      running = false;
    }
  };

  const app = express();
  app.get("/health", (_request, response) =>
    response.json({
      ok: true,
      running,
      datasets: config.datasets.map(({ database, financialYear }) => ({
        database,
        financialYear,
      })),
    }),
  );
  app.listen(config.port, () => console.log(`Service listening on port ${config.port}`));

  await runAll();
  if (config.cronExpression) cron.schedule(config.cronExpression, runAll);
}

module.exports = bootstrap;
