import test, { beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server.js";
import { POST } from "../app/api/leads/retry/route.ts";
import { __setLeadStoreForTests } from "../app/api/leads/lead-store.ts";

let storedLeads;
const previousSecret = process.env.LEAD_RETRY_SECRET;
const previousToken = process.env.HUBSPOT_ACCESS_TOKEN;

beforeEach(() => {
  process.env.LEAD_RETRY_SECRET = "test-retry-secret";
  process.env.HUBSPOT_ACCESS_TOKEN = "test-token-never-used";
  storedLeads = new Map();
  for (const [index, status] of ["pending", "pending", "pending"].entries()) {
    const requestId = `SOL-TEST000${index}`;
    storedLeads.set(requestId, {
      requestId,
      properties: { email: `lead${index}@example.test`, insurance_request_id: requestId },
      status,
      attempts: 0,
      nextAttemptAt: Date.now() - 1000,
      createdAt: Date.now() - 2000,
      updatedAt: Date.now() - 2000
    });
  }
  __setLeadStoreForTests({
    getLead: async (requestId) => storedLeads.get(requestId) ?? null,
    updateLead: async (lead) => storedLeads.set(lead.requestId, structuredClone(lead)),
    getDuePendingLeads: async () => [...storedLeads.values()].filter((lead) => lead.status === "pending")
  });
});

afterEach(() => {
  __setLeadStoreForTests(undefined);
  if (previousSecret === undefined) delete process.env.LEAD_RETRY_SECRET;
  else process.env.LEAD_RETRY_SECRET = previousSecret;
  if (previousToken === undefined) delete process.env.HUBSPOT_ACCESS_TOKEN;
  else process.env.HUBSPOT_ACCESS_TOKEN = previousToken;
});

test("rejects retry requests without the configured bearer secret", async () => {
  const response = await POST(new NextRequest("https://preview.example.test/api/leads/retry", { method: "POST" }));
  assert.equal(response.status, 401);
});

test("reports sent, pending, and permanent failures separately", async (t) => {
  const responses = [
    new Response(JSON.stringify({ id: "contact-1" }), { status: 201 }),
    new Response("rate limited", { status: 429 }),
    new Response("invalid property", { status: 400 })
  ];
  const fetchMock = mock.method(globalThis, "fetch", async () => responses.shift());
  t.after(() => fetchMock.mock.restore());

  const request = new NextRequest("https://preview.example.test/api/leads/retry", {
    method: "POST",
    headers: { authorization: "Bearer test-retry-secret" }
  });
  const response = await POST(request);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    processed: 3,
    sent: 1,
    pending: 1,
    failed: 1
  });
  assert.equal(storedLeads.get("SOL-TEST0000").status, "sent");
  assert.equal(storedLeads.get("SOL-TEST0001").status, "pending");
  assert.equal(storedLeads.get("SOL-TEST0002").status, "failed");
});
