function isOpeningRecord(value) {
  if (value === true || value === 1) return true;
  return ["Y", "YES", "TRUE", "1"].includes(
    String(value ?? "").trim().toUpperCase(),
  );
}

function groupBills(rows) {
  const bills = new Map();

  for (const row of rows) {
    const recordKey = JSON.stringify([row.CompNo, row.EntryId]);
    if (!bills.has(recordKey)) {
      bills.set(recordKey, {
        entryId: row.EntryId,
        compNo: row.CompNo,
        isOpening: isOpeningRecord(row.Opening),
        code: row.Code,
        billNo: row.BillNo + row.BillChr,
        date: row.Date,
        party: row.Party,
        partyCode: row.PartyCode,
        agent: row.Agent,

        grossAmount: row.GrossAmount,
        netAmount: row.NetAmount,

        cgst: row.CGSTAmt,
        sgst: row.SGSTAmt,
        igst: row.IGSTAmt,

        modifyDate: row._ModifyDate,
        modifyTime: row._ModifyTime,

        items: [],
      });
    }

    bills.get(recordKey).items.push({
      serial: row.BillSerial + row.BillSrChr,
      itemCode: row.ItemCode,
      itemName: row.ItemName,
      category: row.Category,
      group: row.GroupName,

      pcs: row.Pcs,
      meters: row.Meters,
      quantity: row.Quantity,
      weight: row.Weight,
      per: row.Per,
      discount: row.DiscAmt,

      rate: row.Rate,
      amount: row.ItemAmount,

      taxable: row.ItemTaxableValue,
      finalAmount: row.ItemFinalAmount,
    });
  }

  return [...bills.values()];
}

module.exports = groupBills;
