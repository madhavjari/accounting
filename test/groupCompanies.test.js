const test = require("node:test");
const assert = require("node:assert/strict");
const groupCompanies = require("../src/domain/groupCompanies");

test("maps and deduplicates MAIN company names by CompNo", () => {
  assert.deepEqual(
    groupCompanies([
      { ExternalCompanyId: 1, CompanyName: " MADHAV ENTERPRISE " },
      { ExternalCompanyId: "1", CompanyName: "MADHAV ENTERPRISE" },
      { ExternalCompanyId: 2, CompanyName: "SECOND COMPANY" },
      { ExternalCompanyId: null, CompanyName: "Ignored" },
      { ExternalCompanyId: 3, CompanyName: "" },
    ]),
    [
      { externalCompanyId: "1", name: "MADHAV ENTERPRISE" },
      { externalCompanyId: "2", name: "SECOND COMPANY" },
    ],
  );
});

test("rejects conflicting names for one CompNo", () => {
  assert.throws(
    () =>
      groupCompanies([
        { ExternalCompanyId: 1, CompanyName: "FIRST NAME" },
        { ExternalCompanyId: 1, CompanyName: "SECOND NAME" },
      ]),
    /conflicting names/,
  );
});
