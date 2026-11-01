#!/usr/bin/env node
// Serves a web export with single-page fallback and captures each screen at phone size.
// Usage: node screenshots.mjs <dist> <outDir>   (playwright must resolve from the cwd)
import { createServer } from 'node:http';
import { readFile, mkdir, stat } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const [dist, out] = process.argv.slice(2).map((p) => resolve(p));
const { chromium } = createRequire(join(process.cwd(), 'x.js'))('playwright');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png', '.json': 'application/json' };

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = join(dist, path);
  try {
    if (!(await stat(file)).isFile()) throw 0;
  } catch {
    file = join(dist, 'index.html');
  }
  res.setHeader('Content-Type', TYPES[extname(file)] ?? 'application/octet-stream');
  res.end(await readFile(file));
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

await mkdir(out, { recursive: true });
const summaryAddr = JSON.parse(await readFile(join(dist, '..', 'src', 'data', 'leaderboard.json'), 'utf8')).zor[0].a;
const proposals = JSON.parse(await readFile(join(dist, '..', 'src', 'data', 'proposals.json'), 'utf8'));
const withAwards = proposals.find((p) => p.awards.length) ?? proposals[0];

const SHOTS = [
  ['1-now', '/'],
  ['2-ranks', '/ranks'],
  ['3-votes', '/votes'],
  ['4-read', '/read'],
  ['5-chapter', '/chapter/3'],
  ['6-member', `/member/${summaryAddr}`],
  ['7-proposal', `/proposal/${withAwards.id}`],
  ['8-not-found', '/proposal/none'],
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const problems = [];
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(`console: ${m.text()}`);
});
for (const [name, path] of SHOTS) {
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: join(out, `${name}.png`) });
  console.log('shot', name);
}
await page.goto(base + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.screenshot({ path: join(out, '1-now-full.png'), fullPage: true });
await browser.close();
server.close();
console.log(problems.length ? `PROBLEMS:\n${[...new Set(problems)].join('\n')}` : 'no page errors');
if (problems.some((p) => p.startsWith('pageerror'))) process.exit(1);
