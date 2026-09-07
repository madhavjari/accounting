function groupCompanies(rows) {
  const companies = new Map();

  for (const row of rows) {
    if (row.ExternalCompanyId === undefined || row.ExternalCompanyId === null) {
      continue;
    }

    const externalCompanyId = String(row.ExternalCompanyId).trim();
    const name = String(row.CompanyName ?? "").trim();
    if (!externalCompanyId || !name) continue;

    const existing = companies.get(externalCompanyId);
    if (existing && existing.name !== name) {
      throw new Error(
        `Company number ${externalCompanyId} has conflicting names in MAIN`,
      );
    }

    companies.set(externalCompanyId, {
      externalCompanyId,
      name,
    });
  }

  return [...companies.values()];
}

module.exports = groupCompanies;
