import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { namesFromDirectory } from './pull-public-names.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const A = '0x1111111111111111111111111111111111111111';
const B = '0x2222222222222222222222222222222222222222';

test('a public name maps to each wallet the member left visible', () => {
  const names = namesFromDirectory({
    members: [{ displayName: ' Ada ', primaryWallet: A.toUpperCase().replace('0X', '0x'), preferredWallet: B }],
  });
  assert.deepEqual(names, { [A]: 'Ada', [B]: 'Ada' });
});

test('no name, a hidden wallet, or a malformed wallet yields nothing', () => {
  const names = namesFromDirectory({
    members: [
      { displayName: null, primaryWallet: A },
      { displayName: '', primaryWallet: A },
      { displayName: 'Bo', primaryWallet: null, preferredWallet: null },
      { displayName: 'Cy', primaryWallet: '0x123' },
    ],
  });
  assert.deepEqual(names, {});
});

test('an empty or odd response yields nothing', () => {
  assert.deepEqual(namesFromDirectory({ members: [] }), {});
  assert.deepEqual(namesFromDirectory(null), {});
});

test('the committed file has the expected shape', () => {
  const file = JSON.parse(readFileSync(join(ROOT, 'data', 'public-names.json'), 'utf8'));
  assert.equal(typeof file.pulledAt, 'string');
  assert.equal(file.count, Object.keys(file.names).length);
  for (const [wallet, name] of Object.entries(file.names)) {
    assert.match(wallet, /^0x[0-9a-f]{40}$/);
    assert.equal(typeof name, 'string');
  }
});
