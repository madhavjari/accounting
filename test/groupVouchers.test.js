const test = require("node:test");
const assert = require("node:assert/strict");
const groupVouchers = require("../src/domain/groupVouchers");

test("normalizes numeric voucher identifiers to nullable text", () => {
  const [voucher] = groupVouchers([
    {
      EntryId: 10,
      CompNo: 1,
      Opening: "Y",
      SlipNo: 123,
      RefNo: 456,
      Cheque: 789,
      VoucherEntryId: 1,
      BillId: 9876,
      BillSr: "S-1",
      BillChr: null,
    },
  ]);

  assert.equal(voucher.slipNo, "123");
  assert.equal(voucher.refNo, "456");
  assert.equal(voucher.chequeNo, "789");
  assert.equal(voucher.isOpening, true);
  assert.equal(voucher.items[0].billNo, "S-1");
  assert.equal(voucher.items[0].billEntrySourceId, "9876");
});

test("normalizes missing voucher identifiers to null", () => {
  const [voucher] = groupVouchers([
    {
      EntryId: 10,
      CompNo: 1,
      SlipNo: null,
      RefNo: "",
      Cheque: undefined,
      VoucherEntryId: 1,
    },
  ]);

  assert.equal(voucher.slipNo, null);
  assert.equal(voucher.refNo, null);
  assert.equal(voucher.chequeNo, null);
  assert.equal(voucher.isOpening, false);
  assert.equal(voucher.items[0].billEntrySourceId, null);
});
