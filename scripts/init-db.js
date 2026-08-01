require("dotenv").config();
const loadConfig = require("../src/config/loadConfig");
const SqliteSyncStore = require("../src/infrastructure/sqlite/SqliteSyncStore");

const config = loadConfig();
const store = new SqliteSyncStore(config.sqlitePath);
store.close();
console.log(`SQLite sync database initialized at ${config.sqlitePath}`);
