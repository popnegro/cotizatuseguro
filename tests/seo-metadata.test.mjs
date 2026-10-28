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
  assert.ok(robots.includes("sitemap: `${productionSiteUrl}/sitemap.xml`"));
  assert.ok(sitemap.includes("`${productionSiteUrl}/privacidad`"));
  assert.doesNotMatch(robots + sitemap, /https:\/\/www\.cotizatuseguro\.com\.ar/);
});

test("privacy page canonical, Open Graph URL, and body use the canonical origin", async () => {
  const privacy = await readFile(new URL("../app/privacidad/page.tsx", import.meta.url), "utf8");
  assert.match(privacy, /alternates: \{ canonical: "\/privacidad" \}/);
  assert.ok(privacy.includes('url: "https://cotizatuseguro.com.ar/privacidad"'));
  assert.ok(privacy.includes("https://cotizatuseguro.com.ar/"));
  assert.doesNotMatch(privacy, /https:\/\/www\.cotizatuseguro\.com\.ar/);
});

test("homepage declares Open Graph and Twitter large social preview metadata", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const image = await readFile(new URL("../app/opengraph-image.tsx", import.meta.url), "utf8");
  assert.ok(layout.includes('url: "/opengraph-image", width: 1200, height: 630'));
  assert.ok(layout.includes('card: "summary_large_image"'));
  assert.ok(layout.includes('images: ["/opengraph-image"]'));
  assert.ok(image.includes('export const size = { width: 1200, height: 630 }'));
  assert.ok(image.includes("Cotizá tu seguro"));
});

test("privacy page exposes a navigable table of contents with stable section anchors", async () => {
  const privacy = await readFile(new URL("../app/privacidad/page.tsx", import.meta.url), "utf8");
  assert.ok(privacy.includes('aria-label="Índice de la política de privacidad"'));
  assert.ok(privacy.includes('id={`seccion-${index + 1}`}'));
  assert.ok(privacy.includes('href={`#seccion-${index + 1}`}'));
});
