export type LocaleCode = string;
export type ContentRegister = "casual" | "standard";
export type BookId = "book-1" | "book-2" | "book-3";

export interface RemotionStepMarker {
  stepIndex: number;
  label: string;
  startFrame: number;
  durationFrames: number;
  headline: string;
  subheadline: string;
  bullets?: string[];
  dialogue?: {
    leaderSpeaker: string;
    leaderText: string;
    staffSpeaker: string;
    staffText: string;
  };
}

export interface ChapterLandscapeStoryProps extends Record<string, unknown> {
  bookId: BookId;
  chapterIndex: number;
  chapterTitle: string;
  motifIcon: string;
  locale: LocaleCode;
  register: ContentRegister;
  teammateName: string;
  accentHex: string;
  steps: RemotionStepMarker[];
}
