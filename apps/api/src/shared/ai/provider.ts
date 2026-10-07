import type {
  EncouragementRequest,
  EveningPromptRequest,
  EveningWordRequest,
  EncouragementText,
  JourneyCounts,
  JourneyStone,
} from '@ebenezer/contracts';

export type EncouragementInput = EncouragementRequest & {
  scripture: { reference: string; text: string; translation: string };
  journey?: JourneyCounts;
  stones?: JourneyStone[];
  passageReferences?: string[];
};

/** Application services depend on this contract, never a vendor SDK. */
export interface EncouragementProvider {
  selectMorningReference?(
    input: EncouragementRequest,
  ): Promise<{ book: string; chapter: number; verse: number }>;
  selectMorningTheme?(input: EncouragementRequest): Promise<EncouragementRequest['theme']>;
  eveningQuestion?(input: EveningPromptRequest): Promise<string>;
  selectEveningWord?(input: EveningWordRequest): Promise<{
    book: string;
    chapter: number;
    firstVerse: number;
    lastVerse: number;
    note: string;
    /** Up to three real songs, best first; the server shows the first one it can confirm. */
    songs: { title: string; artist: string }[];
  }>;
  generate(input: EncouragementInput): Promise<EncouragementText>;
}
