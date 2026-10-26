import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { ChapterLandscapeStoryProps } from '@/lib/remotion-types';

export const ChapterInteractiveStory16x9Comp: React.FC<ChapterLandscapeStoryProps> = ({
    bookId,
    chapterIndex,
    chapterTitle,
    motifIcon,
    locale,
    register,
    teammateName = 'Budi',
    accentHex = '#1D4ED8',
    steps = [],
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const activeStep =
        steps.slice().reverse().find((s) => frame >= s.startFrame) || steps[0] || {
            stepIndex: 0,
            label: '01. Masalah & Konteks',
            startFrame: 0,
            durationFrames: 135,
            headline: 'Tantangan Lapangan',
            subheadline: 'Mengatasi friksi kerja harian bersama tim.',
        };

    const localFrame = Math.max(0, frame - activeStep.startFrame);

    const stepEntrance = spring({
        frame: localFrame,
        fps,
        config: { damping: 14, stiffness: 120, mass: 0.9 },
    });

    const progressPercent = interpolate(frame, [0, 540], [0, 100], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });

    const resolvedTeammate = teammateName.trim() ? teammateName.trim() : (locale === 'en' ? 'Alex' : 'Budi');

    const resolvedLeaderText = (activeStep.dialogue?.leaderText || 'Yuk kita selaraskan target kerjaan ini.')
        .replace(/\{\{teammateName\}\}/g, resolvedTeammate)
        .replace(/\[Nama\]/g, resolvedTeammate);

    const resolvedStaffText = (activeStep.dialogue?.staffText || 'Siap, apa saja poin utama yang perlu diperhatikan?')
        .replace(/\{\{teammateName\}\}/g, resolvedTeammate)
        .replace(/\[Nama\]/g, resolvedTeammate);

    const volumeLabel =
        bookId === 'book-2' ? 'VOL. 02 • ANTI-BURNOUT' : bookId === 'book-3' ? 'VOL. 03 • ORKESTRASI' : 'VOL. 01 • MAHIR MEMIMPIN';

    return (
        <div
            style={{
                width: 1280,
                height: 720,
                backgroundColor: '#FAF8F5',
                color: '#111113',
                fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '36px 48px',
                boxSizing: 'border-box',
                overflow: 'hidden',
            }}
        >
            {/* Top Bar: Volume code, Chapter Title & Step Pills */}
            <header
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #E5E0D5',
                    paddingBottom: '16px',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                        style={{
                            backgroundColor: accentHex,
                            color: '#FFFFFF',
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '12px',
                            fontWeight: 800,
                            padding: '4px 10px',
                            borderRadius: '6px',
                            letterSpacing: '0.05em',
                        }}
                    >
                        {volumeLabel}
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#111113' }}>
                        Bab {chapterIndex}: {chapterTitle}
                    </span>
                </div>

                {/* 4 Step Pills */}
                <div style={{ display: 'flex', gap: '8px' }}>
                    {[0, 1, 2, 3].map((sIdx) => {
                        const isCurrent = activeStep.stepIndex === sIdx;
                        return (
                            <div
                                key={sIdx}
                                style={{
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontFamily: '"JetBrains Mono", monospace',
                                    fontWeight: 700,
                                    backgroundColor: isCurrent ? '#FFE66D' : '#FFFFFF',
                                    border: isCurrent ? '1px solid #111113' : '1px solid #E5E0D5',
                                    color: '#111113',
                                }}
                            >
                                STEP 0{sIdx + 1}
                            </div>
                        );
                    })}
                </div>
            </header>

            {/* Main Stage Center (Animated via localFrame Spring) */}
            <main
                style={{
                    display: 'flex',
                    gap: '40px',
                    alignItems: 'center',
                    flex: 1,
                    minHeight: 0,
                    margin: '20px 0',
                    transform: `translateY(${(1 - stepEntrance) * 20}px)`,
                    opacity: stepEntrance,
                }}
            >
                {/* Left Column: Context Card */}
                <div
                    style={{
                        width: '380px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E5E0D5',
                        borderRadius: '16px',
                        padding: '28px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                    }}
                >
                    <div
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '11px',
                            fontWeight: 800,
                            color: accentHex,
                            textTransform: 'uppercase',
                        }}
                    >
                        <span>STEP 0{activeStep.stepIndex + 1} DARI 04</span>
                    </div>

                    <h2
                        style={{
                            fontSize: '24px',
                            fontWeight: 800,
                            lineHeight: 1.2,
                            color: '#111113',
                            margin: 0,
                        }}
                    >
                        {activeStep.headline}
                    </h2>

                    <p
                        style={{
                            fontSize: '14px',
                            lineHeight: 1.5,
                            color: '#52525B',
                            margin: 0,
                        }}
                    >
                        {activeStep.subheadline}
                    </p>

                    <div
                        style={{
                            marginTop: '12px',
                            padding: '10px 14px',
                            backgroundColor: '#FAF8F5',
                            borderRadius: '8px',
                            border: '1px solid #E5E0D5',
                            fontSize: '12px',
                            color: '#27272A',
                            fontFamily: '"JetBrains Mono", monospace',
                        }}
                    >
                        👤 Anggota Tim: <strong>{resolvedTeammate}</strong>
                    </div>
                </div>

                {/* Right Column: Visual Component depending on activeStep.stepIndex */}
                <div
                    style={{
                        flex: 1,
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E5E0D5',
                        borderRadius: '16px',
                        padding: '32px',
                        height: '420px',
                        boxSizing: 'border-box',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                    }}
                >
                    {activeStep.stepIndex === 0 && (
                        /* Step 0: Masalah & Konteks */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div
                                style={{
                                    padding: '16px 20px',
                                    backgroundColor: '#FEF2F2',
                                    borderLeft: '4px solid #DC2626',
                                    borderRadius: '8px',
                                }}
                            >
                                <span style={{ fontSize: '13px', fontWeight: 800, color: '#991B1B' }}>
                                    ⚠️ JEBAKAN KLASIK PEMIMPIN:
                                </span>
                                <p style={{ fontSize: '15px', color: '#7F1D1D', margin: '6px 0 0', lineHeight: 1.4 }}>
                                    Terlalu cepat mengambil alih pekerjaan teknis saat tim belum mandiri, berujung kelelahan mental dan target meleset.
                                </p>
                            </div>

                            <div
                                style={{
                                    padding: '16px 20px',
                                    backgroundColor: '#F0FDF4',
                                    borderLeft: '4px solid #16A34A',
                                    borderRadius: '8px',
                                }}
                            >
                                <span style={{ fontSize: '13px', fontWeight: 800, color: '#166534' }}>
                                    💡 PRINSIP TAKTIS CROW:
                                </span>
                                <p style={{ fontSize: '15px', color: '#14532D', margin: '6px 0 0', lineHeight: 1.4 }}>
                                    Kunci kesepakatan target di awal, berikan otonomi bertahap, dan kalibrasi gaya pendampingan sesuai tingkat kemandirian tugas.
                                </p>
                            </div>
                        </div>
                    )}

                    {activeStep.stepIndex === 1 && (
                        /* Step 1: Kerangka Taktis */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: '#71717A', fontFamily: '"JetBrains Mono", monospace' }}>
                                RUMUS TERTULIS LAPANGAN
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                <div style={{ padding: '16px', backgroundColor: '#FAF8F5', borderRadius: '12px', border: '1px solid #E5E0D5' }}>
                                    <span style={{ fontSize: '20px', fontWeight: 800, color: accentHex }}>01</span>
                                    <h4 style={{ margin: '8px 0 4px', fontSize: '15px', fontWeight: 800 }}>Keluaran</h4>
                                    <p style={{ margin: 0, fontSize: '13px', color: '#52525B' }}>Bentuk fisik hasil akhir yang disepakati bersama.</p>
                                </div>
                                <div style={{ padding: '16px', backgroundColor: '#FAF8F5', borderRadius: '12px', border: '1px solid #E5E0D5' }}>
                                    <span style={{ fontSize: '20px', fontWeight: 800, color: accentHex }}>02</span>
                                    <h4 style={{ margin: '8px 0 4px', fontSize: '15px', fontWeight: 800 }}>Kriteria</h4>
                                    <p style={{ margin: 0, fontSize: '13px', color: '#52525B' }}>Standar kualitas & metrik sukses terukur.</p>
                                </div>
                                <div style={{ padding: '16px', backgroundColor: '#FAF8F5', borderRadius: '12px', border: '1px solid #E5E0D5' }}>
                                    <span style={{ fontSize: '20px', fontWeight: 800, color: accentHex }}>03</span>
                                    <h4 style={{ margin: '8px 0 4px', fontSize: '15px', fontWeight: 800 }}>Kalender</h4>
                                    <p style={{ margin: 0, fontSize: '13px', color: '#52525B' }}>Tenggat hari dan jam pengumpulan yang tegas.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeStep.stepIndex === 2 && (
                        /* Step 2: Simulasi Skrip 1-on-1 */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 800, color: '#71717A', fontFamily: '"JetBrains Mono", monospace' }}>
                                PERCAKAPAN EMPAT MATA SIAP PRAKTIK
                            </div>

                            {/* Bubble Leader */}
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: '#111113', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, flexShrink: 0 }}>
                                    LEAD
                                </div>
                                <div style={{ flex: 1, backgroundColor: '#FAF8F5', border: '1px solid #E5E0D5', borderRadius: '12px', padding: '14px 18px', fontSize: '14px', lineHeight: 1.4, color: '#111113' }}>
                                    {'"'}{resolvedLeaderText}{'"'}
                                </div>
                            </div>

                            {/* Bubble Staff */}
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', alignSelf: 'flex-end', maxWidth: '85%' }}>
                                <div style={{ flex: 1, backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '12px', padding: '14px 18px', fontSize: '14px', lineHeight: 1.4, color: '#1E3A8A' }}>
                                    {'"'}{resolvedStaffText}{'"'}
                                </div>
                                <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: '#1D4ED8', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, flexShrink: 0 }}>
                                    {resolvedTeammate.substring(0, 3).toUpperCase()}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeStep.stepIndex === 3 && (
                        /* Step 3: Target Praktik & Checklist */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 800, color: '#71717A', fontFamily: '"JetBrains Mono", monospace' }}>
                                CHECKLIST AKSI MEJA KERJA MINGGU INI
                            </div>
                            {(activeStep.bullets || ['Kunci target Rumus 3K', 'Lakukan kalibrasi tugas', 'Dokumentasikan hasil']).map((b, bIdx) => (
                                <div
                                    key={bIdx}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '14px',
                                        padding: '14px 18px',
                                        backgroundColor: '#FAF8F5',
                                        borderRadius: '10px',
                                        border: '1px solid #E5E0D5',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: '22px',
                                            height: '22px',
                                            borderRadius: '6px',
                                            backgroundColor: '#10B981',
                                            color: '#FFFFFF',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '12px',
                                            fontWeight: 800,
                                        }}
                                    >
                                        ✓
                                    </div>
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#18181B' }}>
                                        {b}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Bottom Scrubber Timeline Bar */}
            <footer style={{ borderTop: '1px solid #E5E0D5', paddingTop: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', fontFamily: '"JetBrains Mono", monospace', color: '#71717A', marginBottom: '8px' }}>
                    <span>DURASI FRAME: {frame} / 540 (30 FPS)</span>
                    <span>PROGRES: {Math.round(progressPercent)}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: '#E5E0D5', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                        style={{
                            width: `${progressPercent}%`,
                            height: '100%',
                            backgroundColor: accentHex,
                        }}
                    />
                </div>
            </footer>
        </div>
    );
};
