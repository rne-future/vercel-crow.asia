import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { compileChapter } from "../lib/modules/reader/content/compiler";
import { parseManuscript } from "../lib/modules/reader/content/parser";
import { MANUSCRIPTS } from "../lib/content/seed-data";
import { jsonField, tierSchema } from "../lib/modules/books/books.schema";
import { checkRequestOrigin } from "../lib/http";

test("checklist labels preserve escaped markup and remove unsafe links", () => {
  const result = compileChapter('- [ ] &lt;img src=x onerror=alert(1)&gt;\n- [ ] [unsafe](javascript:alert(1))', "Test", "id");
  assert.equal(result.extractedChecklists.length, 2);
  assert.doesNotMatch(result.extractedChecklists[0].labelHtml, /<img/i);
  assert.match(result.extractedChecklists[0].labelHtml, /&lt;img/);
  assert.doesNotMatch(result.compiledHtml, /href="javascript:/i);
});

test("compiled HTML strips executable markup", () => {
  const { compiledHtml } = compileChapter('<script>alert(1)</script>\n\n<p onclick="alert(1)">Hello</p>\n\n<iframe src="https://example.com"></iframe>', "Test", "id");
  assert.doesNotMatch(compiledHtml, /<script|onclick=|<iframe/i);
  assert.match(compiledHtml, /Hello/);
});

test("parser carries global footnotes into each referencing chapter", () => {
  const chapters = parseManuscript('## Daftar Isi\nignore\n## First\nText[^a]\n## Second\nMore[^a]\n\n[^a]: Research source');
  assert.deepEqual(chapters.map((chapter) => chapter.slug), ["ch-0", "ch-1"]);
  for (const chapter of chapters) assert.match(chapter.rawMarkdown, /\[\^a\]: Research source/);
});

test("invalid admin JSON and invalid tier structures are rejected", () => {
  const form = new FormData();
  form.set("features", "{invalid");
  assert.throws(() => jsonField(form, "features", {}));
  assert.equal(tierSchema.safeParse({ id: "tier-test", names: [], priceIdr: -1, includedBookIds: [] }).success, false);
});

test("custom mutations reject missing and foreign origins", () => {
  const original = process.env.APP_URL;
  process.env.APP_URL = "https://crow.example";
  try {
    assert.equal(checkRequestOrigin(new Request("https://crow.example/api/auth/login"))?.status, 403);
    assert.equal(checkRequestOrigin(new Request("https://crow.example/api/auth/login", { headers: { origin: "https://attacker.example" } }))?.status, 403);
    assert.equal(checkRequestOrigin(new Request("https://crow.example/api/auth/login", { headers: { origin: "https://crow.example" } })), null);
  } finally {
    if (original === undefined) delete process.env.APP_URL; else process.env.APP_URL = original;
  }
});

const sourceDir = resolve(process.env.MANUSCRIPT_SOURCE_DIR ?? "../crow.asia");
test("all source manuscripts compile into 45 chapters and 135 translations", { skip: !MANUSCRIPTS.every((item) => existsSync(resolve(sourceDir, item.path))) }, () => {
  let count = 0;
  for (const item of MANUSCRIPTS) {
    const chapters = parseManuscript(readFileSync(resolve(sourceDir, item.path), "utf8"));
    assert.equal(chapters.length, 15, item.path);
    for (const chapter of chapters) {
      const result = compileChapter(chapter.rawMarkdown, chapter.title, item.locale, item.register, item.bookId, chapter.index);
      assert.ok(result.compiledHtml.length > 0);
      assert.doesNotMatch(result.compiledHtml, /<script\b|<iframe\b/i);
      count++;
    }
  }
  assert.equal(count, 135);
});
