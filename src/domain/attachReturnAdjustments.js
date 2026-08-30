function billKey(compNo, entryId) {
  return JSON.stringify([String(compNo ?? ""), String(entryId ?? "")]);
}

function attachReturnAdjustments(bills, rows) {
  const billsBySourceId = new Map();
  const enrichedBills = bills.map((bill) => {
    const enrichedBill = { ...bill, returnAdjustments: [] };
    billsBySourceId.set(billKey(bill.compNo, bill.entryId), enrichedBill);
    return enrichedBill;
  });
  const adjustmentIds = new Set();

  for (const row of rows) {
    const targetBill = billsBySourceId.get(billKey(row.CompNo, row.BillId));
    if (!targetBill) {
      throw new Error(
        `BILLRETADJDET ${row.EntryId} references missing BillMast ${row.BillId} for CompNo ${row.CompNo}`,
      );
    }

    const adjustmentKey = billKey(row.CompNo, row.EntryId);
    if (adjustmentIds.has(adjustmentKey)) {
      throw new Error(
        `Duplicate BILLRETADJDET EntryId ${row.EntryId} for CompNo ${row.CompNo}`,
      );
    }
    adjustmentIds.add(adjustmentKey);

    targetBill.returnAdjustments.push({
      entryId: row.EntryId,
      returnEntryId: row.LinkId,
      adjustedAmount: row.AdjustAmt,
    });
  }

  return enrichedBills;
}

module.exports = attachReturnAdjustments;
