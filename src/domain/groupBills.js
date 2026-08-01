function groupBills(rows) {
  const bills = new Map();

  for (const row of rows) {
    if (!bills.has(row.EntryId)) {
      bills.set(row.EntryId, {
        entryId: row.EntryId,
        compNo: row.CompNo,
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

    bills.get(row.EntryId).items.push({
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
