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

test("keeps an opening bill that has no BillData rows", () => {
  const [bill] = groupBills([
    {
      EntryId: 11,
      CompNo: 1,
      Opening: "Y",
      BillNo: "OPEN-1",
      BillChr: "",
      DetailEntryId: null,
    },
  ]);

  assert.equal(bill.entryId, 11);
  assert.equal(bill.isOpening, true);
  assert.deepEqual(bill.items, []);
});

test("maps bill GST totals separately from item GST", () => {
  const [bill] = groupBills([
    {
      EntryId: 12,
      CompNo: 1,
      BillNo: "S-12",
      BillChr: null,
      TOTCGSTAmt: 90,
      TOTSGSTAmt: 90,
      TOTIGSTAmt: 0,
      CGSTAmt: 45,
      SGSTAmt: 45,
      IGSTAmt: 0,
      DetailEntryId: 1201,
      BillSerial: "1",
      BillSrChr: null,
    },
  ]);

  assert.equal(bill.billNo, "S-12");
  assert.equal(bill.cgst, 90);
  assert.equal(bill.sgst, 90);
  assert.equal(bill.items[0].serial, "1");
});
