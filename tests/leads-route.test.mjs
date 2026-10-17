import test from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";
import { NextRequest } from "next/server";
import { POST } from "../app/api/leads/route.ts";

test("creates a lead using HubSpot properties without calling the live CRM", async (t) => {
  const previousToken = process.env.HUBSPOT_ACCESS_TOKEN;
  process.env.HUBSPOT_ACCESS_TOKEN = "test-token-never-used";
  t.after(() => {
    if (previousToken === undefined) delete process.env.HUBSPOT_ACCESS_TOKEN;
    else process.env.HUBSPOT_ACCESS_TOKEN = previousToken;
  });

  let captured;
  const fetchMock = mock.method(globalThis, "fetch", async (url, init) => {
    assert.equal(url, "https://api.hubapi.com/crm/v3/objects/contacts");
    assert.equal(init.method, "POST");
    assert.equal(init.headers.Authorization, "Bearer test-token-never-used");
    captured = JSON.parse(init.body);
    return new Response(JSON.stringify({ id: "test-contact-id" }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  });
  t.after(() => fetchMock.mock.restore());

  const request = new NextRequest("https://preview.example.test/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "192.0.2.10" },
    body: JSON.stringify({
      name: "QA Integration",
      phone: "+54 261 555 0101",
      city: "Mendoza",
      product: "auto",
      details: { make: "QA", model: "Test", year: "2024" },
      attribution: {
        utm_source: "qa", utm_medium: "test", utm_campaign: "p0-validation",
        utm_content: "unit-test", utm_term: "test", gclid: "gclid-test", fbclid: "fbclid-test"
      }
    })
  });

  const response = await POST(request);
  assert.equal(response.status, 201);
  const payload = await response.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.contactId, "test-contact-id");
  assert.match(payload.requestId, /^SOL-[A-F0-9]{8}$/);
  assert.equal(fetchMock.mock.callCount(), 1);
  assert.equal(captured.properties.firstname, "QA Integration");
  assert.equal(captured.properties.insurance_product, "auto");
  assert.equal(captured.properties.utm_source, "qa");
  assert.equal(captured.properties.utm_campaign, "p0-validation");
  assert.equal(captured.properties.gclid, "gclid-test");
  assert.equal(captured.properties.fbclid, "fbclid-test");
  assert.equal(captured.properties.insurance_request_id, payload.requestId);
});

test("rejects invalid input before contacting HubSpot", async (t) => {
  const previousToken = process.env.HUBSPOT_ACCESS_TOKEN;
  process.env.HUBSPOT_ACCESS_TOKEN = "test-token-never-used";
  t.after(() => {
    if (previousToken === undefined) delete process.env.HUBSPOT_ACCESS_TOKEN;
    else process.env.HUBSPOT_ACCESS_TOKEN = previousToken;
  });
  const fetchMock = mock.method(globalThis, "fetch", async () => {
    throw new Error("Fetch must not run for invalid input");
  });
  t.after(() => fetchMock.mock.restore());

  const request = new NextRequest("https://preview.example.test/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "192.0.2.11" },
    body: JSON.stringify({ name: "x", phone: "1", city: "Mendoza", product: "invalid" })
  });
  const response = await POST(request);
  assert.equal(response.status, 400);
  assert.equal(fetchMock.mock.callCount(), 0);
});