import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const canonicalOrigin = "https://cotizatuseguro.com.ar";

test("site metadata pins canonical and Open Graph to the apex domain", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /const productionSiteUrl = "https:\/\/cotizatuseguro\.com\.ar"/);
  assert.match(layout, /alternates: \{ canonical: "\/" \}/);
  assert.match(layout, /url: productionSiteUrl/);
  assert.doesNotMatch(layout, /https:\/\/www\.cotizatuseguro\.com\.ar/);
});

test("robots and sitemap advertise the same canonical origin", async () => {
  const robots = await readFile(new URL("../app/robots.ts", import.meta.url), "utf8");
  const sitemap = await readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8");
  assert.ok(robots.includes(canonicalOrigin));
  assert.ok(sitemap.includes(canonicalOrigin));
  assert.ok(robots.includes("${productionSiteUrl}/sitemap.xml"));
  assert.ok(sitemap.includes("${productionSiteUrl}/privacidad"));
  assert.doesNotMatch(robots + sitemap, /https:\/\/www\.cotizatuseguro\.com\.ar/);
});

test("privacy page canonical, Open Graph URL, and body use the canonical origin", async () => {
  const privacy = await readFile(new URL("../app/privacidad/page.tsx", import.meta.url), "utf8");
  assert.match(privacy, /alternates: \{ canonical: "\/privacidad" \}/);
  assert.ok(privacy.includes('url: "https://cotizatuseguro.com.ar/privacidad"'));
  assert.ok(privacy.includes("https://cotizatuseguro.com.ar/"));
  assert.doesNotMatch(privacy, /https:\/\/www\.cotizatuseguro\.com\.ar/);
});
