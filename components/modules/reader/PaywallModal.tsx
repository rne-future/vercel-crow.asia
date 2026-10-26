'use client';
import { useTranslation } from '@/components/TranslationProvider';
import { BookOpen, CheckCircle, Lock, ShieldCheck } from 'lucide-react';

interface PaywallModalProps {
    volumeCode: string;
    bookTitle: string;
    bookId: string;
    priceSingleIdr?: number;
    priceSingleUsd?: number;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
    volumeCode,
    bookTitle,
    bookId,
    priceSingleIdr = 149000,
    priceSingleUsd = 9.99,
}) => {
    const { t, locale, formatPrice } = useTranslation();
    const formattedPrice = formatPrice(priceSingleIdr, priceSingleUsd);

    return (
        <div className="w-full max-w-[72ch] mx-auto mt-8 p-6 sm:p-8 rounded-2xl border-2 border-dashed border-[#E5E0D5] bg-[#FFFFFF] shadow-sm text-center space-y-6">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <Lock className="w-6 h-6" />
            </div>

            <div className="space-y-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                    {t('paywall.badge')}
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-[#111113]">
                    {t('paywall.title', { volume: volumeCode, title: bookTitle })}
                </h3>
                <p className="text-sm text-stone-600 max-w-lg mx-auto leading-relaxed">
                    {t('paywall.description')}
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left max-w-md mx-auto text-xs text-stone-700">
                <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{t('paywall.feature_1')}</span>
                </div>
                <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{t('paywall.feature_2')}</span>
                </div>
                <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{t('paywall.feature_3')}</span>
                </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                    href={`/?locale=${locale}#harga`}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold rounded-lg bg-[#111113] text-[#FAF8F5] hover:bg-stone-800 transition-colors focus-visible:outline-2 focus-visible:outline-[#1D4ED8] min-h-[44px]"
                >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{t('paywall.cta_buy', { price: formattedPrice })}</span>
                </a>
                <a
                    href="/login"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-lg border border-[#E5E0D5] bg-[#FAF8F5] text-stone-700 hover:text-[#111113] transition-colors focus-visible:outline-2 focus-visible:outline-[#1D4ED8] min-h-[44px]"
                >
                    <BookOpen className="w-4 h-4" />
                    <span>{t('paywall.cta_login')}</span>
                </a>
            </div>
        </div>
    );
};
