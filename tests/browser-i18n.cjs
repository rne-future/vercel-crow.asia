const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');

async function main() {
  const base = process.env.E2E_BASE_URL || process.env.AUDIT_BASE_URL || 'http://localhost:4051';
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Use an isolated local test server');
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
  const errors = [];
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const publicContext = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  const publicPage = await publicContext.newPage();
  for (const current of [page, publicPage]) {
    current.setDefaultTimeout(15000);
    current.on('pageerror', (error) => errors.push(error.message));
    current.on('console', (message) => { if (message.type() === 'error' && /hydrat|did not match|server rendered/i.test(message.text())) errors.push(message.text()); });
  }
  const key = 'landing.hero.title_prefix';
  const editUrl = `${base}/admin/translations?locale=en&q=${key}&group=landing`;
  const value = `Live translation ${crypto.randomUUID()}`;
  let original;
  let captured;
  async function submit(form, label) {
    const [req, response] = await Promise.all([
      page.waitForRequest((req) => req.method() === 'POST' && !!req.headers()['next-action']),
      page.waitForResponse((res) => res.request().method() === 'POST' && !!res.request().headers()['next-action']),
      form.getByRole('button', { name: label, exact: true }).click(),
    ]);
    assert.equal(response.status(), 200);
    return { headers: req.headers(), body: req.postDataBuffer() };
  }
  try {
    await page.goto(base + '/login');
    await page.locator('#login-email').fill('admin@crow.asia');
    await page.locator('#login-password').fill(process.env.E2E_PASSWORD || process.env.AUDIT_PASSWORD || 'audit-test-password');
    await page.locator('button[type=submit]').click();
    await page.waitForURL('**/dashboard');
    await publicPage.goto(base + '/?locale=en');
    await page.goto(editUrl);
    let article = page.locator('article').filter({ has: page.locator(`input[name="key"][value="${key}"]`) });
    original = await article.locator('textarea').inputValue();
    await article.locator('textarea').fill(value);
    captured = await submit(article.locator('form').first(), 'Simpan terjemahan');
    await article.getByRole('status').waitFor();
    await publicPage.reload();
    await publicPage.getByRole('heading', { level: 1 }).filter({ hasText: value }).waitFor();
    await publicPage.waitForFunction(() => document.documentElement.lang === 'en');
    assert.equal(await publicPage.locator('html').getAttribute('lang'), 'en');
    await page.reload();
    article = page.locator('article').filter({ has: page.locator(`input[name="key"][value="${key}"]`) });
    assert.equal(await article.locator('textarea').inputValue(), value);
    console.log('PASS admin translation edit persists and immediately invalidates the public dictionary cache');

    const denied = await publicContext.request.post(editUrl, { headers: {
      'next-action': captured.headers['next-action'], 'content-type': captured.headers['content-type'], origin: base,
    }, data: captured.body, maxRedirects: 0 });
    assert.ok([303, 307].includes(denied.status()) || (denied.headers()['x-action-redirect'] || '').includes('/login'), 'Unauthenticated server action must redirect before writing');
    console.log('PASS direct unauthorized server action is rejected');

    await page.goto(base + '/admin/locales');
    const localeForm = page.locator('form').filter({ has: page.locator('input[name="label"]') });
    await localeForm.locator('[name="code"]').fill('ms');
    await localeForm.locator('[name="label"]').fill('Bahasa Melayu');
    await localeForm.locator('[name="name"]').fill('Malay');
    await submit(localeForm, 'Simpan bahasa');
    await publicPage.goto(base + '/?locale=ms');
    await publicPage.getByRole('heading', { level: 1 }).waitFor();
    const localeMenu = publicPage.getByRole('button', { name: /Current language|bahasa saat ini|Select Language|Pilih Bahasa/i });
    await localeMenu.click();
    await publicPage.getByRole('menuitem').filter({ hasText: 'Bahasa Melayu' }).waitFor();
    await publicPage.keyboard.press('Escape');
    assert.equal(await publicPage.getByRole('menu').count(), 0);
    assert.equal((await publicPage.goto(base + '/read/book-1/ms/ch-0')).status(), 200);
    assert.equal(await publicPage.locator('html').getAttribute('lang'), 'ms');
    console.log('PASS dynamic locale menu and published manuscript fallback for a new UI language');

    await page.goto(base + '/admin/translations?locale=ms&q=audit.validation');
    const create = page.locator('form').filter({ has: page.locator('input[name="key"]:not([type="hidden"])') });
    await create.locator('[name="key"]').fill('audit.validation');
    await create.locator('[name="group"]').fill('wrong');
    await create.locator('[name="value"]').fill('Rejected');
    await submit(create, 'Tambah terjemahan');
    await create.getByRole('alert').waitFor();
    await create.locator('[name="group"]').fill('audit');
    await create.locator('[name="value"]').fill('Created through the admin form');
    await submit(create, 'Tambah terjemahan');
    await page.reload();
    const created = page.locator('article').filter({ has: page.locator('input[name="key"][value="audit.validation"]') });
    assert.equal(await created.locator('textarea').inputValue(), 'Created through the admin form');
    await submit(created.locator('form').nth(1), 'Hapus override; gunakan fallback');
    await page.reload();
    assert.equal(await page.locator('article').count(), 0);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Mobile admin overflow');
    console.log('PASS translation create/delete, inline server validation feedback and mobile admin layout');
  } finally {
    if (original !== undefined) {
      await page.goto(editUrl);
      const article = page.locator('article').filter({ has: page.locator(`input[name="key"][value="${key}"]`) });
      await article.locator('textarea').fill(original);
      await submit(article.locator('form').first(), 'Simpan terjemahan');
      await page.goto(base + '/admin/locales');
      const row = page.locator('tr').filter({ has: page.getByRole('cell', { name: 'ms', exact: true }) });
      const disable = row.getByRole('button', { name: 'Nonaktifkan', exact: true });
      if (await disable.count()) await submit(row.locator('form'), 'Nonaktifkan');
    }
    await browser.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS no browser exceptions or hydration errors; translation fixture restored');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
