import test, { beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server.js";
import { POST } from "../app/api/leads/retry/route.ts";
import { __setLeadStoreForTests } from "../app/api/leads/lead-store.ts";
import { deliverStoredLead } from "../app/api/leads/delivery.ts";

let storedLeads;
let claimedLeads;
let requestedBatchLimit;
const previousSecret = process.env.LEAD_RETRY_SECRET;
const previousToken = process.env.HUBSPOT_ACCESS_TOKEN;

beforeEach(() => {
  process.env.LEAD_RETRY_SECRET = "test-retry-secret";
  process.env.HUBSPOT_ACCESS_TOKEN = "test-token-never-used";
  storedLeads = new Map();
  claimedLeads = new Set();
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
    getDuePendingLeads: async (limit) => {
      requestedBatchLimit = limit;
      return [...storedLeads.values()].filter((lead) => lead.status === "pending").slice(0, limit);
    },
    claimLead: async (requestId) => {
      if (claimedLeads.has(requestId)) return false;
      claimedLeads.add(requestId);
      return true;
    },
    releaseLeadClaim: async (requestId) => { claimedLeads.delete(requestId); }
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
  const fetchMock = mock.method(globalThis, "fetch", async (url) => {
    if (String(url).endsWith("/contacts/search")) return new Response(JSON.stringify({ results: [] }), { status: 200 });
    return responses.shift();
  });
  t.after(() => fetchMock.mock.restore());

  const request = new NextRequest("https://preview.example.test/api/leads/retry", {
    method: "POST",
    headers: { authorization: "Bearer test-retry-secret" }
  });
  const response = await POST(request);
  assert.equal(response.status, 200);
  assert.equal(requestedBatchLimit, 4, "retry route must use the bounded batch size");
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


test("prevents concurrent initial and scheduled delivery of the same lead", async (t) => {
  const lead = storedLeads.get("SOL-TEST0000");
  let signalFetchStarted;
  const fetchStarted = new Promise((resolve) => { signalFetchStarted = resolve; });
  let resolveFetch;
  const fetchMock = mock.method(globalThis, "fetch", async (url) => {
    if (String(url).endsWith("/contacts/search")) return new Response(JSON.stringify({ results: [] }), { status: 200 });
    signalFetchStarted();
    return await new Promise((resolve) => { resolveFetch = resolve; });
  });
  t.after(() => fetchMock.mock.restore());

  const firstDelivery = deliverStoredLead(lead.requestId);
  await fetchStarted;
  const competingDelivery = await deliverStoredLead(lead.requestId);

  assert.equal(fetchMock.mock.callCount(), 2, "only the worker holding the claim may reconcile and call HubSpot");
  assert.equal(competingDelivery.status, "pending", "the competing worker observes the current durable state");

  resolveFetch(new Response(JSON.stringify({ id: "contact-concurrent" }), { status: 201 }));
  const delivered = await firstDelivery;
  assert.equal(delivered.status, "sent");
  assert.equal(storedLeads.get(lead.requestId).status, "sent");
  assert.equal(fetchMock.mock.callCount(), 2);
});
