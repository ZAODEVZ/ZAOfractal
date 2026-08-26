#!/usr/bin/env node
/**
 * pull-data.mjs - snapshot ZAO Fractal's on-chain state into data/*.json.
 *
 * Read-only, keyless, zero dependencies (node >= 18). Two public sources:
 *   - Blockscout OP Mainnet v2 API - token metadata, holder lists, transfer
 *     history with decoded ERC-1155 award metadata (periodNumber, groupNum,
 *     level, denomination). Paginated, no block-range ceiling.
 *   - mainnet.optimism.io JSON-RPC - contract reads (OREC config, balances)
 *     and the address-log pull that Blockscout paginates too slowly for.
 *
 * Output lands in data/ and is committed, so the dashboard reads local JSON
 * and Zaal can diff a pull instead of trusting a live endpoint.
 *
 * Usage:  node scripts/pull-data.mjs [--only zor,og,orec] [--quiet]
 */

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'data');

const BLOCKSCOUT = 'https://optimism.blockscout.com/api/v2';
const RPC = process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io';

const CONTRACTS = {
  OREC: '0xcB05F9254765CA521F7698e61E0A6CA6456Be532',
  OG_RESPECT: '0x34cE89baA7E4a4B00E17F7E4C0cb97105C216957',
  ZOR_RESPECT: '0x9885CCeEf7E8371Bf8d6f2413723D25917E7445c',
  HATS: '0x3bc1A0Ad72417f2d411118085256fC53CBdDd137',
};

// Deployment blocks, found by binary search on eth_getCode and pinned here so
// a pull does not re-derive them every run.
const DEPLOY_BLOCK = {
  OREC: 141001439, // 2025-09-11
  OG_RESPECT: 123349892, // 2024-07-30
  ZOR_RESPECT: 141001446, // 2025-09-11
};

const ZERO = '0x0000000000000000000000000000000000000000';

// --- tiny http helpers -----------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let quiet = false;
const log = (...a) => { if (!quiet) console.error(...a); };

async function getJson(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { accept: 'application/json' } });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      return await res.json();
    } catch (err) {
      if (i === tries - 1) throw err;
      await sleep(600 * (i + 1));
    }
  }
}

let rpcId = 0;
async function rpc(method, params, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(RPC, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method, params }),
      });
      const j = await res.json();
      if (j.error) throw new Error(`${method}: ${j.error.message}`);
      return j.result;
    } catch (err) {
      if (i === tries - 1) throw err;
      await sleep(600 * (i + 1));
    }
  }
}

/** Walk a Blockscout v2 collection to the end, following next_page_params. */
async function paginate(path, label, cap = 200) {
  const items = [];
  let params = null;
  for (let page = 0; page < cap; page++) {
    const qs = params ? '?' + new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== null && v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ) : '';
    const j = await getJson(`${BLOCKSCOUT}${path}${qs}`);
    items.push(...(j.items || []));
    log(`  ${label}: ${items.length}`);
    if (!j.next_page_params) return items;
    params = j.next_page_params;
    await sleep(160); // stay polite on the public instance
  }
  throw new Error(`${label}: hit page cap (${cap}) - raise it or narrow the pull`);
}

// --- abi-free decoding -----------------------------------------------------

const hexToBig = (h) => BigInt(h);
const word = (data, i) => '0x' + data.slice(2 + i * 64, 2 + (i + 1) * 64);
const addrFromWord = (w) => '0x' + w.slice(-40);

/** Respect1155 packs award ids as: 3 zero bytes | mintType(1) | periodNumber(8) | owner(20). */
function unpackTokenId(idDec) {
  const hex = BigInt(idDec).toString(16).padStart(64, '0');
  return {
    mintType: parseInt(hex.slice(6, 8), 16),
    periodNumber: parseInt(hex.slice(8, 24), 16),
    owner: '0x' + hex.slice(24, 64),
  };
}

