const path = require("path");

const FINANCIAL_YEAR_PATTERN = /^(\d{4})-(\d{4})$/;

function validateFinancialYear(value, variableName) {
  const match = FINANCIAL_YEAR_PATTERN.exec(value);
  if (!match || Number(match[2]) !== Number(match[1]) + 1) {
    throw new Error(
      `${variableName} must use consecutive years in YYYY-YYYY format`,
    );
  }
  return value;
}

function loadDatasets(baseMssql) {
  const databases = Object.entries(process.env)
    .map(([key, value]) => {
      const match = /^MSSQL_DATABASE_(\d+)$/.exec(key);
      if (!match || !value?.trim()) return null;
      return { index: Number(match[1]), database: value.trim() };
    })
    .filter(Boolean)
    .sort((left, right) => left.index - right.index);

  if (databases.length === 0) {
    throw new Error("At least one MSSQL_DATABASE_n value is required");
  }

  const firstFinancialYearStart = Number(
    process.env.MSSQL_FINANCIAL_YEAR_START || 2025,
  );
  if (!Number.isInteger(firstFinancialYearStart)) {
    throw new Error("MSSQL_FINANCIAL_YEAR_START must be a year");
  }

  const baseSourceId =
    process.env.SYNC_SOURCE_ID || databases[0].database || "local-mssql";

  const datasets = databases.map(({ index, database }, position) => {
    const inferredStartYear = firstFinancialYearStart + position;
    const variableName = `MSSQL_FINANCIAL_YEAR_${index}`;
    const financialYear = validateFinancialYear(
      process.env[variableName]?.trim() ||
        `${inferredStartYear}-${inferredStartYear + 1}`,
      variableName,
    );

    return {
      index,
      database,
      financialYear,
      mssql: { ...baseMssql, database },
      sourceId:
        position === 0 ? baseSourceId : `${baseSourceId}:database-${index}`,
      storageScope: position === 0 ? null : `database-${index}`,
    };
  });

  const requestedDatasetIndex = process.env.SYNC_DATASET_INDEX;
  if (!requestedDatasetIndex) return datasets;

  const datasetIndex = Number(requestedDatasetIndex);
  const selectedDataset = datasets.find(
    (dataset) => dataset.index === datasetIndex,
  );
  if (!selectedDataset) {
    throw new Error(
      `SYNC_DATASET_INDEX ${requestedDatasetIndex} is not configured`,
    );
  }

  return [selectedDataset];
}

function loadConfig() {
  const baseMssql = {
    server: process.env.MSSQL_SERVER,
    port: Number(process.env.MSSQL_PORT),
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  };

  return {
    datasets: loadDatasets(baseMssql),
    sqlitePath: path.resolve(
      process.env.SQLITE_PATH ||
        path.join(process.cwd(), "data", "accounting-sync.sqlite"),
    ),
    targetBaseUrl: process.env.TARGET_BASE_URL || "http://localhost:5000",
    syncApiKey: process.env.SYNC_API_KEY,
    port: Number(process.env.PORT || 3000),
    cronExpression: process.env.SYNC_CRON || null,
    detectDeletions: process.env.SYNC_DETECT_DELETIONS === "true",
  };
}

module.exports = loadConfig;
