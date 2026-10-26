export interface ParsedChapter {
  index: number;
  slug: string;
  title: string;
  rawMarkdown: string;
}

export function parseManuscript(content: string): ParsedChapter[] {
  const globalFootnotes = new Map<string, string>();
  for (const m of content.matchAll(/^\[\^([^\]]+)\]:\s*(.+)$/gm)) {
    globalFootnotes.set(m[1], m[2].trim());
  }

  const sections = content.split(/^##\s+/m);
  sections.shift();

  const chapters: ParsedChapter[] = [];
  for (const s of sections) {
    const firstLineBreak = s.indexOf("\n");
    const title = firstLineBreak === -1 ? s.trim() : s.slice(0, firstLineBreak).trim();
    const body = firstLineBreak === -1 ? "" : s.slice(firstLineBreak).trim();

    if (/(daftar isi|table of contents)/i.test(title)) continue;

    if (
      /(rujukan riset|daftar pustaka|primary research citations)/i.test(title) &&
      chapters.length >= 15
    ) {
      const last = chapters[chapters.length - 1];
      last.rawMarkdown += `\n\n### ${title}\n\n${body}`;
      continue;
    }

    const index = chapters.length;
    const slug = `ch-${index}`;
    const rawMarkdown = `## ${title}\n\n${body}`;

    chapters.push({ index, slug, title: cleanTitle(title), rawMarkdown });
  }

  for (const chapter of chapters) {
    chapter.rawMarkdown = injectFootnotes(chapter.rawMarkdown, globalFootnotes);
  }

  return chapters;
}

function cleanTitle(title: string): string {
  return title.replaceAll("*", "").replaceAll("_", "").replaceAll("`", "").trim();
}

function injectFootnotes(markdown: string, globalFootnotes: Map<string, string>): string {
  if (globalFootnotes.size === 0) return markdown;

  const referencedKeys = new Set<string>();
  for (const m of markdown.matchAll(/(?<!: )\[\^([^\]]+)\](?!:)/g)) {
    referencedKeys.add(m[1]);
  }

  const injected: string[] = [];
  for (const key of referencedKeys) {
    const def = globalFootnotes.get(key);
    if (def === undefined) continue;
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!new RegExp(`^\\[\\^${escaped}\\]:`, "m").test(markdown)) {
      injected.push(`[^${key}]: ${def}`);
    }
  }

  return injected.length > 0 ? `${markdown}\n\n${injected.join("\n")}` : markdown;
}