// keccak topics for the events this script reads. Computed once from the
// @ordao/orec and OpenZeppelin ABIs; hardcoded to keep the script dep-free.
const TOPIC = {
  '0x288a29bca04edb18fcdb2c76d6e3b03b8a137c85c70d1a4cb8aacfa868d60510': 'ProposalCreated',
  '0x88ae8321c96cee88d802409f3677f889d8a6743c4631b069fe600a3a9b07e020': 'ProposalCanceled',
  '0xda66fcfe5711520a570ced34d4cdebbe652fe74713bf2bc9db4ba54357e5a96f': 'Executed',
  '0xd255d8a333980d77af4f9179384057def133983cb02db3e1fdb70c4dc14102e8': 'ExecutionFailed',
  '0xcd907020340d41d9b3fb53725f52264110fc156b0059b7817f4fe29f25a96cef': 'WeightedVoteIn',
  '0x60921de1a934e80af973d90edbca67a078f0dc03d7385b9031ff925b3a2ab820': 'EmptyVoteIn',
  '0x294d62780e868235e85aee4277a92857d52a196987e2a5bbb9fffe4f08b4567a': 'Signal',
  '0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0': 'OwnershipTransferred',
};

const VOTE_TYPE = ['None', 'Yes', 'No'];

// OREC entrypoints and the Respect1155 calls proposals carry as payloads.
const SELECTOR = {
  '0xfd165a73': 'execute(Message)',
  '0xd50b2843': 'vote(bytes32,uint8,string)',
  '0x23f70738': 'propose(Message)',
};
const PAYLOAD_SELECTOR = {
  '0x5da7e1d4': 'mintRespectGroup',
  '0xb4de12ce': 'burnRespectGroup',
  '0x141d51cb': 'signal',
  '0x20cea51a': 'setMinWeight',
  '0xe89075c7': 'setMaxLiveVotes',
};

/** Signal payloads are short: ZAO's weekly tick carries the new period number
 * as a bare integer, not text. Anything longer is left as hex for a human. */
function decodeSignalData(hex) {
  const raw = hex.replace(/^0x/, '');
  if (raw.length === 0) return { hex, value: null };
  if (raw.length <= 16) return { hex, value: Number(BigInt(hex)) };
  return { hex, value: null };
}

/** Read a dynamic `bytes` argument out of an abi-encoded body (hex, no 0x). */
function readBytes(body, byteOffset) {
  const start = byteOffset * 2;
  const len = parseInt(body.slice(start, start + 64), 16);
  return '0x' + body.slice(start + 64, start + 64 + len * 2);
}
const numAt = (body, byteOffset) => parseInt(body.slice(byteOffset * 2, byteOffset * 2 + 64), 16);

/** Decode OREC's `execute(Message)` calldata. Message = (address addr, bytes
 * cdata, bytes memo): the contract the DAO called, the call it made, and a
 * memo hash. */
function decodeExecuteInput(input) {
  if (!input || input.slice(0, 10) !== '0xfd165a73') return null;
  const body = input.slice(10);
  const tupleStart = numAt(body, 0);
  const addr = '0x' + body.slice(tupleStart * 2 + 24, tupleStart * 2 + 64);
  const cdata = readBytes(body, tupleStart + numAt(body, tupleStart + 32));
  const memo = readBytes(body, tupleStart + numAt(body, tupleStart + 64));
  return { target: addr, cdata, memo };
}

/** Decode a Respect1155 mint payload into the per-member awards it grants.
 * mintRespectGroup takes (uint256 id, uint256 value)[] - the id packs the
 * recipient and the weekly period, the value is the Respect granted. */
