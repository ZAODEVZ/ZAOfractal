# Open Questions for Operators

**2026-09-02.** Everything here was reached by measurement and could not be
settled by it. Each needs a person who was there.

Nothing in this document is a finding. The findings are in
`research/08-zao-fractal-measured-state.md`, which has thirteen sections and
cites its sources. This is only the residue: what the chain, Supabase and
Airtable together cannot answer.

---

## 1. Why were periods 67 to 70 reversed in full?

**Measured.** Transaction
`0x12c1c2514fc04d890ada3d96b4b0ca9f55aac5ef46b8eee357be9d7891eba0f1`, on
2025-10-24, burned 28 ZOR awards - every award from periods 67, 68, 69 and 70,
matching each period's full awardee count. None has been re-minted.

**Cannot be settled by measurement.** The chain records that it happened, not
why. Two readings both fit: a deliberate correction (wrong amounts, wrong
period numbers, a re-run under new numbers), or a mistake nobody caught.

Period 73 was minted two weeks later with 10 awardees, and periods 74 and 75
carry 17 each - unusually large against a median of 4 per group. That is
consistent with a re-issue under different numbers. It is also consistent with
several other things. **Do not treat it as established.**

**Who can answer:** whoever executed or authorised that proposal. The sender,
`0xaed620c450911c38714e666cd84137767e3d6286`, holds zero OG and is not Zaal's
wallet, so it is likely an Optimystics operator rather than a ZAO member.

**Why it matters:** if the reversal was a mistake, 28 members are owed Respect
from September and October 2025 and nobody knows it.

## 2. Should periods 71 and 72 be minted now?

**Measured.** Airtable's `Respect` table has a column for "ZAO Fractal 71" with
6 members scored and "ZAO Fractal 72" with 4. Neither period has any mint on
chain. The meetings were played and scored; the Respect was never issued.

**Cannot be settled by measurement.** Whether to issue Respect ten months late
is a governance decision, not a data one. It would need an OREC proposal, and
the six-day floor means it could not land for a week after that.

**Who can answer:** Zaal, or the circle.

**Why it matters:** ten members earned Respect in November 2025 and do not have
it. Nothing currently tracks that it is outstanding, so the default outcome is
that it is quietly never issued.

## 3. Did period 103 happen?

**Measured.** No ZOR mints carry period 103. Airtable's per-meeting columns end
at fractal 98, so its absence there is not evidence.

**Cannot be settled by measurement.** Neither available source covers it.

**Who can answer:** the Discord history around 2026-06-29, between period 102
(minted 2026-06-22) and period 104 (minted 2026-07-06). A thread, or its
absence, would settle it in a minute.

**Why it matters:** it is the only remaining gap in the ledger that might be a
skipped meeting rather than an unpaid one, and the whitepaper's "unbroken
weekly streak" claim in `ch08` rests on it. That claim is currently marked
`[unverified]` because of this single week.

## 4. What is the real rationale for the 2x Respect ladder?

**Measured.** ZAO awards 110/68/42/26/16/10 against ORDAO's standard
55/34/21/13/8/5. Both give a rank-1 to rank-6 ratio of exactly **11.0** -
scaling every rank by the same constant preserves every ratio.

`ch08` argued the doubling "increases differentiation: a rank-1 contributor
earns 5x more than a rank-6, instead of 11x". That is wrong in both halves and
is now corrected in the text.

**Cannot be settled by measurement.** What doubling actually changes is the
absolute quantity of Respect issued per meeting, which affects dilution against
the frozen OG ledger and the shape of the leaderboard - not differentiation.
Whether that was the intent is not recoverable from the chain.

**Who can answer:** whoever chose the 2x scale.

**Why it matters:** the whitepaper currently has a corrected claim and no
replacement rationale. A governance document should be able to say why its
central parameter is what it is.

## 5. Is the frozen franchise intended?

**Measured.** OREC reads OG for vote weight. OG froze in December 2025. ZOR
confers no vote. Of the 70 members who have ever received a ZOR award, 47 - two
thirds - hold zero OG and therefore cannot vote, and that share has risen
monotonically from 25% at period 67 to 67% at period 111. It can only continue
rising, because no new voter can be created under this configuration.

**Cannot be settled by measurement.** Whether this is a deliberate transitional
state awaiting a next-generation token, or an unnoticed consequence of freezing
OG, is a question of intent.

**Who can answer:** Zaal, and the Optimystics team who set `respectContract`.

**Why it matters:** it is the largest gap between what the Respect Game promises
a participant - earn Respect, gain a say - and what it delivers. It is recorded
in `ch09` as a limitation. It is not currently surfaced to the members it
affects, who see a dashboard number that sums OG and ZOR and calls it "weight".

---

## Not questions - decisions already recorded

For completeness, so these are not re-raised as open:

- **The single-signer risk.** One wallet holds 3094 OG against a `minWeight` of
  1000 and can pass any proposal alone. Zaal was shown this on 2026-09-01 and
  chose to accept it for now. `ch10`'s milestone "Establish 3+ Signer Committee
  for OREC", dated 2026-06-30, remains open.
- **The period 0 test mint.** One 1-Respect award to
  `0x70a74f41e99e412657c014583544fa6ecdba4743` on 2026-08-18, tx
  `0x055d04485f74`. Harmless; noted so nobody investigates it twice.
