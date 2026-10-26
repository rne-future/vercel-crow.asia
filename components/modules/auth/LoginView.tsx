'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useTranslation as useLoginTranslation } from '@/components/TranslationProvider';

import { ArrowLeft, Lock, LogIn, Mail } from 'lucide-react';

export function LoginView({ error }: { error?: string }) {
    const { t } = useLoginTranslation();
    const [email, setEmail] = useState('');
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [processing, setProcessing] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setSubmitError(null);
        const fd = new FormData();
        fd.set('email', email.trim());
        fd.set('password', password);
        try {
            const response = await fetch('/api/auth/login', { method: 'POST', body: fd });
            if (!response.ok) {
                const result = await response.json();
                setSubmitError(response.status === 401 ? t('auth.invalid_credentials') : t('auth.failed'));
                return;
            }
            window.location.href = '/dashboard';
        } catch {
            setSubmitError(t('auth.network_error'));
        } finally {
            setProcessing(false);
        }
    };

    return (
        <>

            <div className="w-full max-w-md mx-auto py-16 px-4 sm:px-6">
                <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-stone-500 hover:text-[#111113] mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>{t('auth.back_home')}</span>
                </Link>

                <div className="p-6 sm:p-8 rounded-2xl border border-[#E5E0D5] bg-[#FFFFFF] shadow-sm space-y-6">
                    <div className="space-y-1.5 text-center">
                        <div className="w-10 h-10 mx-auto rounded-xl bg-[#111113] text-white flex items-center justify-center font-bold">
                            <LogIn className="w-5 h-5" />
                        </div>
                        <h1 className="text-xl font-black text-[#111113]">{t('auth.login_title')}</h1>
                        <p className="text-xs text-stone-500">
                            {t('auth.login_desc')}
                        </p>
                    </div>

                    {(submitError || error) && (
                        <div role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium text-center">
                            {submitError || error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label htmlFor="login-email" className="block text-xs font-mono font-bold uppercase text-stone-700">
                                {t('auth.email_label')}
                            </label>
                            <div className="relative">
                                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    id="login-email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="nama@email.com"
                                    className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-lg border border-[#E5E0D5] bg-[#FAF8F5] focus:outline-none focus:border-[#1D4ED8] focus:ring-1 focus:ring-[#1D4ED8]"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="login-password" className="block text-xs font-mono font-bold uppercase text-stone-700">
                                {t('auth.password_label')}
                            </label>
                            <div className="relative">
                                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    id="login-password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-lg border border-[#E5E0D5] bg-[#FAF8F5] focus:outline-none focus:border-[#1D4ED8] focus:ring-1 focus:ring-[#1D4ED8]"
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#111113] text-white font-bold text-sm hover:bg-stone-800 disabled:opacity-50 transition-colors min-h-[44px]"
                            >
                                <span>{processing ? t('auth.checking') : t('auth.login_btn')}</span>
                            </button>
                        </div>
                    </form>

                    <div className="pt-4 border-t border-[#E5E0D5] text-center text-xs text-stone-500 space-y-2">
                        <p>
                            {t('auth.no_account')}{' '}
                            <Link href="/#harga" className="font-bold text-[#1D4ED8] hover:underline">
                                {t('auth.buy_here')}
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
