import { Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { BookId } from '@/lib/remotion-types';

export interface BookCoverProps {
    bookId: BookId;
    volumeCode: string;
    title: string;
    subtitle: string;
    accentHex: string;
    illustrationPath: string;
    coverTitleTop?: string;
    coverTitleBottom?: string;
    chaptersLabel?: string;
    editionLabel?: string;
}

export const BookCoverRemotionComp: React.FC<BookCoverProps> = ({
    bookId,
    volumeCode,
    subtitle,
    accentHex,
    illustrationPath,
    coverTitleTop,
    coverTitleBottom,
    chaptersLabel = '13 Bab + Lampiran',
    editionLabel = 'ID + EN',
}) => {
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();

    // 1. Ken Burns slow breathing zoom (smooth loop)
    const scale = interpolate(
        frame,
        [0, durationInFrames / 2, durationInFrames],
        [1.0, 1.04, 1.0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );

    const translateY = interpolate(
        frame,
        [0, durationInFrames / 2, durationInFrames],
        [0, -6, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );

    // 2. Dynamic Light Sheen Glint Sweep
    const sheenProgress = (frame % 90) / 90;
    const sheenX = interpolate(sheenProgress, [0, 0.5, 1], [-160, 140, 260]);
    const sheenOpacity = interpolate(sheenProgress, [0, 0.25, 0.5, 0.75, 1], [0, 0.35, 0.15, 0, 0]);

    // Fallback titles if not provided via props
    const defaultTop = bookId === 'book-1' ? 'MAHIR' : bookId === 'book-2' ? 'NAFAS PANJANG' : 'MEMIMPIN';
    const defaultBottom = bookId === 'book-1' ? 'MEMIMPIN TIM' : bookId === 'book-2' ? 'MEMIMPIN TIM' : 'PARA LEADER';

    const topText = coverTitleTop || defaultTop;
    const bottomText = coverTitleBottom || defaultBottom;

    return (
        <div
            style={{
                width: 400,
                height: 600,
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '4px 16px 16px 4px',
                backgroundColor: '#111113',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.5), inset 2px 0 6px rgba(0, 0, 0, 0.6)',
                border: 'none',
            }}
        >
            {/* Background Layer: Full-Bleed Animated Papercraft Portrait */}
            <div
                style={{
                    position: 'absolute',
                    inset: -10,
                    transform: `scale(${scale}) translateY(${translateY}px)`,
                    transformOrigin: 'center center',
                    willChange: 'transform',
                }}
            >
                <Img
                    src={illustrationPath}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                    }}
                />
            </div>

            {/* Closed-Book Spine Crease Shadow Overlay (Left Edge - Darkening Only, No White Streak) */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: '12%',
                    background:
                        'linear-gradient(to right, rgba(0, 0, 0, 0.65) 0%, rgba(0, 0, 0, 0.25) 50%, transparent 100%)',
                    zIndex: 15,
                    pointerEvents: 'none',
                }}
            />

            {/* Dynamic Light Sheen Sweep Overlay */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: sheenOpacity,
                    background:
                        'linear-gradient(115deg, transparent 35%, rgba(255, 255, 255, 0.45) 50%, transparent 65%)',
                    transform: `translateX(${sheenX}%)`,
                    pointerEvents: 'none',
                    zIndex: 12,
                }}
            />

            {/* Top Bar Overlay */}
            <div
                style={{
                    position: 'absolute',
                    top: 20,
                    left: 20,
                    right: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    zIndex: 20,
                }}
            >
                <span
                    style={{
                        padding: '4px 10px',
                        borderRadius: 8,
                        backgroundColor: 'rgba(17, 17, 19, 0.72)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255, 255, 255, 0.22)',
                        fontSize: 11,
                        fontFamily: 'JetBrains Mono, monospace',
                        fontWeight: 900,
                        color: '#FFFFFF',
                        letterSpacing: '0.06em',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    }}
                >
                    {volumeCode}
                </span>

                <span
                    style={{
                        padding: '4px 10px',
                        borderRadius: 8,
                        backgroundColor: 'rgba(17, 17, 19, 0.65)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        fontSize: 10,
                        fontFamily: 'Newsreader, serif',
                        fontStyle: 'italic',
                        color: '#FAF8F5',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    }}
                >
                    {chaptersLabel}
                </span>
            </div>

            {/* Bottom Scrim: High-Contrast Gradient for Cover Title */}
            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: '52%',
                    background:
                        'linear-gradient(to top, rgba(10, 10, 12, 0.95) 0%, rgba(10, 10, 12, 0.75) 50%, rgba(10, 10, 12, 0.3) 78%, transparent 100%)',
                    zIndex: 18,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    padding: '24px 22px',
                }}
            >
                {/* Title in High Contrast */}
                <h2
                    style={{
                        fontSize: bookId === 'book-2' ? 24 : 26,
                        fontWeight: 900,
                        color: '#FFFFFF',
                        lineHeight: 1.15,
                        margin: '0 0 8px 0',
                        letterSpacing: '-0.01em',
                        textShadow: '0 3px 10px rgba(0,0,0,0.8)',
                    }}
                >
                    {topText}
                    <br />
                    {bottomText}
                </h2>

                <p
                    style={{
                        fontSize: 11,
                        color: '#D4D4D8',
                        lineHeight: 1.45,
                        margin: '0 0 16px 0',
                        textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                        maxHeight: 34,
                        overflow: 'hidden',
                    }}
                >
                    {subtitle}
                </p>

                {/* Cover Bottom Footer Bar */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderTop: '1px solid rgba(255, 255, 255, 0.18)',
                        paddingTop: 10,
                        fontSize: 10,
                        fontFamily: 'JetBrains Mono, monospace',
                        fontWeight: 800,
                        color: '#A1A1AA',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: accentHex,
                                boxShadow: `0 0 8px ${accentHex}`,
                            }}
                        />
                        <span style={{ color: '#FFFFFF' }}>crow.asia</span>
                    </div>
                    <span style={{ color: '#E4E4E7' }}>{editionLabel}</span>
                </div>
            </div>
        </div>
    );
};
