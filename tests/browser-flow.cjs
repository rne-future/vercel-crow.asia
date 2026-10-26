const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');

async function main() {
  const base = process.env.E2E_BASE_URL || process.env.AUDIT_BASE_URL || 'http://localhost:4051';
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Browser tests require a local server with an isolated test database');
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    context.setDefaultTimeout(15000);
    context.setDefaultNavigationTimeout(30000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error' && /hydrat|did not match|server rendered/i.test(message.text())) errors.push(message.text()); });
    for (const route of ['/', '/login', '/checkout/tier-book-1', '/read/book-1/id/ch-0', '/read/book-1/id/ch-2']) {
      assert.equal((await page.goto(base + route)).status(), 200, route);
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `mobile overflow: ${route}`);
      await page.setViewportSize({ width: 1440, height: 1000 });
    }
    console.log('PASS public pages and mobile layout');
    await page.goto(base + '/login');
    await page.locator('#login-email').fill('admin@crow.asia');
    await page.locator('#login-password').fill('wrong-password');
    await page.locator('button[type=submit]').click();
    await page.getByRole('alert').waitFor();
    assert.ok(page.url().endsWith('/login'));
    await page.locator('#login-password').fill(process.env.E2E_PASSWORD || process.env.AUDIT_PASSWORD || 'audit-test-password');
    await page.locator('button[type=submit]').click();
    await page.waitForURL('**/dashboard');
    for (const route of ['/admin', '/admin/books', '/admin/chapters', '/admin/tiers', '/admin/orders', '/admin/users', '/admin/locales', '/admin/translations']) {
      assert.equal((await page.goto(base + route)).status(), 200, route);
    }
    await page.goto(base + '/admin/books?id=book-1');
    assert.equal(await page.locator('[name=price_single_idr]').inputValue(), '59000');
    await page.goto(base + '/admin/chapters?book_id=book-1&slug=ch-2');
    assert.equal(await page.locator('[name=chapter_index]').inputValue(), '2');
    console.log('PASS login, admin routes, and populated edit forms');
    await page.goto(base + '/read/book-1/id/ch-2');
    await page.getByRole('button', { name: 'Obsidian', exact: true }).click();
    assert.equal(await page.locator('[data-paper-theme]').first().getAttribute('data-paper-theme'), 'obsidian');
    await page.getByRole('button', { name: 'Ivory', exact: true }).click();
    await page.getByRole('tab').nth(1).click();
    await page.getByText('STUDIO VISUAL 16:9 • CROW.ASIA', { exact: true }).waitFor();
    await page.getByRole('tab').nth(0).click();
    await page.keyboard.press('Control+k');
    await page.getByRole('dialog').waitFor();
    const searchResponse = page.waitForResponse((response) => response.url().includes('/api/search?') && response.status() === 200);
    await page.getByRole('dialog').locator('input').fill('kalibrasi');
    await searchResponse;
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 0);
    const api = context.request;
    assert.equal((await api.post(base + '/api/checklists/toggle', { headers: { Origin: 'https://attacker.example' }, data: {} })).status(), 403);
    assert.equal((await api.post(base + '/api/webhooks/mayar', { headers: { 'x-callback-token': process.env.E2E_WEBHOOK_TOKEN || process.env.AUDIT_WEBHOOK_TOKEN || 'audit-webhook-token' }, data: { data: { invoiceId: {} } } })).status(), 400);
    assert.equal((await api.get(base + '/api/search?q=' + 'x'.repeat(201))).status(), 400);
    assert.equal((await api.get(base + '/read/book-1/id/ch-0/extra')).status(), 404);
    console.log('PASS SOS search and API validation');

    const buyer = await browser.newContext();
    buyer.setDefaultTimeout(15000);
    buyer.setDefaultNavigationTimeout(30000);
    const buyerPage = await buyer.newPage();
    buyerPage.on('pageerror', (error) => errors.push(error.message));
    buyerPage.on('console', (message) => { if (message.type() === 'error' && /hydrat|did not match|server rendered/i.test(message.text())) errors.push(message.text()); });
    const email = `audit-${crypto.randomUUID()}@example.test`;
    await buyerPage.goto(base + '/checkout/tier-book-1');
    await buyerPage.locator('#customer-email').fill(email);
    await buyerPage.locator('#customer-mobile').fill('081234567890');
    await buyerPage.locator('#checkout-password').fill('buyer-audit-password');
    await buyerPage.locator('button[type=submit]').click();
    await buyerPage.waitForURL('**/checkout/mock-pay/**');
    const orderNumber = new URL(buyerPage.url()).pathname.split('/').pop();
    assert.equal((await page.goto(base + '/admin/orders?status=PENDING')).status(), 200);
    assert.ok((await page.locator('body').innerText()).includes(orderNumber));
    await buyerPage.locator('button[type=submit]').click();
    await buyerPage.waitForURL('**/login');
    await buyerPage.locator('#login-email').fill(email);
    await buyerPage.locator('#login-password').fill('buyer-audit-password');
    await buyerPage.locator('button[type=submit]').click();
    await buyerPage.waitForURL('**/dashboard');
    assert.ok((await buyerPage.locator('body').innerText()).includes(orderNumber));
    assert.equal(await buyerPage.locator('a[href="/api/download/pdf/book-1"]').count(), 1);
    await buyerPage.goto(base + '/read/book-1/id/ch-7');
    const checklist = buyerPage.getByRole('region', { name: 'Checklist praktik' }).getByRole('checkbox').first();
    await checklist.waitFor();
    const saved = buyerPage.waitForResponse((response) => response.url().includes('/api/checklists/toggle') && response.status() === 200);
    await checklist.check();
    await saved;
    await buyerPage.reload();
    assert.equal(await buyerPage.getByRole('region', { name: 'Checklist praktik' }).getByRole('checkbox').first().isChecked(), true);
    const personalizer = buyerPage.locator('#teammate-name-input');
    await personalizer.fill('AuditName');
    assert.equal(await buyerPage.locator('article .teammate-token').first().textContent(), 'AuditName');
    const callbacks = await Promise.all(Array.from({ length: 3 }, () => buyer.request.post(base + '/api/webhooks/mayar', {
      headers: { 'x-callback-token': process.env.E2E_WEBHOOK_TOKEN || process.env.AUDIT_WEBHOOK_TOKEN || 'audit-webhook-token' },
      data: { event: 'payment.received', data: { status: 'SUCCESS', orderNumber } },
    })));
    for (const callback of callbacks) {
      assert.equal(callback.status(), 200);
      assert.equal((await callback.json()).idempotent, true);
    }
    assert.equal((await buyer.request.get(base + '/api/download/pdf/book-2')).status(), 403);
    assert.equal((await buyer.request.post(base + '/api/auth/logout', { headers: { Origin: base } })).status(), 200);
    assert.equal((await buyerPage.goto(base + '/admin/orders')).url(), base + '/login');
    assert.deepEqual(errors, []);
    console.log('PASS guest purchase, mock payment, buyer login, persistent checklist, script personalization, animation, themes, webhook replay, PDF access, logout, admin isolation; no browser exceptions');
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
