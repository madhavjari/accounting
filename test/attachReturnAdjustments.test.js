const test = require("node:test");
const assert = require("node:assert/strict");
const attachReturnAdjustments = require("../src/domain/attachReturnAdjustments");

test("attaches return adjustments to the original bill by CompNo and BillId", () => {
  const bills = [
    { compNo: 1, entryId: 100, billNo: "S-100" },
    { compNo: 2, entryId: 100, billNo: "S-200" },
  ];

  const result = attachReturnAdjustments(bills, [
    {
      EntryId: 900,
      LinkId: 500,
      BillId: 100,
      AdjustAmt: 7004,
      CompNo: 2,
    },
  ]);

  assert.deepEqual(result[0].returnAdjustments, []);
  assert.deepEqual(result[1].returnAdjustments, [
    {
      entryId: 900,
      returnEntryId: 500,
      adjustedAmount: 7004,
    },
  ]);
});

test("rejects an adjustment whose original bill is missing", () => {
  assert.throws(
    () =>
      attachReturnAdjustments([], [
        {
          EntryId: 900,
          LinkId: 500,
          BillId: 100,
          AdjustAmt: 7004,
          CompNo: 2,
        },
      ]),
    /references missing BillMast 100/,
  );
});
