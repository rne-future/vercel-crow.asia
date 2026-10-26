'use client';
import { useEffect, useRef, useState } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import { BookCoverRemotionComp, type BookCoverProps } from '@/components/remotion/compositions/BookCoverRemotionComp';
import { useTranslation } from '@/components/TranslationProvider';

interface RemotionBookCoverPlayerProps {
    bookProps: BookCoverProps;
    isHovered?: boolean;
    className?: string;
}

export const RemotionBookCoverPlayer: React.FC<RemotionBookCoverPlayerProps> = ({
    bookProps,
    isHovered: externalHover,
    className = '',
}) => {
    const { t } = useTranslation();
    const playerRef = useRef<PlayerRef>(null);
    const [internalHover, setInternalHover] = useState(false);

    const activeHover = externalHover !== undefined ? externalHover : internalHover;

    useEffect(() => {
        if (!playerRef.current) return;

        if (activeHover) {
            try {
                playerRef.current.play();
            } catch (err) {
                // Ignore autoplay/playback interruption
            }
        } else {
            try {
                playerRef.current.pause();
            } catch (err) {
                // Ignore
            }
        }
    }, [activeHover]);

    return (
        <div
            className={`relative group cursor-pointer transition-transform duration-300 ${className}`}
            onMouseEnter={() => setInternalHover(true)}
            onMouseLeave={() => setInternalHover(false)}
            style={{
                aspectRatio: '2 / 3',
                width: '100%',
                maxHeight: 380,
            }}
        >
            <div
                className="w-full h-full rounded-2xl overflow-hidden shadow-md group-hover:shadow-2xl transition-all duration-300 pointer-events-none"
            >
                <Player
                    ref={playerRef}
                    component={BookCoverRemotionComp as unknown as React.FC<Record<string, unknown>>}
                    inputProps={bookProps as unknown as Record<string, unknown>}
                    durationInFrames={150}
                    fps={30}
                    compositionWidth={400}
                    compositionHeight={600}
                    style={{
                        width: '100%',
                        height: '100%',
                    }}
                    autoPlay={false}
                    loop
                    clickToPlay={false}
                    controls={false}
                />
            </div>

            {/* Hover indicator hint badge */}
            <div
                className={`absolute bottom-3 right-3 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-[10px] font-mono text-white/90 transition-opacity duration-300 pointer-events-none ${
                    activeHover ? 'opacity-100' : 'opacity-0'
                }`}
            >
                {t('landing.catalog.cinematic_motion')}
            </div>
        </div>
    );
};
