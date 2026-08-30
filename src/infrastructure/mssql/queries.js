const BILLS_QUERY = `
SELECT

    -- BillMaster
    bm.EntryId,
    bm.CompNo,
    bm.Opening,
    bm.Code,
    bm.Book,
    bm.Serial AS BillNo,
    bm.SrChr AS BillChr,
    bm.Date,
    bm.Party,
    bm.PartyCode,
    bm.Agent,

    bm.GrossAmt    AS GrossAmount,
    bm.NetAmt      AS NetAmount,
    bm.TOTCGSTAmt,
    bm.TOTSGSTAmt,
    bm.TOTIGSTAmt,

    bm._EntryDate,
    bm._ModifyDate,
    bm._ModifyTime,

    -- BillData
    bd.EntryId       AS DetailEntryId,
    bd.Serial        AS BillSerial,
    bd.SrChr         AS BillSrChr,

    bd.ItemCode,
    bd.ItemName,

    bd.Category,
    bd.GroupName,
    bd.Brand,
    bd.Quality,
    bd.Design,
    bd.Colour,
    bd.Pattern,

    bd.Pcs,
    bd.Meters,
    bd.Weight,
    bd.Quantity,

    bd.Rate,
    bd.Per,

    bd.Amount        AS ItemAmount,
    bd.TaxableValue  AS ItemTaxableValue,
    bd.FinalAmt      AS ItemFinalAmount,

    bd.DiscPer,
    bd.DiscAmt,

    bd.CGSTRate,
    bd.CGSTAmt,

    bd.SGSTRate,
    bd.SGSTAmt,

    bd.IGSTRate,
    bd.IGSTAmt,

    bd.CessRate,
    bd.CessAmt,

    bd.Remarks

    FROM BillMast bm

    LEFT JOIN BillData bd
    ON bm.EntryId = bd.ControlId

    ORDER BY
    bm.EntryId,
    bd.Serial; 
  
  `.replace(/\n/g, "\r\n");

const VOUCHERS_QUERY = `
SELECT
    -- AccountVoucherMaster
    avm.EntryId,
    avm.CompNo,
    avm.Opening,
    avm.Date,
    avm.Mode,
    avm.VchrType,
    avm.SlipNo,
    avm.RefNo,
    avm.Party,
    avm.Cheque,
    avm.ChqDate,
    avm.ChqBank,
    avm.ClearingDt,
    avm.NetAmt,
    avm.Remarks,
    avm._ModifyDate,
    avm._ModifyTime,

    -- AccountVoucherDetail
    avd.ControlId,
    avd.EntryId AS VoucherEntryId,
    avd.Code,
    avd.BillSr,
    avd.BillChr,
    avd.Date     AS DetailDate,
    avd.Mode     AS DetailMode,
    avd.BillAmt,
    avd.AdjustAmt,
    avd.UnAdjAmt,
    avd.BAlAmt,
    avd.Status

    FROM ACCVCHRMST avm

    INNER JOIN ACCVCHRDET avd
    ON avm.EntryId = avd.ControlId

    WHERE avd.Code IN ('BR', 'BP')

    ORDER BY
    avm.EntryId
  `.replace(/\n/g, "\r\n");

const RETURN_ADJUSTMENTS_QUERY = `
SELECT
    EntryId,
    LinkId,
    BillId,
    AdjustAmt,
    CompNo

    FROM BILLRETADJDET

    ORDER BY
    BillId,
    EntryId;
  `.replace(/\n/g, "\r\n");

module.exports = { BILLS_QUERY, VOUCHERS_QUERY, RETURN_ADJUSTMENTS_QUERY };
