'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FullWidthWorkspaceLayout, type PaperTheme } from '@/components/layout/FullWidthWorkspaceLayout';
import { TopNavbarFullWidth } from '@/components/layout/TopNavbarFullWidth';
import { ReaderModeSwitch, type ReaderMode } from '@/components/modules/reader/ReaderModeSwitch';
import { PreCompiledArticle } from '@/components/modules/reader/PreCompiledArticle';
import { TacticalRightDock } from '@/components/modules/reader/TacticalRightDock';
import { PaywallModal } from '@/components/modules/reader/PaywallModal';
import { SosSearchModal } from '@/components/modules/reader/SosSearchModal';
import { LandscapeAnimationStage } from '@/components/modules/reader/LandscapeAnimationStage';
import { ScriptPersonalizerInput } from '@/components/modules/reader/ScriptPersonalizerInput';

import { useTranslation } from '@/components/TranslationProvider';
import { ArrowLeft, ArrowRight, CheckCircle2, Lock } from 'lucide-react';

interface ChapterViewProps {
    book: { id: string; volumeCode: string; accentHex: string; title: string; subtitle: string; priceSingleIdr?: number; priceSingleUsd?: number };
    locale: string;
    activeRegister: string;
    supportedLocales: { code: string; name: string; nativeName: string; flagEmoji: string; isLlmTranslated: boolean }[];
    currentChapter: {
        index: number; slug: string; title: string; isFreeSample: boolean; hasAccess: boolean; hasScripts: boolean;
        illustrationPath: string | null; illustrationCaption: string | null; displayHtml: string;
        checklists: { itemIndex: number; labelHtml: string; isCompleted: boolean }[];
        remotionConfig: { compositionId: string; width: number; height: number; fps: number; durationInFrames: number; sceneProps: Record<string, unknown> & { steps?: unknown[]; teammateName?: string } };
        optionalYoutube: { isEnabled: boolean; videoId: string | null };
    };
    allChapters: { index: number; slug: string; title: string; isFreeSample: boolean; isUnlocked: boolean }[];
    user?: { name: string; email: string; role?: string } | null;
}