function decodeMintPayload(cdata) {
  const selector = cdata.slice(0, 10);
  const name = PAYLOAD_SELECTOR[selector];
  if (name === 'signal') {
    // signal(uint8 signalType, bytes data) - ZAO's weekly tick, and the only
    // proposal type that carries a human-readable payload.
    const body = cdata.slice(10);
    const data = readBytes(body, numAt(body, 32));
    const signal = decodeSignalData(data);
    return { call: name, awards: null, signalType: numAt(body, 0), signalData: signal.hex, signalValue: signal.value };
  }
  if (name !== 'mintRespectGroup') return { call: name || selector, awards: null };
  const body = cdata.slice(10);
  const arrayStart = numAt(body, 0);
  const count = numAt(body, arrayStart);
  const awards = [];
  for (let i = 0; i < count; i++) {
    const base = arrayStart + 32 + i * 64;
    const idHex = body.slice(base * 2, base * 2 + 64);
    const value = parseInt(body.slice((base + 32) * 2, (base + 32) * 2 + 64), 16);
    const { mintType, periodNumber, owner } = unpackTokenId('0x' + idHex);
    awards.push({ recipient: owner, respect: value, periodNumber, mintType });
  }
  return { call: name, awards };
}

// --- pulls -----------------------------------------------------------------

async function pullToken(key) {
  const addr = CONTRACTS[key];
  log(`[${key}] token metadata`);
  const [meta, counters] = await Promise.all([
    getJson(`${BLOCKSCOUT}/tokens/${addr}`),
    getJson(`${BLOCKSCOUT}/tokens/${addr}/counters`),
  ]);
  const holders = await paginate(`/tokens/${addr}/holders`, `[${key}] holders`);
  const transfers = await paginate(`/tokens/${addr}/transfers`, `[${key}] transfers`);
  return { meta, counters, holders, transfers };
}

function normalizeOgHolders(holders) {
  return holders
    .map((h) => ({
      address: h.address.hash,
      raw: h.value,
      respect: Number(BigInt(h.value) / 10n ** 18n),
    }))
    .sort((a, b) => b.respect - a.respect || a.address.localeCompare(b.address));
}

/** ZOR holds two kinds of balance: fungible id 0 is accumulated Respect, every
 * other id is a single soulbound award badge (always value 1).
 *
 * Blockscout's indexed value for the fungible id runs behind the chain (spot
 * checks were short by 4-18%), so the Respect figure is read from the contract
 * and only the award-badge count comes from the indexer. */
async function normalizeZorHolders(holders, transfers) {
  const awards = new Map();
  const addrs = new Set();
  for (const h of holders) {
    const address = h.address.hash;
    addrs.add(address);
    if (h.token_id !== '0') awards.set(address, (awards.get(address) || 0) + 1);
  }
  // The indexer's holder list has also been seen to drop accounts entirely, so
  // seed the address set from everyone who ever received a token.
  for (const t of transfers) {
    if (t.to?.hash && t.to.hash !== ZERO) addrs.add(t.to.hash);
  }

  const pad = (v) => v.replace(/^0x/, '').toLowerCase().padStart(64, '0');
  const rows = [];
  for (const address of addrs) {
    // balanceOf(address,uint256)
    const raw = await rpc('eth_call', [{
      to: CONTRACTS.ZOR_RESPECT,
      data: '0x00fdd58e' + pad(address) + pad('0x0'),
    }, 'latest']);
    rows.push({ address, respect: Number(hexToBig(raw)), awards: awards.get(address) || 0 });
  }
  log(`  [ZOR_RESPECT] balances read from chain: ${rows.length}`);
  return rows.sort((a, b) => b.respect - a.respect || a.address.localeCompare(b.address));
}

/** One row per ZOR award badge movement: who, how much Respect, which weekly
 * period, which breakout group, what rank. Mints are the award timeline the
 * member write-ups need; burns are kept separately so the ledger reconciles
 * against on-chain balances. */
