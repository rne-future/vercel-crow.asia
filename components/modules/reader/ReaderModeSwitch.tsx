'use client';
import { useTranslation } from '@/components/TranslationProvider';
import { BookOpen, Film } from 'lucide-react';

export type ReaderMode = 'read' | 'animasi';

interface ReaderModeSwitchProps {
    mode: ReaderMode;
    onModeChange: (mode: ReaderMode) => void;
    className?: string;
}

export const ReaderModeSwitch: React.FC<ReaderModeSwitchProps> = ({
    mode,
    onModeChange,
    className = '',
}) => {
    const { t } = useTranslation();

    return (
        <div
            role="tablist"
            aria-label={t('reader.display_mode')}
            className={`inline-flex items-center p-1 rounded-xl border border-[#E5E0D5] bg-[#FFFFFF] shadow-2xs ${className}`}
        >
            {/* Mode 1: Baca Interaktif */}
            <button
                type="button"
                role="tab"
                aria-selected={mode === 'read'}
                onClick={() => onModeChange('read')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-[#1D4ED8] min-h-[38px] ${
                    mode === 'read'
                        ? 'bg-[#111113] text-[#FAF8F5] shadow-xs'
                        : 'text-stone-600 hover:text-[#111113]'
                }`}
            >
                <BookOpen className="w-4 h-4" />
                <span>{t('reader.mode_read')}</span>
            </button>

            {/* Mode 2: Animasi Landscape 16:9 */}
            <button
                type="button"
                role="tab"
                aria-selected={mode === 'animasi'}
                onClick={() => onModeChange('animasi')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-[#1D4ED8] min-h-[38px] ${
                    mode === 'animasi'
                        ? 'bg-[#111113] text-[#FAF8F5] shadow-xs'
                        : 'text-stone-600 hover:text-[#111113]'
                }`}
            >
                <Film className="w-4 h-4" />
                <span>{t('reader.mode_animation')}</span>
            </button>
        </div>
    );
};
