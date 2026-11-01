# fractal.thezao.com - site upgrade plan

Scope of tracker card 10661. Zaal, 1 Nov 2026, on the live site: "the UI looks terrible" and "research all my repos and find upgrades". He did not name what looks wrong, so this plan starts from the home page and hero, which are what a reader sees first.

Read-only research. No render, dev server or local build was run (Mac load limit). Every change below goes in as its own PR and is reviewed on the Vercel preview link that PRs now get, not on a local server.

## Decisions, recommended first

| # | Do | Why | Where |
|---|---|---|---|
| 1 | **Adopt The ZAO's own look: deep navy ground, one gold accent.** | The site is a subdomain of thezao.com, but uses a plum ground (`#0F0E16`) with four accent colors (orange, cyan, gold, magenta) and colors each heading level differently (h1 orange, h2 gold, h3 cyan). It matches no other ZAO surface. | `site/src/styles/global.css` `:root` and the `h1`-`h3` rules |
| 2 | **Cut four fonts to two.** Keep Spectral for long-form prose; use the system UI stack for everything else; JetBrains Mono only for code and addresses. Drop Syne and Outfit. | Four families on one page reads as noise. Body chrome is Outfit at weight 300, which is thin on a dark ground. thezao.com uses the system stack. | `global.css` `@import` line, `html`, `h1-h6` |
| 3 | **Replace the hero.** Remove the three drifting blur blobs and the grid overlay; lead with one plain sentence, the next session time and live numbers. | The animated gradient mesh is the most generic part of the page and it is always moving. `site/src` has 1 `prefers-reduced-motion` rule, so check whether it covers the blobs. | `site/src/components/Hero.astro` |
| 4 | **Make the home page an invitation, then an index.** First screen: what the fractal is, when it meets (Mondays 6pm EST), and how to join. Docs grid second. | Today the page reads as a list of documents. | `site/src/pages/index.astro` |
| 5 | **Read numbers at build time, never type them.** The week counter is already computed (`site/src/lib/week.ts`); do the same for session and proposal counts from the ornode indexer that `dao/` already reads (`zao-ornode.frapps.xyz`). | Every typed number on the page has gone stale (list below). A build-time read needs no change to the CSP, whose `connect-src 'self'` in `vercel.json` would block a browser-side fetch. | `index.astro`, `Hero.astro`, new `site/src/lib/` helper |
| 6 | **Keep what already works.** Pagefind search, TOC, breadcrumbs, prev/next, copy buttons and share bar shipped from ZAOOS doc `research/infrastructure/741-21st-dev-ui-ux-zaofractal-improvements`. | The reading pages are not the problem; the front door is. | no change |

## Palette: which gold

Two ZAO palettes exist and they disagree on the gold:

| Source | Ground | Gold | Text |
|---|---|---|---|
| thezao.com, `bettercallzaal/zao-website` `app/globals.css` | `#03182f` | `#f5c518` | `#eaf0f8` |
| ZAO OS, `bettercallzaal/ZAOOS` `DESIGN.md` | `#0a1628` | `#f5a623` | `#ededed` |
| this site today | `#0F0E16` (plum) | `#D4A23A` plus orange, cyan, magenta | `#F0EDE6` |

**Default: thezao.com's tokens**, since this is its subdomain. Borrow one rule from ZAOOS `DESIGN.md`: "gold means action" (gold only on links, buttons and active states, never on headings) and depth by background lightness rather than shadows. Zaal can pick ZAOOS's gold instead; it is a one-line change.

## Stale copy on the home page (fix in the first PR)

Read on main at `de8ee5f`.

| Where | Says | Problem |
|---|---|---|
| `index.astro:93` | Discord bot `fractalbotmarch2026` (52 slash commands, v2.1) | That repo is archived. Which bot runs Monday sessions now is not stated here; needs Zaal's word before the line is rewritten. |
| `index.astro:99`, `Hero.astro:43` | 242+ OREC transactions, "as of May 21, 2026" | Five months old. Replace with a build-time count (item 5). |
| `Hero.astro:44` | ~40 active members | The whitepaper's own 2026-09-02 measurement correction gives a median of 7, a mean of 8 and a max of 17 people receiving Respect per session. Pick one defined number and say what it counts. |
| `Hero.astro` title and stat | "100+ weeks unbroken", "100+ weekly sessions" | The next session is Fractal 122. Use the computed week. |
| `index.astro:46` | "Chapters 1-3 in v0.1 draft. Chapters 4-11 still to come." | `whitepaper/draft/` holds ch00 to ch11, all twelve drafted. |
| `index.astro:105-107` | "Push to `main` and the site rebuilds." | The old Vercel project had no Git connection, so this was not happening. The new project shows a Vercel check on PRs (#35). Keep the line, but confirm a merge to main actually deploys. |

## What the repo survey found

Method: GitHub reads of every non-archived repo under `bettercallzaal` and `ZAODEVZ` whose main language is a web language (131 repos), pulling root `package.json`, the main CSS file, the Tailwind config and the Next.js root layout. **86 of 131 were scanned** before the session ended; the other 45 were not checked.

- **Stack:** `tailwindcss` in 30 of 86, `next` in 32, shadcn (`components.json`) in 5. Not a reason to move this Astro site to Tailwind: the site is plain CSS in one 417-line file, and a token swap is cheaper than a rewrite.
- **Fonts:** Inter is the most common family found (16 of 86). The scan's font reading is partial: it read one or two CSS files per repo and did not even record this site's own Syne import, so font counts are a floor, not a census.
- **Written design systems:** `bettercallzaal/ZAOOS` `DESIGN.md` (the fullest), `bettercallzaal/orca` `docs/STYLEGUIDE.md`, `bettercallzaal/sparkz` `docs/BRAND.md`, `bettercallzaal/zao-media` `docs/brand-kit.md`, `bettercallzaal/zao-floor` `src/renderer/src/design/tokens.css` (a tokens-file pattern worth copying: one CSS file of variables, imported once).
- **A third fractal look:** the dashboard in `bettercallzaal/zao-fractal-bot` `web/` uses a light theme (`#f6f5f8`, purple `#6b3fd4`) with Bricolage Grotesque and IBM Plex. Two fractal surfaces with two unrelated looks; align both to the ZAO tokens rather than adopt either.

## Order of PRs

1. Stale copy (table above). Text only, small, ships first.
2. Tokens and fonts (items 1-2). One file, `global.css`.
3. Hero and home layout (items 3-4).
4. Build-time numbers (item 5).

Each lands on the Vercel preview first. #35 (canonical domain) should merge before any of these.

## Open for Zaal

1. What looks terrible to you: the colors, the type, the hero, the layout, or all of it? Default: all four, in the order above.
2. thezao.com gold or ZAO OS gold? Default: thezao.com.
3. Which bot runs Monday sessions now, for the home page line?
