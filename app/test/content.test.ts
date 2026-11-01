import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseBlocks, parseInline } from '../src/lib/markdown.ts';
import { shortAddress } from '../src/lib/format.ts';

const DATA = join(import.meta.dirname, '..', 'src', 'data');
const load = (f: string) => JSON.parse(readFileSync(join(DATA, f), 'utf8'));

test('no member names in structured data, addresses only', () => {
  const members = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', 'data', 'members.json'), 'utf8')).members;
  const names = new Set<string>(members.map((m: { name: string }) => m.name).filter(Boolean));
  for (const f of ['leaderboard.json', 'members.json', 'proposals.json']) {
    const walk = (v: unknown, key: string): void => {
      if (typeof v === 'string' && key !== 'memo') assert.ok(!names.has(v), `${f} has a name at ${key}`);
      else if (v && typeof v === 'object') for (const [k, c] of Object.entries(v)) walk(c, k);
    };
    walk(load(f), '');
  }
});

test('no em dash in bundled data or screens', () => {
  for (const f of readdirSync(DATA)) assert.ok(!readFileSync(join(DATA, f), 'utf8').includes('—'), f);
  const scan = (dir: string) => {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) scan(p);
      else if (/\.tsx$/.test(e)) assert.ok(!readFileSync(p, 'utf8').includes('—'), p);
    }
  };
  scan(join(import.meta.dirname, '..', 'src'));
});

test('leaderboard is sorted and the whitepaper has its chapters', () => {
  const lb = load('leaderboard.json');
  for (let i = 1; i < lb.zor.length; i++) assert.ok(lb.zor[i - 1].r >= lb.zor[i].r);
  const wp = load('whitepaper.json');
  assert.equal(wp.filter((c: { num: string | null }) => c.num).length, 11);
  assert.ok(wp.every((c: { body: string }) => c.body.length > 100));
});

test('short addresses', () => {
  assert.equal(shortAddress('0x7234c36A71ec237c2Ae7698e8916e0735001E9Af'), '0x7234...E9Af');
});

test('markdown blocks and inline', () => {
  const b = parseBlocks(
    '## Head\n\nPara **bold** and *it* with [x](https://a.b).\n\n- one\n1. two\n\n> q\n\n```\ncode\n```\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n---',
  );
  assert.deepEqual(b.map((x) => x.kind), ['h2', 'p', 'li', 'li', 'quote', 'code', 'table', 'rule']);
  const spans = parseInline('a **b** *c* `d` [e](https://f.g) [h](javascript:x)');
  assert.ok(spans.some((s) => s.bold && s.text === 'b'));
  assert.ok(spans.some((s) => s.href === 'https://f.g'));
  assert.ok(!spans.some((s) => s.href?.startsWith('javascript')));
});
