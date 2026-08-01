const crypto = require("crypto");

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value
      .map(canonicalize)
      .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  }

  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = canonicalize(value[key]);
        return result;
      }, {});
  }

  return value;
}

class CanonicalHasher {
  hash(entity) {
    const canonicalEntity = canonicalize(entity);
    const body = JSON.stringify(canonicalEntity);
    return crypto.createHash("sha256").update(body).digest("hex");
  }
}

module.exports = CanonicalHasher;
