// Member profiles, read at build time from the committed snapshots in data/.
//
// A member here is any wallet that holds ZOR or OG Respect or has received a
// ZOR award. Wallets show in full (Zaal, 27 Nov 2026). A name shows only when
// the member picked a public name in ZAO OS and left that wallet visible there
// (data/public-names.json, written by scripts/pull-public-names.mjs). No name
// is ever taken from Discord or guessed.
import fs from 'node:fs/promises';
import path from 'node:path';

export interface MemberProfile {
  address: string; // checksummed as it appears on chain
  slug: string; // lowercase address, the URL segment
  name: string | null;
  zorRespect: number; // ZOR (ERC-1155) held, fractals 74 onward
  ogRespect: number; // OG (ERC-20) held, fractals 1 to 73; 0 for the treasury wallet
  isOgTreasury: boolean; // this wallet is the OG Respect treasury
}

export interface RespectSnapshot {
  pulledAt: string;
  zorContract: string;
  ogContract: string;
}

interface Holder { address: string; respect: number }
interface AwardEvent { recipient: string }

const dataDir = path.resolve('../data');
const readJson = async <T>(file: string): Promise<T> =>
  JSON.parse(await fs.readFile(path.join(dataDir, file), 'utf-8')) as T;

export async function loadMembers(): Promise<MemberProfile[]> {
  const [zor, og, awards, names] = await Promise.all([
    readJson<{ holders: Holder[] }>('zor-respect.json'),
    readJson<{ holders: Holder[]; treasury: string }>('og-respect.json'),
    readJson<{ events: AwardEvent[] }>('award-events.json'),
    readJson<{ names: Record<string, string> }>('public-names.json'),
  ]);
  // The OG treasury wallet's OG balance is not earned Respect, so it does not
  // make that wallet a member. It still counts through ZOR holdings or awards.
  const treasury = og.treasury.toLowerCase();
  const seen = new Map<string, string>();
  const add = (address: string) => {
    const slug = address.toLowerCase();
    if (!seen.has(slug)) seen.set(slug, address);
  };
  zor.holders.forEach((h) => add(h.address));
  og.holders.filter((h) => h.address.toLowerCase() !== treasury).forEach((h) => add(h.address));
  awards.events.forEach((e) => add(e.recipient));
  const zorBy = new Map(zor.holders.map((h) => [h.address.toLowerCase(), h.respect]));
  const ogBy = new Map(
    og.holders.filter((h) => h.address.toLowerCase() !== treasury).map((h) => [h.address.toLowerCase(), h.respect]),
  );
  return [...seen.entries()]
    .map(([slug, address]) => ({
      slug,
      address,
      name: names.names[slug] ?? null,
      zorRespect: zorBy.get(slug) ?? 0,
      ogRespect: ogBy.get(slug) ?? 0,
      isOgTreasury: slug === treasury,
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

export async function loadRespectSnapshot(): Promise<RespectSnapshot> {
  const [zor, og] = await Promise.all([
    readJson<{ pulledAt: string; contract: string }>('zor-respect.json'),
    readJson<{ pulledAt: string; contract: string }>('og-respect.json'),
  ]);
  return { pulledAt: zor.pulledAt < og.pulledAt ? zor.pulledAt : og.pulledAt, zorContract: zor.contract, ogContract: og.contract };
}

/** Blockscout's view of one wallet's balance of one token contract. */
export const tokenHoldings = (address: string, contract: string) =>
  `https://optimism.blockscout.com/token/${contract}?a=${address}`;

export const blockscout = (address: string) => `https://optimism.blockscout.com/address/${address}`;
