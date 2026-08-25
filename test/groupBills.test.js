const test = require("node:test");
const assert = require("node:assert/strict");
const groupBills = require("../src/domain/groupBills");

test("keeps identical entry IDs separate by CompNo and maps opening flags", () => {
  const bills = groupBills([
    {
      EntryId: 10,
      CompNo: 1,
      Opening: "Y",
      BillNo: "1",
      BillChr: "A",
      BillSerial: "1",
      BillSrChr: "A",
    },
    {
      EntryId: 10,
      CompNo: 2,
      Opening: "N",
      BillNo: "2",
      BillChr: "A",
      BillSerial: "1",
      BillSrChr: "A",
    },
  ]);

  assert.equal(bills.length, 2);
  assert.equal(bills[0].isOpening, true);
  assert.equal(bills[1].isOpening, false);
});
