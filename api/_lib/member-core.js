// Pure-ish core of POST /api/member, kept apart from the Vercel handler so it
// can be tested with a mocked RPC (see api/member.test.mjs).
//
// What it does: the visitor's own wallet signs a short plain-text message in
// the browser. Here we check that the signature really comes from the address
// it claims, then read that address's Respect balances on Optimism. Nothing on
// our side holds a key, signs, or sends a transaction: this is read-only.
//
// Member = balance > 0 in either Respect contract. The answer only switches
// the site between the simple newcomer view and the full member view; the
// balances themselves are public onchain, so this is not access control.

import { createPublicClient, http, isAddress, getAddress, verifyMessage } from 'viem';
import { optimism } from 'viem/chains';

// OP Mainnet (chain id 10). Same addresses as CLAUDE.md "Key Contracts",
// scripts/pull-data.mjs CONTRACTS, and the home page live facts.
export const OG_RESPECT = '0x34cE89baA7E4a4B00E17F7E4C0cb97105C216957'; // ERC-20, fractals 1-73
export const ZOR_RESPECT = '0x9885CCeEf7E8371Bf8d6f2413723D25917E7445c'; // ERC-1155, fractals 74+
// ZOR id 0 is the fungible, accumulated Respect balance; every other id is a
// single award badge (scripts/pull-data.mjs normalizeZorHolders,
// research/08-zao-fractal-measured-state.md section 8).
export const ZOR_RESPECT_ID = 0n;

export const OPTIMISM_RPC = 'https://mainnet.optimism.io';

// How old a signed message may be before we refuse it, and how far in the
// future its clock may run (wallet and server clocks drift a little).
export const MAX_AGE_MS = 10 * 60 * 1000;
export const MAX_SKEW_MS = 2 * 60 * 1000;
const MAX_MESSAGE_LENGTH = 1000;

const erc20Abi = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
];
const erc1155Abi = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
];

export class MemberError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * The exact text the browser asks the wallet to sign. site/src/lib/member.ts
 * builds the same text; keep the two in step.
 */
export function buildMemberMessage({ host, address, nonce, issuedAt }) {
  return [
    `${host} asks you to confirm this wallet for ZAO member view.`,
    '',
    'This only reads your ZAO Respect balance. It is free and sends no transaction.',
    '',
    `Address: ${address}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join('\n');
}

/** Pull host, address, nonce and time back out of a signed message. */
export function parseMemberMessage(message) {
  if (typeof message !== 'string' || message.length > MAX_MESSAGE_LENGTH) return null;
  const m = message.match(
    /^(\S+) asks you to confirm this wallet for ZAO member view\.\n\nThis only reads your ZAO Respect balance\. It is free and sends no transaction\.\n\nAddress: (0x[0-9a-fA-F]{40})\nNonce: ([0-9a-f]{16,64})\nIssued At: (\S+)$/,
  );
  if (!m) return null;
  return { host: m[1], address: m[2], nonce: m[3], issuedAt: m[4] };
}

/**
 * Check the request body shape and the message contents, without touching
 * the network. Returns the checksummed address on success.
 */
export function validateRequest(body, { host, now = Date.now() } = {}) {
  if (!body || typeof body !== 'object') throw new MemberError(400, 'Expected a JSON body.');
  const { address, message, signature } = body;
  if (typeof address !== 'string' || !isAddress(address, { strict: false })) {
    throw new MemberError(400, 'Missing or invalid address.');
  }
  if (typeof signature !== 'string' || !/^0x[0-9a-fA-F]+$/.test(signature) || signature.length > 20000) {
    throw new MemberError(400, 'Missing or invalid signature.');
  }
  const parsed = parseMemberMessage(message);
  if (!parsed) throw new MemberError(400, 'Message is not in the expected format.');
  if (parsed.address.toLowerCase() !== address.toLowerCase()) {
    throw new MemberError(400, 'Message address does not match.');
  }
  if (!host || parsed.host.toLowerCase() !== String(host).toLowerCase()) {
    throw new MemberError(400, 'Message was made for a different site.');
  }
  const issued = Date.parse(parsed.issuedAt);
  if (Number.isNaN(issued)) throw new MemberError(400, 'Message time is not valid.');
  if (now - issued > MAX_AGE_MS || issued - now > MAX_SKEW_MS) {
    throw new MemberError(400, 'Message has expired. Please try again.');
  }
  return getAddress(address);
}

export function makeClient(transport = http(OPTIMISM_RPC, { timeout: 8000 })) {
  return createPublicClient({ chain: optimism, transport });
}

/**
 * True when the signature was made by `address`. Plain wallets are checked
 * locally (no network). If that fails, ask the chain, which covers smart
 * contract wallets (ERC-1271 / ERC-6492) deployed on Optimism.
 */
export async function verifySignature(client, { address, message, signature }) {
  try {
    if (await verifyMessage({ address, message, signature })) return true;
  } catch {
    // Not a plain 65-byte signature; fall through to the onchain check.
  }
  try {
    return await client.verifyMessage({ address, message, signature });
  } catch {
    return false;
  }
}

/** Read both Respect balances. Member when either is above zero. */
export async function readMembership(client, address) {
  const [og, zor] = await Promise.allSettled([
    client.readContract({ address: OG_RESPECT, abi: erc20Abi, functionName: 'balanceOf', args: [address] }),
    client.readContract({
      address: ZOR_RESPECT,
      abi: erc1155Abi,
      functionName: 'balanceOf',
      args: [address, ZOR_RESPECT_ID],
    }),
  ]);
  const positive = (r) => r.status === 'fulfilled' && typeof r.value === 'bigint' && r.value > 0n;
  if (positive(og) || positive(zor)) return true;
  if (og.status === 'rejected' && zor.status === 'rejected') {
    throw new MemberError(502, 'Could not reach Optimism. Please try again.');
  }
  // One read failed and the other was zero: we cannot be sure, so say so.
  if (og.status === 'rejected' || zor.status === 'rejected') {
    throw new MemberError(502, 'Could not read every balance. Please try again.');
  }
  return false;
}

/** Full check for one request body. Resolves to { member: boolean }. */
export async function checkMember(body, { host, now, client = makeClient() } = {}) {
  const address = validateRequest(body, { host, now });
  const ok = await verifySignature(client, { address, message: body.message, signature: body.signature });
  if (!ok) throw new MemberError(401, 'Signature does not match this wallet.');
  return { member: await readMembership(client, address) };
}