export function ChapterView({
    book,
    locale,
    activeRegister,
    supportedLocales,
    currentChapter,
    allChapters,
    user,
}: ChapterViewProps) {
    const { t } = useTranslation();
    const router = useRouter();
    const [mode, setMode] = useState<ReaderMode>('read');
    const [paperTheme, setPaperTheme] = useState<PaperTheme>('ivory');
    const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
    const [teammateName, setTeammateName] = useState<string>('');
    const [checklists, setChecklists] = useState(currentChapter.checklists);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [checklistError, setChecklistError] = useState<string | null>(null);
    const [pendingItems, setPendingItems] = useState<number[]>([]);

    // Sync checklists when chapter changes
    useEffect(() => {
        setChecklists(currentChapter.checklists);
    }, [currentChapter.slug, currentChapter.checklists]);

    // Load preferences from localStorage
    useEffect(() => {
        try {
            const savedName = localStorage.getItem('crow:teammate-name');
            if (savedName) setTeammateName(savedName);

            const savedSize = localStorage.getItem('crow:reader-font-size');
            if (savedSize === 'sm' || savedSize === 'base' || savedSize === 'lg') {
                setFontSize(savedSize);
            }
        } catch {
            // Ignore storage issues
        }
    }, []);

    const handleTeammateNameChange = (name: string) => {
        setTeammateName(name);
        try {
            localStorage.setItem('crow:teammate-name', name);
        } catch {
            // Ignore
        }
    };

    const handleFontSizeChange = (size: 'sm' | 'base' | 'lg') => {
        setFontSize(size);
        try {
            localStorage.setItem('crow:reader-font-size', size);
        } catch {
            // Ignore
        }
    };

    // Optimistic checklist toggle
    const handleToggleChecklist = (itemIndex: number, currentCompleted: boolean) => {
        if (pendingItems.includes(itemIndex)) return;
        setPendingItems((items) => [...items, itemIndex]);
        setChecklistError(null);
        const nextCompleted = !currentCompleted;

        // 1. Optimistic local state update
        setChecklists((prev) =>
            prev.map((c) => (c.itemIndex === itemIndex ? { ...c, isCompleted: nextCompleted } : c))
        );

        // 2. Background server sync
        fetch('/api/checklists/toggle', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-TOKEN':
                    (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
            },
            body: JSON.stringify({
                book_id: book.id,
                chapter_slug: currentChapter.slug,
                item_index: itemIndex,
                is_completed: nextCompleted,
            }),
        }).then((response) => { if (!response.ok) throw new Error('Checklist save failed'); }).catch(() => {
            setChecklistError(t('reader.checklist_error'));
            // Revert on error
            setChecklists((prev) =>
                prev.map((c) => (c.itemIndex === itemIndex ? { ...c, isCompleted: currentCompleted } : c))
            );
        }).finally(() => setPendingItems((items) => items.filter((index) => index !== itemIndex)));
    };

    const handleRegisterChange = (newRegister: string) => {
        const url = new URL(window.location.href);
        url.searchParams.set('reg', newRegister);
        router.push(url.pathname + url.search);
    };

    const handleLocaleChange = (newLocale: string) => {
        router.push(`/read/${book.id}/${newLocale}/${currentChapter.slug}`);
    };

    const prevChapter = allChapters.find((c) => c.index === currentChapter.index - 1);
    const nextChapter = allChapters.find((c) => c.index === currentChapter.index + 1);

    return (
        <FullWidthWorkspaceLayout
            paperTheme={paperTheme}
            onOpenSearch={() => setIsSearchOpen(true)}
            topNavbar={
                <TopNavbarFullWidth
                    currentLocale={locale}
                    supportedLocales={supportedLocales}
                    onLocaleChange={handleLocaleChange}
                    currentBookId={book.id}
                    paperTheme={paperTheme}
                    onTogglePaperTheme={(t: string) => setPaperTheme(t as PaperTheme)}
                    onOpenSearch={() => setIsSearchOpen(true)}
                />
            }
            leftSidebar={
                <nav className="space-y-1 font-sans text-xs" aria-label={t('reader.chapter_list')}>
                    <div className="pb-3 mb-2 border-b border-[#E5E0D5]">
                        <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                            {book.volumeCode}
                        </span>
                        <h2 className="font-bold text-sm text-[#111113] truncate">{book.title}</h2>
                    </div>

                    <div className="space-y-1">
                        {allChapters.map((ch) => {
                            const isCurrent = ch.slug === currentChapter.slug;
                            return (
                                <Link
                                    key={ch.slug}
                                    href={`/read/${book.id}/${locale}/${ch.slug}${
                                        locale === 'id' ? `?reg=${activeRegister}` : ''
                                    }`}
                                    className={`flex items-start gap-2.5 p-2 rounded-lg transition-colors ${
                                        isCurrent
                                            ? 'bg-[#111113] text-[#FAF8F5] font-bold shadow-2xs'
                                            : 'hover:bg-black/5 text-stone-700'
                                    }`}
                                >
                                    <span className="mt-0.5 shrink-0">
                                        {ch.isFreeSample ? (
                                            <CheckCircle2
                                                className={`w-3.5 h-3.5 ${
                                                    isCurrent ? 'text-[#FFE66D]' : 'text-emerald-600'
                                                }`}
                                            />
                                        ) : !ch.isUnlocked ? (
                                            <Lock
                                                className={`w-3.5 h-3.5 ${
                                                    isCurrent ? 'text-amber-300' : 'text-stone-400'
                                                }`}
                                            />
                                        ) : (
                                            <span
                                                className={`w-2 h-2 rounded-full inline-block mt-1 ${
                                                    isCurrent ? 'bg-[#FFE66D]' : 'bg-stone-300'
                                                }`}
                                            />
                                        )}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate leading-tight">{ch.title}</p>
                                        <span
                                            className={`text-[10px] font-mono ${
                                                isCurrent ? 'text-stone-300' : 'text-stone-400'
                                            }`}
                                        >
                                            {ch.isFreeSample
                                                ? t('nav.free_sample')
                                                : t('nav.chapter', { num: ch.index })}
                                        </span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </nav>
            }
            rightDock={
                <div className="space-y-6">
                <TacticalRightDock
                    locale={locale}
                    register={activeRegister}
                    onRegisterChange={handleRegisterChange}
                    paperTheme={paperTheme}
                    onPaperThemeChange={setPaperTheme}
                    fontSize={fontSize}
                    onFontSizeChange={handleFontSizeChange}
                />
                {currentChapter.hasAccess && currentChapter.hasScripts && <ScriptPersonalizerInput teammateName={teammateName} onChange={handleTeammateNameChange} defaultName={t('reader.default_name')} />}
                </div>
            }
        >
            <div className="w-full max-w-4xl mx-auto space-y-6 pb-20">
                {/* Chapter Top Bar & Mode Switcher */}
                <div className="flex flex-wrap items-center justify-between gap-4 py-2">
                    <div className="flex items-center gap-2 text-xs font-mono text-stone-500">
                        <span
                            className="px-2.5 py-0.5 rounded text-white font-bold"
                            style={{ backgroundColor: book.accentHex }}
                        >
                            {book.volumeCode}
                        </span>
                        <span>•</span>
                        <span>
                            {t('reader.chapter_progress', { current: currentChapter.index, total: 14 })}
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline">
                            {t('reader.read_time')}
                        </span>
                    </div>

                    <ReaderModeSwitch mode={mode} onModeChange={setMode} className="shrink-0" />
                </div>

                {/* Main Content Area */}
                {mode === 'read' ? (
                    <div className="space-y-6">
                        <div className="reading-sheet rounded-2xl border p-6 sm:p-10 lg:p-14">
                            {/* Chapter Title inside the reading sheet */}
                            <div className="pb-8 mb-8 border-b border-[#E5E0D5]">
                                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#111113] tracking-tight leading-[1.2]">
                                    {currentChapter.title}
                                </h1>
                            </div>

                            <PreCompiledArticle
                                html={currentChapter.displayHtml}
                                teammateName={teammateName}
                                fontSize={fontSize}
                                paperTheme={paperTheme}
                            />

                            {currentChapter.hasAccess && checklists.length > 0 && <section className="mt-8 space-y-3" aria-label={t('reader.checklist_title')}>
                                <h2 className="font-bold">{t('reader.checklist_title')}</h2>
                                {checklistError && <p role="alert" className="text-sm text-red-700">{checklistError}</p>}
                                {checklists.map((item) => <label key={item.itemIndex} className="flex items-start gap-3 py-2 text-sm">
                                    <input type="checkbox" className="mt-1" checked={item.isCompleted} disabled={pendingItems.includes(item.itemIndex)} onChange={() => handleToggleChecklist(item.itemIndex, item.isCompleted)} />
                                    <span dangerouslySetInnerHTML={{ __html: item.labelHtml }} />
                                </label>)}
                            </section>}

                            {/* Paywall Gate for locked chapters */}
                            {!currentChapter.hasAccess && (
                                <PaywallModal
                                    volumeCode={book.volumeCode}
                                    bookTitle={book.title}
                                    bookId={book.id}
                                    priceSingleIdr={book.priceSingleIdr}
                                    priceSingleUsd={book.priceSingleUsd}
                                />
                            )}
                        </div>

                        {/* Chapter Navigation Footer (Prev / Next) */}
                        <div className="pt-8 border-t border-[#E5E0D5] flex items-center justify-between gap-4">
                            {prevChapter ? (
                                <Link
                                    href={`/read/${book.id}/${locale}/${prevChapter.slug}${
                                        locale === 'id' ? `?reg=${activeRegister}` : ''
                                    }`}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E5E0D5] bg-white text-xs sm:text-sm font-semibold text-stone-700 hover:text-[#111113] hover:bg-stone-50 transition-colors min-h-[40px]"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    <span>{t('reader.prev_chapter')}</span>
                                </Link>
                            ) : (
                                <div />
                            )}

                            {nextChapter && (
                                <Link
                                    href={`/read/${book.id}/${locale}/${nextChapter.slug}${
                                        locale === 'id' ? `?reg=${activeRegister}` : ''
                                    }`}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#111113] text-[#FAF8F5] text-xs sm:text-sm font-semibold hover:bg-stone-800 transition-colors min-h-[40px]"
                                >
                                    <span>{t('reader.next_chapter', { num: nextChapter.index })}</span>
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Mode 2: Landscape 16:9 Animation Stage */
                    <div className="space-y-6">
                        <LandscapeAnimationStage
                            storyProps={{
                                ...currentChapter.remotionConfig.sceneProps,
                                teammateName: teammateName.trim() || String(currentChapter.remotionConfig.sceneProps.teammateName ?? ''),
                            } as unknown as import('@/lib/remotion-types').ChapterLandscapeStoryProps}
                            durationInFrames={currentChapter.remotionConfig.durationInFrames}
                            fps={currentChapter.remotionConfig.fps}
                            optionalYoutube={currentChapter.optionalYoutube}
                        />

                        {/* Paywall Gate for locked chapters in Animation mode */}
                        {!currentChapter.hasAccess && (
                            <PaywallModal
                                volumeCode={book.volumeCode}
                                bookTitle={book.title}
                                bookId={book.id}
                                priceSingleIdr={book.priceSingleIdr}
                                priceSingleUsd={book.priceSingleUsd}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* SOS Search Modal */}
            <SosSearchModal
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                locale={locale}
                register={activeRegister as 'casual'}
            />
        </FullWidthWorkspaceLayout>
    );
}
