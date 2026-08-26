# Signer committee - replacing the OREC bottleneck

**Status:** proposal, 2026-08-26. Nothing here executes. Every figure is
measured from `data/orec-proposals.json` in the committed snapshot, pulled at OP
Mainnet block 156,053,890. Reproduce with `node scripts/pull-data.mjs`.

This is the **L5 - Autonomous operations** item on the decentralization scale.
The gate for L5 is that Zaal takes 30 days fully off and cadence, settlement and
onboarding all hold. Today they would not.

The whitepaper (ch09) describes the bottleneck as "zaal.eth + civilmonkey.eth".
That is close but it names the wrong mechanism, and the wrong mechanism leads to
the wrong fix. The measurement below reframes it.

---

## 1. What the chain actually shows

153 proposals over 11 months, from 2025-09-11 to 2026-08-25.

| | |
|---|---|
| Addresses that have ever cast a vote | **9** |
| Addresses that have ever executed a proposal | **2** |
| Proposals decided by a single voter | **137 of 153** |
| Proposals where more than one voter was needed to clear the minimum weight | **0** |
| Proposals ever voted down by anyone other than the person who started them | **0** |

Who does what:

| Wallet | Yes | No | Executions | OG vote weight |
|---|---|---|---|---|
| Zaal `0x7234c36a…E9Af` | 146 | 10 | **130** | 3,094 |
| Ohnahji B `0x64a15b1d…b3e1` | 11 | 0 | 0 | 1,265 |
| Tadas `0xaed620c4…6286` | 5 | 0 | **4** | 0 |
| CandyToyBox `0x8d43a3fc…eE66` | 3 | 0 | 0 | 1,914 |
| Dan SingJoy `0xc11c6f47…44Ff` | 2 | 0 | 0 | 50 |
| `0xe5adabbd…071b` (unnamed) | 2 | 0 | 0 | 0 |
| Meta Mu `0x2d9cbc4e…AA8B` | 1 | 0 | 0 | 825 |
| Will T `0x461acd84…747c` | 1 | 0 | 0 | 0 |
| Mumbo `0x8a1891e1…a73e` | 1 | 0 | 0 | 0 |

Four of the nine voters hold zero OG, so **twelve of the votes ever cast carried
zero weight** - they registered as participation and changed nothing. That
includes three of Zaal's own, cast on 2025-12-09 during a four-day window when
his OG balance was 0 because the tokens were sitting in another wallet. OREC
reads weight live at vote time, with no snapshot, so a routine wallet move
silently disenfranchised the largest holder mid-vote.

All ten No votes are Zaal reversing a proposal he opened himself. OREC has never
seen a contested vote.

Execution timing: median 7 days from creation to execution, which is the
protocol floor (3-day vote plus 3-day veto). But 18 executions took more than 14
days and two took more than 30, the slowest 81. Two proposals sit passed and
unexecuted right now, one for 28 days. Eleven of 134 execution attempts reverted
- all of them `mintRespectGroup`, meaning a week's Respect Game results failed
to settle and had to be redone.

---

## 2. What the bottleneck actually is

Reading `Orec.sol` against the deployed contract settles what is and is not
permissioned:

| Function | Access |
|---|---|
| `propose` | **anyone** |
| `vote` | **anyone** (weight may be zero) |
| `execute` | **anyone**, once the proposal has passed |
| `signal`, `setMinWeight`, `setMaxLiveVotes`, `setPeriodLengths`, `setRespectContract`, `cancelProposal` | `onlyOwner`, and the owner is OREC itself - so only through a passed proposal |

**Nothing about execution is gated.** Any wallet on Optimism with gas can
execute a passed ZAO proposal. There is no signer set to be a member of, no key
to be added to, no permission to be granted.

So the bottleneck is three separate things wearing one name:

1. **A weight bottleneck.** Only 12 addresses hold enough OG to clear the 1,000
   minimum weight alone, and only one of them shows up reliably. Because no
   proposal has ever needed a second voter, the practical rule today is: if Zaal
   votes yes it passes, and if he does not, nothing does.
2. **An operational bottleneck.** Execution is permissionless and unpaid, so
   nobody does it. 130 of 134 executions are one person clicking a button
   anybody could click. The four exceptions were all Tadas, all in the first six
   weeks, and it has not happened since 2025-10-24.
3. **A key bottleneck, and this one is real.** The OG Respect contract's
   `DEFAULT_ADMIN_ROLE` has **exactly one member**, Zaal's wallet. That role can
   grant itself minting rights and issue vote weight at will. It is not frozen
   on-chain; it simply has not been used since 2025-12-09. ZOR by contrast is
   owned by OREC, and OREC is owned by itself - those two are already
   decentralised.

The whitepaper's "two-wallet bottleneck" framing implies a multisig would fix
it. It would not. Two of the three problems above are unaffected by a multisig,
and the third is an admin key on a token that a unified ledger retires anyway.

---

## 3. What breaks if a signer is lost

Working through the failure modes concretely, assuming the current
configuration.

