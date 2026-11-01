// People data sourced from reference/11-key-people.md + research/05-targeted-gap-fillers.md.
// initials drive the avatar fallback when no photo is shipped.

export interface Person {
  name: string;
  initials: string;
  role: string;
  blurb: string;
  links: { label: string; href: string }[];
  group: 'founders' | 'optimystics' | 'zao' | 'fractal-founders';
  accent: 'orange' | 'cyan' | 'gold' | 'purple';
}

export const PEOPLE: Person[] = [
  {
    name: 'Daniel Larimer',
    initials: 'DL',
    role: 'Philosophical founder',
    blurb: 'Built BitShares (2014), Steem/Hive (2016), EOS (2018). Wrote "More Equal Animals" (Feb 20, 2021). Co-authored the Fractally White Paper (Feb 22, 2022). The intellectual root of every fractal community alive today.',
    links: [
      { label: 'More Equal Animals', href: 'https://www.amazon.com/More-Equal-Animals-Subtle-Democracy-ebook/dp/B08X4TY925' },
      { label: 'Medium', href: 'https://medium.com/@bytemaster' },
      { label: 'Hive', href: 'https://hive.blog/@dan' },
    ],
    group: 'founders',
    accent: 'orange',
  },
  {
    name: 'Dan SingJoy',
    initials: 'DS',
    role: 'Bridge figure - musician + governance',
    blurb: 'Placed 3rd in Genesis Fractal. Founded Eden Fractal (May 2022), Optimism Fractal (Oct 2023), and co-founded Optimystics. Musician + governance builder. Created the Fractal DJ variant. Hosts Creator Talk, Fractal Apple.',
    links: [
      { label: 'dansingjoy.com', href: 'https://dansingjoy.com' },
      { label: 'Farcaster', href: 'https://warpcast.com/dansingjoy' },
    ],
    group: 'optimystics',
    accent: 'cyan',
  },
  {
    name: 'Tadas Vaitiekunas',
    initials: 'TV',
    role: 'Lead developer (Optimystics)',
    blurb: 'GitHub: sim31. Built ORDAO, OREC, Fractalgram. Deployed zao.frapps.xyz for ZAO. Released the original Fractalgram in February 2023. The technical core of every modern fractal community. Last commit to sim31/ordao: April 2, 2026.',
    links: [
      { label: 'github.com/sim31', href: 'https://github.com/sim31' },
      { label: 'sim31/ordao', href: 'https://github.com/sim31/ordao' },
    ],
    group: 'optimystics',
    accent: 'gold',
  },
  {
    name: 'Rosmari',
    initials: 'RO',
    role: 'Community builder (Optimystics)',
    blurb: 'Co-founder of Optimystics. 1,400 Respect points - 2nd highest contributor to Optimism Fractal. Podcast host, content production.',
    links: [
      { label: 'Optimystics', href: 'https://optimystics.io' },
    ],
    group: 'optimystics',
    accent: 'purple',
  },
  {
    name: 'Abraham Becker',
    initials: 'AB',
    role: 'Next-gen Fractalgram developer',
    blurb: 'Building Respect.Games (MIT-licensed, async-first version of the Respect Game). UI improvements to Fractalgram. Working on mainnet deployment of next-gen tools.',
    links: [
      { label: 'Respect.Games', href: 'https://respect.games' },
    ],
    group: 'optimystics',
    accent: 'cyan',
  },
  {
    name: 'Zaal Panthaki',
    initials: 'ZP',
    role: 'ZAO founder',
    blurb: 'Joined Optimism Fractal at week 6, served on Eden council, founded ZAO Fractal in July 2024. Built 7 generations of the fractal Discord bot. Deployed ORDAO for ZAO with Tadas. On daily/weekly terms with SingJoy and Tadas. Wallet: zaal.eth.',
    links: [
      { label: 'BetterCallZaal', href: 'https://bettercallzaal.com' },
      { label: 'Farcaster', href: 'https://warpcast.com/zaal' },
    ],
    group: 'zao',
    accent: 'orange',
  },
  {
    name: 'civilmonkey.eth',
    initials: 'CM',
    role: 'ZAO OREC co-signer',
    blurb: 'One of two wallets that has ever submitted to ZAO\'s OREC contract. Operational core alongside Zaal. The 2-wallet bottleneck is a documented open issue.',
    links: [],
    group: 'zao',
    accent: 'cyan',
  },
  {
    name: 'Shakruz Azirof',
    initials: 'SA',
    role: 'Roy Fractal founder',
    blurb: 'Founded Roy Fractal on EOS - the largest fractal community at 700+ members. Multi-platform facilitation: YouTube archive + Telegram async + Zoom realtime. Nested breakout rooms. Uzbekistan-based.',
    links: [
      { label: 'eosrespect.io', href: 'https://eosrespect.io' },
    ],
    group: 'fractal-founders',
    accent: 'gold',
  },
  {
    name: 'Jorge Ramos',
    initials: 'JR',
    role: 'Fractal Hispano founder',
    blurb: '25+ active members, 30+ meetings. Spanish-speaking fractal community on EOS since 2022.',
    links: [],
    group: 'fractal-founders',
    accent: 'cyan',
  },
  {
    name: 'Randall Roland',
    initials: 'RR',
    role: 'EOS Respect founder',
    blurb: 'EOS-based trust network community. Monthly elections, dozens of participants since 2022.',
    links: [],
    group: 'fractal-founders',
    accent: 'purple',
  },
  {
    name: 'Mikael',
    initials: 'MK',
    role: 'Fractal Circles creator (dormant)',
    blurb: 'Built Fractal Circles - an async contribution pre-prep tool. Tanja\'s May 18 2026 call described the problem it solved: "people do amazing work but forget it on presentation day." Mikael unreachable since May 2026. Status: ABANDON revival, route to Frapp-GH instead.',
    links: [],
    group: 'fractal-founders',
    accent: 'orange',
  },
  {
    name: 'Spacewrangler Joe',
    initials: 'SJ',
    role: 'Upland Fractal founder',
    blurb: '10 core members governing the Upland real-estate metaverse game (3M+ players). Small governance core inside a large community.',
    links: [],
    group: 'fractal-founders',
    accent: 'gold',
  },
];

export const GROUP_LABEL: Record<Person['group'], string> = {
  founders: 'Philosophical founders',
  optimystics: 'Optimystics (the dev team)',
  zao: 'ZAO core',
  'fractal-founders': 'Other fractal community founders',
};

export const ACCENT_TO_VAR: Record<Person['accent'], string> = {
  orange: 'var(--orange)',
  cyan: 'var(--cyan)',
  gold: 'var(--gold)',
  purple: '#a78bfa',
};
