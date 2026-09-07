const test = require("node:test");
const assert = require("node:assert/strict");
const HttpSyncTarget = require("../src/infrastructure/http/HttpSyncTarget");

test("authenticates uploads with the sync API key", async () => {
  const originalFetch = global.fetch;
  let request;

  global.fetch = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      status: 200,
      text: async () => '{"success":true}',
    };
  };

  try {
    const target = new HttpSyncTarget(
      "https://dashboard.example/",
      "sync_prefix.secret",
    );

    await target.sendUpserts("bill", [
      { payloadJson: '{"entryId":"1","compNo":"1"}' },
    ]);

    assert.equal(
      request.url,
      "https://dashboard.example/api/v1/sync/bills",
    );
    assert.equal(
      request.options.headers.Authorization,
      "Bearer sync_prefix.secret",
    );
    assert.deepEqual(JSON.parse(request.options.body), [
      { entryId: "1", compNo: "1" },
    ]);

    await target.sendCompanies([
      { externalCompanyId: "1", name: "MADHAV ENTERPRISE" },
    ]);

    assert.equal(
      request.url,
      "https://dashboard.example/api/v1/sync/companies",
    );
    assert.deepEqual(JSON.parse(request.options.body), {
      companies: [
        { externalCompanyId: "1", name: "MADHAV ENTERPRISE" },
      ],
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test("sends only the exact source identity for deletes", async () => {
  const originalFetch = global.fetch;
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200, text: async () => '{"count":1}' };
  };

  try {
    const target = new HttpSyncTarget(
      "https://dashboard.example",
      "sync_prefix.secret",
    );
    await target.sendDeletes("bill", [{
      eventId: 7,
      payloadJson: JSON.stringify({
        financialYear: "2026-2027",
        compNo: 2,
        entryId: 2966,
        billNo: "1R",
        party: "SHIVAY CREATION",
      }),
    }]);

    assert.equal(request.options.method, "DELETE");
    assert.equal(request.url, "https://dashboard.example/api/v1/sync/bills");
    assert.deepEqual(JSON.parse(request.options.body), [{
      financialYear: "2026-2027",
      compNo: 2,
      entryId: 2966,
    }]);
  } finally {
    global.fetch = originalFetch;
  }
});
