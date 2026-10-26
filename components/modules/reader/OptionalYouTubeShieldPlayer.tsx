'use client';
import { useTranslation } from '@/components/TranslationProvider';


interface OptionalYouTubeShieldPlayerProps {
    videoId: string;
}

export const OptionalYouTubeShieldPlayer: React.FC<OptionalYouTubeShieldPlayerProps> = ({ videoId }) => {
    const { t } = useTranslation();
    return (
        <div
            className="relative w-full overflow-hidden rounded-xl border border-[#E5E0D5] bg-black shadow-inner"
            style={{ aspectRatio: '16 / 9' }}
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* DOM Shield Overlay at the top to prevent casual copying/clicking of unlisted video title */}
            <div className="absolute top-0 left-0 right-0 h-14 z-10 bg-transparent select-none pointer-events-auto" />
            <iframe
                src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`}
                title={t('reader.chapter_video')}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            />
        </div>
    );
};
