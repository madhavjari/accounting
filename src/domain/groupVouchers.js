function nullableText(value) {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

function isOpeningRecord(value) {
  if (value === true || value === 1) return true;
  return ["Y", "YES", "TRUE", "1"].includes(
    String(value ?? "").trim().toUpperCase(),
  );
}

function joinIdentifier(...parts) {
  return parts
    .filter((part) => part !== undefined && part !== null)
    .join("");
}

function groupVouchers(rows) {
  const vouchers = new Map();

  for (const row of rows) {
    const recordKey = JSON.stringify([row.CompNo, row.EntryId]);
    if (!vouchers.has(recordKey)) {
      vouchers.set(recordKey, {
        entryId: row.EntryId,
        compNo: row.CompNo,
        isOpening: isOpeningRecord(row.Opening),

        date: row.Date,
        mode: row.Mode,
        vchrType: row.VchrType,
        slipNo: nullableText(row.SlipNo),
        refNo: nullableText(row.RefNo),

        party: row.Party,

        chequeNo: nullableText(row.Cheque),
        chequeDate: row.ChqDate,
        chequeBank: row.ChqBank,
        clearingDate: row.ClearingDt,

        netAmount: row.NetAmt,
        remarks: row.Remarks,

        modifyDate: row._ModifyDate,
        modifyTime: row._ModifyTime,

        items: [],
      });
    }

    if (row.VoucherEntryId === null) continue;

    vouchers.get(recordKey).items.push({
      entryId: row.VoucherEntryId,

      code: row.Code,
      billNo: joinIdentifier(row.BillSr, row.BillChr),
      date: row.DetailDate,
      mode: row.DetailMode,

      billAmt: row.BillAmt,
      adjustAmt: row.AdjustAmt,
      unAdjAmt: row.UnAdjAmt,
      bAlAmt: row.BAlAmt,
      status: row.Status,
    });
  }

  return [...vouchers.values()];
}

module.exports = groupVouchers;
