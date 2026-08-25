const test = require("node:test");
const assert = require("node:assert/strict");
const loadConfig = require("../src/config/loadConfig");

const CONFIG_KEYS = [
  "MSSQL_DATABASE_1",
  "MSSQL_DATABASE_2",
  "MSSQL_FINANCIAL_YEAR_1",
  "MSSQL_FINANCIAL_YEAR_2",
  "MSSQL_FINANCIAL_YEAR_START",
  "SYNC_SOURCE_ID",
];

function withEnvironment(values, work) {
  const original = Object.fromEntries(
    CONFIG_KEYS.map((key) => [key, process.env[key]]),
  );
  for (const key of CONFIG_KEYS) delete process.env[key];
  Object.assign(process.env, values);

  try {
    return work();
  } finally {
    for (const key of CONFIG_KEYS) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
}

test("discovers numbered databases and assigns consecutive years", () => {
  withEnvironment(
    {
      MSSQL_DATABASE_1: "Books2025",
      MSSQL_DATABASE_2: "Books2026",
      MSSQL_FINANCIAL_YEAR_START: "2025",
      SYNC_SOURCE_ID: "office-pc",
    },
    () => {
      const config = loadConfig();

      assert.deepEqual(
        config.datasets.map((dataset) => ({
          database: dataset.database,
          financialYear: dataset.financialYear,
          sourceId: dataset.sourceId,
          storageScope: dataset.storageScope,
        })),
        [
          {
            database: "Books2025",
            financialYear: "2025-2026",
            sourceId: "office-pc",
            storageScope: null,
          },
          {
            database: "Books2026",
            financialYear: "2026-2027",
            sourceId: "office-pc:database-2",
            storageScope: "database-2",
          },
        ],
      );
    },
  );
});

test("rejects a non-consecutive explicit financial year", () => {
  withEnvironment(
    {
      MSSQL_DATABASE_1: "Books",
      MSSQL_FINANCIAL_YEAR_1: "2025-2027",
    },
    () => {
      assert.throws(loadConfig, /consecutive years/);
    },
  );
});
