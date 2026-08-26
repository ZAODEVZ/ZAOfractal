# Execution runbook - the proposed executor bench

**Status:** proposal, 2026-08-26. Nothing here executes and nothing here is
agreed. Every figure is measured from `data/orec-proposals.json`,
`data/award-events.json` and `data/members.json` in the committed snapshot,
pulled at OP Mainnet block 156,055,426. Reproduce with `node scripts/pull-data.mjs`.

**Nobody named on this page has been contacted, approached, asked or has
agreed to anything.** The bench in section 2 is a naming proposal derived from
on-chain activity, put in front of Zaal so he has a concrete list to accept,
edit or replace. Treat every name as a suggestion, not a commitment, until the
person themselves says otherwise.

This is Step 1 of the migration path in
[SIGNER-COMMITTEE.md](./SIGNER-COMMITTEE.md): the execution rota. It is the only
item on that page that needs no proposal, no deploy and no contract change,
because **execution on OREC is already permissionless** - any wallet on Optimism
with gas can execute a passed ZAO proposal. There is no signer set to join and
no permission to grant. What is missing is a named set of people who consider it
their job, and a written procedure for the two ways it goes wrong.

---

## 1. Why this exists

Measured over 153 proposals from 2025-09-11 to 2026-08-25:

| | |
|---|---|
| Addresses that have ever executed a proposal | **2** |
| Executions by Zaal `0x7234c36a…E9Af` | **130** of 134 |
| Executions by Tadas `0xaed620c4…6286` | **4** |
| Executions that reverted | **11**, all `mintRespectGroup`, all sent by Zaal |
| Proposals passed and sitting unexecuted right now | **2** (28.4 days and 7.4 days old) |
| Award slots that never settled because of a reverted execution | **24**, worth **1,672 Respect**, across **16 people** and **8 periods** |

The last row is the argument. Eleven reverts over ten months were never fully
recovered, so sixteen members are still missing Respect they were ranked for.
Section 6 lists every one of them.

---

## 2. The proposed bench

**Proposed only. Not contacted, not asked, not agreed.**

Selection criteria, applied to the snapshot and to nothing else:

1. Has taken a governance action on OREC at least once (voted or executed).
2. Has received a Respect Game award in period 100 or later, so they are
   currently in the room each week.
3. Is a named identity in `data/members.json`, so a missed week has someone to
   ask.

Three people meet all three:

| Proposed | Wallet | OREC votes | Executions | Awards since period 100 | Last period |
|---|---|---|---|---|---|
| Ohnahji B | `0x64a15b1d…b3e1` | 11 | 0 | 4 | 109 |
| CandyToyBox | `0x8d43a3fc…eE66` | 3 | 0 | 5 | 110 |
| Meta Mu | `0x2d9cbc4e…AA8B` | 1 | 0 | 5 | 110 |

**Also worth asking, but failing criterion 2:** Tadas `0xaed620c4…6286` is the
only person other than Zaal who has ever executed a ZAO proposal - four times -
and is therefore the only person on chain who has demonstrably done this job.
His last Respect Game award was period 68, so by the measure above he is not
currently in the weekly room. Whether that means he has stepped back or simply
does not get ranked is not something the chain can answer. He should be asked
before anyone else is, because he already knows the procedure.

**Named but not proposed, and why:** Dan SingJoy (2 votes, 0 ZOR), Will T
(1 vote, 0 ZOR), Mumbo (1 vote, last award far back), and `0xe5adabbd…071b`,
the only one of the nine voters with no name in `data/members.json`. None fail
on merit; they fail criterion 2 or 3 on this snapshot, and criterion 3 is a gap
in our records, not in the person.

**Notes Zaal should weigh before accepting this list:**

- Two of the three proposed (Ohnahji B, Meta Mu) are themselves owed Respect
  from the section 6 backlog. That is alignment, not a conflict - but the person
  who executes a mint that awards them should not also be the person who decided
  the ranking, and today they are not.
- None of the three has ever executed anything. The rota's first week should be
  a walkthrough, not a handover.
- OG vote weight is irrelevant to this role. Execution needs gas, not weight.
  Tadas holds zero OG and executed four proposals.

---

## 3. The rota

Once Zaal has a bench that has actually agreed:

- **One person on duty per week**, rotating in a fixed order, starting the
  Monday of the Respect Game.
- **The duty person owns settlement for that week**: every proposal that reaches
  the Execution stage during their week gets executed by them, or explicitly
  handed to the next person with a reason.
