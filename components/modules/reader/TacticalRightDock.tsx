'use client';
import { InContentRegisterToggle } from '@/components/layout/InContentRegisterToggle';
import type { PaperTheme } from '@/components/layout/FullWidthWorkspaceLayout';
import { useTranslation } from '@/components/TranslationProvider';
import { Sliders, Type } from 'lucide-react';

interface TacticalRightDockProps {
    locale: string;
    register: string;
    onRegisterChange?: (register: string) => void;
    paperTheme: PaperTheme;
    onPaperThemeChange: (theme: PaperTheme) => void;
    fontSize: 'sm' | 'base' | 'lg';
    onFontSizeChange: (size: 'sm' | 'base' | 'lg') => void;
    className?: string;
}

export const TacticalRightDock: React.FC<TacticalRightDockProps> = ({
    locale,
    register,
    onRegisterChange,
    paperTheme,
    onPaperThemeChange,
    fontSize,
    onFontSizeChange,
    className = '',
}) => {
    const { t } = useTranslation();

    return (
        <div className={`space-y-5 text-xs text-stone-800 ${className}`}>
            <div className="flex items-center gap-1.5 pb-3 border-b border-[#E5E0D5]">
                <Sliders className="w-3.5 h-3.5 text-stone-500" />
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-stone-500">
                    {t('reader.settings_title')}
                </span>
            </div>

            {/* 1. In-Content Register Switcher (Only when locale === 'id') */}
            {locale === 'id' && (
                <div className="space-y-2 pb-4 border-b border-[#E5E0D5]">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                        {t('reader.register_title')}
                    </span>
                    <InContentRegisterToggle
                        locale={locale}
                        register={register}
                        onRegisterChange={onRegisterChange}
                        className="w-full justify-center"
                    />
                </div>
            )}

            {/* 2. Paper Theme Controls */}
            <div className="space-y-2 pb-4 border-b border-[#E5E0D5]">
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                    {t('reader.paper_theme_title')}
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                    <button
                        type="button"
                        onClick={() => onPaperThemeChange('ivory')}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors min-h-[36px] ${
                            paperTheme === 'ivory'
                                ? 'bg-[#FAF8F5] text-[#111113] border-[#111113] font-bold shadow-2xs'
                                : 'bg-[#FAF8F5] text-stone-600 border-[#E5E0D5] hover:border-stone-400'
                        }`}
                    >
                        Ivory
                    </button>
                    <button
                        type="button"
                        onClick={() => onPaperThemeChange('sepia')}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors min-h-[36px] ${
                            paperTheme === 'sepia'
                                ? 'bg-[#F4ECD8] text-[#1C1917] border-[#1C1917] font-bold shadow-2xs'
                                : 'bg-[#F4ECD8] text-stone-700 border-[#E5E0D5] hover:border-stone-400'
                        }`}
                    >
                        Sepia
                    </button>
                    <button
                        type="button"
                        onClick={() => onPaperThemeChange('obsidian')}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors min-h-[36px] ${
                            paperTheme === 'obsidian'
                                ? 'bg-[#121316] text-[#F4F4F5] border-white font-bold shadow-2xs'
                                : 'bg-[#121316] text-stone-300 border-stone-800 hover:border-stone-600'
                        }`}
                    >
                        Obsidian
                    </button>
                </div>
            </div>

            {/* 3. Font Size Controls */}
            <div className="space-y-2">
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                    <Type className="w-3.5 h-3.5" />
                    <span>{t('reader.font_size_title')}</span>
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                    <button
                        type="button"
                        onClick={() => onFontSizeChange('sm')}
                        className={`px-2 py-1 rounded-lg border text-xs transition-colors min-h-[36px] ${
                            fontSize === 'sm'
                                ? 'bg-[#111113] text-[#FAF8F5] font-bold'
                                : 'bg-white text-stone-600 border-[#E5E0D5] hover:border-stone-400'
                        }`}
                    >
                        {t('reader.font_sm')}
                    </button>
                    <button
                        type="button"
                        onClick={() => onFontSizeChange('base')}
                        className={`px-2 py-1 rounded-lg border text-xs transition-colors min-h-[36px] ${
                            fontSize === 'base'
                                ? 'bg-[#111113] text-[#FAF8F5] font-bold'
                                : 'bg-white text-stone-600 border-[#E5E0D5] hover:border-stone-400'
                        }`}
                    >
                        {t('reader.font_base')}
                    </button>
                    <button
                        type="button"
                        onClick={() => onFontSizeChange('lg')}
                        className={`px-2 py-1 rounded-lg border text-xs transition-colors min-h-[36px] ${
                            fontSize === 'lg'
                                ? 'bg-[#111113] text-[#FAF8F5] font-bold'
                                : 'bg-white text-stone-600 border-[#E5E0D5] hover:border-stone-400'
                        }`}
                    >
                        {t('reader.font_lg')}
                    </button>
                </div>
            </div>
        </div>
    );
};
