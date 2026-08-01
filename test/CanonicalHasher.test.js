const test = require("node:test");
const assert = require("node:assert/strict");
const CanonicalHasher = require("../src/domain/CanonicalHasher");

test("hash is stable across object property and item order", () => {
  const hasher = new CanonicalHasher();
  const first = {
    entryId: 1,
    party: "Example",
    items: [{ serial: "2A" }, { serial: "1A" }],
  };
  const second = {
    items: [{ serial: "1A" }, { serial: "2A" }],
    party: "Example",
    entryId: 1,
  };

  assert.equal(hasher.hash(first), hasher.hash(second));
  assert.deepEqual(first.items, [{ serial: "2A" }, { serial: "1A" }]);
});
