#!/usr/bin/env node
/**
 * assemble-whitepaper.mjs - build whitepaper/ZAO-Fractal-Whitepaper.md from the
 * chapters in whitepaper/draft/.
 *
 * The assembled file used to be maintained by hand, which is how it ended up
 * with a stray `---` directly under the Abstract heading (the per-chapter
 * "Draft vX" line was deleted and its separator left behind) and with chapter
 * text that had drifted from the drafts. Assembly is mechanical, so it should
 * be a script, and the drafts should be the only thing anyone edits.
 *
 * Two normalizations are applied to each chapter:
 *   1. The "Draft vN - date" line and the `---` rule that follows it are
 *      dropped. They are drafting state, not document content.
 *   2. The trailing "**Word count: N**" line and its rule are dropped, for the
 *      same reason. The counts stay in the drafts and in whitepaper/README.md.
 *
 * Usage:  node scripts/assemble-whitepaper.mjs
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DRAFT = join(ROOT, 'whitepaper', 'draft');
const OUT = join(ROOT, 'whitepaper', 'ZAO-Fractal-Whitepaper.md');

const VERSION = 'v0.2';
const DATE = '2026-08-26';

const chapters = readdirSync(DRAFT).filter((f) => /^ch\d\d.*\.md$/.test(f)).sort();
if (chapters.length === 0) throw new Error(`no chapters found in ${DRAFT}`);

/** Strip drafting state: the version line, the word count, and any rule left
 * orphaned by removing them. Operates on lines so a stray `---` inside a table
 * or code block is never touched by accident. */
function clean(body) {
  const lines = body.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isVersion = /^>?\s*\*{0,2}Draft v\d/.test(line);
    const isCount = /^\*\*Word count:/.test(line);
    if (!isVersion && !isCount) { out.push(line); continue; }
    // Swallow the blank line(s) and the horizontal rule that belonged to it.
    let j = i + 1;
    while (j < lines.length && lines[j].trim() === '') j++;
    if (lines[j]?.trim() === '---') { i = j; while (out.at(-1)?.trim() === '') out.pop(); }
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

const parts = [
  '# The ZAO Fractal Whitepaper',
  '',
  'Earned governance, verified on-chain. The ZAO.',
  '',
  `Version ${VERSION} - ${DATE}`,
  '',
  'Assembled from `whitepaper/draft/` by `scripts/assemble-whitepaper.mjs`.',
  'Edit the chapters, not this file.',
];

for (const file of chapters) {
  parts.push('', '---', '', clean(readFileSync(join(DRAFT, file), 'utf8')));
}

writeFileSync(OUT, parts.join('\n') + '\n');

const words = parts.join(' ').split(/\s+/).filter(Boolean).length;
console.log(`Assembled ${chapters.length} chapters into ${OUT} (~${words.toLocaleString()} words).`);