**If Zaal's key is lost or he steps away.** Weekly settlement stops. 3,094 of
38,484 OG (8%) becomes unvotable, which is survivable. What is not survivable is
that no proposal has ever passed without him: 11 other addresses could clear the
minimum weight, but the habit, the tooling and the knowledge of how to submit a
week's results all sit with one person. The OG admin role is permanently
stranded, so the vote-weight token can never be modified or wound down. **Impact:
the DAO cannot settle a Respect Game and cannot change its own vote-weight
token.**

**If Ohnahji B, CandyToyBox or any other weighted holder is lost.** Nothing
breaks. Their weight leaves the electorate, the pass threshold gets marginally
easier for everyone else. This is the correct behaviour and it already works.

**If the OG contract admin key is compromised rather than lost.** The attacker
mints themselves unlimited vote weight and controls every subsequent vote,
because OREC reads OG balances live. There is no timelock and no snapshot to
fall back on. **This is the single highest-severity item in this document** and
it is independent of anything else here.

**If OREC itself needs changing.** It cannot be. It is non-upgradeable and
self-owned; parameter changes go through a passed proposal, which works, but the
contract logic is fixed. That is a deliberate property, not a defect.

### The multisig that already exists

There is a Gnosis Safe at `0x7A944994cE587bD133c2E6C683FE34951cBb5575`, version
1.4.1, with three owners:

- `0x0c687a27…1d3d` - Sven
- `0x7234c36a…E9Af` - Zaal
- `0xb9f12b0a…829f` - not in the member map, unidentified

Its **threshold is 1**. Any single owner can move anything it holds. It briefly
held 3,094 OG between 2025-12-08 and 2025-12-12 - the largest single holding at
the time - and returned it. It holds nothing today.

A 3-owner Safe at threshold 1 provides redundancy (any of three can act if the
others are unavailable) and no check whatsoever (any of three can act
unilaterally). That is a defensible configuration for an operations wallet and
an indefensible one for custody of governance. Whichever it is meant to be
should be stated, and the third owner should be identified.

---

## 4. Design options

Assessed against the L5 gate: can the DAO settle a Respect Game, execute a
proposal and change its own parameters with any one person unavailable for 30
days?

### Option 1 - Do nothing structural; distribute weight

Ship the unified ledger from
[LEDGER-RECONCILIATION.md](./LEDGER-RECONCILIATION.md) and let vote weight
follow participation. No new contracts, no new roles.

- Fixes the weight bottleneck: all 27 recently active members gain weight, and
  18 addresses clear the minimum alone instead of 12.
- Does not fix the operational bottleneck. Execution stays permissionless and
  unpaid, so it stays with whoever is in the habit.
- Does not fix the OG admin key, though a unified ledger makes OG irrelevant,
  which is nearly as good and considerably simpler.
- Cost: one governance proposal, already designed and built.

### Option 2 - Execution rota, no contract change

Name 3 to 5 people responsible for executing passed proposals on a rota, with a
published runbook and a bot reminder when a proposal enters the Execution stage.
Purely social, because execution is already permissionless.

- Fixes the operational bottleneck directly and immediately.
- Fixes nothing else.
- Cost: zero on-chain. A runbook and a bot command that already half exists.

### Option 3 - Safe as the OG admin

Transfer OG's `DEFAULT_ADMIN_ROLE` to a Safe with a real threshold (2-of-3 or
3-of-5), raising the existing Safe's threshold above 1 first.

- Fixes the key bottleneck, which is the highest-severity item.
- Does not touch voting or execution.
- Cost: one `grantRole` plus one `renounceRole`, plus a Safe configuration
  change. Low effort, high value.
- Caveat: it puts a small committee in control of the vote-weight token, which
  is a real centralisation in exchange for removing a single point of failure.
  It is only defensible as a temporary measure until the unified ledger retires
  OG entirely.

### Option 4 - Hats-based signer committee

The Hats contract at `0x3bc1A0Ad…d137` is already listed as ZAO infrastructure.
Mint a facilitator/executor hat, use it to gate a rota and give it a visible,
revocable membership.

- Fixes the operational bottleneck with real accountability, and gives the L1
  facilitator bench a home too.
- Does not fix weight or the admin key.
- Cost: meaningful. Hats is not currently wired to anything in this repo's data,
  and OREC cannot be made to check a hat because it is non-upgradeable. So the
  hat is a social credential with on-chain visibility, not an enforced
  permission - which is fine, but it should not be sold as more than that.

### Option 5 - Fork OREC with a signer set

Deploy a new executor that gates execution to a committee.

- Fixes nothing that is actually broken. Execution being permissionless is a
  feature; gating it would make things worse.
- Costs a fork, a migration and an audit.
- **Not recommended.** Listed because "signer committee" implies it and it
  should be explicitly ruled out.

---

## 5. Recommendation

**Options 2, 3 and 1, in that order, and none of them is a fork.**

The ordering is by cost-to-value, not by severity:

