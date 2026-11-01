// Hand-curated timeline data sourced from reference/14-timeline.md.
// Each entry: when, what, era, optional URL. Era drives color coding.

export type Era = 'pre-fractal' | 'fractally' | 'eos-eden' | 'optimism-fractal' | 'zao';

export interface TimelineEvent {
  when: string;
  title: string;
  body: string;
  era: Era;
  url?: string;
}

export const ERA_LABEL: Record<Era, string> = {
  'pre-fractal': 'Pre-Fractal',
  'fractally': 'Fractally',
  'eos-eden': 'EOS / Eden',
  'optimism-fractal': 'Optimism Fractal',
  'zao': 'ZAO Fractal',
};

export const ERA_COLOR: Record<Era, string> = {
  'pre-fractal': 'var(--text-dim)',
  'fractally': '#a78bfa',
  // Not var(--cyan): the thezao.com token change aliases --cyan to --gold,
  // which would make this era match 'zao'. Existing token keeps all five distinct.
  'eos-eden': 'var(--text)',
  'optimism-fractal': '#ff4d8a',
  'zao': 'var(--orange)',
};

export const TIMELINE: TimelineEvent[] = [
  { when: '2014', title: 'BitShares launches', body: 'Daniel Larimer builds the first decentralized exchange. The DeFi prequel.', era: 'pre-fractal' },
  { when: '2016', title: 'Steem / Hive', body: 'Larimer creates the first blockchain-based social media with token rewards.', era: 'pre-fractal' },
  { when: 'June 2017 - June 2018', title: 'EOS ICO', body: 'Block.one raises $4B+, the largest ICO in history. EOS mainnet ships June 2018.', era: 'pre-fractal' },
  { when: 'April 2018', title: 'EOS peaks at $22.89', body: 'High water mark before the long decline (-99.6% to $0.40 by Nov 2024).', era: 'pre-fractal' },
  { when: 'February 20, 2021', title: '"More Equal Animals" published', body: 'Larimer\'s book defines fractal democracy. Verified on Amazon, Goodreads, Apple Books.', era: 'pre-fractal', url: 'https://www.amazon.com/More-Equal-Animals-Subtle-Democracy-ebook/dp/B08X4TY925' },
  { when: 'April 2021', title: 'Eden on EOS launches', body: 'First practical fractal democracy implementation. Peaks at 400+ members.', era: 'eos-eden' },
  { when: 'September 6, 2021', title: 'EOS Foundation grant', body: '200K EOS + 200 EOS per member awarded to Eden on EOS. 182 registrants signed up.', era: 'eos-eden' },
  { when: 'October 9, 2021', title: 'First fractal election', body: 'Eden on EOS holds the first on-chain fractal election at 13:00 UTC.', era: 'eos-eden' },
  { when: 'January 28, 2022', title: 'Fractally protocol announced', body: 'Larimer publishes "Introducing Fractally" on Medium. The next generation of DAOs.', era: 'fractally', url: 'https://medium.com/gofractally/introducing-fractally-the-next-generation-of-daos-7c94981514d8' },
  { when: 'February 22, 2022', title: 'Fractally White Paper 1.0', body: 'The protocol specification. Respect token, Fibonacci scoring, weekly cadence.', era: 'fractally' },
  { when: '2022', title: 'Genesis Fractal experiment', body: '30 weeks, 130 participants. Dan SingJoy places 3rd. Proves weekly cadence works.', era: 'fractally' },
  { when: 'May 2022', title: 'Eden Fractal Epoch 1 (EOS)', body: 'SingJoy founds Eden Fractal as a permanent community. 77 contributors earn EDEN.', era: 'eos-eden' },
  { when: 'February 2023', title: 'Fractalgram released', body: 'Tadas Vaitiekunas (sim31) ships the Telegram Web A client for live sessions.', era: 'eos-eden' },
  { when: 'October 2023', title: 'Optimism Fractal launches', body: 'SingJoy + Optimystics bring fractal governance to OP Mainnet. Tripartite model.', era: 'optimism-fractal' },
  { when: 'July 2024', title: 'ZAO Fractal begins', body: 'Zaal founds the first music-focused fractal. Weekly Mondays 6pm EST.', era: 'zao' },
  { when: 'July 30, 2024', title: 'OG Respect ERC-20 deployed', body: '0x34cE...6957 on Optimism. Tracks contributions outside the weekly game.', era: 'zao' },
  { when: 'November 2024', title: 'ORDAO Season 5 approved', body: 'Optimism Fractal Council formally adopts ORDAO. First production ORDAO on Ethereum mainnet.', era: 'optimism-fractal' },
  { when: 'June 5, 2025', title: 'Eden Fractal Epoch 2 launches', body: 'Event #121, 3-year anniversary. Eden migrates to Base via ORDAO + snapshot-and-claim.', era: 'eos-eden' },
  { when: 'September 11, 2025', title: 'ZOR Respect ERC-1155 deployed', body: '0x9885...445c. Soulbound multitoken minted via OREC weekly. Fractal 74+.', era: 'zao' },
  { when: 'January 2026', title: 'Optimism Fractal pauses', body: 'Council votes to consolidate into Eden. ZAO becomes the only active Optimism fractal.', era: 'optimism-fractal' },
  { when: 'March 28, 2026', title: 'Bot v2.1 ships', body: 'fractalbotmarch2026: 52 slash commands, auto-submit, Snapshot cog, Farcaster linking.', era: 'zao' },
  { when: 'May 24, 2026', title: 'ZAOfractal repo + site launched', body: 'github.com/ZAODEVZ/ZAOfractal goes live with reference + research + whitepaper drafts.', era: 'zao' },
];