- **48-hour rule.** A proposal that has been executable for more than 48 hours
  is late. The duty person either executes it or says in the channel why not.
- **Miss twice in a row and you come off the rota.** No penalty, no drama - the
  point of a bench is that it survives someone getting busy.
- **Zaal is not on the rota.** He is the escalation path in section 7. If he is
  executing in a normal week, the rota is not working.

**Done when:** two consecutive weeks settle with a non-Zaal executor. That is
the same success test as SIGNER-COMMITTEE.md Step 1, and it is measurable from
the snapshot - `executedBy` on every proposal is in `data/orec-proposals.json`.

---

## 4. How to spot a proposal that needs executing

OREC moves a proposal through Voting (72h) then Veto (72h) then Execution.
`voteLen` and `vetoLen` are both 259,200 seconds on the deployed contract, and
`minWeight` is 1,000 Respect. A proposal is executable when both windows have
closed and `noWeight * 2 < yesWeight && yesWeight >= minWeight`.

Refresh the snapshot and list what is waiting:

```bash
node scripts/pull-data.mjs --only orec

node -e "
const raw = require('./data/orec-proposals.json');
const now = new Date(raw.pulledAt);
raw.proposals
  .filter(p => p.stage === 'Executable')
  .forEach(p => console.log(
    p.propId,
    p.createdAt.slice(0, 10),
    ((now - new Date(p.createdAt)) / 86400000).toFixed(1) + 'd waiting',
    'yes ' + p.yesWeight, 'no ' + p.noWeight));
"
```

As of the snapshot this prints two proposals:

| Proposal | Created | Waiting | Yes | No |
|---|---|---|---|---|
| `0x55e992ec…102d` | 2026-07-28 | 28.4 days | 3,094 | 0 |
| `0xc8059d58…46a8` | 2026-08-18 | 7.4 days | 3,094 | 0 |

Two more were in the Voting stage at snapshot time (both created 2026-08-25) and
will become executable on 2026-08-31 if nothing vetoes them.

The dashboard shows the same thing without the terminal: `cd dao && npm run dev`,
Proposals tab.

---

## 5. How to execute - and the dependency that currently blocks this

Execution is one transaction: call `execute(Message)` on OREC at
`0xcB05F9254765CA521F7698e61E0A6CA6456Be532`, selector `0xfd165a73`, where
`Message` is the tuple `(address addr, bytes cdata, bytes memo)` - the contract
the DAO is calling, the calldata it is calling with, and a memo hash. OREC
recomputes the proposal id from that tuple and rejects anything that does not
hash to the proposal being executed. Gas is the only cost, and it is a few cents
on Optimism.

**The problem: the Message is not on chain until someone executes it.**

All 153 proposals were created by `vote(bytes32,uint8,string)` - selector
`0xd50b2843` - not by `propose(Message)`. Sampled across the full history, the
creating transaction is that vote selector every single time; `propose(Message)`
`0x23f70738` has never been used. OREC creates a proposal from the id alone on
the first vote, so the chain records **what** was approved only as a hash. The
award list itself lives off chain until execution puts it in the calldata.

That is why `data/orec-proposals.json` has a decoded `action` for every executed
proposal and `undefined` for the two that are waiting. It is also, most likely,
the real reason execution has stayed with one person: **the executor has to be
someone who holds the Message.**

The known off-chain home for it is ornode. As of 2026-08-26 it does not answer:

| Probe | Result |
|---|---|
| `GET https://zao-ornode.frapps.xyz/` | 404 |
| `GET .../proposals` | 404 |
| `GET .../api/proposals` | 404 |
| `GET .../getProposals` | 404 |
| `POST /` with a JSON-RPC body | `{"status":"error","error":{"message":"Can not POST /"}}` |
| `GET https://zao.frapps.xyz/` | 200 |

The Frapps UI is up, so something is serving it the proposal bodies. Until the
working endpoint is written down here, **the rota cannot start from the terminal**
and a duty person's only route is the Frapps UI. This is open call 1 in section 8
and it blocks everything else on this page.

---

## 6. When it reverts

Eleven of 134 execution attempts reverted, all of them `mintRespectGroup`, all
sent by Zaal. OREC catches the inner revert and emits `ExecutionFailed`, so the
transaction itself succeeds and the proposal is spent: **a reverted execution
cannot be retried on the same proposal.** The week has to be re-proposed and
re-voted from scratch. That is why eleven reverts turned into ten months of
missing Respect.

Tracing every one of the eleven against the award ledger gives two causes and
nothing else.

