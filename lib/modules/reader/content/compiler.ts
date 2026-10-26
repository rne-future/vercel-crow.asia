import MarkdownIt, { type MarkdownIt as MarkdownItInstance } from "markdown-it";
import { createHash } from "node:crypto";
import sanitizeHtml from "sanitize-html";
import { getDict, translate } from "@/lib/i18n";

type MdPlugin = (md: unknown, ...params: unknown[]) => void;
const footnote = require("markdown-it-footnote") as MdPlugin;
const taskLists = require("markdown-it-task-lists") as MdPlugin;

export interface ChecklistItem {
  itemIndex: number;
  itemId: string;
  labelHtml: string;
  isCompleted: boolean;
}

export interface RemotionStep {
  stepIndex: number;
  label: string;
  startFrame: number;
  durationFrames: number;
  headline: string;
  subheadline: string;
  dialogue?: {
    leaderSpeaker: string;
    leaderText: string;
    staffSpeaker: string;
    staffText: string;
  };
  bullets?: string[];
}

export interface RemotionSceneProps {
  bookId: string;
  chapterIndex: number;
  chapterTitle: string;
  motifIcon: string;
  locale: string;
  register: string;
  teammateName: string;
  accentHex: string;
  steps: RemotionStep[];
}

export interface CompiledChapter {
  compiledHtml: string;
  safePreviewHtml: string;
  hasScripts: boolean;
  extractedChecklists: ChecklistItem[];
  remotionSceneProps: RemotionSceneProps;
}

let md: MarkdownItInstance | null = null;
function getMd(): MarkdownItInstance {
  if (!md) {
    md = new MarkdownIt({ html: true, linkify: true }).use(footnote).use(taskLists);
  }
  return md;
}

const mdInline = new MarkdownIt({ html: false });

export function compileChapter(
  rawMarkdown: string,
  title: string,
  locale: string,
  register = "standard",
  bookId = "book-1",
  chapterIndex = 0,
  dictionary: Record<string, unknown> = getDict(locale),
): CompiledChapter {
  const converter = getMd();
  const text = (key: string) => converter.utils.escapeHtml(String(translate(dictionary, key)));
  const defaultName = String(translate(dictionary, "reader.default_name"));

  let processedMd = transformCallouts(rawMarkdown);
  processedMd = processedMd.replace(/^##\s+.*?\r?\n+/, "");
  const extractedChecklists = extractChecklists(rawMarkdown);
  processedMd = transformPracticeCards(processedMd, text("compiler.practice_badge"));

  let html = converter.render(processedMd);

  const mermaidBadge = text("compiler.mermaid_badge");
  html = html.replace(
    /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
    `<div class="crow-mermaid-block"><div class="crow-mermaid-header"><span class="crow-mermaid-badge">${mermaidBadge}</span></div><pre class="mermaid">$1</pre></div>`,
  );

  const footnoteLabel = text("reader.footnotes_title");
  const footnoteHint = text("reader.footnotes_hint");
  html = html.replace(
    /<(?:div|section) class="footnotes"([^>]*)>([\s\S]*?)<\/(?:div|section)>/g,
    `<details class="crow-footnotes-drawer"><summary class="crow-footnotes-summary"><span class="crow-footnotes-title">${footnoteLabel}</span><span class="crow-footnotes-hint">${footnoteHint}</span></summary><div class="footnotes"$1>$2</div></details>`,
  );

  html = html.replace(/<details(\s[^>]*)?>/gi, (_m: string, attrs: string | undefined) => {
    let a = attrs ?? "";
    if (!a.includes("class=")) a += ' class="crow-script-drawer"';
    if (!a.includes("data-copy-script=")) a += ' data-copy-script="true"';
    return `<details${a}>`;
  });

  html = replaceTeammateTokens(html, defaultName);
  const compiledHtml = sanitize(html);
  const hasScripts = compiledHtml.includes("crow-script-drawer");
  const safePreviewHtml = generateSafePreview(compiledHtml);
  const remotionSceneProps = extractRemotionSceneProps(
    rawMarkdown,
    bookId,
    chapterIndex,
    title,
    locale,
    register,
    defaultName,
    extractedChecklists,
    dictionary,
  );

  return { compiledHtml, safePreviewHtml, hasScripts, extractedChecklists, remotionSceneProps };
}

function transformPracticeCards(markdown: string, practiceBadge: string): string {
  return markdown.replace(
    /(?:^[-*]\s+\[[ xX]\]\s+.+(?:\r?\n|$))+/gm,
    (block) => {
      const items = [...block.matchAll(/^[-*]\s+\[[ xX]\]\s+(.+)$/gm)].map((m) => m[1]);
      if (items.length === 0) return block;
      let html = `<div class="crow-practice-section">\n`;
      html += `  <div class="crow-practice-header">\n`;
      html += `    <span class="crow-practice-badge">${practiceBadge}</span>\n`;
      html += `  </div>\n`;
      html += `  <div class="crow-practice-grid">\n`;
      items.forEach((itemText, idx) => {
        const num = String(idx + 1).padStart(2, "0");
        html += `    <div class="crow-practice-card">\n`;
        html += `      <div class="crow-practice-num">${num}</div>\n`;
        html += `      <div class="crow-practice-content">\n\n${itemText.trim()}\n\n</div>\n`;
        html += `    </div>\n`;
      });
      html += `  </div>\n`;
      html += `</div>\n\n`;
      return html;
    },
  );
}

function transformCallouts(markdown: string): string {
  return markdown.replace(
    /^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\s+(.+?))?\r?\n((?:^>.*(?:\r?\n|$))*)/gm,
    (_, type: string, title: string | undefined, body: string) => {
      const t = String(type).toLowerCase();
      const cleanTitle = (title ?? "").trim().replace(/^>\s*/, "");
      const bodyLines = String(body)
        .split(/\r?\n/)
        .map((line) => line.replace(/^>\s?/, ""))
        .filter((line) => line !== "");
      const bodyText = bodyLines.join("\n").trim();
      const iconMap: Record<string, string> = {
        note: "📌",
        tip: "💡",
        important: "⚡",
        warning: "⚠️",
        caution: "🛑",
      };
      const icon = iconMap[t] ?? "📌";
      const typeLabel = String(type).toUpperCase();
      const headerText = cleanTitle ? `${icon} ${typeLabel}: ${cleanTitle}` : `${icon} ${typeLabel}`;
      return `<aside class="crow-callout crow-callout-${t}">\n\n<div class="crow-callout-title">${headerText}</div>\n\n${bodyText}\n\n</aside>\n\n`;
    },
  );
}

