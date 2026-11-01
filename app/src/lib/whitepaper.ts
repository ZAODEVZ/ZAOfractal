import whitepaperJson from '../data/whitepaper.json';

export interface Chapter {
  id: string;
  num: string | null;
  title: string;
  minutes: number;
  body: string;
}

export const chapters = whitepaperJson as unknown as Chapter[];
