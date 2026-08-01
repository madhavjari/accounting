class MssqlReadRepository {
  constructor(pool, query, rowMapper) {
    this.pool = pool;
    this.query = query;
    this.rowMapper = rowMapper;
  }

  async findAll() {
    const result = await this.pool.request().query(this.query);
    return this.rowMapper(result.recordset);
  }
}

module.exports = MssqlReadRepository;