function zorAwardEvents(transfers) {
  const rows = [];
  const burns = [];
  for (const t of transfers) {
    const minting = t.from.hash === ZERO;
    const burning = t.to.hash === ZERO;
    if (!minting && !burning) continue;
    const tokenId = t.total?.token_id;
    if (!tokenId || tokenId === '0') continue; // the fungible leg of the same tx
    const unpacked = unpackTokenId(tokenId);
    const props = t.total?.token_instance?.metadata?.properties || {};
    const row = {
      date: t.timestamp,
      block: t.block_number,
      tx: t.transaction_hash,
      recipient: minting ? t.to.hash : t.from.hash,
      periodNumber: props.periodNumber ?? unpacked.periodNumber,
      groupNum: props.groupNum ?? null,
      level: props.level ?? null,
      respect: props.denomination ?? null,
      mintType: props.mintType ?? unpacked.mintType,
      tokenId,
    };
    (minting ? rows : burns).push(row);
  }
  const byBlock = (a, b) => a.block - b.block || a.recipient.localeCompare(b.recipient);
  rows.sort(byBlock);
  burns.sort(byBlock);
  return { awards: rows, burns };
}

/** OG Respect predates the ZOR award-metadata scheme, and it was not minted
 * per member: every mint went to one treasury wallet, which then distributed
 * Respect by plain transfer. So the OG-era award timeline is the outgoing
 * transfers from that treasury, not the mints. Rows are tagged by kind and the
 * caller picks which it wants. */
