const test = require("node:test");
const assert = require("node:assert/strict");
const MssqlBillReadRepository = require("../src/infrastructure/mssql/MssqlBillReadRepository");

function createPool(results) {
  const queries = [];
  return {
    queries,
    request() {
      return {
        async query(query) {
          queries.push(query);
          return { recordset: results[query] };
        },
      };
    },
  };
}

test("does not query or add adjustments while the feature is disabled", async () => {
  const pool = createPool({ bills: [{ EntryId: 1, CompNo: 1 }] });
  const repository = new MssqlBillReadRepository({
    pool,
    billsQuery: "bills",
    billMapper: (rows) =>
      rows.map((row) => ({ entryId: row.EntryId, compNo: row.CompNo })),
  });

  const result = await repository.findAll();

  assert.deepEqual(pool.queries, ["bills"]);
  assert.deepEqual(result, [{ entryId: 1, compNo: 1 }]);
});

test("queries and attaches adjustments while the feature is enabled", async () => {
  const pool = createPool({
    bills: [{ EntryId: 1, CompNo: 1 }],
    adjustments: [
      { EntryId: 3, LinkId: 2, BillId: 1, AdjustAmt: 50, CompNo: 1 },
    ],
  });
  const repository = new MssqlBillReadRepository({
    pool,
    billsQuery: "bills",
    billMapper: (rows) =>
      rows.map((row) => ({ entryId: row.EntryId, compNo: row.CompNo })),
    returnAdjustmentsQuery: "adjustments",
  });

  const result = await repository.findAll();

  assert.deepEqual(pool.queries, ["bills", "adjustments"]);
  assert.deepEqual(result[0].returnAdjustments, [
    { entryId: 3, returnEntryId: 2, adjustedAmount: 50 },
  ]);
});
