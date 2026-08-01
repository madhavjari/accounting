require("dotenv").config();
const bootstrap = require("./src/bootstrap");

bootstrap().catch((error) => {
  console.error("Service failed to start:", error);
  process.exitCode = 1;
});