function ogTransferEvents(transfers) {
  const mintedTo = new Map();
  for (const t of transfers) {
    if (t.from.hash === ZERO) mintedTo.set(t.to.hash, (mintedTo.get(t.to.hash) || 0) + 1);
  }
  const treasury = [...mintedTo.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const rows = transfers.map((t) => {
    const from = t.from.hash;
    const to = t.to.hash;
    const kind = from === ZERO ? 'mint'
      : to === ZERO ? 'burn'
      : from === treasury ? 'distribution'
      : to === treasury ? 'return'
      : 'peer-transfer';
    return {
      date: t.timestamp,
      block: t.block_number,
      tx: t.transaction_hash,
      kind,
      from,
      to,
      respect: Number(BigInt(t.total.value) / 10n ** 18n),
      method: t.method || null,
    };
  });
  rows.sort((a, b) => a.block - b.block || a.to.localeCompare(b.to));
  return { treasury, rows };
}

/** Group award rows into weekly Respect Game sessions. */
function periodsFrom(rows) {
  const byPeriod = new Map();
  for (const r of rows) {
    const p = r.periodNumber;
    if (p === undefined || p === null) continue;
    if (!byPeriod.has(p)) byPeriod.set(p, { periodNumber: p, date: r.date, groups: new Set(), participants: new Set(), respect: 0, awards: 0 });
    const e = byPeriod.get(p);
    if (r.date < e.date) e.date = r.date;
    if (r.groupNum != null) e.groups.add(r.groupNum);
    e.participants.add(r.recipient.toLowerCase());
    e.respect += r.respect || 0;
    e.awards += 1;
  }
  return [...byPeriod.values()]
    .map((e) => ({
      periodNumber: e.periodNumber,
      date: e.date,
      groups: e.groups.size,
      participants: e.participants.size,
      awards: e.awards,
      respect: e.respect,
    }))
    .sort((a, b) => a.periodNumber - b.periodNumber);
}

/** OREC log history. Blockscout serves the contract's whole log history
 * paginated with block timestamps attached; the public RPC caps eth_getLogs at
 * a few thousand blocks, which would mean ~1,700 chunked calls for the same
 * data. Topics come back with trailing nulls, so they get trimmed here. */
async function pullOrecLogs() {
  const items = await paginate(`/addresses/${CONTRACTS.OREC}/logs`, '[OREC] logs');
  return items.map((l) => ({
    topics: (l.topics || []).filter(Boolean),
    data: l.data,
    blockNumber: l.block_number,
    timestamp: l.block_timestamp,
    transactionHash: l.transaction_hash,
  }));
}

function decodeOrecLogs(logs) {
  const proposals = new Map();
  const get = (id) => {
    if (!proposals.has(id)) {
      proposals.set(id, {
        propId: id, createdBlock: null, createdTx: null, createdAt: null,
        stage: 'Unknown', executed: false, executionFailed: false, canceled: false,
        votes: [],
      });
    }
    return proposals.get(id);
  };
  const signals = [];

  for (const l of logs) {
    const name = TOPIC[l.topics[0]] || l.topics[0];
    const block = Number(l.blockNumber);
    const at = l.timestamp;
    if (name === 'ProposalCreated') {
      const p = get(l.topics[1]);
      p.createdBlock = block;
      p.createdAt = at;
      p.createdTx = l.transactionHash;
    } else if (name === 'ProposalCanceled') {
      get(l.topics[1]).canceled = true;
    } else if (name === 'Executed') {
      const p = get(l.topics[1]);
      p.executed = true;
      p.executedAt = at;
      p.executedBlock = block;
      p.executedTx = l.transactionHash;
    } else if (name === 'ExecutionFailed') {
      const p = get(l.topics[1]);
      p.executionFailed = true;
      p.executedAt = at;
      p.executedBlock = block;
      p.executedTx = l.transactionHash;
    } else if (name === 'WeightedVoteIn') {
      const p = get(l.topics[1]);
      const voter = addrFromWord(l.topics[2]);
      const vtype = Number(hexToBig(word(l.data, 0)));
      // Vote weight is the voter's balance in OREC's respect contract, which is
      // the 18-decimal OG Respect ERC-20. Keep wei exact, expose whole Respect.
      const weiWeight = hexToBig(word(l.data, 1));
      p.votes.push({
        voter, vote: VOTE_TYPE[vtype] || String(vtype),
        weight: Number(weiWeight / 10n ** 18n), weightWei: weiWeight.toString(),
        block, at, tx: l.transactionHash,
      });
    } else if (name === 'EmptyVoteIn') {
      const p = get(l.topics[1]);
      const voter = addrFromWord(l.topics[2]);
      const vtype = Number(hexToBig(word(l.data, 0)));
      p.votes.push({ voter, vote: VOTE_TYPE[vtype] || String(vtype), weight: 0, weightWei: '0', block, at, tx: l.transactionHash });
    } else if (name === 'Signal') {
      signals.push({ signalType: Number(hexToBig(l.topics[1])), block, tx: l.transactionHash });
    }
  }
  const list = [...proposals.values()]
    .sort((a, b) => (a.createdBlock || 0) - (b.createdBlock || 0))
    .map((p) => ({ ...p, ...tally(p.votes) }));
  return { proposals: list, signals };
}

/** OREC lets a voter change their vote, and emits an event for each change
 * while replacing the stored one. Summing every event therefore double-counts
 * anyone who switched - it produced nine proposals reading 3094 yes and 3094 no
 * from a single 3094-weight wallet. The standing tally is the LAST vote each
 * voter cast, so reduce to that first. The full event log is kept as history. */
function tally(votes) {
  const final = new Map();
  for (const v of votes) {
    const prev = final.get(v.voter);
    if (!prev || v.block > prev.block) final.set(v.voter, v);
  }
  let yesWei = 0n;
  let noWei = 0n;
  for (const v of final.values()) {
    if (v.vote === 'Yes') yesWei += BigInt(v.weightWei);
    if (v.vote === 'No') noWei += BigInt(v.weightWei);
  }
  return {
    yesWeight: Number(yesWei / 10n ** 18n),
    noWeight: Number(noWei / 10n ** 18n),
    yesWeightWei: yesWei.toString(),
    noWeightWei: noWei.toString(),
    voterCount: final.size,
    voteChanges: votes.length - final.size,
    finalVotes: [...final.values()].sort((a, b) => b.weight - a.weight),
  };
}

/** OREC's own pass rule: a 2/3 supermajority with a 1/3 veto, above a floor. */
function passes(p, minWeightWei) {
  const yes = BigInt(p.yesWeightWei);
  const no = BigInt(p.noWeightWei);
  return no * 2n < yes && yes >= BigInt(minWeightWei);
}

/** Where a proposal sits in OREC's voting -> veto -> execution timeline. */
function stageOf(p, config, now = Date.now()) {
  if (p.executed) return 'Executed';
  if (p.executionFailed) return 'ExecutionFailed';
  if (p.canceled) return 'Canceled';
  if (!p.createdAt) return 'Unknown';
  const created = Date.parse(p.createdAt);
  const voteEnd = created + Number(config.voteLen) * 1000;
  const vetoEnd = voteEnd + Number(config.vetoLen) * 1000;
  if (now < voteEnd) return 'Voting';
  if (now < vetoEnd) return 'Veto';
  return passes(p, config.minWeight) ? 'Executable' : 'Failed';
}

/** Pull the execute() calldata for every executed proposal, so each one says
 * what the DAO actually did - which is, for most of them, minting one weekly
 * breakout group's Respect. */
async function attachActions(proposals) {
  const withTx = proposals.filter((p) => p.executedTx);
  let done = 0;
  for (const p of withTx) {
    const tx = await rpc('eth_getTransactionByHash', [p.executedTx]);
    p.entrypoint = SELECTOR[tx?.input?.slice(0, 10)] || tx?.input?.slice(0, 10) || null;
    p.executedBy = tx?.from ?? null;
    const msg = decodeExecuteInput(tx?.input);
    if (!msg) continue;
    const payload = decodeMintPayload(msg.cdata);
    p.action = {
      target: msg.target,
      call: payload.call,
      memo: msg.memo,
      awards: payload.awards,
      periodNumber: payload.awards?.[0]?.periodNumber ?? null,
      respectMinted: payload.awards?.reduce((sum, a) => sum + a.respect, 0) ?? null,
      signalType: payload.signalType ?? null,
      signalData: payload.signalData ?? null,
      signalValue: payload.signalValue ?? null,
    };
    if (++done % 25 === 0) log(`  [OREC] actions decoded ${done}/${withTx.length}`);
  }
}

async function readOrecConfig() {
  const sel = {
    voteLen: '0xcb156a4a', vetoLen: '0x0ee572fd', minWeight: '0x0c2ee55e',
    respectContract: '0xbe142264', owner: '0x8da5cb5b',
  };
  const out = {};
  for (const [name, data] of Object.entries(sel)) {
    try {
      const r = await rpc('eth_call', [{ to: CONTRACTS.OREC, data }, 'latest']);
      out[name] = name === 'respectContract' || name === 'owner'
        ? addrFromWord(r)
        : hexToBig(r).toString();
    } catch {
      out[name] = null;
    }
  }
  return out;
}

// --- main ------------------------------------------------------------------

const write = async (name, data) => {
  await writeFile(join(OUT, name), JSON.stringify(data, null, 2) + '\n');
  log(`wrote data/${name}`);
};

async function main() {
  const argv = process.argv.slice(2);
  quiet = argv.includes('--quiet');
  const onlyArg = argv.indexOf('--only');
  const only = onlyArg >= 0 ? argv[onlyArg + 1].split(',') : ['zor', 'og', 'orec'];

  await mkdir(OUT, { recursive: true });
  const latestBlock = Number(await rpc('eth_blockNumber', []));
  const pulledAt = new Date().toISOString();
  // A partial pull (--only) must not wipe the sections it did not refresh.
  let prior = {};
  try { prior = JSON.parse(await readFile(join(OUT, 'summary.json'), 'utf8')); } catch {}
  const summary = { ...prior, pulledAt, latestBlock, chainId: 10, sources: { blockscout: BLOCKSCOUT, rpc: RPC }, contracts: CONTRACTS };

  if (only.includes('zor')) {
    const zor = await pullToken('ZOR_RESPECT');
    const holders = await normalizeZorHolders(zor.holders, zor.transfers);
    const { awards, burns } = zorAwardEvents(zor.transfers);
    const periods = periodsFrom(awards);
    const minted = awards.reduce((sum, a) => sum + (a.respect || 0), 0);
    const burned = burns.reduce((sum, a) => sum + (a.respect || 0), 0);
    const held = holders.reduce((s, h) => s + h.respect, 0);
    await write('zor-respect.json', {
      pulledAt, contract: CONTRACTS.ZOR_RESPECT, deployBlock: DEPLOY_BLOCK.ZOR_RESPECT,
      name: zor.meta.name, type: zor.meta.type,
      holderCount: holders.length, transferCount: Number(zor.counters.transfers_count),
      totalRespect: held,
      holders,
    });
    await write('award-events.json', {
      pulledAt, ledger: 'ZOR', contract: CONTRACTS.ZOR_RESPECT,
      count: awards.length, events: awards,
      burnCount: burns.length, burns,
    });
    await write('periods.json', { pulledAt, count: periods.length, periods });
    summary.zor = {
      holders: holders.length,
      awards: awards.length,
      periodsRecorded: periods.length,
      firstPeriod: periods[0]?.periodNumber ?? null,
      latestPeriod: periods.at(-1)?.periodNumber ?? null,
      firstAward: awards[0]?.date ?? null,
      latestAward: awards.at(-1)?.date ?? null,
      burns: burns.length,
      // minted - burned should equal the balances read off the contract; a
      // non-zero residual means the snapshot missed a transfer.
      respectMinted: minted,
      respectBurned: burned,
      respectHeld: held,
      reconciliationResidual: minted - burned - held,
    };
  }

  if (only.includes('og')) {
    const og = await pullToken('OG_RESPECT');
    const holders = normalizeOgHolders(og.holders);
    const { treasury, rows } = ogTransferEvents(og.transfers);
    const distributions = rows.filter((r) => r.kind === 'distribution');
    await write('og-respect.json', {
      pulledAt, contract: CONTRACTS.OG_RESPECT, deployBlock: DEPLOY_BLOCK.OG_RESPECT,
      name: og.meta.name, symbol: og.meta.symbol, decimals: Number(og.meta.decimals),
      treasury,
      holderCount: holders.length, transferCount: Number(og.counters.transfers_count),
      totalSupply: Number(BigInt(og.meta.total_supply) / 10n ** 18n),
      holders,
      transfers: rows,
    });
    summary.og = {
      holders: holders.length,
      treasury,
      transfers: rows.length,
      mints: rows.filter((r) => r.kind === 'mint').length,
      distributions: distributions.length,
      recipients: new Set(distributions.map((r) => r.to.toLowerCase())).size,
      // Holder balances should add up to total supply; a residual means the
      // indexer's holder list is incomplete.
      respectHeld: holders.reduce((sum, h) => sum + h.respect, 0),
      reconciliationResidual: Number(BigInt(og.meta.total_supply) / 10n ** 18n)
        - holders.reduce((sum, h) => sum + h.respect, 0),
      firstDistribution: distributions[0]?.date ?? null,
      latestDistribution: distributions.at(-1)?.date ?? null,
      totalSupply: Number(BigInt(og.meta.total_supply) / 10n ** 18n),
    };
  }

  if (only.includes('orec')) {
    log('[OREC] config + logs');
    const config = await readOrecConfig();
    const logs = await pullOrecLogs();
    const { proposals, signals } = decodeOrecLogs(logs);
    await attachActions(proposals);
    for (const p of proposals) p.stage = stageOf(p, config);
    await write('orec-proposals.json', {
      pulledAt, contract: CONTRACTS.OREC, deployBlock: DEPLOY_BLOCK.OREC,
      config, logCount: logs.length, proposalCount: proposals.length,
      proposals, signals,
    });
    summary.orec = {
      config,
      proposals: proposals.length,
      executed: proposals.filter((p) => p.executed).length,
      failed: proposals.filter((p) => p.executionFailed).length,
      canceled: proposals.filter((p) => p.canceled).length,
      byStage: proposals.reduce((acc, p) => { acc[p.stage] = (acc[p.stage] || 0) + 1; return acc; }, {}),
      respectMintingProposals: proposals.filter((p) => p.action?.call === 'mintRespectGroup').length,
      firstProposal: proposals[0]?.createdAt ?? null,
      latestProposal: proposals.at(-1)?.createdAt ?? null,
    };
  }

  await write('summary.json', summary);
}

main().catch((err) => {
  console.error('pull failed:', err.message);
  process.exit(1);
});
