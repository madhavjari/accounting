const attachReturnAdjustments = require("../../domain/attachReturnAdjustments");

class MssqlBillReadRepository {
  constructor({
    pool,
    billsQuery,
    billMapper,
    returnAdjustmentsQuery = null,
  }) {
    this.pool = pool;
    this.billsQuery = billsQuery;
    this.billMapper = billMapper;
    this.returnAdjustmentsQuery = returnAdjustmentsQuery;
  }

  async findAll() {
    const billResult = await this.pool.request().query(this.billsQuery);
    const bills = this.billMapper(billResult.recordset);
    if (!this.returnAdjustmentsQuery) return bills;

    const adjustmentResult = await this.pool
      .request()
      .query(this.returnAdjustmentsQuery);
    return attachReturnAdjustments(bills, adjustmentResult.recordset);
  }
}

module.exports = MssqlBillReadRepository;
