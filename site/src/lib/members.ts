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
}

interface Holder { address: string }
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
  return [...seen.entries()]
    .map(([slug, address]) => ({ slug, address, name: names.names[slug] ?? null }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

export const blockscout = (address: string) => `https://optimism.blockscout.com/address/${address}`;
