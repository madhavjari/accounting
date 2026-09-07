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
