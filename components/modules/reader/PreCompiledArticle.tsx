'use client';
import { useEffect, useRef, useState } from 'react';
import { PaperTheme } from '@/components/layout/FullWidthWorkspaceLayout';
import { useTranslation } from '@/components/TranslationProvider';

interface PreCompiledArticleProps {
    html: string;
    teammateName?: string;
    fontSize?: 'sm' | 'base' | 'lg';
    paperTheme?: PaperTheme;
    className?: string;
}

export const PreCompiledArticle: React.FC<PreCompiledArticleProps> = ({
    html,
    teammateName = '',
    fontSize = 'base',
    paperTheme = 'ivory',
    className = '',
}) => {
    const { t } = useTranslation();
    const articleRef = useRef<HTMLDivElement>(null);
    const diagramSources = useRef(new WeakMap<Element, string>());
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    // 1. Instant Script Personalizer DOM Update (< 2ms)
    useEffect(() => {
        if (!articleRef.current) return;
        const tokens = articleRef.current.querySelectorAll<HTMLElement>('.teammate-token');
        tokens.forEach((el) => {
            const defaultVal = el.dataset.default || 'Budi';
            el.textContent = teammateName.trim() ? teammateName.trim() : defaultVal;
        });
    }, [teammateName, html]);

    // 2. Render Mermaid Diagrams Client-Side
    useEffect(() => {
        if (!articleRef.current) return;

        const isDark = paperTheme === 'obsidian';
        const isSepia = paperTheme === 'sepia';

        let cancelled = false;
        const renderDiagrams = async () => {
            const { default: mermaid } = await import('mermaid');
            if (cancelled || !articleRef.current) return;
            mermaid.initialize({
                startOnLoad: false,
                securityLevel: 'strict',
                theme: isDark ? 'dark' : 'base',
                fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
                themeVariables: {
                    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
                    primaryColor: isDark ? '#1E293B' : isSepia ? '#FAF4E6' : '#EFF6FF',
                    primaryTextColor: isDark ? '#F8FAFC' : '#0F172A',
                    primaryBorderColor: isDark ? '#475569' : '#93C5FD',
                    lineColor: isDark ? '#94A3B8' : '#334155',
                    secondaryColor: isDark ? '#334155' : '#F1F5F9',
                    tertiaryColor: isDark ? '#1E293B' : '#FFFFFF',
                    edgeLabelBackground: isDark ? '#1E293B' : '#FFFFFF',
                },
            });

            // Find all mermaid diagram containers
            const mermaidContainers = articleRef.current.querySelectorAll('.crow-mermaid-block .mermaid, pre.mermaid');
            if (mermaidContainers.length > 0) {
                // Clear any previous processed flag
                mermaidContainers.forEach((el) => {
                    const source = diagramSources.current.get(el) ?? el.textContent ?? '';
                    diagramSources.current.set(el, source);
                    el.textContent = source;
                    el.removeAttribute('data-processed');
                });

                await mermaid.run({
                    nodes: Array.from(mermaidContainers) as HTMLElement[],
                }).catch((err) => {
                    console.warn('Mermaid rendering notice:', err);
                });
            }
        };
        renderDiagrams().catch((err) => console.warn('Mermaid rendering notice:', err));
        return () => { cancelled = true; };
    }, [html, paperTheme]);

    // 3. Attach Copy Button to each Script Drawer (<details class="crow-script-drawer">)
    useEffect(() => {
        if (!articleRef.current) return;
        const drawers = articleRef.current.querySelectorAll<HTMLDetailsElement>('details.crow-script-drawer');

        drawers.forEach((drawer, idx) => {
            if (drawer.querySelector('.crow-copy-btn')) return;

            const summary = drawer.querySelector('summary');
            if (summary) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className =
                    'crow-copy-btn inline-flex items-center gap-1 ml-auto text-xs font-mono font-bold px-2.5 py-1 rounded-md border border-[#E5E0D5] bg-[#FAF8F5] text-stone-700 hover:text-[#111113] hover:bg-white transition-colors cursor-pointer shrink-0';
                const copyLabel = t('reader.copy_script');
                const copiedLabel = t('reader.copied');
                btn.textContent = copyLabel;
                btn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // Clone drawer, remove summary and buttons, get text
                    const clone = drawer.cloneNode(true) as HTMLElement;
                    clone.querySelector('summary')?.remove();
                    clone.querySelectorAll('.crow-copy-btn').forEach((b) => b.remove());
                    const cleanText = (clone.textContent ?? '').trim();

                    navigator.clipboard.writeText(cleanText).then(() => {
                        setCopiedIndex(idx);
                        btn.textContent = copiedLabel;
                        setTimeout(() => {
                            btn.textContent = copyLabel;
                            setCopiedIndex(null);
                        }, 2000);
                    }).catch(() => { btn.textContent = copyLabel; });
                };

                summary.style.display = 'flex';
                summary.style.alignItems = 'center';
                summary.style.justifyContent = 'space-between';
                summary.appendChild(btn);
            }
        });

        // 4. Auto-expand footnotes drawer when footnote reference link is clicked
        const footnoteLinks = articleRef.current.querySelectorAll<HTMLAnchorElement>('a.footnote-ref');
        footnoteLinks.forEach((link) => {
            link.onclick = () => {
                const drawer = articleRef.current?.querySelector<HTMLDetailsElement>('details.crow-footnotes-drawer');
                if (drawer && !drawer.open) {
                    drawer.open = true;
                }
            };
        });
    }, [html, t]);

    return (
        <div className={`w-full ${className}`} data-font-size={fontSize}>
            <article
                ref={articleRef}
                className="max-w-[72ch] mx-auto prose font-sans selection:bg-[#FFE66D] selection:text-[#111113]"
                dangerouslySetInnerHTML={{ __html: html }}
            />
        </div>
    );
};
