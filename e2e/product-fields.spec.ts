import { expect, test } from "@playwright/test";

// Keep the delayed consent banner from obscuring form controls in unrelated PMV tests.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("analytics-consent", "rejected"));
});

const productCases = [
  {
    product: "auto",
    label: "Autos",
    requiredFields: ["make", "model", "year"],
    forbiddenFields: ["homeSqm", "constructionMaterial", "wheelSize", "monthlyRent"],
  },
  {
    product: "moto",
    label: "Motos",
    requiredFields: ["make", "model", "year"],
    forbiddenFields: ["homeSqm", "constructionMaterial", "wheelSize", "monthlyRent"],
  },
  {
    product: "hogar",
    label: "Hogar",
    requiredFields: ["homeSqm", "location", "occupancy"],
    forbiddenFields: ["make", "constructionMaterial", "wheelSize", "monthlyRent"],
  },
  {
    product: "consorcio",
    label: "Consorcio",
    requiredFields: ["homeSqm", "location", "constructionMaterial", "activity"],
    forbiddenFields: ["make", "occupancy", "wheelSize", "monthlyRent"],
  },
  {
    product: "bicicletas",
    label: "Bicicleta",
    requiredFields: ["make", "model", "year", "wheelSize", "bikeMaterial", "insuredAmount"],
    forbiddenFields: ["homeSqm", "constructionMaterial", "monthlyRent"],
  },
  {
    product: "caucion_alquiler",
    label: "Caución alquiler",
    requiredFields: ["monthlyRent", "contractDuration"],
    forbiddenFields: ["make", "homeSqm", "constructionMaterial", "wheelSize"],
  },
] as const;

for (const productCase of productCases) {
  test(`el producto ${productCase.label} muestra únicamente sus campos de riesgo`, async ({ page }) => {
    let leadApiCalls = 0;
    await page.route("**/api/leads", async (route) => {
      leadApiCalls += 1;
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "blocked in product field test" }),
      });
    });

    await page.goto("/");
    await page.locator("#cotizar").scrollIntoViewIfNeeded();
    await page.getByLabel("Tipo de seguro *").selectOption(productCase.product);
    await page.getByLabel("Nombre y apellido *").fill("QA Producto");
    await page.getByLabel("WhatsApp *").fill("+54 261 555 0101");
    await page.getByLabel("Email *").fill("qa.product@example.test");
    await page.getByLabel("Provincia *").selectOption("Mendoza");
    await page.getByRole("button", { name: /^continuar/i }).click();

    for (const fieldId of productCase.requiredFields) {
      await expect(page.locator(`#${fieldId}`), `expected #${fieldId} for ${productCase.product}`).toBeVisible();
      await expect(page.locator(`#${fieldId}`)).toHaveAttribute("required", "");
    }
    for (const fieldId of productCase.forbiddenFields) {
      await expect(page.locator(`#${fieldId}`), `unexpected #${fieldId} for ${productCase.product}`).toHaveCount(0);
    }

    await expect(page.getByRole("checkbox")).toBeVisible();
    await expect(page.getByRole("button", { name: /registrar y continuar por whatsapp/i })).toBeVisible();
    expect(leadApiCalls).toBe(0);
  });
}

for (const productCase of productCases) {
  test(`el formulario de ${productCase.label} no desborda en móvil (320 y 390 px)`, async ({ page }) => {
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/");
      await page.locator("#cotizar").scrollIntoViewIfNeeded();
      await page.getByLabel("Tipo de seguro *").selectOption(productCase.product);
      await page.getByLabel("Nombre y apellido *").fill("QA Producto");
      await page.getByLabel("WhatsApp *").fill("+54 261 555 0101");
      await page.getByLabel("Email *").fill("qa.product@example.test");
      await page.getByLabel("Provincia *").selectOption("Mendoza");
      await page.getByRole("button", { name: /^continuar/i }).click();

      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
      }));
      expect(
        dimensions.document,
        `${productCase.product} at ${width}px: document width ${dimensions.document} exceeds viewport ${dimensions.viewport}`,
      ).toBeLessThanOrEqual(dimensions.viewport);
      await expect(page.locator(`#${productCase.requiredFields[0]}`)).toBeVisible();
    }
  });
}

test("la solicitud conserva atribución UTM y gclid al registrar el lead", async ({ page }) => {
  let capturedPayload: Record<string, unknown> | null = null;
  await page.route("**/api/leads", async (route) => {
    capturedPayload = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, requestId: "SOL-QA123456" }),
    });
  });
  await page.route("https://wa.me/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<title>WhatsApp navigation intercepted by Playwright</title>",
    });
  });

  await page.goto("/?utm_source=qa-source&utm_medium=qa-medium&utm_campaign=pmv-regression&utm_content=cta-form&utm_term=seguro-auto&gclid=GCLID-QA-123");
  await page.locator("#cotizar").scrollIntoViewIfNeeded();
  await page.getByLabel("Nombre y apellido *").fill("QA Atribución");
  await page.getByLabel("WhatsApp *").fill("+54 261 555 0101");
  await page.getByLabel("Email *").fill("qa.attribution@example.test");
  await page.getByLabel("Provincia *").selectOption("Mendoza");
  await page.getByRole("button", { name: /^continuar/i }).click();
  await page.getByLabel("Marca *").fill("Toyota");
  await page.getByLabel("Modelo *").fill("Corolla");
  await page.getByLabel("Año *").fill("2022");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /registrar y continuar por whatsapp/i }).click();

  await expect.poll(() => capturedPayload).not.toBeNull();
  const payload = capturedPayload as unknown as { attribution: Record<string, string> };
  expect(payload.attribution).toMatchObject({
    utm_source: "qa-source",
    utm_medium: "qa-medium",
    utm_campaign: "pmv-regression",
    utm_content: "cta-form",
    utm_term: "seguro-auto",
    gclid: "GCLID-QA-123",
  });
  await expect(page).toHaveURL(/https:\/\/wa\.me\//);
});