1. **Execution rota now (Option 2).** Zero on-chain cost, fixes the most visible
   symptom this week, and it is the only item on this page that needs no
   proposal, no deploy and no decision from anyone but Zaal. Three names and a
   runbook. The two proposals currently sitting passed and unexecuted are the
   argument.
2. **Move the OG admin role to a Safe at threshold 2 or higher (Option 3).**
   Highest severity, low effort. Raise the existing Safe's threshold above 1
   first, or create a new one - a threshold-1 Safe is not a mitigation. Do this
   even though the unified ledger will eventually retire OG, because "eventually"
   is not a control.
3. **Unified ledger (Option 1),** on the timeline in
   [LEDGER-RECONCILIATION.md](./LEDGER-RECONCILIATION.md). This is the real fix
   for the weight bottleneck and it makes step 2 obsolete rather than permanent.

Option 4 is worth doing later, folded into the L1 facilitator bench work, where
the hat means something operationally rather than being a governance ornament.

**What this does not fix, and should be said plainly:** none of it makes anyone
else *want* to run the DAO. 137 of 153 proposals had one voter not because the
others were blocked but because they did not turn up. Enfranchising 27 people
who currently cannot vote is necessary and it is not sufficient. The gate for L5
is behavioural, and the contracts are not the reason it has not been met.

---

## 6. Migration path

Sequenced so each step is independently useful and nothing depends on a step
that has not shipped.

**Step 1 - Execution rota (this week, no chain work).**
- Name 3 to 5 executors. Candidates who have already acted on-chain: Tadas (4
  executions), Ohnahji B (11 votes), CandyToyBox, Meta Mu.
- Write the execution runbook: how to spot a proposal in the Execution stage,
  how to call `execute`, what to do when it reverts. The 11 failed
  `mintRespectGroup` executions need a documented recovery path, because that
  failure mode has recurred eleven times over ten months.
- Add a bot notification when a proposal enters the Execution stage and when it
  has been executable for more than 48 hours.
- **Done when:** two consecutive weeks settle with a non-Zaal executor.

**Step 2 - Identify and fix the Safe (this week, one transaction).**
- Identify `0xb9f12b0a…829f`. An unidentified owner on a threshold-1 Safe is not
  acceptable regardless of what the Safe is for.
- Decide the Safe's purpose: operations wallet or governance custody. If
  governance custody, raise the threshold to at least 2 and expand to 5 owners.
- **Done when:** the Safe's owners are all named and the threshold matches its
  stated purpose.

**Step 3 - Move the OG admin role (one proposal, after step 2).**
- `grantRole(DEFAULT_ADMIN_ROLE, safe)` then `renounceRole` from the EOA. Verify
  with `getRoleMemberCount` that exactly one holder remains and it is the Safe.
- **Done when:** no EOA can mint vote weight.

**Step 4 - Unified ledger (per the launch runbook).**
- Retires OG, retires step 3's committee, enfranchises everyone who plays.
- **Done when:** OREC's `respectContract` points at the new token and the old
  admin role controls nothing that votes.

**Step 5 - Measure the L5 gate honestly.**
- Zaal takes 30 days off. Track: did every week settle, was every passed
  proposal executed inside 7 days, did any proposal pass without him.
- **Done when:** all three hold for 30 days.

---

## 7. Open calls - Zaal only

1. **Name the executors.** Three to five, this week. Nothing else on this page
   is blocked on it and nothing else is as cheap.
2. **Who is `0xb9f12b0a…829f`?** Third owner of the threshold-1 Safe.
3. **What is the Safe for** - operations or governance custody? The answer sets
   the threshold.
4. **Move the OG admin role to it, or wait for the unified ledger?** The
   recommendation is move it now, because a single EOA that can mint vote weight
   is the highest-severity item in this document and the ledger migration has no
   date.
5. **Should the 11 recurring `mintRespectGroup` execution failures be
   investigated?** Eleven failures across ten months is a pattern, not bad luck,
   and each one is a week of Respect Game results that did not settle on the
   first attempt.
6. **Period-0 and the two unexecuted passed proposals** - execute, cancel, or
   let them expire?

---

## Reproducing this

```bash
node scripts/pull-data.mjs --only orec
node -e "const p=require('./data/orec-proposals.json'); console.log(p.proposalCount)"
cd dao && npm run dev    # Proposals tab, with per-voter tallies
```

Contract behaviour was read from `Orec.sol` as published in `@ordao/orec`, and
the deployed configuration (`minWeight` 1,000 Respect, 3-day vote, 3-day veto,
`respectContract` pointing at OG) was read live from OP Mainnet. Role membership
on OG Respect was read with `getRoleMemberCount` and `getRoleMember`.

One caveat on the vote figures: OREC emits an event every time a voter changes
their vote while replacing the stored one, so a naive sum double-counts
reversals. The snapshot reduces to the standing vote per voter before tallying
- see `tally()` in `scripts/pull-data.mjs`. Nine proposals were affected, and
all nine were the self-reversal pattern described in section 1.