### Cause A - a recipient already has an award for that period (7 of 11)

ZOR award ids pack `mintType | periodNumber | owner`, so an address can hold
exactly one award badge per period. If a recipient in the group was already
minted for that period by an earlier proposal, the whole group reverts.

| Period | Failed on | Recipients already holding a period award |
|---|---|---|
| 74 | 2025-11-24 | 1 |
| 75 | 2025-12-16 | 2 |
| 77 | 2026-01-10 | 4 |
| 76 | 2026-03-20 | 5 |
| 76 | 2026-03-30 | 4 |
| 89 | 2026-04-06 | 1 |
| 96 | 2026-05-19 | 2 |

Period 76 is the clearest case: the same group was submitted twice, ten days
apart, and reverted both times for the same reason.

**Check before executing:**

```bash
node -e "
const ev = require('./data/award-events.json').events;
const PERIOD = 110;
console.log(ev.filter(e => e.periodNumber === PERIOD)
  .map(e => e.recipient.toLowerCase() + ' ' + e.respect).join('\n') || '(nothing minted yet)');
"
```

If any address in the proposal appears in that list, executing will revert.
Do not send it. Escalate per section 7 so the group can be re-proposed with the
already-settled member removed.

### Cause B - a recipient is a contract that does not accept ERC-1155 (4 of 11)

ZOR is an ERC-1155, so minting to an address that holds code triggers the
`onERC1155Received` acceptance check. If that call does not return the magic
value, the mint reverts. Four failures have no duplicate recipient at all and
the trace shows Respect1155 calling out to recipient addresses that hold code -
a path an EOA recipient never takes.

| Period | Failed on | Contract recipients called during the mint |
|---|---|---|
| 88 | 2026-03-10 | `0x21bc394f…d75b` |
| 95 | 2026-04-27 | `0x4440397b…4f3a`, `0xe5adabbd…071b` |
| 99 | 2026-05-25 | `0xe5adabbd…071b` |
| 108 | 2026-08-10 | `0x29185eb8…0ad2`, `0xe5adabbd…071b` |

Three of the four are EIP-7702 delegated EOAs - `eth_getCode` returns 23 bytes
beginning `0xef0100`, the delegation designator - and each points at a different
delegate:

| Recipient | Code | Delegate |
|---|---|---|
| `0x21bc394f…d75b` | 23 bytes, EIP-7702 | `0x985adf92…21c3` |
| `0xe5adabbd…071b` | 23 bytes, EIP-7702 | `0x06ee8eae…3c7a` |
| `0x29185eb8…0ad2` | 23 bytes, EIP-7702 | `0x63c0c19a…e32b` |
| `0x4440397b…4f3a` | 61 bytes, EIP-1167 minimal proxy | - |

A member who upgraded their wallet to a smart account after joining silently
became unable to receive Respect, and nothing told them. The wallet still works
for voting, which is why this went unnoticed for months.

**Check before executing:**

```bash
for a in <each recipient address>; do
  printf "%s " "$a"
  curl -s -X POST https://mainnet.optimism.io -H 'content-type: application/json' \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_getCode\",\"params\":[\"$a\",\"latest\"]}" \
    | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const r=JSON.parse(s).result;console.log(r==='0x'?'EOA ok':'CONTRACT - will likely revert')})"
done
```

Any `CONTRACT` result is a stop. The member needs to supply an EOA, or the group
needs to be re-proposed without them and their Respect handled separately.

### The backlog this created

24 award slots across 8 periods were never minted to 16 people, totalling 1,672
Respect. Working through this is the bench's first real job, and it is the
clearest possible demonstration that the rota does something.

