'use client';
import { useEffect, useRef, useState } from 'react';
import { CallbackListener, Player, PlayerRef } from '@remotion/player';
import { Maximize2, Pause, Play, RotateCcw, Sparkles, Video } from 'lucide-react';
import { ChapterLandscapeStoryProps } from '@/lib/remotion-types';
import { ChapterInteractiveStory16x9Comp } from '@/components/remotion/compositions/ChapterInteractiveStory16x9Comp';
import { OptionalYouTubeShieldPlayer } from '@/components/modules/reader/OptionalYouTubeShieldPlayer';
import { useTranslation } from '@/components/TranslationProvider';

interface LandscapeAnimationStageProps {
    storyProps: ChapterLandscapeStoryProps;
    durationInFrames?: number;
    fps?: number;
    optionalYoutube?: {
        isEnabled: boolean;
        videoId: string | null;
    };
}

export const LandscapeAnimationStage: React.FC<LandscapeAnimationStageProps> = ({
    storyProps,
    durationInFrames = 540,
    fps = 30,
    optionalYoutube,
}) => {
    const { t } = useTranslation();
    const playerRef = useRef<PlayerRef>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);
    const [playing, setPlaying] = useState(true);
    const [currentFrame, setCurrentFrame] = useState(0);
    const [playbackRate, setPlaybackRate] = useState<number>(1);
    const [activeSubMode, setActiveSubMode] = useState<'remotion' | 'youtube'>('remotion');

    const showYoutubeTab = Boolean(optionalYoutube?.isEnabled && optionalYoutube?.videoId);

    useEffect(() => {
        setMounted(true);
        if (typeof window !== 'undefined' && window.matchMedia) {
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                setPlaying(false);
            }
        }
    }, []);

    useEffect(() => {
        if (!mounted || activeSubMode !== 'remotion') return;
        const player = playerRef.current;
        if (!player) return;

        const onPlay: CallbackListener<'play'> = () => setPlaying(true);
        const onPause: CallbackListener<'pause'> = () => setPlaying(false);
        const onFrameUpdate: CallbackListener<'frameupdate'> = (e) => {
            setCurrentFrame(e.detail.frame);
        };

        player.addEventListener('play', onPlay);
        player.addEventListener('pause', onPause);
        player.addEventListener('frameupdate', onFrameUpdate);

        return () => {
            player.removeEventListener('play', onPlay);
            player.removeEventListener('pause', onPause);
            player.removeEventListener('frameupdate', onFrameUpdate);
        };
    }, [mounted, activeSubMode]);

    const handleSeekToStep = (startFrame: number) => {
        const player = playerRef.current;
        if (!player) return;
        player.seekTo(startFrame);
        player.play();
    };

    const handleFullscreen = () => {
        if (!containerRef.current) return;
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        } else {
            containerRef.current.requestFullscreen().catch(() => {});
        }
    };

    const steps = storyProps.steps || [];
    const activeStepIndex = steps.reduce((acc, step, idx) => {
        if (currentFrame >= step.startFrame) return idx;
        return acc;
    }, 0);

    return (
        <div
            ref={containerRef}
            className="w-full rounded-2xl border border-[#E5E0D5] bg-[#FAF8F5] p-3 sm:p-4 shadow-xs"
        >
            {/* Top Bar: Sub-Mode Switcher (Only shown if optional YouTube is enabled) */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E0D5] bg-white px-2.5 py-1 font-mono text-xs font-extrabold text-[#111113]">
                        <Sparkles className="h-3.5 w-3.5 text-[#1D4ED8]" />
                        <span>{t('reader.studio_title')}</span>
                    </span>
                </div>

                {showYoutubeTab && (
                    <div className="inline-flex rounded-xl border border-[#E5E0D5] bg-white p-1">
                        <button
                            type="button"
                            onClick={() => setActiveSubMode('remotion')}
                            className={`min-h-9 rounded-lg px-3 py-1 font-mono text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-[#1D4ED8] ${
                                activeSubMode === 'remotion'
                                    ? 'bg-[#111113] text-white'
                                    : 'text-stone-600 hover:text-[#111113]'
                            }`}
                        >
                            ✨ Animasi Interaktif
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                playerRef.current?.pause();
                                setActiveSubMode('youtube');
                            }}
                            className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 py-1 font-mono text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-[#1D4ED8] ${
                                activeSubMode === 'youtube'
                                    ? 'bg-[#111113] text-white'
                                    : 'text-stone-600 hover:text-[#111113]'
                            }`}
                        >
                            <Video className="h-3.5 w-3.5" />
                            <span>{t('reader.video_explanation')}</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Main 16:9 Landscape Canvas */}
            {activeSubMode === 'youtube' && showYoutubeTab && optionalYoutube?.videoId ? (
                <OptionalYouTubeShieldPlayer videoId={optionalYoutube.videoId} />
            ) : (
                <>
                    <div
                        className="relative w-full overflow-hidden rounded-xl border border-[#E5E0D5] bg-white shadow-inner"
                        style={{ aspectRatio: '16 / 9' }}
                    >
                        {!mounted ? (
                            <div className="flex h-full w-full items-center justify-center font-mono text-xs font-bold text-stone-500">
                                {t('reader.animation_loading')}
                            </div>
                        ) : (
                            <Player
                                ref={playerRef}
                                component={ChapterInteractiveStory16x9Comp}
                                inputProps={storyProps}
                                durationInFrames={durationInFrames}
                                compositionWidth={1280}
                                compositionHeight={720}
                                fps={fps}
                                loop
                                autoPlay={playing}
                                playbackRate={playbackRate}
                                initiallyMuted={true}
                                numberOfSharedAudioTags={0}
                                acknowledgeRemotionLicense
                                controls={false}
                                clickToPlay={false}
                                style={{ width: '100%', height: '100%' }}
                            />
                        )}
                    </div>

                    {/* Interactive Step Markers & Playback Controls */}
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="grid flex-1 grid-cols-2 gap-1.5 sm:grid-cols-4">
                            {steps.map((step, idx) => {
                                const isActive = activeStepIndex === idx;
                                return (
                                    <button
                                        key={step.stepIndex}
                                        type="button"
                                        onClick={() => handleSeekToStep(step.startFrame)}
                                        className={`min-h-11 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-[#1D4ED8] ${
                                            isActive
                                                ? 'border-[#111113] bg-[#FFE66D] text-[#111113] shadow-2xs font-bold'
                                                : 'border-[#E5E0D5] bg-white text-stone-600 hover:bg-stone-50'
                                        }`}
                                    >
                                        <div className="font-mono text-[10px] font-extrabold uppercase">
                                            STEP 0{idx + 1}
                                        </div>
                                        <div className="line-clamp-1 text-xs font-bold">
                                            {step.label}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex items-center justify-end gap-1.5 shrink-0">
                            <button
                                type="button"
                                onClick={() => {
                                    const p = playerRef.current;
                                    if (!p) return;
                                    p.isPlaying() ? p.pause() : p.play();
                                }}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#E5E0D5] bg-white text-[#111113] hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-[#1D4ED8]"
                                title={t(playing ? 'reader.pause_animation' : 'reader.play_animation')}
                                aria-label={t(playing ? 'reader.pause_animation' : 'reader.play_animation')}
                            >
                                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSeekToStep(0)}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#E5E0D5] bg-white text-[#111113] hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-[#1D4ED8]"
                                title={t('reader.restart_animation')}
                                aria-label={t('reader.restart_animation')}
                            >
                                <RotateCcw className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    setPlaybackRate((prev) => (prev === 1 ? 1.25 : prev === 1.25 ? 0.75 : 1))
                                }
                                className="inline-flex h-11 min-w-11 items-center justify-center rounded-xl border border-[#E5E0D5] bg-white px-2.5 font-mono text-xs font-bold text-[#111113] hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-[#1D4ED8]"
                                aria-label={t('reader.playback_speed')}
                            >
                                {playbackRate}x
                            </button>
                            <button
                                type="button"
                                onClick={handleFullscreen}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#E5E0D5] bg-white text-[#111113] hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-[#1D4ED8]"
                                title={t('reader.fullscreen')}
                                aria-label={t('reader.fullscreen')}
                            >
                                <Maximize2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
