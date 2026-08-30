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
        billNo: joinIdentifier(row.BillNo, row.BillChr),
        date: row.Date,
        party: row.Party,
        partyCode: row.PartyCode,
        agent: row.Agent,

        grossAmount: row.GrossAmount,
        netAmount: row.NetAmount,

        cgst: row.TOTCGSTAmt,
        sgst: row.TOTSGSTAmt,
        igst: row.TOTIGSTAmt,

        modifyDate: row._ModifyDate,
        modifyTime: row._ModifyTime,

        items: [],
      });
    }

    if (row.DetailEntryId === null || row.DetailEntryId === undefined) {
      continue;
    }

    bills.get(recordKey).items.push({
      serial: joinIdentifier(row.BillSerial, row.BillSrChr),
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
