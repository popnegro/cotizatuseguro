import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";
import { NextRequest } from "next/server.js";
import { POST, __setRateLimitForTests } from "../app/api/leads/route.ts";

beforeEach(() => __setRateLimitForTests(async () => ({ success: true, reset: Date.now() + 60_000 })));
afterEach(() => __setRateLimitForTests(undefined));

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
      email: "qa.integration@example.test",
      phone: "+54 261 555 0101",
      province: "Mendoza",
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
  assert.equal(captured.properties.email, "qa.integration@example.test");
  assert.equal(captured.properties.firstname, "QA");
  assert.equal(captured.properties.lastname, "Integration");
  assert.equal(captured.properties.state, "Mendoza");
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

test("accepts only the six PMV products and omits blank attribution", async (t) => {
  const previousToken = process.env.HUBSPOT_ACCESS_TOKEN;
  process.env.HUBSPOT_ACCESS_TOKEN = "test-token-never-used";
  t.after(() => {
    if (previousToken === undefined) delete process.env.HUBSPOT_ACCESS_TOKEN;
    else process.env.HUBSPOT_ACCESS_TOKEN = previousToken;
  });

  const validProducts = [
    "auto", "moto", "hogar", "consorcio", "bicicletas", "caucion_alquiler"
  ];
  const unsupportedProducts = ["comercio", "vida", "accidentes_personales", "art", "viajes"];
  const capturedPayloads = [];
  const detailsByProduct = {
    auto: { make: "QA", model: "Test", year: "2024" },
    moto: { make: "QA", model: "Test", year: "2024" },
    hogar: { homeSqm: "80", location: "Mendoza", occupancy: "propia" },
    consorcio: { homeSqm: "800", location: "Mendoza", constructionMaterial: "hormigón", activity: "vivienda" },
    bicicletas: { make: "QA", model: "Test", year: "2024", wheelSize: "29", bikeMaterial: "aluminio", insuredAmount: "500000" },
    caucion_alquiler: { monthlyRent: "250000", contractDuration: "24" }
  };
  const fetchMock = mock.method(globalThis, "fetch", async (_url, init) => {
    capturedPayloads.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ id: "test-contact-id" }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  });
  t.after(() => fetchMock.mock.restore());

  for (const [index, product] of validProducts.entries()) {
    const request = new NextRequest("https://preview.example.test/api/leads", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": `192.0.2.${20 + index}`
      },
      body: JSON.stringify({
        name: "QA Test",
        email: "qa.test@example.test",
        phone: "+54 261 555 0101",
        province: "Mendoza",
        city: ["hogar", "consorcio"].includes(product) ? "Mendoza" : "",
        product,
        details: detailsByProduct[product] || {},
        attribution: { utm_source: "  ", utm_medium: "", gclid: "  " }
      })
    });
    const response = await POST(request);
    assert.equal(response.status, 201, `product rejected: ${product}`);
  }

  for (const [index, product] of unsupportedProducts.entries()) {
    const request = new NextRequest("https://preview.example.test/api/leads", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": `192.0.2.${100 + index}`
      },
      body: JSON.stringify({
        name: "QA Test",
        email: "qa.test@example.test",
        phone: "+54 261 555 0101",
        province: "Mendoza",
        product,
        details: {}
      })
    });
    const response = await POST(request);
    assert.equal(response.status, 400, `unsupported product accepted: ${product}`);
  }

  assert.equal(fetchMock.mock.callCount(), validProducts.length);
  assert.deepEqual(
    capturedPayloads.map(({ properties }) => properties.insurance_product),
    validProducts
  );
  for (const { properties } of capturedPayloads) {
    assert.equal(properties.city, "Mendoza", "empty city should fall back to province");
    assert.equal(properties.lead_source, "direct");
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"]) {
      assert.equal(Object.hasOwn(properties, key), false, `unexpected blank attribution property: ${key}`);
    }
  }
});

