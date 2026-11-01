#!/usr/bin/env node
// Turns the repo's snapshot in ../data and the whitepaper into small bundled JSON.
// Output is committed, so the app works offline and a build needs no network.
// Rule from the V1 research doc: no member names leave this script, addresses only,
// until Zaal rules on publishing them. data/members.json is deliberately not read.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const OUT = join(HERE, '..', 'src', 'data');
const read = (f) => JSON.parse(readFileSync(join(ROOT, 'data', f), 'utf8'));
const write = (f, v) => writeFileSync(join(OUT, f), JSON.stringify(v) + '\n');
mkdirSync(OUT, { recursive: true });
const noEmDash = (s) => s.replace(/\s*—\s*/g, ', ');

const summary = read('summary.json');
const zor = read('zor-respect.json');
const og = read('og-respect.json');
const awards = read('award-events.json');
const periods = read('periods.json');
const orec = read('orec-proposals.json');

const byAddress = new Map();
for (const e of awards.events) {
  const k = e.recipient.toLowerCase();
  if (!byAddress.has(k)) byAddress.set(k, []);
  byAddress.get(k).push({ s: e.periodNumber, l: e.level, r: e.respect, d: e.date.slice(0, 10) });
}
const ogByAddress = new Map(og.holders.map((h) => [h.address.toLowerCase(), h.respect]));

write('leaderboard.json', {
  zor: zor.holders
    .slice()
    .sort((a, b) => b.respect - a.respect)
    .map((h) => ({ a: h.address, r: h.respect, n: h.awards ?? 0 })),
  og: og.holders
    .slice()
    .sort((a, b) => b.respect - a.respect)
    .map((h) => ({ a: h.address, r: h.respect })),
});

const members = {};
for (const h of zor.holders) {
  const k = h.address.toLowerCase();
  members[k] = {
    z: h.respect,
    o: ogByAddress.get(k) ?? 0,
    h: (byAddress.get(k) ?? []).sort((a, b) => b.s - a.s),
  };
}
for (const h of og.holders) {
  const k = h.address.toLowerCase();
  if (!members[k]) members[k] = { z: 0, o: h.respect, h: [] };
}
write('members.json', members);

const proposals = orec.proposals
  .filter((p) => p.createdAt)
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  .slice(0, 40)
  .map((p) => ({
    id: p.propId,
    at: p.createdAt,
    stage: p.stage,
    yes: p.yesWeight ?? 0,
    no: p.noWeight ?? 0,
    memo: noEmDash(p.action?.memo ?? '').trim(),
    call: p.action?.call ?? null,
    period: p.action?.periodNumber ?? null,
    minted: p.action?.respectMinted ?? null,
    awards: (p.action?.awards ?? []).map((a) => ({ a: a.recipient, r: a.respect })),
    votes: (p.finalVotes ?? [])
      .filter((v) => v.weight > 0)
      .sort((a, b) => b.weight - a.weight)
      .map((v) => ({ a: v.voter, v: v.vote, w: v.weight })),
    tx: p.createdTx,
  }));
write('proposals.json', proposals);

const sessions = periods.periods
  .filter((p) => p.periodNumber > 0)
  .sort((a, b) => b.periodNumber - a.periodNumber)
  .map((p) => ({ n: p.periodNumber, d: p.date.slice(0, 10), p: p.participants, r: p.respect }));

write('summary.json', {
  pulledAt: summary.pulledAt,
  holders: summary.zor.holders,
  ogHolders: summary.og.holders,
  awards: summary.zor.awards,
  sessions: sessions.length,
  respect: summary.zor.respectHeld,
  ogRespect: summary.og.respectHeld,
  proposals: summary.orec.proposals,
  executed: summary.orec.executed,
  recent: sessions.slice(0, 16),
});

// Whitepaper: one entry per chapter. The compiled file opens with its own title.
const raw = noEmDash(readFileSync(join(ROOT, 'whitepaper', 'ZAO-Fractal-Whitepaper.md'), 'utf8'));
const parts = raw
  .split(/^# (?=\S)/m)
  .slice(1)
  .filter((p) => !p.startsWith('The ZAO Fractal Whitepaper'));
const chapters = parts.map((p, i) => {
  const nl = p.indexOf('\n');
  const heading = p.slice(0, nl).trim();
  const body = p.slice(nl + 1).trim();
  const m = /^Chapter (\d+):\s*(.*)$/.exec(heading);
  return {
    id: String(i),
    num: m ? m[1] : null,
    title: m ? m[2] : heading,
    minutes: Math.max(1, Math.round(body.split(/\s+/).length / 230)),
    body,
  };
});
write('whitepaper.json', chapters);
console.log(
  `leaderboard ${zor.holders.length}+${og.holders.length}, members ${Object.keys(members).length}, proposals ${proposals.length}, chapters ${chapters.length}, snapshot ${summary.pulledAt}`,
);
