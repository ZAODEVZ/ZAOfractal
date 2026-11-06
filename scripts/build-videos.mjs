#!/usr/bin/env node
/**
 * build-videos.mjs - turn a yt-dlp listing of the Eden Creators YouTube channel
 * into site/src/data/fractal-videos.json, the recordings archive on /lineage.
 *
 * Zero dependencies (node >= 18). It does not call YouTube itself: yt-dlp does
 * that, so this file stays a pure, diffable transform. To refresh:
 *
 *   yt-dlp --flat-playlist --print '%(id)s' \
 *     'https://www.youtube.com/@EdenCreators/videos' \
 *     'https://www.youtube.com/@EdenCreators/streams' \
 *     'https://www.youtube.com/playlist?list=PLa5URJF9l5lk5Aavi98CqFj7ryM42bvbP' \
 *     | sort -u | sed 's#^#https://www.youtube.com/watch?v=#' > /tmp/urls.txt
 *   yt-dlp --skip-download --ignore-errors --sleep-requests 0.5 \
 *     --print '%(id)s\t%(upload_date)s\t%(duration)s\t%(title)s' -a /tmp/urls.txt > /tmp/videos.tsv
 *   node scripts/build-videos.mjs /tmp/videos.tsv
 *
 * The flat listing alone has no dates, which is why the second, per-video pass
 * exists. Rows whose date did not resolve are dropped and counted, not guessed.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'site', 'src', 'data', 'fractal-videos.json');

// Order matters: first match wins. Each series maps to a timeline era.
const SERIES = [
  { key: 'genesis', label: 'Genesis Fractal', era: 'fractally', re: /^Genesis\s+(ƒ|f)ractal/i },
  { key: 'fractally', label: 'fractally', era: 'fractally', re: /^(ƒ|f)ractally\b|^Intro to (ƒ|f)ractally/i },
  { key: 'eden-town-hall', label: 'Eden Town Hall', era: 'eos-eden', re: /^ETH\s*\d+|Eden Town Hall|^Town Hall/i },
  { key: 'eden-fractal', label: 'Eden Fractal', era: 'eos-eden', re: /^EF\s*\d+|^Eden\s+(ƒ|f)ractal(\s+Meeting)?\s*\d+|^Eden Fractal's First Meeting/i },
  { key: 'optimism-fractal', label: 'Optimism Fractal', era: 'optimism-fractal', re: /^OF\s*\d+|^Optimism Fractal (Proposal Overview|and RetroPGF)/i },
  { key: 'optimism-town-hall', label: 'Optimism Town Hall', era: 'optimism-fractal', re: /^OTH\s*\d+/i },
  { key: 'ordao-fractal', label: 'ORDAO Fractal', era: 'optimism-fractal', re: /^ORF\s*\d+|^ORDAO/i },
];

function classify(title) {
  for (const s of SERIES) if (s.re.test(title)) return s;
  return null;
}

function episodeNumber(title) {
  const m = title.match(/^(?:EF|ETH|OF|OTH|ORF)\s*(\d+)/i)
    || title.match(/(?:ƒ|f)ractal(?:ly)?(?:\s+Meeting)?\s*#?(\d+)/i)
    || title.match(/Town Hall(?:\s+Meeting)?\s*#?(\d+)/i);
  return m ? Number(m[1]) : null;
}

const inputs = process.argv.slice(2);
if (inputs.length === 0) {
  console.error('usage: node scripts/build-videos.mjs <videos.tsv> [more.tsv ...]');
  process.exit(2);
}

const byId = new Map();
let undated = 0;
let unmatched = 0;
for (const path of inputs) {
  const text = await readFile(path, 'utf8');
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const [id, ymd, dur, ...rest] = line.split('\t');
    const title = rest.join('\t').trim();
    if (!/^\d{8}$/.test(ymd || '')) { undated++; continue; }
    const series = classify(title);
    if (!series) { unmatched++; continue; }
    byId.set(id, {
      id,
      date: `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`,
      durationMin: Number.isFinite(Number(dur)) ? Math.round(Number(dur) / 60) : null,
      title,
      series: series.key,
      episode: episodeNumber(title),
      era: series.era,
      url: `https://www.youtube.com/watch?v=${id}`,
    });
  }
}

const videos = [...byId.values()].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
const series = SERIES.map(({ key, label, era }) => {
  const rows = videos.filter((v) => v.series === key);
  return { key, label, era, count: rows.length, first: rows[0]?.date ?? null, last: rows.at(-1)?.date ?? null };
}).filter((s) => s.count > 0);

const out = {
  source: 'YouTube @EdenCreators channel and the Optimism Fractal playlist, via yt-dlp',
  generated: new Date().toISOString().slice(0, 10),
  count: videos.length,
  series,
  videos,
};
await writeFile(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`wrote ${videos.length} videos in ${series.length} series to ${OUT}`);
console.log(`dropped: ${undated} with no upload date, ${unmatched} not a fractal meeting series`);
