class HttpSyncTarget {
  constructor(baseUrl) {
    this.endpoints = {
      bill: `${baseUrl}/data`,
      voucher: `${baseUrl}/vouchers`,
    };
  }

  async sendUpserts(entityType, events) {
    if (events.length === 0) return;

    const endpoint = this.endpoints[entityType];
    if (!endpoint) throw new Error(`No target endpoint for ${entityType}`);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(events.map((event) => JSON.parse(event.payloadJson))),
    });
    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`Target returned ${response.status}: ${responseText}`);
    }
  }
}

module.exports = HttpSyncTarget;