test("requires contact email, province, and product-specific details before contacting HubSpot", async (t) => {
  const previousToken = process.env.HUBSPOT_ACCESS_TOKEN;
  process.env.HUBSPOT_ACCESS_TOKEN = "test-token-never-used";
  t.after(() => {
    if (previousToken === undefined) delete process.env.HUBSPOT_ACCESS_TOKEN;
    else process.env.HUBSPOT_ACCESS_TOKEN = previousToken;
  });
  const fetchMock = mock.method(globalThis, "fetch", async () => {
    throw new Error("HubSpot must not be called for incomplete data");
  });
  t.after(() => fetchMock.mock.restore());

  const incompletePayloads = [
    { name: "QA Test", phone: "+54 261 555 0101", province: "Mendoza", product: "auto", details: { make: "Fiat", model: "Cronos", year: "2022" } },
    { name: "QA Test", email: "qa@example.test", phone: "+54 261 555 0101", product: "auto", details: { make: "Fiat", model: "Cronos", year: "2022" } },
    { name: "QA Test", email: "qa@example.test", phone: "+54 261 555 0101", province: "Mendoza", product: "bicicletas", details: { make: "Trek" } }
  ];
  for (const [index, body] of incompletePayloads.entries()) {
    const request = new NextRequest("https://preview.example.test/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": `192.0.2.${70 + index}` },
      body: JSON.stringify(body)
    });
    const response = await POST(request);
    assert.equal(response.status, 400);
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});


test("maps HubSpot duplicate and transient failures to safe client responses", async (t) => {
  const previousToken = process.env.HUBSPOT_ACCESS_TOKEN;
  process.env.HUBSPOT_ACCESS_TOKEN = "test-token-never-used";
  t.after(() => {
    if (previousToken === undefined) delete process.env.HUBSPOT_ACCESS_TOKEN;
    else process.env.HUBSPOT_ACCESS_TOKEN = previousToken;
  });

  const cases = [
    { upstreamStatus: 409, expectedStatus: 409 },
    { upstreamStatus: 429, expectedStatus: 503 },
    { upstreamStatus: 500, expectedStatus: 503 },
    { upstreamStatus: 400, expectedStatus: 502 }
  ];

  for (const [index, scenario] of cases.entries()) {
    const fetchMock = mock.method(globalThis, "fetch", async () => new Response(
      JSON.stringify({ message: "sensitive upstream details must not leak" }),
      { status: scenario.upstreamStatus, headers: { "Content-Type": "application/json" } }
    ));
    t.after(() => fetchMock.mock.restore());

    const request = new NextRequest("https://preview.example.test/api/leads", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": `192.0.2.${180 + index}`
      },
      body: JSON.stringify({
        name: "QA Failure",
        email: `qa.failure.${index}@example.test`,
        phone: "+54 261 555 0101",
        province: "Mendoza",
        product: "auto",
        details: { make: "QA", model: "Test", year: "2024" }
      })
    });

    const response = await POST(request);
    assert.equal(response.status, scenario.expectedStatus);
    const body = await response.json();
    assert.equal(body.ok, undefined);
    assert.doesNotMatch(JSON.stringify(body), /sensitive upstream details/);
    assert.equal(fetchMock.mock.callCount(), 1);
    fetchMock.mock.restore();
  }
});


test("rejects honeypot submissions before contacting HubSpot", async (t) => {
  const previousToken = process.env.HUBSPOT_ACCESS_TOKEN;
  process.env.HUBSPOT_ACCESS_TOKEN = "test-token-never-used";
  t.after(() => {
    if (previousToken === undefined) delete process.env.HUBSPOT_ACCESS_TOKEN;
    else process.env.HUBSPOT_ACCESS_TOKEN = previousToken;
  });

  const fetchMock = mock.method(globalThis, "fetch", async () => {
    throw new Error("HubSpot must not be called for honeypot submissions");
  });
  t.after(() => fetchMock.mock.restore());

  const request = new NextRequest("https://preview.example.test/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "192.0.2.245" },
    body: JSON.stringify({
      website: "https://spam.example",
      name: "QA Bot",
      email: "qa.bot@example.test",
      phone: "+54 261 555 0101",
      province: "Mendoza",
      product: "auto",
      details: { make: "QA", model: "Test", year: "2024" }
    })
  });

  const response = await POST(request);
  assert.equal(response.status, 400);
  assert.equal(fetchMock.mock.callCount(), 0);
});


