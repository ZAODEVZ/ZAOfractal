import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => JSON.parse(readFileSync(path, 'utf8'));

test('committed member entries omit name and retain addresses and Respect', () => {
  const { members } = read(join(ROOT, 'data', 'members.json'));
  assert.ok(members.length > 0);
  for (const member of members) {
    assert.equal(Object.hasOwn(member, 'name'), false, 'member entry contains name');
    assert.match(member.address, /^0x[0-9a-fA-F]{40}$/);
    for (const key of ['zorRespect', 'zorAwards', 'ogRespect']) {
      assert.equal(typeof member[key], 'number');
    }
  }
});

test('regeneration omits member names without losing balances or the DAO display map', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'zaofractal-members-'));
  try {
    for (const dir of ['scripts', 'data', 'source', 'dao/src/lib']) mkdirSync(join(fixture, dir), { recursive: true });
    copyFileSync(join(ROOT, 'scripts', 'build-members.mjs'), join(fixture, 'scripts', 'build-members.mjs'));
    const address = '0x' + '1'.repeat(40);
    const write = (path, data) => writeFileSync(join(fixture, path), JSON.stringify(data));
    write('source/names_to_wallets.json', { 'Fixture Member': address });
    write('data/zor-respect.json', { holders: [{ address, respect: 110, awards: 1 }] });
    write('data/og-respect.json', { holders: [{ address, respect: 42 }] });
    writeFileSync(join(fixture, 'dao/src/lib/constants.ts'), 'export const KNOWN_MEMBERS: Record<string, string> = {};\n');
    execFileSync(process.execPath, [join(fixture, 'scripts', 'build-members.mjs')], {
      env: { ...process.env, MEMBER_SOURCE_DIR: join(fixture, 'source') },
      stdio: 'pipe',
    });
    const { members } = read(join(fixture, 'data', 'members.json'));
    assert.equal(members.length, 1);
    assert.equal(Object.hasOwn(members[0], 'name'), false, 'generator restored name');
    assert.deepEqual(members[0], {
      address, source: 'names_to_wallets.json', holder: true,
      zorRespect: 110, zorAwards: 1, ogRespect: 42,
    });
    assert.ok(readFileSync(join(fixture, 'dao/src/lib/constants.ts'), 'utf8').includes(`'${address}': 'Fixture Member'`));
  } finally {
    assert.ok(fixture.startsWith(join(tmpdir(), 'zaofractal-members-')));
    rmSync(fixture, { recursive: true, force: true });
  }
});
