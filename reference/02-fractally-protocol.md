# 02 - The Fractally Protocol (2022)

## What it was

Fractally was the protocol that turned Larimer's theory into a system. Announced **January 28, 2022** via a Medium post titled *"Introducing Fractally - The next generation of DAOs."* The white paper followed on **February 22, 2022**.

The protocol's core primitive is **Respect** - a soulbound (non-transferable) reputation token earned only through peer evaluation. Governance power tracks contribution, never capital.

## The Respect Game mechanics

Fractally codified the weekly ritual that every downstream fractal still uses today:

- Random breakout groups of 3-6 people (6 is ideal - 15 pairwise comparisons).
- Each person gets ~4 minutes to describe their contributions to the community that week.
- The group discusses and collaboratively ranks members 1-6.
- A **2/3 consensus** is required on the final ranking.
- Respect is distributed on the **Fibonacci curve** by rank (1, 2, 3, 5, 8, 13 in the base scheme). Each level earns roughly 60% more than the one below.

## The scoring formula evolution

The white paper proposed `AVERAGE(FIBONACCI(LEVEL))` - an exponential moving average of weekly ranks.

Larimer's **Addendum 1** (Hive post) revised it to `FIBONACCI(AVERAGE(LEVEL))` - apply the Fibonacci function to a moving-average weighted level. The formula, quoted verbatim from the post:

```
NEW_AVERAGE = (CURRENT_AVERAGE * 5 + NEW_LEVEL)/6
```

Then map `NEW_AVERAGE` to its position on a continuous Fibonacci curve. This creates **momentum**
- your standing persists even if you miss a week. **Corrected 2026-09-26**: a 5/6 weekly
retention gives half-life `ln(0.5)/ln(5/6) = 3.80 weeks`, not the ~34 weeks this doc previously
stated - that number was off by roughly 9x and did not trace to anything in the source. The post
itself states no half-life; it only contrasts this formula against "a pure moving window average
would go from 0 to max in just 6 weeks," calling the revised formula slower ("more momentum") by
comparison, which is true at both the correct and the previous figure and does not, by itself,
tell you which is right - the arithmetic does.

The post also states this scoring model has its own membership cutoff, separate from Season 3's
2026-09-26 ruling of a 90-day rolling vote-eligibility window: **"after 12 weeks of
non-attendance someone would cease to be a member and their income would fall to 0."** Twelve
weeks is 84 days - close to Season 3's 90 days, but Fractally's cutoff drops *membership itself*,
where Season 3's rule drops only the vote.

Both Eden Fractal and ZAO Fractal use the revised (Addendum 1) formula.

*(Verified 2026-09-26 by fetching Addendum 1's raw body directly via the Hive `condenser_api.get_content`
API - 13,728 characters. The `hive.blog` page itself renders as a 513-byte JavaScript shell with
no server-side content, which likely explains why this number went uncaught: a browser view of
the source page shows nothing to check it against.)*

## What Fractally promised

- A soulbound token earned only through peer ranking
- A weekly governance ritual that doubles as community-building
- A nested-fractal scaling story for very large populations
- Open-source contracts, tooling, and templates

## Status today

Dormant since approximately 2023. The website (fractally.com) is still up and the white paper is still downloadable, but there is no active development team or community. The EOS ecosystem - Fractally's home - declined, and the live downstream communities (Eden, Optimism, ZAO) migrated to Ethereum L2s.

What survived is the **idea**. Every active fractal today (Eden Fractal on Base, ZAO Fractal on Optimism, Roy Fractal on EOS, Aquadac on Zoom) implements the Fractally Respect Game in some form. The protocol succeeded as a meme and a template; the company behind it did not.

## Why this matters for ZAO

ZAO Fractal inherits the Fractally Respect Game mechanics directly. The only changes:

- ZAO uses **2x Fibonacci** scoring (110/68/42/26/16/10) starting in Year 2, vs Fractally/Eden's standard 1x (55/34/21/13/8/5).
- ZAO ranks members on five **music-community-specific criteria** (vision, contribution, collaboration, innovation, onboarding) rather than generic contribution.
- ZAO runs **weekly**, where Optimism Fractal ran bi-weekly.

Everything else - the 6-person groups, 4-minute presentations, 2/3 consensus, Fibonacci rewards, soulbound token - traces directly to Fractally.

## Sources

- [Introducing Fractally - The next generation of DAOs](https://medium.com/gofractally/introducing-fractally-the-next-generation-of-daos-7c94981514d8) - Larimer, Medium, Jan 28, 2022 - [FULL]
- [Fractally White Paper 1.0](https://fractally.com/uploads/Fractally%20White%20Paper%201.0.pdf) - Feb 22, 2022 - [FULL]
- [Fractally White Paper Addendum 1](https://hive.blog/fractally/@dan/fractally-white-paper-addendum-1) - Larimer, Hive - [FULL]
- [fractally.com](https://fractally.com) - the home site, dormant - [FULL]
