'use client';
import Link from 'next/link';
import { useTranslation } from '@/components/TranslationProvider';

import { BookOpen, CheckCircle, Download, Lock, LogOut, ShieldCheck, User } from 'lucide-react';

interface BookItem {
    id: string;
    volumeCode: string;
    title: string;
    subtitle: string;
    accentHex: string;
    priceSingleIdr: number;
    isUnlocked: boolean;
}

interface OrderItem {
    orderNumber: string;
    tierName: string;
    amountIdr: number;
    status: string;
    paidAt: string | null;
}

export interface DashboardProps {
    user: { name: string; email: string; role?: string } | null;
    allBooks: BookItem[];
    recentOrders: OrderItem[];
    checklistSummary: Record<string, number>;
    locale: string;
}

export function DashboardView({
    user,
    allBooks,
    recentOrders,
    checklistSummary,
    locale,
}: DashboardProps) {
    const { t } = useTranslation();


    return (
        <>

            <div className="w-full max-w-6xl mx-auto py-10 px-4 sm:px-6 space-y-10">
                {/* Header Profile / Status */}
                <div className="p-6 sm:p-8 rounded-2xl border border-[#E5E0D5] bg-[#FFFFFF] shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="p-2 rounded-lg bg-[#FAF8F5] border border-[#E5E0D5] text-[#111113]">
                                <User className="w-5 h-5" />
                            </span>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-black text-[#111113]">
                                    {t('dashboard.greeting', { name: user?.name || user?.email || 'Reader' })}
                                </h1>
                                <p className="text-xs text-stone-500 font-mono">
                                    {user?.email}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {(user?.role === 'admin' || user?.role === 'editor') && (
                            <Link
                                href="/admin"
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-purple-200 bg-purple-50 text-xs font-bold text-purple-900 hover:bg-purple-100 transition-colors"
                            >
                                <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                                <span>Admin Panel</span>
                            </Link>
                        )}

                        <Link href="/#harga"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#E5E0D5] bg-[#FAF8F5] text-xs font-bold text-stone-800 hover:bg-stone-100 transition-colors"
                        >
                            <span>{t('dashboard.buy_more')}</span>
                        </Link>

                        <button
                            type="button"
                            onClick={() => fetch('/api/auth/logout', { method: 'POST' }).then(() => { window.location.href = '/'; })}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E5E0D5] bg-white text-xs font-bold text-stone-700 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>{t('dashboard.logout')}</span>
                        </button>
                    </div>
                </div>

                {/* Section: Playbooks Library */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg sm:text-xl font-extrabold text-[#111113]">{t('dashboard.my_library')}</h2>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {allBooks.map((book) => {
                            const completedCount = checklistSummary[book.id] || 0;

                            return (
                                <div
                                    key={book.id}
                                    className={`p-6 rounded-2xl border flex flex-col justify-between space-y-6 transition-all ${
                                        book.isUnlocked
                                            ? 'border-[#111113] bg-[#FFFFFF] shadow-sm'
                                            : 'border-[#E5E0D5] bg-[#FAF8F5]/80 opacity-90'
                                    }`}
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span
                                                className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase text-white"
                                                style={{ backgroundColor: book.accentHex }}
                                            >
                                                {book.volumeCode}
                                            </span>

                                            {book.isUnlocked ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                    <CheckCircle className="w-3 h-3" />
                                                    <span>{t('dashboard.active_access')}</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                                                    <Lock className="w-3 h-3" />
                                                    <span>{t('dashboard.locked')}</span>
                                                </span>
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            <h3 className="font-extrabold text-base text-[#111113]">{book.title}</h3>
                                            <p className="text-xs text-stone-500 leading-relaxed">{book.subtitle}</p>
                                        </div>

                                        {book.isUnlocked && (
                                            <div className="pt-2 text-[11px] font-mono text-stone-600">
                                                <span>{t('dashboard.completed_checklists', { count: completedCount })}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-4 border-t border-[#E5E0D5] space-y-2">
                                        {book.isUnlocked ? (
                                            <>
                                                <Link
                                                    href={`/read/${book.id}/${locale}/ch-0`}
                                                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#111113] text-white font-bold text-xs hover:bg-stone-800 transition-colors min-h-[40px]"
                                                >
                                                    <BookOpen className="w-3.5 h-3.5" />
                                                    <span>{t('dashboard.open_reader')}</span>
                                                </Link>
                                                <Link
                                                    href={`/api/download/pdf/${book.id}`}
                                                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-[#E5E0D5] bg-[#FAF8F5] text-stone-800 font-semibold text-xs hover:bg-stone-100 transition-colors min-h-[38px]"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                    <span>{t('dashboard.download_pdf')}</span>
                                                </Link>
                                            </>
                                        ) : (
                                            <Link
                                                href={`/checkout/tier-${book.id}?locale=${locale}`}
                                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#111113] text-white font-bold text-xs hover:bg-stone-800 transition-colors min-h-[40px]"
                                            >
                                                <ShieldCheck className="w-3.5 h-3.5" />
                                                <span>{t('landing.pricing.cta_buy')}</span>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Section: Order History */}
                {recentOrders.length > 0 && (
                    <div className="space-y-4 pt-6 border-t border-[#E5E0D5]">
                        <h2 className="text-base font-bold text-[#111113]">{t('dashboard.recent_orders')}</h2>
                        <div className="rounded-xl border border-[#E5E0D5] bg-white overflow-hidden shadow-2xs">
                            <table className="w-full text-left text-xs font-mono">
                                <thead className="bg-[#FAF8F5] border-b border-[#E5E0D5] text-stone-500 uppercase">
                                    <tr>
                                        <th className="p-3">{t('dashboard.order_number')}</th>
                                        <th className="p-3">{t('dashboard.tier_package')}</th>
                                        <th className="p-3">{t('common.total')}</th>
                                        <th className="p-3">{t('common.status')}</th>
                                        <th className="p-3">{t('dashboard.paid_at')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E5E0D5]">
                                    {recentOrders.map((ord) => (
                                        <tr key={ord.orderNumber} className="hover:bg-[#FAF8F5]/60">
                                            <td className="p-3 font-bold text-stone-900">{ord.orderNumber}</td>
                                            <td className="p-3 font-sans font-medium text-stone-800">{ord.tierName}</td>
                                            <td className="p-3">Rp{ord.amountIdr.toLocaleString('id-ID')}</td>
                                            <td className="p-3">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    {ord.status}
                                                </span>
                                            </td>
                                            <td className="p-3 text-stone-500">{ord.paidAt || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
