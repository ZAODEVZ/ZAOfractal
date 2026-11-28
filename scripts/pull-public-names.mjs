#!/usr/bin/env node
/**
 * pull-public-names.mjs - which wallets have a name their owner chose to show.
 *
 * Source: ZAO OS's public member directory (GET /api/members/directory, no
 * session). Without a session ZAO OS lists only members who picked a public
 * name, and shows a wallet only when that member left it visible. So a name
 * lands here only when the member both chose it and tied it to a public
 * wallet. Nothing is guessed from Discord names or anywhere else.
 *
 * Output: data/public-names.json, { pulledAt, source, count, names: { <lowercase wallet>: <name> } }.
 * The site reads it at build time for /member/<wallet> pages.
 *
 * Usage:  node scripts/pull-public-names.mjs
 */

import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'data', 'public-names.json');
export const SOURCE = 'https://zaoos.com/api/members/directory?limit=300';

const WALLET = /^0x[0-9a-fA-F]{40}$/;

/** Map each publicly shown wallet to the member's chosen public name. */
export function namesFromDirectory(body) {
  const names = {};
  for (const m of body?.members ?? []) {
    const name = typeof m?.displayName === 'string' ? m.displayName.trim() : '';
    if (!name) continue;
    for (const key of ['primaryWallet', 'preferredWallet']) {
      const w = m[key];
      if (typeof w === 'string' && WALLET.test(w)) names[w.toLowerCase()] = name;
    }
  }
  return names;
}

async function main() {
  const res = await fetch(SOURCE, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`directory returned HTTP ${res.status}`);
  const body = await res.json();
  if (!Array.isArray(body?.members)) throw new Error('directory response has no members array');
  const names = namesFromDirectory(body);
  const out = {
    pulledAt: new Date().toISOString(),
    source: SOURCE,
    listed: body.members.length,
    count: Object.keys(names).length,
    names: Object.fromEntries(Object.entries(names).sort(([a], [b]) => a.localeCompare(b))),
  };
  await writeFile(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(`public names: ${out.count} wallets from ${out.listed} listed members -> data/public-names.json`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
