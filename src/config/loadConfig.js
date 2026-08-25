const path = require("path");

function loadConfig() {
  const databaseName = process.env.MSSQL_DATABASE_1;

  return {
    mssql: {
      server: process.env.MSSQL_SERVER,
      port: Number(process.env.MSSQL_PORT),
      user: process.env.MSSQL_USER,
      password: process.env.MSSQL_PASSWORD,
      database: databaseName,
      options: {
        encrypt: false,
        trustServerCertificate: true,
      },
    },
    sqlitePath: path.resolve(
      process.env.SQLITE_PATH ||
        path.join(process.cwd(), "data", "accounting-sync.sqlite"),
    ),
    sourceId: process.env.SYNC_SOURCE_ID || databaseName || "local-mssql",
    targetBaseUrl: process.env.TARGET_BASE_URL || "http://localhost:5000",
    syncApiKey: process.env.SYNC_API_KEY,
    port: Number(process.env.PORT || 3000),
    cronExpression: process.env.SYNC_CRON || null,
    detectDeletions: process.env.SYNC_DETECT_DELETIONS === "true",
  };
}

module.exports = loadConfig;