function replaceTeammateTokens(content: string, defaultName: string): string {
  const escapedName = getMd().utils.escapeHtml(defaultName);
  const tokenHtml = `<span class="teammate-token" data-default="${escapedName}">${escapedName}</span>`;
  return content
    .replace(/\[Nama\]/g, tokenHtml)
    .replace(/\[Nama Staf\]/gi, tokenHtml)
    .replace(/\[Nama Anggota Tim\]/gi, tokenHtml)
    .replace(/\[Teammate Name\]/gi, tokenHtml)
    .replace(/\{\{teammateName\}\}/g, tokenHtml);
}

const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "ul", "ol", "li", "table", "thead", "tbody", "tr", "th", "td",
  "blockquote", "pre", "code", "details", "summary", "aside", "span",
  "sup", "sub", "hr", "strong", "em", "a", "div", "section", "ins", "mark",
  "input", "br", "s", "del",
];

export function sanitizeChapterHtml(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      aside: ["class"],
      details: ["class", "open", "data-copy-script"],
      summary: ["class"],
      span: ["class", "data-default"],
      pre: ["class"],
      code: ["class"],
      sup: ["id"],
      div: ["class", "id", "role"],
      li: ["class", "id", "role"],
      a: ["class", "id", "role", "rev", "href", "name"],
      th: ["align", "class"],
      td: ["align", "class"],
      ins: ["class"],
      mark: ["class"],
      input: ["type", "checked", "disabled", "class"],
      "*": ["class", "id", "role"],
      section: ["class"],
      ol: ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
  }).replace(/<details(?![\s>])/g, "<details ");
}

const sanitize = sanitizeChapterHtml;

export function localizeCompiledHtml(html: string, dictionary: Record<string, unknown>): string {
  const labels: Record<string, string> = {
    "crow-mermaid-badge": "compiler.mermaid_badge", "crow-practice-badge": "compiler.practice_badge",
    "crow-footnotes-title": "reader.footnotes_title", "crow-footnotes-hint": "reader.footnotes_hint",
  };
  const localized = html.replace(/<span class="(crow-mermaid-badge|crow-practice-badge|crow-footnotes-title|crow-footnotes-hint)">[\s\S]*?<\/span>/g,
    (_match, name: string) => `<span class="${name}">${getMd().utils.escapeHtml(String(translate(dictionary, labels[name])))}</span>`);
  return sanitizeChapterHtml(localized);
}

