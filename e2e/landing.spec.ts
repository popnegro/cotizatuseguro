import { expect, test } from '@playwright/test';

async function waitForConsentBanner(page: import('@playwright/test').Page) {
  await expect(page.getByLabel('Preferencias de privacidad')).toBeVisible({ timeout: 5000 });
}

test('landing muestra los seis productos del PMV y el formulario', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /tu tranquilidad empieza con la cobertura adecuada/i })).toBeVisible();
  await expect(page.locator('#cotizar')).toBeVisible();
  await expect(page.locator('#seguros .coverage-grid button.coverage-action')).toHaveCount(6);
  await expect(page.locator('#product option')).toHaveCount(6);
  await expect(page.locator('#aseguradoras .assurance-card')).toHaveCount(4);
  await expect(page.locator('#aseguradoras .company-chip')).toHaveCount(7);
  await expect(page.locator('#faq details.faq')).toHaveCount(6);
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
  // Paso 1 del formulario: Continuar (el envío final está en el paso 2)
  await expect(page.getByRole('button', { name: /^continuar/i })).toBeVisible();
  await expect(page.locator('.form-stepper')).toBeVisible();
});

test('rechazar consentimiento mantiene bloqueadas las etiquetas de medición', async ({ page }) => {
  const analyticsRequests: string[] = [];
  page.on('request', (request) => {
    if (/googletagmanager\.com|google-analytics\.com|connect\.facebook\.net|facebook\.com\/tr/i.test(request.url())) {
      analyticsRequests.push(request.url());
    }
  });
  await page.goto('/');
  await waitForConsentBanner(page);
  await page.getByRole('button', { name: 'Rechazar' }).click();
  await expect(page.getByLabel('Preferencias de privacidad')).toHaveCount(0);
  await page.waitForTimeout(500);
  expect(analyticsRequests).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('analytics-consent'))).toBe('rejected');
});

test('aceptar consentimiento carga GTM una sola vez si hay ID configurado', async ({ page }) => {
  await page.goto('/');
  await waitForConsentBanner(page);
  await page.getByRole('button', { name: 'Aceptar' }).click();
  await expect(page.getByLabel('Preferencias de privacidad')).toHaveCount(0);
  const loaderCount = await page.locator('#gtm-loader').count();
  // The local test server intentionally has no GTM ID; acceptance must not fabricate one.
  expect(loaderCount).toBe(0);
  expect(await page.evaluate(() => localStorage.getItem('analytics-consent'))).toBe('accepted');
});

test('el formulario invalido no intenta enviar leads ni llamar a HubSpot', async ({ page }) => {
  let leadApiCalls = 0;
  await page.route('**/api/leads', async (route) => {
    leadApiCalls += 1;
    await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'blocked in test' }) });
  });
  await page.goto('/');
  await page.locator('#cotizar').scrollIntoViewIfNeeded();
  // Paso 1 vacío: Continuar valida en cliente y no llama a la API
  await page.getByRole('button', { name: /^continuar/i }).click();
  await expect(page.getByRole('alert').first()).toBeVisible();
  expect(leadApiCalls).toBe(0);
});

test('la pagina de privacidad se abre y contiene informacion de tratamiento', async ({ page }) => {
  await page.goto('/privacidad');
  await expect(page.locator('body')).toContainText(/privacidad|datos personales|cotización/i);
  await expect(page.locator('.legal-shell')).toBeVisible();
  await expect(page.locator('header.site-header')).toBeVisible();
  await expect(page.locator('footer.site-footer')).toBeVisible();
  await expect(page.getByRole('heading', { name: /política de privacidad/i })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
  await expect(page.getByRole('link', { name: /solicitar cotización/i }).first()).toBeVisible();
});

test('solicitud valida usa la API simulada y construye el enlace de WhatsApp', async ({ page }) => {
  let leadRequests = 0;
  await page.route('**/api/leads', async (route) => {
    leadRequests += 1;
    const payload = route.request().postDataJSON();
    expect(payload).toMatchObject({
      name: 'QA Playwright',
      email: 'qa.playwright@example.test',
      product: 'auto',
      website: '',
    });
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, requestId: 'SOL-QA123456' }),
    });
  });
  await page.route('https://wa.me/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'text/html', body: '<title>WhatsApp navigation intercepted by Playwright</title>' });
  });

  await page.goto('/');
  await page.locator('#cotizar').scrollIntoViewIfNeeded();

  // Paso 1 — contacto
  await page.getByLabel('Nombre y apellido *').fill('QA Playwright');
  await page.getByLabel('WhatsApp *').fill('+54 261 555 0101');
  await page.getByLabel('Email *').fill('qa.playwright@example.test');
  await page.getByLabel('Provincia *').selectOption('Mendoza');
  await page.getByRole('button', { name: /^continuar/i }).click();

  // Paso 2 — detalle del riesgo + privacidad
  await expect(page.getByRole('button', { name: /registrar y continuar por whatsapp/i })).toBeVisible();
  await page.getByLabel('Marca *').fill('Toyota');
  await page.getByLabel('Modelo *').fill('Etios');
  await page.getByLabel('Año *').fill('2022');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /registrar y continuar por whatsapp/i }).click();

  await expect.poll(() => leadRequests).toBe(1);
  await expect(page).toHaveURL(/https:\/\/wa\.me\/5492610000000\?text=/);
  expect(new URL(page.url()).searchParams.get('text')).toContain('SOL-QA123456');
});
