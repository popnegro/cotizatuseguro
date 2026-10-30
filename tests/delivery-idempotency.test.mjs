import test, { afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { deliverLead, deliverStoredLead } from "../app/api/leads/delivery.ts";
import { __setLeadStoreForTests } from "../app/api/leads/lead-store.ts";

const previousToken = process.env.HUBSPOT_ACCESS_TOKEN;

afterEach(() => {
  mock.restoreAll();
  if (previousToken === undefined) delete process.env.HUBSPOT_ACCESS_TOKEN;
  else process.env.HUBSPOT_ACCESS_TOKEN = previousToken;
});

function lead(overrides = {}) {
  const now = Date.now();
  return {
    requestId: "SOL-AB12CD34",
    properties: {
      email: "qa@example.test",
      insurance_request_id: "SOL-AB12CD34",
      insurance_product: "auto"
    },
    status: "pending",
    attempts: 1,
    nextAttemptAt: now - 1,
    createdAt: now - 10_000,
    updatedAt: now - 1_000,
    ...overrides
  };
}

test("reconciles a contact created before a lost response without creating a duplicate", async () => {
  process.env.HUBSPOT_ACCESS_TOKEN = "test-token-never-used";
  const fetchMock = mock.method(globalThis, "fetch", async (url, init) => {
    assert.equal(url, "https://api.hubapi.com/crm/v3/objects/contacts/search");
    assert.equal(init.method, "POST");
    const body = JSON.parse(String(init.body));
    assert.equal(body.filterGroups[0].filters[0].propertyName, "insurance_request_id");
    assert.equal(body.filterGroups[0].filters[0].value, "SOL-AB12CD34");
    return new Response(JSON.stringify({ results: [{ id: "existing-contact-42" }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  });

  const result = await deliverLead(lead());
  assert.deepEqual(result, { status: "sent", contactId: "existing-contact-42" });
  assert.equal(fetchMock.mock.callCount(), 1, "must not POST a second contact when reconciliation finds one");
});

test("creates a contact only after reconciliation succeeds and finds no existing contact", async () => {
  process.env.HUBSPOT_ACCESS_TOKEN = "test-token-never-used";
  const responses = [
    new Response(JSON.stringify({ results: [] }), { status: 200, headers: { "Content-Type": "application/json" } }),
    new Response(JSON.stringify({ id: "new-contact-43" }), { status: 201, headers: { "Content-Type": "application/json" } })
  ];
  const fetchMock = mock.method(globalThis, "fetch", async (url, init) => {
    if (url === "https://api.hubapi.com/crm/v3/objects/contacts/search") {
      assert.equal(init.method, "POST");
    } else {
      assert.equal(url, "https://api.hubapi.com/crm/v3/objects/contacts");
      assert.equal(init.method, "POST");
    }
    return responses.shift();
  });

  const result = await deliverLead(lead());
  assert.deepEqual(result, { status: "sent", contactId: "new-contact-43" });
  assert.equal(fetchMock.mock.callCount(), 2);
});

test("keeps a retry pending when reconciliation fails and does not risk a duplicate contact", async () => {
  process.env.HUBSPOT_ACCESS_TOKEN = "test-token-never-used";
  const fetchMock = mock.method(globalThis, "fetch", async () =>
    new Response("temporary HubSpot search failure", { status: 503 })
  );

  const result = await deliverLead(lead());
  assert.deepEqual(result, {
    status: "pending",
    errorCode: "hubspot_reconciliation_http_503",
    retryable: true
  });
  assert.equal(fetchMock.mock.callCount(), 1, "must not create a contact if duplicate reconciliation failed");
});

test("fails closed when a retried lead has no stable HubSpot request ID", async () => {
  process.env.HUBSPOT_ACCESS_TOKEN = "test-token-never-used";
  const fetchMock = mock.method(globalThis, "fetch", async () => {
    throw new Error("HubSpot must not be called without a stable request ID");
  });

  const result = await deliverLead(lead({ properties: { email: "qa@example.test" } }));
  assert.deepEqual(result, {
    status: "pending",
    errorCode: "hubspot_reconciliation_missing_request_id",
    retryable: true
  });
  assert.equal(fetchMock.mock.callCount(), 0);
});


test("persists the first delivery attempt before contacting HubSpot and reconciles after a lost response", async () => {
  process.env.HUBSPOT_ACCESS_TOKEN = "test-token-never-used";
  const initial = lead({ attempts: 0 });
  const stored = structuredClone(initial);
  let attemptPersistedBeforeSearch = false;
  __setLeadStoreForTests({
    getLead: async () => structuredClone(stored),
    updateLead: async (next) => {
      Object.assign(stored, structuredClone(next));
      if (next.attempts === 1 && next.status === "pending") attemptPersistedBeforeSearch = true;
    },
    claimLead: async () => true,
    releaseLeadClaim: async () => {}
  });
  const fetchMock = mock.method(globalThis, "fetch", async (url) => {
    assert.equal(url, "https://api.hubapi.com/crm/v3/objects/contacts/search");
    assert.equal(attemptPersistedBeforeSearch, true, "attempt must be durable before any outbound CRM request");
    return new Response(JSON.stringify({ results: [{ id: "contact-after-lost-response" }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  });

  const result = await deliverStoredLead(initial.requestId);
  assert.equal(result.status, "sent");
  assert.equal(result.contactId, "contact-after-lost-response");
  assert.equal(stored.attempts, 1);
  assert.equal(stored.status, "sent");
  assert.equal(fetchMock.mock.callCount(), 1, "existing contact must be reconciled without a duplicate create");
  __setLeadStoreForTests(undefined);
});
