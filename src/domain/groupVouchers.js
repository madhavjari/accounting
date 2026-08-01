function groupVouchers(rows) {
  const vouchers = new Map();

  for (const row of rows) {
    if (!vouchers.has(row.EntryId)) {
      vouchers.set(row.EntryId, {
        entryId: row.EntryId,
        compNo: row.CompNo,

        date: row.Date,
        mode: row.Mode,
        vchrType: row.VchrType,
        slipNo: row.SlipNo,
        refNo: row.RefNo,

        party: row.Party,

        chequeNo: row.Cheque,
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

    if (row.entryId === null) continue;

    vouchers.get(row.EntryId).items.push({
      entryId: row.VoucherEntryId,

      code: row.Code,
      billNo: row.BillSr + row.BillChr,
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
