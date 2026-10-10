// Compile whitepaper/ZAO-Fractal-Whitepaper.md from whitepaper/draft/ch00..ch11.
// The root file is the concatenation of the chapter drafts with each draft's
// status line (line 3, "Draft vX ..." or "> **Draft vX ...**") removed, joined by
// a rule, under a fixed header. Run: node scripts/build-whitepaper.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(process.cwd(), 'whitepaper', 'draft');
const files = readdirSync(dir).filter((f) => /^ch\d\d-.*\.md$/.test(f)).sort();
const header = `# The ZAO Fractal Whitepaper

Earned governance, verified on-chain. The ZAO.

Version v0.2 draft - compiled ${new Date().toISOString().slice(0, 10)} by scripts/build-whitepaper.mjs from whitepaper/draft/

---
`;
const parts = files.map((f) => {
  const lines = readFileSync(join(dir, f), 'utf8').split('\n');
  if (/^(> \*\*)?Draft v/.test(lines[2] ?? '')) lines[2] = '';
  return lines.join('\n').trim();
});
writeFileSync(join(process.cwd(), 'whitepaper', 'ZAO-Fractal-Whitepaper.md'), `${header}\n${parts.join('\n\n---\n\n')}\n`);
console.log(`compiled ${files.length} chapters`);
