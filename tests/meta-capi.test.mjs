import test, { afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { sendMetaLeadEvent, __setMetaCapiForTests } from "../app/api/leads/meta-capi.ts";

const previousPixel = process.env.META_PIXEL_ID;
const previousPublicPixel = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const previousToken = process.env.META_CAPI_ACCESS_TOKEN;
const previousSite = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  mock.restoreAll();
  __setMetaCapiForTests(undefined);
  for (const [key, value] of [
    ["META_PIXEL_ID", previousPixel],
    ["NEXT_PUBLIC_META_PIXEL_ID", previousPublicPixel],
    ["META_CAPI_ACCESS_TOKEN", previousToken],
    ["NEXT_PUBLIC_SITE_URL", previousSite]
  ]) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function sampleLead(overrides = {}) {
  const now = Date.now();
  return {
    requestId: "SOL-AB12CD34",
    properties: {
      email: "qa@example.test",
      insurance_request_id: "SOL-AB12CD34",
      insurance_product: "auto",
      fbclid: "fbclid-test-value"
    },
    status: "sent",
    attempts: 1,
    nextAttemptAt: 0,
    createdAt: now - 5_000,
    updatedAt: now,
    eventContext: {
      clientIp: "203.0.113.10",
      userAgent: "Mozilla/5.0 QA",
      fbp: "fb.1.123.456"
    },
    ...overrides
  };
}

test("skips when Meta CAPI is not configured", async () => {
  delete process.env.META_PIXEL_ID;
  delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
  delete process.env.META_CAPI_ACCESS_TOKEN;
  const fetchMock = mock.method(globalThis, "fetch", async () => {
    throw new Error("fetch must not run when CAPI is not configured");
  });
  const result = await sendMetaLeadEvent(sampleLead());
  assert.deepEqual(result, { status: "skipped", reason: "meta_capi_not_configured" });
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("sends Lead event with event_id, action_source website, and no PII", async () => {
  process.env.META_PIXEL_ID = "1635609034873051";
  process.env.META_CAPI_ACCESS_TOKEN = "test-capi-token";
  process.env.NEXT_PUBLIC_SITE_URL = "https://cotizatuseguro.com.ar";

  let capturedUrl = "";
  let capturedBody;
  const fetchMock = mock.method(globalThis, "fetch", async (url, init) => {
    capturedUrl = String(url);
    capturedBody = JSON.parse(String(init.body));
    return new Response(JSON.stringify({ events_received: 1 }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  });

  const result = await sendMetaLeadEvent(sampleLead());
  assert.equal(result.status, "sent");
  assert.equal(result.eventsReceived, 1);
  assert.equal(fetchMock.mock.callCount(), 1);
  assert.match(capturedUrl, /graph\.facebook\.com\/v21\.0\/1635609034873051\/events/);
  assert.match(capturedUrl, /access_token=test-capi-token/);

  const event = capturedBody.data[0];
  assert.equal(event.event_name, "Lead");
  assert.equal(event.event_id, "SOL-AB12CD34");
  assert.equal(event.action_source, "website");
  assert.equal(event.event_source_url, "https://cotizatuseguro.com.ar");
  assert.equal(event.user_data.client_ip_address, "203.0.113.10");
  assert.equal(event.user_data.client_user_agent, "Mozilla/5.0 QA");
  assert.equal(event.user_data.fbp, "fb.1.123.456");
  assert.equal(event.custom_data.content_category, "auto");
  assert.equal(event.user_data.em, undefined);
  assert.equal(event.user_data.ph, undefined);
  assert.equal(event.user_data.fn, undefined);
  assert.equal(event.user_data.ln, undefined);
  const serialized = JSON.stringify(capturedBody);
  assert.doesNotMatch(serialized, /qa@example\.test/);
});

test("builds fbc from fbclid when _fbc cookie is absent", async () => {
  process.env.META_PIXEL_ID = "1635609034873051";
  process.env.META_CAPI_ACCESS_TOKEN = "test-capi-token";

  let capturedBody;
  mock.method(globalThis, "fetch", async (_url, init) => {
    capturedBody = JSON.parse(String(init.body));
    return new Response(JSON.stringify({ events_received: 1 }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  });

  const lead = sampleLead({
    eventContext: { clientIp: "203.0.113.10", userAgent: "QA" }
  });
  await sendMetaLeadEvent(lead);
  assert.match(capturedBody.data[0].user_data.fbc, /^fb\.1\.\d+\.fbclid-test-value$/);
});

test("returns failed on upstream HTTP errors without throwing", async () => {
  process.env.META_PIXEL_ID = "1635609034873051";
  process.env.META_CAPI_ACCESS_TOKEN = "test-capi-token";
  mock.method(globalThis, "fetch", async () =>
    new Response("nope", { status: 400 })
  );
  const result = await sendMetaLeadEvent(sampleLead());
  assert.deepEqual(result, { status: "failed", reason: "meta_capi_http_400" });
});
