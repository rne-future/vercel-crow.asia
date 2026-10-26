const assert = require('node:assert/strict');
const { test } = require('node:test');
const { build } = require('esbuild');
const { chromium } = require('@playwright/test');

test('duplicate checklist rows reconcile without key warnings and share completion, pending and rollback', async () => {
  const bundle = await build({
    stdin: {
      contents: `import React from 'react';
        import { createRoot } from 'react-dom/client';
        import { act } from 'react';
        import { ChapterView } from './components/modules/reader/ChapterView';
        globalThis.IS_REACT_ACT_ENVIRONMENT = true;
        const root = createRoot(document.getElementById('root'));
        window.renderReader = async (labels) => act(async () => root.render(<ChapterView
          book={{ id: 'book-1', title: 'Test', volumeCode: 'VOL-1', accentHex: '#111113' }}
          locale="id" activeRegister="standard" supportedLocales={[]} allChapters={[]}
          currentChapter={{ slug: 'ch-0', index: 0, title: 'Test', hasAccess: true,
            checklists: labels.map((label, itemIndex) => ({ itemIndex, itemId: label === 'Alpha' ? 'aaaaaaaaaaaa' : 'bbbbbbbbbbbb', labelHtml: label, isCompleted: false })) }}
        />));
        window.requests = [];
        window.fetch = (_url, options) => {
          window.requests.push(JSON.parse(options.body));
          return new Promise(resolve => { window.finishRequest = ok => act(async () => resolve({ ok })); });
        };`,
      resolveDir: process.cwd(), loader: 'tsx',
    },
    bundle: true, write: false, platform: 'browser', jsx: 'automatic',
    tsconfigRaw: { compilerOptions: { jsx: 'react-jsx' } },
    define: { 'process.env.NODE_ENV': '"development"' },
    plugins: [{ name: 'stub-reader-surroundings', setup(builder) {
      builder.onResolve({ filter: /^(@\/components\/|next\/)/ }, args => ({ path: args.path, namespace: 'reader-stub' }));
      builder.onLoad({ filter: /.*/, namespace: 'reader-stub' }, () => ({ contents: `
        import React from 'react';
        export const FullWidthWorkspaceLayout = ({children}) => children;
        export const TopNavbarFullWidth = () => null;
        export const ReaderModeSwitch = () => null;
        export const PreCompiledArticle = () => null;
        export const TacticalRightDock = () => null;
        export const PaywallModal = () => null;
        export const SosSearchModal = () => null;
        export const LandscapeAnimationStage = () => null;
        export const ScriptPersonalizerInput = () => null;
        export const useTranslation = () => ({t: key => key});
        export const useRouter = () => ({push() {}});
        export default () => null;
      `, resolveDir: process.cwd() }));
    } }],
  });
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
  try {
    const page = await browser.newPage();
    const keyErrors = [];
    page.on('console', message => { if (/same key|unique.*key/i.test(message.text())) keyErrors.push(message.text()); });
    await page.setContent('<div id="root"></div>');
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    await page.evaluate(() => window.renderReader(['Alpha', 'Alpha']));
    assert.equal(await page.locator('input[type=checkbox]').count(), 2);
    assert.deepEqual(keyErrors, []);
    await page.locator('input[type=checkbox]').first().focus();
    await page.keyboard.press('Space');
    assert.deepEqual(await page.locator('input[type=checkbox]').evaluateAll(inputs => inputs.map(input => [input.checked, input.disabled])), [[true, true], [true, true]]);
    assert.deepEqual(await page.evaluate(() => window.requests), [{ book_id: 'book-1', chapter_slug: 'ch-0', item_id: 'aaaaaaaaaaaa', is_completed: true }]);
    await page.evaluate(() => window.finishRequest(false));
    assert.deepEqual(await page.locator('input[type=checkbox]').evaluateAll(inputs => inputs.map(input => [input.checked, input.disabled])), [[false, false], [false, false]]);
    assert.equal(await page.locator('[role=alert]').textContent(), 'reader.checklist_error');
    await page.evaluate(() => window.renderReader(['Beta', 'Alpha', 'Alpha']));
    assert.equal(await page.locator('input[type=checkbox]').count(), 3);
    await page.evaluate(() => window.renderReader(['Alpha', 'Beta', 'Alpha']));
    assert.equal(await page.locator('input[type=checkbox]').count(), 3);
    assert.deepEqual(keyErrors, []);
    await page.evaluate(() => window.renderReader([]));
    assert.equal(await page.locator('input[type=checkbox]').count(), 0);
  } finally { await browser.close(); }
});