test("enforces the shared per-IP limit under concurrent submissions and blocks excess requests before HubSpot", async (t) => {
  const previousToken = process.env.HUBSPOT_ACCESS_TOKEN;
  process.env.HUBSPOT_ACCESS_TOKEN = "test-token-never-used";
  t.after(() => {
    if (previousToken === undefined) delete process.env.HUBSPOT_ACCESS_TOKEN;
    else process.env.HUBSPOT_ACCESS_TOKEN = previousToken;
  });

  let accepted = 0;
  __setRateLimitForTests(async () => {
    accepted += 1;
    return { success: accepted <= 8, reset: Date.now() + 30_000 };
  });
  const fetchMock = mock.method(globalThis, "fetch", async () => new Response(
    JSON.stringify({ id: "test-contact-id" }),
    { status: 201, headers: { "Content-Type": "application/json" } }
  ));
  t.after(() => fetchMock.mock.restore());

  const requests = Array.from({ length: 12 }, (_, index) => new NextRequest("https://preview.example.test/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": "192.0.2.200" },
    body: JSON.stringify({
      name: "QA Concurrent", email: `qa.concurrent.${index}@example.test`,
      phone: "+54 261 555 0101", province: "Mendoza", product: "auto",
      details: { make: "QA", model: "Concurrent", year: "2024" }
    })
  }));
  const responses = await Promise.all(requests.map((request) => POST(request)));
  assert.equal(responses.filter((response) => response.status === 201).length, 8);
  const blocked = responses.filter((response) => response.status === 429);
  assert.equal(blocked.length, 4);
  assert.ok(Number(blocked[0].headers.get("Retry-After")) >= 1);
  assert.equal(fetchMock.mock.callCount(), 8);
});

test("fails closed when Redis rate limiting fails and never contacts HubSpot", async (t) => {
  const previousToken = process.env.HUBSPOT_ACCESS_TOKEN;
  process.env.HUBSPOT_ACCESS_TOKEN = "test-token-never-used";
  t.after(() => {
    if (previousToken === undefined) delete process.env.HUBSPOT_ACCESS_TOKEN;
    else process.env.HUBSPOT_ACCESS_TOKEN = previousToken;
  });
  __setRateLimitForTests(async () => { throw new Error("simulated Redis outage"); });
  const fetchMock = mock.method(globalThis, "fetch", async () => {
    throw new Error("HubSpot must not be called when Redis fails");
  });
  t.after(() => fetchMock.mock.restore());

  const request = new NextRequest("https://preview.example.test/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": "192.0.2.201" },
    body: JSON.stringify({
      name: "QA Redis", email: "qa.redis@example.test", phone: "+54 261 555 0101",
      province: "Mendoza", product: "auto", details: { make: "QA", model: "Redis", year: "2024" }
    })
  });
  const response = await POST(request);
  assert.equal(response.status, 503);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("invalid and honeypot submissions are rejected before rate limiting and HubSpot", async (t) => {
  let rateLimitCalls = 0;
  __setRateLimitForTests(async () => {
    rateLimitCalls += 1;
    return { success: true, reset: Date.now() + 60_000 };
  });
  const fetchMock = mock.method(globalThis, "fetch", async () => {
    throw new Error("HubSpot must not be called for blocked submissions");
  });
  t.after(() => fetchMock.mock.restore());

  const bodies = [
    { name: "x", email: "invalid", website: "" },
    {
      website: "bot-filled", name: "QA Bot", email: "qa.bot@example.test",
      phone: "+54 261 555 0101", province: "Mendoza", product: "auto",
      details: { make: "QA", model: "Bot", year: "2024" }
    }
  ];
  for (const body of bodies) {
    const request = new NextRequest("https://preview.example.test/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json", "x-real-ip": "192.0.2.202" },
      body: JSON.stringify(body)
    });
    assert.equal((await POST(request)).status, 400);
  }
  assert.equal(rateLimitCalls, 0);
  assert.equal(fetchMock.mock.callCount(), 0);
});
