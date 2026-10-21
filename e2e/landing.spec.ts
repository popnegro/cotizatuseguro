import { expect, test } from '@playwright/test';

test('landing muestra los seis productos del PMV y el formulario', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /tu tranquilidad empieza con la cobertura adecuada/i })).toBeVisible();
  await expect(page.locator('#cotizar')).toBeVisible();
  await expect(page.locator('#seguros .coverage-grid button.coverage-action')).toHaveCount(6);
  await expect(page.locator('#product option')).toHaveCount(6);
  await expect(page.locator('#aseguradoras .assurance-card')).toHaveCount(4);
  await expect(page.locator('#faq details.faq')).toHaveCount(6);
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
  await expect(page.getByRole('button', { name: /registrar y continuar por whatsapp/i })).toBeVisible();
});

test('rechazar consentimiento mantiene bloqueadas las etiquetas de medición', async ({ page }) => {
  const analyticsRequests: string[] = [];
  page.on('request', (request) => {
    if (/googletagmanager\.com|google-analytics\.com|connect\.facebook\.net|facebook\.com\/tr/i.test(request.url())) {
      analyticsRequests.push(request.url());
    }
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Rechazar' }).click();
  await expect(page.getByLabel('Preferencias de privacidad')).toHaveCount(0);
  await page.waitForTimeout(500);
  expect(analyticsRequests).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('analytics-consent'))).toBe('rejected');
});

test('aceptar consentimiento carga Meta Pixel y encola PageView', async ({ page }) => {
  await page.route('https://connect.facebook.net/en_US/fbevents.js', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `window.__metaCalls = window.fbq?.queue?.map((args) => [...args]) || [];
        if (window.fbq) {
          window.fbq.callMethod = (...args) => window.__metaCalls.push(args);
          window.fbq.queue = [];
        }`
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Aceptar medición' }).click();
  await expect(page.getByLabel('Preferencias de privacidad')).toHaveCount(0);
  await expect(page.locator('#meta-pixel-loader')).toHaveCount(1);
  await expect.poll(async () => page.evaluate(() => window.__metaCalls?.length || 0)).toBeGreaterThanOrEqual(2);
  const calls = await page.evaluate(() => window.__metaCalls || []);
  expect(calls.some((args) => args[0] === 'init' && args[1] === '123456789012345')).toBe(true);
  expect(calls.some((args) => args[0] === 'track' && args[1] === 'PageView')).toBe(true);
  // GTM is intentionally not configured in the isolated test build.
  expect(await page.locator('#gtm-loader').count()).toBe(0);
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
  await page.getByRole('button', { name: /registrar y continuar por whatsapp/i }).click();
  expect(leadApiCalls).toBe(0);
});

test('la pagina de privacidad se abre y contiene informacion de tratamiento', async ({ page }) => {
  await page.goto('/privacidad');
  await expect(page.locator('body')).toContainText(/privacidad|datos personales|cotización/i);
});

test('solicitud valida envía Meta Lead solo tras éxito de API y sin datos personales', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('analytics-consent', 'accepted'));
  await page.route('https://connect.facebook.net/en_US/fbevents.js', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `window.__metaCalls = window.fbq?.queue?.map((args) => [...args]) || [];
        if (window.fbq) {
          window.fbq.callMethod = (...args) => window.__metaCalls.push(args);
          window.fbq.queue = [];
        }`
    });
  });
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
  await page.getByLabel('Nombre y apellido *').fill('QA Playwright');
  await page.getByLabel('WhatsApp *').fill('+54 261 555 0101');
  await page.getByLabel('Email *').fill('qa.playwright@example.test');
  await page.getByLabel('Provincia *').fill('Mendoza');
  await page.getByLabel('Marca *').fill('Toyota');
  await page.getByLabel('Modelo *').fill('Etios');
  await page.getByLabel('Año *').fill('2022');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /registrar y continuar por whatsapp/i }).click();
  await expect.poll(() => leadRequests).toBe(1);
  await expect.poll(async () => page.evaluate(() => (window.__metaCalls || []).filter((args) => args[0] === 'track' && args[1] === 'Lead').length)).toBe(1);
  const leadCall = await page.evaluate(() => (window.__metaCalls || []).find((args) => args[0] === 'track' && args[1] === 'Lead'));
  expect(leadCall).toBeTruthy();
  expect(JSON.stringify(leadCall)).not.toMatch(/QA Playwright|qa\.playwright@example\.test|261 555 0101/i);
  await expect(page).toHaveURL(/https:\/\/wa\.me\/5492610000000\?text=/);
  expect(new URL(page.url()).searchParams.get('text')).toContain('SOL-QA123456');
});