export function localizeSceneLabels(scene: { steps?: unknown[]; [key: string]: unknown }, dictionary: Record<string, unknown>) {
  const text = (key: string) => String(translate(dictionary, `compiler.scene.${key}`));
  return { ...scene, steps: (scene.steps ?? []).map((value) => {
    if (!value || typeof value !== "object") return value;
    const step = value as Record<string, unknown>;
    const index = step.stepIndex;
    if (typeof index !== "number" || !Number.isInteger(index) || index < 0 || index > 3) return step;
    return { ...step, label: text(`step_${index}_label`), subheadline: text(`step_${index}_description`),
      ...(index >= 2 ? { headline: text(`step_${index}_headline`) } : {}),
    };
  }) };
}

function generateSafePreview(html: string): string {
  const matches = html.match(/<(p|blockquote)(?=[\s>])[^>]*>.*?<\/\1>/gis);
  if (matches && matches.length > 0) return matches.slice(0, 3).join("\n");
  const text = html.replace(/<[^>]*>/g, "");
  return text.length > 300 ? `${text.slice(0, 300)}…` : text;
}

export function stableItemId(labelHtml: string): string {
  return createHash("sha256").update(labelHtml).digest("hex").slice(0, 12);
}

function extractChecklists(markdown: string): ChecklistItem[] {
  const matches = [...markdown.matchAll(/^[-*]\s+\[([ xX])\]\s+(.+)$/gm)];
  return matches.map((m, i) => {
    const rendered = mdInline.renderInline(m[2].trim());
    const cleanLabel = sanitize(rendered);
    return { itemIndex: i, itemId: stableItemId(cleanLabel), labelHtml: cleanLabel, isCompleted: m[1].toLowerCase() === "x" };
  });
}

function limitText(s: string, n: number): string {
  const t = s.trim();
  return t.length > n ? `${t.slice(0, n).trimEnd()}…` : t;
}

function extractRemotionSceneProps(
  rawMarkdown: string,
  bookId: string,
  chapterIndex: number,
  chapterTitle: string,
  locale: string,
  register: string,
  teammateName: string,
  extractedChecklists: ChecklistItem[],
  dictionary: Record<string, unknown>,
): RemotionSceneProps {
  const text = (key: string) => String(translate(dictionary, `compiler.scene.${key}`));
  const subheads = [...rawMarkdown.matchAll(/^###\s+(.+)$/gm)].map((m) => m[1].trim());

  const step0Headline = subheads[0] ?? text("step_0_headline");
  const step1Headline = subheads[1] ?? text("step_1_headline");

  let leaderText = text("leader_default");
  const staffText = text("staff_default");
  const dialogueMatch = /<details>[\s\S]*?```(?:text)?\s*([\s\S]*?)\s*```[\s\S]*?<\/details>/.exec(rawMarkdown);
  if (dialogueMatch) {
    const firstLine = dialogueMatch[1].trim().split("\n")[0]?.trim().replace(/^"|"$/g, "");
    if (firstLine) leaderText = limitText(firstLine, 160);
  }

  let bullets = extractedChecklists.slice(0, 3).map((c) => limitText(c.labelHtml, 70));
  if (bullets.length === 0) {
    bullets = translate(dictionary, "compiler.scene.fallback_bullets") as string[];
  }

  return {
    bookId,
    chapterIndex,
    chapterTitle,
    motifIcon: "compass",
    locale,
    register,
    teammateName,
    accentHex: bookId === "book-2" ? "#EA580C" : bookId === "book-3" ? "#0F766E" : "#1D4ED8",
    steps: [
      {
        stepIndex: 0,
        label: text("step_0_label"),
        startFrame: 0,
        durationFrames: 135,
        headline: step0Headline,
        subheadline: text("step_0_description"),
      },
      {
        stepIndex: 1,
        label: text("step_1_label"),
        startFrame: 135,
        durationFrames: 135,
        headline: step1Headline,
        subheadline: text("step_1_description"),
      },
      {
        stepIndex: 2,
        label: text("step_2_label"),
        startFrame: 270,
        durationFrames: 135,
        headline: text("step_2_headline"),
        subheadline: text("step_2_description"),
        dialogue: { leaderSpeaker: text("leader_speaker"), leaderText, staffSpeaker: text("staff_speaker"), staffText },
      },
      {
        stepIndex: 3,
        label: text("step_3_label"),
        startFrame: 405,
        durationFrames: 135,
        headline: text("step_3_headline"),
        subheadline: text("step_3_description"),
        bullets,
      },
    ],
  };
}
