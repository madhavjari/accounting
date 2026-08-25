class HttpSyncTarget {
  constructor(baseUrl, apiKey) {
    if (!apiKey?.trim()) {
      throw new Error("SYNC_API_KEY is required");
    }

    const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey.trim();
    this.endpoints = {
      bill: `${normalizedBaseUrl}/api/v1/sync/bills`,
      voucher: `${normalizedBaseUrl}/api/v1/sync/vouchers`,
    };
  }

  async postJson(endpoint, payload) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`Target returned ${response.status}: ${responseText}`);
    }

    if (!responseText) return null;

    try {
      return JSON.parse(responseText);
    } catch {
      return responseText;
    }
  }

  async sendUpserts(entityType, events) {
    if (events.length === 0) return;

    const endpoint = this.endpoints[entityType];
    if (!endpoint) throw new Error(`No target endpoint for ${entityType}`);

    await this.postJson(
      endpoint,
      events.map((event) => JSON.parse(event.payloadJson)),
    );
  }
}

module.exports = HttpSyncTarget;
