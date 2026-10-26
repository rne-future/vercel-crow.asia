'use client';
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Menu, Sliders, X } from "lucide-react";
import { SosSearchModal } from "@/components/modules/reader/SosSearchModal";
import { useTranslation } from "@/components/TranslationProvider";

export type PaperTheme = "ivory" | "sepia" | "obsidian";

export function FullWidthWorkspaceLayout({
  children,
  topNavbar,
  leftSidebar,
  rightDock,
  paperTheme = "ivory",
  onTogglePaperTheme,
  onOpenSearch,
  locale = "id",
  register = "standard",
}: {
  children: React.ReactNode;
  topNavbar?: React.ReactNode;
  leftSidebar?: React.ReactNode;
  rightDock?: React.ReactNode;
  paperTheme?: PaperTheme;
  onTogglePaperTheme?: (theme: PaperTheme) => void;
  onOpenSearch?: () => void;
  locale?: string;
  register?: string;
}) {
  const { t } = useTranslation();
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [mobileDrawer, setMobileDrawer] = useState<"none" | "left" | "right">("none");
  const [searchOpen, setSearchOpen] = useState(false);

  void onTogglePaperTheme;

  const openSearch = () => {
    if (onOpenSearch) onOpenSearch();
    else setSearchOpen(true);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "\\") {
        e.preventDefault();
        setLeftOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onOpenSearch]);

  return (
    <div data-paper-theme={paperTheme} className="min-h-screen w-full flex flex-col font-sans transition-colors duration-200 selection:bg-[#FFE66D] selection:text-[#111113]">
      {topNavbar && (
        <header className="sticky top-0 z-30 w-full border-b border-[#E5E0D5] bg-inherit backdrop-blur-md">
          <div className="w-full px-4 lg:px-6 h-14 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileDrawer("left")}
                aria-label={t('reader.open_chapters')}
                className="lg:hidden p-2 rounded-md hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-[#1D4ED8] min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <Menu className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setLeftOpen((prev) => !prev)}
                aria-label={t(leftOpen ? 'reader.close_chapters' : 'reader.open_chapters')}
                title={t('reader.toggle_sidebar')}
                className="hidden lg:flex items-center justify-center p-2 rounded-md hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-[#1D4ED8] text-stone-600 hover:text-stone-900 transition-colors"
              >
                {leftOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex-1 flex items-center justify-between min-w-0">{topNavbar}</div>
            {rightDock && (
              <button
                type="button"
                onClick={() => setMobileDrawer("right")}
                aria-label={t('reader.open_settings')}
                className="xl:hidden p-2 rounded-md hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-[#1D4ED8] min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-700"
              >
                <Sliders className="w-5 h-5" />
              </button>
            )}
          </div>
        </header>
      )}

      <div className="w-full flex-1 flex justify-center items-start px-4 sm:px-6 lg:px-8 py-6 gap-6 relative">
        {leftSidebar && (
          <aside className={`hidden lg:block shrink-0 transition-all duration-200 sticky top-20 z-10 ${leftOpen ? "w-72 xl:w-80" : "w-0 overflow-hidden"}`}>
            {leftOpen && (
              <div className="reading-sheet rounded-2xl border p-4 sm:p-5 shadow-xs max-h-[calc(100vh-6rem)] overflow-y-auto">{leftSidebar}</div>
            )}
          </aside>
        )}
        <main className="flex-1 min-w-0 max-w-4xl">{children}</main>
        {rightDock && (
          <aside className={`hidden xl:block shrink-0 transition-all duration-200 sticky top-20 z-10 ${rightOpen ? "w-72 2xl:w-80" : "w-0 overflow-hidden"}`}>
            {rightOpen && (
              <div className="reading-sheet rounded-2xl border p-5 shadow-xs max-h-[calc(100vh-6rem)] overflow-y-auto">{rightDock}</div>
            )}
          </aside>
        )}
      </div>

      {mobileDrawer !== "none" && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity" onClick={() => setMobileDrawer("none")} aria-hidden="true" />
          {mobileDrawer === "left" && leftSidebar && (
            <div data-paper-theme={paperTheme} className="relative w-80 max-w-[85vw] h-full shadow-2xl flex flex-col z-10 bg-inherit border-r border-[#E5E0D5]">
              <div className="p-4 border-b border-[#E5E0D5] flex items-center justify-between">
                <span className="font-bold text-sm">{t('reader.chapter_list')}</span>
                <button type="button" onClick={() => setMobileDrawer("none")} className="p-2 rounded-md hover:bg-black/5 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label={t('common.close')}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">{leftSidebar}</div>
            </div>
          )}
          {mobileDrawer === "right" && rightDock && (
            <div data-paper-theme={paperTheme} className="relative ml-auto w-80 max-w-[85vw] h-full shadow-2xl flex flex-col z-10 bg-inherit border-l border-[#E5E0D5]">
              <div className="p-4 border-b border-[#E5E0D5] flex items-center justify-between">
                <span className="font-bold text-sm">{t('reader.settings_scripts')}</span>
                <button type="button" onClick={() => setMobileDrawer("none")} className="p-2 rounded-md hover:bg-black/5 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label={t('common.close')}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">{rightDock}</div>
            </div>
          )}
        </div>
      )}

      <SosSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} locale={locale} register={register === 'casual' ? 'casual' : 'standard'} />
    </div>
  );
}
