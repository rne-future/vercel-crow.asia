const assert = require('node:assert/strict');
const { test } = require('node:test');
const { build } = require('esbuild');
const { chromium } = require('@playwright/test');

test('editor refresh replaces the manuscript and baseline together, but preserves edits at the same revision', async () => {
  const bundle = await build({
    stdin: {
      contents: `import React from 'react';
        import { createRoot } from 'react-dom/client';
        import { flushSync } from 'react-dom';
        import Editor from './components/modules/admin/ChapterTranslationsEditor';
        const root = createRoot(document.getElementById('root'));
        window.renderEditor = (revision, text) => flushSync(() => root.render(<Editor data={{
          rows: [], selectedId: 1, selected: { id: 1, title: text, rawMarkdown: text,
            translationStatus: 'DRAFT', updatedAt: new Date(revision) }
        }} />));`,
      resolveDir: process.cwd(), loader: 'tsx',
    },
    bundle: true, write: false, platform: 'browser', jsx: 'automatic',
    tsconfigRaw: { compilerOptions: { jsx: 'react-jsx' } },
    define: { 'process.env.NODE_ENV': '"development"' },
    plugins: [{ name: 'stub-server-action', setup(builder) {
      builder.onResolve({ filter: /chapter-actions$/ }, () => ({ path: 'action', namespace: 'server-action' }));
      builder.onLoad({ filter: /.*/, namespace: 'server-action' }, () => ({ contents: 'export async function saveChapterTranslation() {}' }));
    } }],
  });
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
  try {
    const page = await browser.newPage();
    await page.setContent('<div id="root"></div>');
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    await page.evaluate(() => window.renderEditor('2026-10-01T00:00:00.000Z', 'Revision A'));
    await page.locator('textarea').fill('Unsaved based on A');
    await page.evaluate(() => window.renderEditor('2026-10-01T00:00:00.000Z', 'Revision A'));
    assert.equal(await page.locator('textarea').inputValue(), 'Unsaved based on A');
    await page.evaluate(() => window.renderEditor('2026-10-02T00:00:00.000Z', 'Revision B'));
    const data = await page.locator('textarea').evaluate((element) => Object.fromEntries(new FormData(element.form)));
    assert.equal(data.updated_at, '2026-10-02T00:00:00.000Z');
    assert.equal(data.raw_markdown, 'Revision B');
    assert.equal(data.title, 'Revision B');
  } finally { await browser.close(); }
});
