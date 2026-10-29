import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const canonicalOrigin = "https://cotizatuseguro.com.ar";

test("site metadata pins canonical and Open Graph to the apex domain", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /const productionSiteUrl = "https:\/\/cotizatuseguro\.com\.ar"/);
  assert.match(layout, /alternates: \{ canonical: "\/" \}/);
  assert.match(layout, /url: productionSiteUrl/);
  assert.match(layout, /title: "Cotizá tu seguro en Argentina \| Agustín Montes"/);
  assert.match(layout, /description: "Solicitá asesoramiento para cotizar seguros/);
  assert.doesNotMatch(layout, /https:\/\/www\.cotizatuseguro\.com\.ar/);
});

test("robots and sitemap advertise the same canonical origin and only known routes", async () => {
  const robots = await readFile(new URL("../app/robots.ts", import.meta.url), "utf8");
  const sitemap = await readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8");
  assert.ok(robots.includes(canonicalOrigin));
  assert.ok(sitemap.includes(canonicalOrigin));
  assert.ok(robots.includes("sitemap: `${productionSiteUrl}/sitemap.xml`"));
  assert.ok(sitemap.includes("`${productionSiteUrl}/privacidad`"));
  assert.doesNotMatch(robots + sitemap, /https:\/\/www\.cotizatuseguro\.com\.ar/);
  assert.doesNotMatch(sitemap, /\/api\//);
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
  assert.match(layout, /const socialImagePath = "\/opengraph-image"/);
  assert.match(layout, /type: "image\/png",\s+width: 1200,\s+height: 630,\s+alt: socialImageAlt/);
  assert.match(layout, /card: "summary_large_image"/);
  assert.match(layout, /images: \[\{ url: socialImagePath, alt: socialImageAlt \}\]/);
  assert.ok(image.includes("export const size = { width: 1200, height: 630 }"));
  assert.ok(image.includes("Cotizá tu seguro"));
});

test("homepage includes factual structured data for the site, page, and named professional", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.ok(layout.includes('type="application/ld+json"'));
  assert.ok(layout.includes('"@context": "https://schema.org"'));
  assert.ok(layout.includes('"@type": "WebSite"'));
  assert.ok(layout.includes('"@type": "Person"'));
  assert.ok(layout.includes('"@type": "WebPage"'));
  assert.ok(layout.includes('name: "Agustín Montes"'));
  assert.ok(layout.includes('jobTitle: "Productor Asesor de Seguros"'));
  assert.ok(layout.includes("JSON.stringify(structuredData)"));
  assert.doesNotMatch(layout, /sameAs:|telephone:|streetAddress:|aggregateRating:/);
});

test("homepage content clarifies the quote is not a policy or guaranteed coverage", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /<h1>Cotizá tu seguro con asesoramiento personalizado\.<\/h1>/);
  assert.match(page, /no implica la emisión de una póliza ni garantiza la aprobación/);
  assert.match(page, /La aprobación y los requisitos dependen de la evaluación del proveedor/);
  assert.match(page, /condiciones de cada póliza/);
  assert.match(page, /¿De qué depende el precio de un seguro\?/);
  assert.match(page, /¿La solicitud garantiza que me otorguen la cobertura\?/);
  assert.doesNotMatch(page, /Superintendencia de Seguros de la Nación|registro oficial de la SSN|matrícula|habilitación profesional/i);
  assert.doesNotMatch(page, /sin avales propietarios|Protección integral para consorcios/);
});

test("static internal anchor links on the homepage point to existing IDs", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const ids = new Set([...page.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  const anchors = [...page.matchAll(/\bhref="#([^"]+)"/g)].map((match) => match[1]).filter(Boolean);
  const missing = [...new Set(anchors.filter((anchor) => !ids.has(anchor)))];
  assert.deepEqual(missing, [], `Missing internal anchor targets: ${missing.join(", ")}`);
});

test("privacy page exposes a navigable table of contents with stable section anchors", async () => {
  const privacy = await readFile(new URL("../app/privacidad/page.tsx", import.meta.url), "utf8");
  assert.ok(privacy.includes('aria-label="Índice de la política de privacidad"'));
  assert.ok(privacy.includes('id={`seccion-${index + 1}`}'));
  assert.ok(privacy.includes('href={`#seccion-${index + 1}`}'));
});
