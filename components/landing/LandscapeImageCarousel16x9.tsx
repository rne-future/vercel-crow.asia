'use client';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from '@/components/TranslationProvider';

interface CarouselSlide {
    book_id: string;
    label: string;
    title: string;
    short_desc: string;
    action_link: string;
}

interface LandscapeImageCarousel16x9Props {
    locale?: string;
    className?: string;
}

export const LandscapeImageCarousel16x9: React.FC<LandscapeImageCarousel16x9Props> = ({
    locale = 'id',
    className = '',
}) => {
    const { t, get } = useTranslation();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    // Fallback slides definition if not populated in translations
    const defaultSlides: CarouselSlide[] = [
        {
            book_id: 'book-1',
            label: 'BUKU 01 • UNTUK PEMIMPIN TIM BARU',
            title: 'Mahir Memimpin Tim: Strategi Menciptakan Tim yang Mandiri',
            short_desc: 'Cara memberi arahan yang jelas, menegur tanpa bikin baper, dan melatih anak buah berpikir mandiri.',
            action_link: 'Baca Gratis Bab 1 →',
        },
        {
            book_id: 'book-2',
            label: 'BUKU 02 • UNTUK LEADER YANG MULAI KEWALAHAN',
            title: 'Napas Panjang Memimpin Tim: Mengatasi Kejenuhan & Membangun Sistem',
            short_desc: 'Cara berhenti jadi "pemadam kebakaran" setiap hari, mencetak tangan kanan, dan pulang kerja dengan pikiran tenang.',
            action_link: 'Baca Gratis Bab 1 →',
        },
        {
            book_id: 'book-3',
            label: 'BUKU 03 • UNTUK PEMIMPIN MULTI-TIM / CABANG',
            title: 'Memimpin Para Leader: Dari Mengarahkan Tim ke Menggerakkan Divisi',
            short_desc: 'Cara membina para kepala tim di bawahmu, meruntuhkan ego antar-tim, dan menerjemahkan target besar usaha.',
            action_link: 'Baca Gratis Bab 1 →',
        },
    ];

    const rawSlides = get('landing.hero.carousel.slides');
    const slides: CarouselSlide[] = Array.isArray(rawSlides) && rawSlides.length === 3
        ? (rawSlides as CarouselSlide[])
        : defaultSlides;

    // Auto-advance every 5 seconds, pauses on hover
    useEffect(() => {
        if (isHovered || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % slides.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [isHovered, slides.length]);

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % slides.length);
    };

    const currentSlide = slides[currentIndex] || slides[0];
    const imageSrc = `/illustrations/${currentSlide.book_id}/landscape.jpeg`;

    return (
        <div
            className={`relative w-full aspect-video rounded-2xl overflow-hidden border border-[#E5E0D5] bg-[#111113] shadow-lg group select-none ${className}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            data-carousel-container="true"
        >
            {/* Background Landscape Images with Smooth Fade */}
            {slides.map((slide, idx) => (
                <div
                    key={slide.book_id}
                    className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                        idx === currentIndex ? 'opacity-100 z-0' : 'opacity-0 pointer-events-none'
                    }`}
                >
                    <Image
                        fill
                        sizes="(max-width: 1024px) 100vw, 65vw"
                        src={`/illustrations/${slide.book_id}/landscape.jpeg`}
                        alt={slide.title}
                        className="w-full h-full object-cover object-center transform scale-102 transition-transform duration-6000 ease-out"
                        loading={idx === 0 ? 'eager' : 'lazy'}
                    />
                </div>
            ))}

            {/* Subtle Vignette & Scrim Gradient Overlay */}
            <div
                className="absolute inset-0 pointer-events-none z-10"
                style={{
                    background:
                        'linear-gradient(to top, rgba(10, 10, 12, 0.96) 0%, rgba(10, 10, 12, 0.72) 42%, rgba(10, 10, 12, 0.2) 75%, transparent 100%)',
                }}
            />

            {/* Top Bar: Slide Indicator & Dots */}
            <div className="absolute top-3.5 left-4 right-4 flex items-center justify-between z-20">
                <span className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/20 text-[10px] font-mono font-bold text-white tracking-wider uppercase">
                    {currentIndex + 1} / {slides.length}
                </span>

                {/* Pill Dot Indicators */}
                <div className="flex items-center gap-1.5 p-1 rounded-full bg-black/50 backdrop-blur-md border border-white/15">
                    {slides.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            aria-label={t('landing.hero.carousel.go_to_slide', { num: idx + 1 })}
                            className={`h-2 rounded-full transition-all duration-300 focus-visible:outline-2 focus-visible:outline-white ${
                                idx === currentIndex
                                    ? 'w-6 bg-[#FFE66D]'
                                    : 'w-2 bg-white/40 hover:bg-white/70'
                            }`}
                        />
                    ))}
                </div>
            </div>

            {/* Navigation Arrow Buttons */}
            <button
                type="button"
                onClick={handlePrev}
                aria-label={t('landing.hero.carousel.prev_slide')}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/55 backdrop-blur-md border border-white/20 text-white flex items-center justify-center opacity-80 hover:opacity-100 hover:bg-black/80 transition-all focus-visible:outline-2 focus-visible:outline-white shadow-md cursor-pointer"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>

            <button
                type="button"
                onClick={handleNext}
                aria-label={t('landing.hero.carousel.next_slide')}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/55 backdrop-blur-md border border-white/20 text-white flex items-center justify-center opacity-80 hover:opacity-100 hover:bg-black/80 transition-all focus-visible:outline-2 focus-visible:outline-white shadow-md cursor-pointer"
            >
                <ChevronRight className="w-5 h-5" />
            </button>

            {/* Bottom Content Scrim Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 z-20 flex flex-col justify-end">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                    <div className="space-y-1 max-w-xl">
                        <span className="inline-block text-[10px] font-mono font-bold tracking-wider uppercase text-[#FFE66D] drop-shadow-sm">
                            {currentSlide.label}
                        </span>
                        <h3 className="text-sm sm:text-base md:text-lg font-black text-white leading-snug drop-shadow-md">
                            {currentSlide.title}
                        </h3>
                        <p className="text-xs text-stone-300 line-clamp-2 leading-relaxed drop-shadow-sm">
                            {currentSlide.short_desc}
                        </p>
                    </div>

                    <div className="shrink-0 pt-1 sm:pt-0">
                        <Link
                            href={`/read/${currentSlide.book_id}/${locale}/ch-0`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FAF8F5] text-[#111113] font-bold text-xs hover:bg-[#FFE66D] transition-colors shadow-md min-h-[40px] focus-visible:outline-2 focus-visible:outline-white"
                        >
                            <BookOpen className="w-3.5 h-3.5 text-[#1D4ED8]" />
                            <span>{currentSlide.action_link}</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
