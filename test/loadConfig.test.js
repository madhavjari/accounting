const test = require("node:test");
const assert = require("node:assert/strict");
const loadConfig = require("../src/config/loadConfig");

const CONFIG_KEYS = [
  "MSSQL_DATABASE_1",
  "MSSQL_DATABASE_2",
  "MSSQL_COMPANY_DATABASE",
  "MSSQL_FINANCIAL_YEAR_1",
  "MSSQL_FINANCIAL_YEAR_2",
  "MSSQL_FINANCIAL_YEAR_START",
  "SYNC_SOURCE_ID",
  "SYNC_DATASET_INDEX",
  "SYNC_RETURN_ADJUSTMENTS",
  "SYNC_DETECT_DELETIONS",
  "SYNC_DELETE_CONFIRM_SCANS",
  "SYNC_DELETE_MAX_COUNT",
  "SYNC_DELETE_MAX_PERCENT",
  "SYNC_ALLOW_EMPTY_DELETE_SCAN",
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

      assert.equal(config.companyDatabase, "MAIN");

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

test("can restrict a run to one numbered database", () => {
  withEnvironment(
    {
      MSSQL_DATABASE_1: "Books2025",
      MSSQL_DATABASE_2: "Books2026",
      SYNC_DATASET_INDEX: "2",
    },
    () => {
      const config = loadConfig();

      assert.equal(config.datasets.length, 1);
      assert.equal(config.datasets[0].index, 2);
      assert.equal(config.datasets[0].financialYear, "2026-2027");
    },
  );
});

test("keeps return adjustments disabled until explicitly enabled", () => {
  withEnvironment({ MSSQL_DATABASE_1: "Books" }, () => {
    assert.equal(loadConfig().syncReturnAdjustments, false);
  });

  withEnvironment(
    {
      MSSQL_DATABASE_1: "Books",
      SYNC_RETURN_ADJUSTMENTS: "true",
    },
    () => {
      assert.equal(loadConfig().syncReturnAdjustments, true);
    },
  );
});

test("uses conservative deletion defaults and requires explicit enablement", () => {
  withEnvironment({ MSSQL_DATABASE_1: "Books" }, () => {
    const config = loadConfig();
    assert.equal(config.detectDeletions, false);
    assert.deepEqual(config.deletionPolicy, {
      enabled: false,
      confirmationScans: 2,
      maxCount: 25,
      maxPercent: 10,
      allowEmptyScan: false,
    });
  });

  withEnvironment({
    MSSQL_DATABASE_1: "Books",
    SYNC_DETECT_DELETIONS: "true",
    SYNC_DELETE_CONFIRM_SCANS: "3",
    SYNC_DELETE_MAX_COUNT: "5",
    SYNC_DELETE_MAX_PERCENT: "2.5",
  }, () => {
    assert.deepEqual(loadConfig().deletionPolicy, {
      enabled: true,
      confirmationScans: 3,
      maxCount: 5,
      maxPercent: 2.5,
      allowEmptyScan: false,
    });
  });
});
