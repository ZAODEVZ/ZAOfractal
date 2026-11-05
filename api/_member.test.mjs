// Run from the repo root: npm test. The leading "_" keeps Vercel from
// deploying this file as a function.
// The Optimism RPC is mocked with a viem custom transport; no network is used.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { custom, decodeFunctionData, encodeAbiParameters } from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import {
  buildMemberMessage,
  parseMemberMessage,
  validateRequest,
  checkMember,
  makeClient,
  OG_RESPECT,
  ZOR_RESPECT,
  MemberError,
} from './_lib/member-core.js';

const HOST = 'fractal.thezao.com';
const NOW = Date.parse('2026-11-05T12:00:00.000Z');

// A throwaway key made fresh for each test run, standing in for a visitor's
// own wallet. It never leaves this process.
const visitor = privateKeyToAccount(generatePrivateKey());

const balanceAbi = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }, { name: 'id', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
];

/** Mock RPC: answers eth_call balanceOf from the given table, records calls. */
function mockClient({ og = 0n, zor = 0n, failOg = false, failZor = false } = {}) {
  const calls = [];
  const transport = custom({
    async request({ method, params }) {
      if (method === 'eth_chainId') return '0xa';
      if (method !== 'eth_call') throw new Error(`unexpected ${method}`);
      const { to, data } = params[0];
      const decoded = decodeFunctionData({ abi: balanceAbi, data });
      calls.push({ to: to.toLowerCase(), args: decoded.args });
      if (to.toLowerCase() === OG_RESPECT.toLowerCase()) {
        if (failOg) throw new Error('rpc down');
        return encodeAbiParameters([{ type: 'uint256' }], [og]);
      }
      if (to.toLowerCase() === ZOR_RESPECT.toLowerCase()) {
        if (failZor) throw new Error('rpc down');
        return encodeAbiParameters([{ type: 'uint256' }], [zor]);
      }
      throw new Error('unknown contract');
    },
  });
  return { client: makeClient(transport), calls };
}

async function signedBody({ issuedAt = new Date(NOW).toISOString(), host = HOST, account = visitor } = {}) {
  const message = buildMemberMessage({ host, address: account.address, nonce: 'a1b2c3d4e5f60718', issuedAt });
  const signature = await account.signMessage({ message });
  return { address: account.address, message, signature };
}

test('message round-trips through the parser', () => {
  const msg = buildMemberMessage({ host: HOST, address: visitor.address, nonce: '0123456789abcdef', issuedAt: '2026-11-05T12:00:00.000Z' });
  assert.deepEqual(parseMemberMessage(msg), {
    host: HOST,
    address: visitor.address,
    nonce: '0123456789abcdef',
    issuedAt: '2026-11-05T12:00:00.000Z',
  });
  assert.equal(parseMemberMessage(msg + '\nextra'), null);
  assert.equal(parseMemberMessage(42), null);
});

test('member when OG Respect > 0', async () => {
  const { client, calls } = mockClient({ og: 10n ** 18n });
  assert.deepEqual(await checkMember(await signedBody(), { host: HOST, now: NOW, client }), { member: true });
  const zorCall = calls.find((c) => c.to === ZOR_RESPECT.toLowerCase());
  assert.equal(zorCall.args[1], 0n, 'ZOR is read at token id 0');
});

test('member when only ZOR Respect > 0', async () => {
  const { client } = mockClient({ zor: 110n });
  assert.deepEqual(await checkMember(await signedBody(), { host: HOST, now: NOW, client }), { member: true });
});

test('not a member when both balances are zero', async () => {
  const { client } = mockClient();
  assert.deepEqual(await checkMember(await signedBody(), { host: HOST, now: NOW, client }), { member: false });
});

test('member if one read fails but the other is positive', async () => {
  const { client } = mockClient({ zor: 5n, failOg: true });
  assert.deepEqual(await checkMember(await signedBody(), { host: HOST, now: NOW, client }), { member: true });
});

test('error, not a false "no", when a read fails and the other is zero', async () => {
  const { client } = mockClient({ failOg: true });
  await assert.rejects(checkMember(await signedBody(), { host: HOST, now: NOW, client }), (e) => e instanceof MemberError && e.status === 502);
});

test('rejects a signature from a different wallet', async () => {
  const { client } = mockClient({ og: 1n });
  const other = privateKeyToAccount(generatePrivateKey());
  const body = await signedBody();
  body.signature = await other.signMessage({ message: body.message });
  await assert.rejects(checkMember(body, { host: HOST, now: NOW, client }), (e) => e.status === 401);
});

test('rejects a body whose address differs from the message', async () => {
  const body = await signedBody();
  body.address = privateKeyToAccount(generatePrivateKey()).address;
  assert.throws(() => validateRequest(body, { host: HOST, now: NOW }), (e) => e.status === 400);
});

test('rejects a message made for another site', async () => {
  const body = await signedBody({ host: 'evil.example' });
  assert.throws(() => validateRequest(body, { host: HOST, now: NOW }), /different site/);
});

test('rejects an old or future-dated message', async () => {
  const old = await signedBody({ issuedAt: new Date(NOW - 11 * 60 * 1000).toISOString() });
  assert.throws(() => validateRequest(old, { host: HOST, now: NOW }), /expired/);
  const future = await signedBody({ issuedAt: new Date(NOW + 5 * 60 * 1000).toISOString() });
  assert.throws(() => validateRequest(future, { host: HOST, now: NOW }), /expired/);
});

test('rejects malformed bodies', () => {
  assert.throws(() => validateRequest(null, { host: HOST, now: NOW }), (e) => e.status === 400);
  assert.throws(() => validateRequest({ address: 'nope' }, { host: HOST, now: NOW }), /address/);
  assert.throws(() => validateRequest({ address: visitor.address, signature: 'zz' }, { host: HOST, now: NOW }), /signature/);
});

test('handler: 405 on GET, 200 shape on POST', async () => {
  const { default: handler } = await import('./member.js');
  const res = {
    statusCode: 0, headers: {}, payload: null,
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.statusCode = c; return this; },
    json(p) { this.payload = p; return this; },
  };
  await handler({ method: 'GET', headers: { host: HOST } }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.payload.member, false);
  await handler({ method: 'POST', headers: { host: HOST }, body: '{bad json' }, res);
  assert.equal(res.statusCode, 400);
});