| Period | Respect | Wallet | Member |
|---|---|---|---|
| 76 | 16 | `0x64a15b1d…b3e1` | Ohnahji B |
| 77 | 110 | `0x0c687a27…1d3d` | Sven |
| 77 | 110 | `0x06210814…08b7` | (unnamed) |
| 77 | 40 | `0x2d9cbc4e…AA8B` | Meta Mu |
| 77 | 40 | `0xf6519fef…38f0` | Jango UU |
| 88 | 110 | `0x21bc394f…d75b` | DopeStilo |
| 89 | 110 | `0x9763c16d…9eea` | (unnamed) |
| 89 | 110 | `0xea2fe2a2…0487` | (unnamed) |
| 89 | 110 | `0xdbaa4643…024a` | (unnamed) |
| 95 | 110 | `0x4440397b…4f3a` | (unnamed) |
| 95 | 68 | `0xf73485a6…a8ea` | (unnamed) |
| 95 | 42 | `0x64a15b1d…b3e1` | Ohnahji B |
| 95 | 26 | `0xe5adabbd…071b` | (unnamed) |
| 96 | 110 | `0x29185eb8…0ad2` | Jose (Joseph Goats) |
| 96 | 42 | `0x547f8b79…2ee4` | Shawn |
| 96 | 26 | `0x64a15b1d…b3e1` | Ohnahji B |
| 99 | 110 | `0xc96ab83c…85d8` | DCoop |
| 99 | 68 | `0x2d9cbc4e…AA8B` | Meta Mu |
| 99 | 42 | `0x698e5a25…5383` | Kosbaar |
| 99 | 26 | `0xe5adabbd…071b` | (unnamed) |
| 108 | 110 | `0x2d9cbc4e…AA8B` | Meta Mu |
| 108 | 68 | `0x29185eb8…0ad2` | Jose (Joseph Goats) |
| 108 | 42 | `0xe5adabbd…071b` | (unnamed) |
| 108 | 26 | `0x64a15b1d…b3e1` | Ohnahji B |

Seven of the sixteen are unnamed in `data/members.json`, which is its own tap -
they cannot be told they are owed anything.

`0xe5adabbd…071b` appears three times and is a contract; `0x29185eb8…0ad2`
(Jose (Joseph Goats)) appears twice and is a contract. Re-minting to those
addresses will revert again. Fix the wallet first, then re-propose.

---

## 7. Escalation

- **The proposal will revert (section 6 check failed):** do not send it. Post
  the failing recipient and the reason, and ask for the group to be re-proposed
  next session. A reverted execution costs the week; a delayed one does not.
- **The Message is not available:** section 5. This is the standing blocker, not
  a per-week incident.
- **A proposal has been executable more than 7 days:** hand it to Zaal directly
  rather than letting it sit. Two proposals are in that state right now, one for
  28 days.
- **Anything touching contract configuration** - `setMinWeight`,
  `setMaxLiveVotes`, `setRespectContract`, `cancelProposal` - is not routine
  settlement. Those are `onlyOwner` and the owner is OREC itself, so they only
  move through a passed proposal, and the duty person should not execute one
  without Zaal confirming it is the intended change.

---

## 8. Open calls - Zaal only

1. **Where does a proposal's Message actually come from?** The ornode paths in
   section 5 all 404 while the Frapps UI works. Until this is answered the rota
   is a UI-only procedure and section 4's terminal flow cannot complete. This is
   the blocker.
2. **Accept, edit or replace the proposed bench.** Three names, none contacted.
   Ask Tadas first regardless - he is the only person who has done this before.
3. **Ask them.** Nothing on this page is real until three people have said yes.
4. **Who is `0xe5adabbd…071b`?** Two OREC votes, three unsettled awards, and a
   contract wallet that cannot currently receive Respect.
5. **Name the other six unnamed backlog wallets** - `0x06210814…08b7`,
   `0x9763c16d…9eea`, `0xea2fe2a2…0487`, `0xdbaa4643…024a`, `0x4440397b…4f3a`
   and `0xf73485a6…a8ea` - so they can be told what they are owed. Seven of the
   sixteen owed members have no name on file; `0xe5adabbd…071b` is the seventh
   and is already call 4.
6. **Approve re-proposing the 24 unsettled awards.** Eight periods, 1,672
   Respect. Doing it as one catch-up group per period is cleanest, but the
   contract-wallet recipients have to be resolved first or it reverts again.
7. **Should the bot post when a proposal enters the Execution stage?** The
   48-hour rule in section 3 needs a reminder to be real. This is the one piece
   of tooling the rota depends on that does not exist yet.

---

## 9. Reproduction

Everything above comes from the committed snapshot:

```bash
node scripts/pull-data.mjs          # full refresh, about 50 seconds
node scripts/pull-data.mjs --only orec
node scripts/verify-claims.mjs      # checks the figures quoted in these docs
```

The revert traces in section 6 come from Blockscout's internal-transaction view:

```bash
curl -sL "https://optimism.blockscout.com/api/v2/transactions/<executedTx>/internal-transactions"
```

Read alongside [SIGNER-COMMITTEE.md](./SIGNER-COMMITTEE.md) (why the rota is step
one and what comes after) and [LEDGER-RECONCILIATION.md](./LEDGER-RECONCILIATION.md)
(the unified ledger that eventually makes ZOR the vote).
