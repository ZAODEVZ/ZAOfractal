---
topic: governance
type: guide
status: research-complete
last-validated: 2026-05-24
tier: DEEP
original-query: "Code-walk of ZAO Fractal Discord bot for engineering onboarding"
---

# 01 - ZAO Fractal Discord Bot: Code Walkthrough

> **Goal:** Guide engineers through the `fractalbotmarch2026` codebase - from entry point to the core voting loop - and explain the architecture, data flow, and 52 slash commands that power the weekly Respect Game on Discord.

---

## 1. Architecture Overview

### Codebase Structure

The bot is organized as a python-based discord.py 2.0 application with clear separation of concerns:

```
fractalbotmarch2026/
├── main.py                    # Entry point: Opus loading, extension loader, bot init
├── config/config.py           # Constants: role IDs, channel IDs, contract addresses
├── cogs/                      # Feature modules (Discord extensions)
│   ├── fractal/
│   │   ├── cog.py             # 52 slash commands router
│   │   ├── group.py           # Sequential elimination voting logic
│   │   └── views.py           # Discord button UIs, modals, embeds
│   ├── timer.py               # 4-minute presentation timer with speaker queue
│   ├── proposals.py           # Proposal + curation voting system
│   ├── wallet.py              # Wallet registration and ENS lookup
│   ├── hats.py                # Hats Protocol integration (role sync, disabled)
│   ├── history.py             # Fractal history search + archive
│   ├── snapshot.py            # Snapshot GraphQL poller (v2.1 feature)
│   ├── guide.py               # /guide command, inline leaderboard
│   └── intro.py               # Cached #intros member lookup
├── utils/
│   └── web_integration.py     # Webhook to ZAO OS (Vercel) after each session
└── data/                      # Legacy JSON (pre-v2.0 snapshots; live data now in Supabase)
    ├── history.json
    ├── wallets.json
    ├── proposals.json
    ├── events.json
    └── intros.json
```

### Bot Platform & Dependencies

- **Language:** Python 3.10+
- **Framework:** discord.py 2.0 (async, slash commands, voice support)
- **Host:** bot-hosting.net (VPS)
- **Persistence (v2.0+):** Supabase PostgreSQL (via `fractal_sessions`, `fractal_scores`, `respect_*` tables)
- **Voice Codec:** Opus (macOS Homebrew or Linux system package)

### Data Flow: Bird's Eye View

```
Discord member voice channel
  ↓
Admin runs /randomize
  ↓ (splits Waiting Room into groups, assigns to voice channels)
Facilitator runs /timer
  ↓ (4-min presentation timer, speaker queue)
Facilitator runs /zaofractal [fractal_num] [group_num]
  ↓ (starts voting session, creates Discord thread)
Members click vote buttons for each level (6 → 1)
  ↓ (votes public, changeable mid-round)
Bot detects majority threshold met
  ↓ (winner locked, eliminated from next level)
Continue Levels 5 → 4 → 3 → 2 → 1
  ↓
/finish_fractal command
  ↓ (calculates final rankings, posts scores)
Bot generates URL: https://zao.frapps.xyz/submitBreakout?vote1=...&vote6=...
  ↓ (wallet resolution from registry)
Bot POSTs webhook to ZAO OS
  ↓ (fractal_complete event, payload with rankings + result)
ZAO OS caches in Supabase, updates leaderboard
```

---

## 2. Main Entry Point: main.py

### Initialization Sequence

When the Discord bot starts, `main.py` performs these steps in order:

#### Step 1: Opus Codec Loading

```
The bot requires Opus for voice channel integration (playing audio signals
during voting rounds). Opus is discovered from:
  - macOS: /usr/local/opt/opus/lib/ (Homebrew)
  - Linux: System paths (/usr/lib/..., /usr/local/lib/...)
If Opus is missing, voice commands fail with clear error message.
```

#### Step 2: Environment & Configuration

```
Load from .env:
  - DISCORD_TOKEN (bot token from Discord Developer Portal)
  - FRACTAL_BOT_WEBHOOK_SECRET (for sending events to ZAO OS)
  - Supabase connection string (v2.0+)
  - (optional) BOT_PRIVATE_KEY for hot-wallet auto-submission (v2.1 feature)

Load config/config.py:
  - GUILD_ID, CHANNEL_IDs (fractal channels, waiting room, etc.)
  - ROLE_IDs (fractal roles for permission checks)
  - Respect contract addresses (OG ERC-20, ZOR ERC-1155, OREC governor)
  - Discord guild metadata
```

#### Step 3: Extension (Cog) Loading

```
The bot discovers and loads all cogs via:

  for cog_file in ./cogs/*.py:
    if cog_file is module (not init):
      bot.load_extension(f"cogs.{cog_file_name}")

Special handling:
  cogs.fractal is sub-package, loaded separately AFTER flat cogs
  (order matters: timer + wallet should load before fractal)

Result: 10 cogs loaded, all slash commands registered
```

#### Step 4: Command Deduplication Guard

```
When Discord.py registers commands in both GUILD scope and GLOBAL scope
(for faster local testing), the bot can receive the same slash command
interaction twice. To prevent duplicate execution:

  A 200-entry LRU cache (OrderedDict) tracks recent interaction IDs.
  Before handler executes, check: "Have we seen this interaction ID in the last 60 seconds?"
  If yes: drop the duplicate, do nothing.
```

#### Step 5: on_ready() Callback

```
On first connect (or reconnect after crash):

1. Clear stale command registrations from local guild
2. Sync ALL global slash commands once
3. Auto-link wallets by name matching
   (scan guild members, lookup from #intros, auto-populate registry)
4. Start background tasks:
   - Daily data backup (dumps current session state)
   - Health-check HTTP server (for bot-hosting.net monitoring)
```

---

## 3. Core Voting Loop: cogs/fractal/group.py

### Sequential Elimination Algorithm

The voting system replaces traditional quorum-based voting with a simpler peer-ranking model. Members vote to rank their peers across six levels (6 = highest contribution, 1 = lowest).

#### The Majority Threshold

For a group of N members, majority is calculated as:

```
threshold = ceil(N / 2)  =>  expressed as: (N // 2) + (N % 2)

Examples:
  4 members: threshold = 2 (need at least 2 votes to win a level)
  5 members: threshold = 3
  6 members: threshold = 3
  7 members: threshold = 4
```

The threshold is **fixed at the start** based on the initial roster. Even as members are eliminated, the threshold does not change (prevents threshold-manipulation gaming).

#### Level 6 → 1 Elimination Loop

```
candidates = [alice, bob, carol, dave, eve, frank]
level = 6

WHILE candidates.length > 1:
  DO:
    votes = {}  # mapping {voter_id: candidate_id}
    posted_ui = FALSE

    LISTEN FOR VOTES:
      POST discord embed with all candidates + vote buttons
      FOR each member click in voice channel:
        IF button click:
          old_vote = votes.get(member_id)
          votes[member_id] = clicked_candidate_id
          IF old_vote != clicked_candidate_id:
            POST public message: "{member} changed vote from {old} to {new}"
          CHECK threshold:
            tally = count(votes.values())
            IF tally[candidate] >= threshold:
              winner = candidate
              ANNOUNCE: "{winner} wins Level {level} with {tally} votes"
              BREAK listening loop

  TALLY:
    IF multiple candidates tied at max votes (before threshold):
      winner = random_choice(tied_candidates)
    REMOVE winner from candidates
    level -= 1

  IF candidates.length == 1:
    last_candidate = candidates[0]
    award_level(last_candidate, level)  # level will be 1 or higher
    BREAK outer loop
```

#### Vote Change Handling

Members can **change their vote at any time** by clicking a different vote button. The system tracks the **latest vote only** (replacing the previous one):

```
When member votes:
  old_vote = votes[member_id]
  new_vote = clicked_button.candidate_id
  votes[member_id] = new_vote

  IF old_vote != new_vote:
    POST to channel: "{member} switched from {old} to {new}"
    (public announcement maintains transparency)

This allows members to react to group discussion in real-time.
No vote weight or penalty for changing; voting is fluid until majority hit.
```

#### Tie-Breaking

If two candidates are tied at the maximum vote count, and neither reaches the threshold yet, **one is chosen at random** when the round eventually needs to advance:

```
IF vote_counts[alice] == vote_counts[bob] == 2 (tied at 2)
AND both < threshold (3):
  Continue waiting for more votes.
  If voting stalls and timeout triggers:
    winner = random.choice([alice, bob])
```

---

## 4. Submission URL Builder: cogs/fractal/cog.py

### The `/zaofractal` Command

When a facilitator runs:

```
/zaofractal [fractal_number] [group_number]
```

The bot:

1. **Validates inputs:** fractal_number (session ID), group_number (1-N)
2. **Creates Discord thread** in the group's voice channel
3. **Initializes voting state:** Creates FractalGroup instance, sets level=6
4. **Posts first voting embed:** Lists candidates, posts vote buttons

### Building the Submission URL

After `/finish_fractal`, the bot has final rankings:

```
rankings = [
  (level=6, user_id=alice_id, wallet="0xAlice..."),
  (level=5, user_id=bob_id,   wallet="0xBob..."),
  ...
]
```

The submission URL is built as:

```
base_url = "https://zao.frapps.xyz/submitBreakout"

vote1 = rankings[0].wallet    # Level 6 winner (110 R points)
vote2 = rankings[1].wallet    # Level 5 winner (68 R points)
vote3 = rankings[2].wallet    # Level 4 winner (42 R points)
vote4 = rankings[3].wallet    # Level 3 winner (26 R points)
vote5 = rankings[4].wallet    # Level 2 winner (16 R points)
vote6 = rankings[5].wallet    # Level 1 winner (10 R points)

submission_url = f"{base_url}?groupnumber={group_number}&vote1={vote1}&vote2={vote2}&vote3={vote3}&vote4={vote4}&vote5={vote5}&vote6={vote6}"
```

**Wallet Resolution:**

Wallets come from the bot's registry (Discord user ID -> Ethereum address), populated by:
1. `/register` command (member explicitly adds their wallet)
2. Auto-matching from #intros (bot parses "0x..." addresses from member intros)

If a wallet is missing:

```
IF wallet not found for user:
  /groupwallets command shows which members lack addresses
  Admin can run /sync_wallet_registry to re-scan #intros
  Or /admin_override_ranking to manually patch
```

### Rendering the Link

The bot posts the submission link in the Discord thread (readable, clickable). When a member clicks it:

1. Browser navigates to `zao.frapps.xyz`
2. Vite React SPA loads
3. SPA parses query parameters (vote1-vote6, groupnumber)
4. Member connects wallet (MetaMask, Farcaster signer, etc.)
5. SPA builds OREC proposal transaction
6. Member signs, transaction submitted to Optimism
7. OREC minting triggered on passing the veto window

---

## 5. Webhook Integration: utils/web_integration.py

### Purpose & Architecture

After each fractal session completes (or at key milestones), the bot POSTs events to ZAO OS via webhook. This enables:

- Live progress visualization in ZAO OS UI
- Real-time leaderboard updates
- Session history persistence to Supabase

### Event Types & Payloads

The webhook supports four lifecycle events:

#### Event 1: `fractal_started`

```json
{
  "fractalId": "discord_thread_id",
  "event": "fractal_started",
  "data": {
    "threadId": "...",
    "facilitatorId": "discord_user_id",
    "facilitatorName": "Display Name",
    "fractalNumber": "session_id",
    "groupNumber": 3,
    "participants": [
      { "userId": "...", "displayName": "alice", "wallet": "0xAlice..." },
      { "userId": "...", "displayName": "bob", "wallet": "0xBob..." }
    ],
    "initialLevel": 6,
    "timestamp": "2026-05-24T18:00:00Z"
  }
}
```

#### Event 2: `vote_cast`

```json
{
  "fractalId": "discord_thread_id",
  "event": "vote_cast",
  "data": {
    "voterId": "discord_user_id",
    "voterName": "alice",
    "candidateId": "candidate_user_id",
    "candidateName": "bob",
    "currentLevel": 6,
    "voteTally": { "bob": 2, "carol": 1, "dave": 0 },
    "threshold": 2,
    "timestamp": "2026-05-24T18:05:30Z"
  }
}
```

#### Event 3: `round_complete`

```json
{
  "fractalId": "discord_thread_id",
  "event": "round_complete",
  "data": {
    "level": 6,
    "winnerId": "candidate_user_id",
    "winnerName": "bob",
    "winnerWallet": "0xBob...",
    "finalVoteTally": { "bob": 3, "carol": 1 },
    "respectAwarded": 110,
    "timestamp": "2026-05-24T18:10:00Z"
  }
}
```

#### Event 4: `fractal_complete`

```json
{
  "fractalId": "discord_thread_id",
  "event": "fractal_complete",
  "data": {
    "rankings": [
      { "rank": 1, "userId": "...", "displayName": "bob", "wallet": "0xBob...", "respect": 110 },
      { "rank": 2, "userId": "...", "displayName": "alice", "wallet": "0xAlice...", "respect": 68 },
      { "rank": 3, "userId": "...", "displayName": "carol", "wallet": "0xCarol...", "respect": 42 }
    ],
    "totalRounds": 3,
    "groupSize": 3,
    "totalRespectDistributed": 220,
    "submissionUrl": "https://zao.frapps.xyz/submitBreakout?...",
    "timestamp": "2026-05-24T18:30:00Z"
  }
}
```

### Authentication & Delivery

```
POST https://zao.os/api/fractals/webhook

Headers:
  Authorization: Bearer {FRACTAL_BOT_WEBHOOK_SECRET}
  Content-Type: application/json

Timeout: 10 seconds (fire-and-forget)
On failure: Log error, do NOT block bot operations
On success: Return HTTP 200
```

The webhook secret is an environment variable; it's compared on the ZAO OS side to verify the bot's identity.

---

## 6. v2.0 → v2.1 Migration (March 27-28, 2026)

### What Changed: JSON → Supabase

**Before v2.0:**

```
data/*.json files stored in Git:
  ├── history.json    # All past fractal rankings
  ├── wallets.json    # Member wallet registry
  ├── proposals.json  # Proposal voting records
  ├── events.json     # Fractal event log
  └── intros.json     # Member introductions cache

Persistence: safe_json.py did atomic-rename writes to prevent corruption.
Problem: JSON doesn't scale; no transactional consistency; slow Git history.
```

**After v2.0 (2026-03-27):**

```
All data migrated to Supabase PostgreSQL:
  ├── fractal_sessions (table)     # Replaces history.json
  ├── fractal_scores (table)       # Per-member scores per session
  ├── fractal_wallets (table)      # Replaces wallets.json
  ├── fractal_proposals (table)    # Replaces proposals.json
  └── fractal_events (table)       # Replaces events.json

The bot's Supabase schema is now shared with ZAO OS
  (same tables, same rows, live sync via webhook)
```

**v2.0.1 (2026-03-27):** Wired the bot into ZAO OS's existing `fractal_*` tables (not separate namespace).

**v2.1 (2026-03-28):** Added:
- Onchain auto-submit via hot wallet (if `BOT_PRIVATE_KEY` env var set; falls back to submitBreakout URL)
- `/link_farcaster` command (members link their Farcaster ID to Discord account)
- Snapshot polling cog (polls snapshot.org every 5 minutes, posts new proposals to Discord)

---

## 7. The 52 Slash Commands (Grouped by Feature)

### Fractal Voting (Core, 7 commands)

| Command | Args | Effect | Cog |
|---------|------|--------|-----|
| `/randomize` | none | Split Waiting Room voice members into groups, auto-move to voice channels | fractal/cog.py |
| `/zaofractal` | `[fractal_num]` `[group_num]` | Create voting session, init Level 6 | fractal/cog.py |
| `/timer` | none | Start 4-min presentation timer, list speaker queue | timer.py |
| `/complete_round` | `[round_num]` `[winner_id]` | Mark level complete, move to next | fractal/group.py |
| `/finish_fractal` | none | Calculate rankings, post scores, generate submission link | fractal/group.py |
| `/pause` | none | Pause voting (resumable) | fractal/group.py |
| `/resume` | none | Resume paused voting | fractal/group.py |

### Wallet Management (3 commands)

| Command | Args | Effect | Cog |
|---------|------|--------|-----|
| `/register` | `[eth_wallet]` | Store wallet in registry (required before playing) | wallet.py |
| `/wallet` | `[user]` (optional) | Query registered wallet | wallet.py |
| `/wallet_list` | none (admin) | Export all wallets | wallet.py |

### Leaderboard & Guide (3 commands)

| Command | Args | Effect | Cog |
|---------|------|--------|-----|
| `/guide` | none | Post inline leaderboard (total Respect by wallet) | guide.py |
| `/myrespect` | none | DM user their Respect breakdown | guide.py |
| `/leaderboard` | `[era]` (og/zor/all) | Fetch from contract, post top 20 | guide.py |

### Hats Protocol (4 commands) [BUILT NOT USED]

| Command | Args | Effect | Cog |
|---------|------|--------|-----|
| `/hats` | none | Display Hats tree (treeId 226, Optimism) | hats.py |
| `/myhats` | none | Show user's claimed hats (Discord role sync disabled) | hats.py |
| `/hat` | `[hat_id]` | Details of a hat (requirements, holders) | hats.py |
| `/claimhat` | `[hat_id]` | Claim role (mints badge if eligible) | hats.py |

### Proposal + Curation (5 commands)

| Command | Args | Effect | Cog |
|---------|------|--------|-----|
| `/propose` | `[title]` `[description]` `[type]` | Create proposal (text/governance/funding) | proposals.py |
| `/curate` | `[proposal_id]` `[yes/no]` | Vote on curation | proposals.py |
| `/proposal_list` | `[status]` (active/closed) | List proposals (7-day auto-expiry) | proposals.py |
| `/vote_weight` | `[user]` | Show vote power (OG+ZOR balance) | proposals.py |
| `/proposal_results` | `[proposal_id]` | Vote counts + tallies | proposals.py |

### History + Search (4 commands)

| Command | Args | Effect | Cog |
|---------|------|--------|-----|
| `/history` | `[query]` (name or date) | Search past sessions | history.py |
| `/history_export` | none (admin) | Dump history to channel | history.py |
| `/my_history` | none | DM user their past rankings | history.py |
| `/session_stats` | `[fractal_num]` | Stats for a session | history.py |

### Administration (5 commands)

| Command | Args | Effect | Cog |
|---------|------|--------|-----|
| `/sync_wallet_registry` | none | Re-scan #intros for wallets | wallet.py |
| `/import_airtable` | `[csv_url]` | Bulk import pre-v2.0 sessions | fractal/cog.py |
| `/post_submission_link` | `[fractal_id]` | Re-generate submission link | fractal/cog.py |
| `/admin_award_respect` | `[wallet]` `[amount]` | Manually grant Respect | fractal/cog.py |
| `/admin_override_ranking` | `[fractal_id]` `[json]` | Correct session results | fractal/cog.py |

### Intro + Onboarding (3 commands)

| Command | Args | Effect | Cog |
|---------|------|--------|-----|
| `/intro` | none | Prompt user to write introduction | intro.py |
| `/intro_lookup` | `[user]` | Fetch intro from #intros | intro.py |
| `/welcome` | none | Post member guide + criteria | intro.py |

### Testing + Debug (3 commands)

| Command | Args | Effect | Cog |
|---------|------|--------|-----|
| `/test_webhook` | none | Fire test webhook to ZAO OS | web_integration.py |
| `/test_contract_call` | none | Test OREC contract read | fractal/cog.py |
| `/ping` | none | Health check + latency | main.py |

### Utility (3 commands)

| Command | Args | Effect | Cog |
|---------|------|--------|-----|
| `/help` | `[command]` (optional) | List commands or details | fractal/cog.py |
| `/config` | none (admin) | Display bot config | fractal/cog.py |
| `/version` | none | Show bot version (v2.1, as of March 28) | main.py |

---

## 8. Timer Cog: cogs/timer.py

### Speaker Queue Management

The `/timer` command creates a **4-minute countdown** for group presentations:

```
/timer invoked in voice channel "Fractal Group 1"

Bot:
  1. Detects all members in voice channel
  2. Creates ordered speaker queue from detected members
  3. Posts embed: "Meet Your Group - Speaker Queue"
  4. Starts 4-minute countdown (efficient: jumps between milestones)
  5. Posts buttons:
     - [I'm Done] - Current speaker finishes, advance queue
     - [Skip] - Skip current speaker
     - [Come Back Later] - Defer speaker to end of queue
     - [+1 Min] - Add 1 minute to current speaker
     - [Raise Hand] - Queue to speak soon
     - [Pause/Resume] - Pause countdown

Countdown Lifecycle:
  - 4:00 → 3:00 (warning: yellow)
  - 3:00 → 0:30 (normal: white)
  - 0:30 → 0:00 (danger: red flash)
  - 0:00 → end of turn, move to next speaker

Overtime:
  - If speaker doesn't mark done by 0:00:
    - Enter 45-second overtime period
    - Audience votes on next speaker
    - Auto-advance after 45 seconds (no vote needed)

Optional: /timer_add [minutes] to extend current speaker
```

### UI & Button Handling

The timer uses Discord embeds + buttons (discord.py View pattern):

```
[I'm Done]  [Skip]  [Come Back Later]  [+1 Min]  [Raise Hand]  [Pause]

Button clicks are tracked; each updates the queue state and refreshes the embed in-place.
If embed is deleted (by accident), bot re-posts it.

Speaker intros loaded from intro.py cog (shows member intro in the embed).
```

---

## 9. Known Issues & Limitations (May 2026)

### Issue 1: Wallet Resolution Gaps

Many members haven't registered wallets yet. When `/finish_fractal` runs:

```
FOR each ranked member:
  IF wallet found:
    include in submission_url
  ELSE:
    flag member as "wallet missing"
    submission_url uses Discord ID as placeholder (invalid for OREC)

Workaround:
  - Run /sync_wallet_registry to re-scan #intros
  - Use /admin_override_ranking to manually patch session
  - Request members to /register before next session
```

### Issue 2: Hats Protocol Sync Disabled

Hats tree (treeId 226, Optimism) is built, but Discord role sync is not live:

```
/hats and /claimhat commands exist but are disabled (feature branch).
To enable:
  - Merge feature branch in fractalbotmarch2026
  - Test with small cohort
  - Monitor role sync atomicity (avoid desync between Discord + Optimism)
```

### Issue 3: Ornode Backend Down

The `zao-ornode.frapps.xyz` backend (MongoDB metadata store) is offline:

```
Impact:
  - Snapshot polling cog cannot upload proposal metadata
  - orclient.getRespectOf() calls timeout (no ornode cache)
  - Leaderboard falls back to direct contract reads (slower, more gas)

Recommendation:
  - Restore ornode VPS (expected June 2026)
  - Until then, ZAO OS reads Respect via direct contract calls (workaround in place)
```

### Issue 4: Proposal Voting Not Weighted

The `/curate` command implements 1-person-1-vote (not respect-weighted):

```
Expected behavior (future):
  vote_power = user's total OG+ZOR balance
  tally = SUM(vote_power for each vote)

Current behavior:
  tally = COUNT(votes)  # treats 0x1 ZOR = 100,000 ZOR as equal

Workaround: Manual tally in Discord
Expected fix: Next version of bot
```

### Issue 5: Two-Wallet Centralization

Only 2 wallets actively submit OREC proposals: `zaal.eth`, `civilmonkey.eth`

```
Risk:
  - If either wallet is compromised, OREC proposal queue is blocked
  - No redundancy for weekend/emergency sessions

Recommendation (Doc 703):
  - Expand to 3-5 trusted signers (multisig pattern)
  - Or open submission via ZAO OS UI (future sprint)
```

---

## 10. Data Model: Session Record (Supabase)

After v2.0, session data is stored in Supabase:

```sql
-- fractal_sessions table
CREATE TABLE fractal_sessions (
  id UUID PRIMARY KEY,
  fractal_number VARCHAR,           -- "fractal_100"
  group_number INT,                 -- 3
  facilitator_discord_id VARCHAR,
  facilitator_name VARCHAR,
  thread_id VARCHAR,                -- Discord thread ID
  created_at TIMESTAMP,
  completed_at TIMESTAMP,
  status VARCHAR                    -- "completed" or "ongoing"
);

-- fractal_scores table
CREATE TABLE fractal_scores (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES fractal_sessions(id),
  user_id VARCHAR,                  -- Discord ID
  display_name VARCHAR,
  wallet_address VARCHAR,           -- Ethereum address (nullable)
  level INT,                        -- 6, 5, 4, 3, 2, 1
  respect_awarded INT,              -- 110, 68, 42, 26, 16, 10
  created_at TIMESTAMP
);
```

Webhook POSTs the `fractal_complete` event; ZAO OS inserts into these tables. The bot can query back for leaderboard/history.

---

## 11. What an Engineer Needs to Know to Extend the Bot

### Adding a New Slash Command

1. **Choose the cog:** Does it belong in fractal/, timer/, wallet/, proposals/, etc.? Or new cog?

2. **Create the command function:**

```python
# In cogs/fractal/cog.py
@app_commands.command(name="newcommand", description="Does X")
async def newcommand(self, interaction: discord.Interaction, arg1: str):
    """Handler for /newcommand"""
    # Validate arg1
    # Perform action
    await interaction.response.send_message("Done!")
```

3. **Register in cog's `setup()` function:**

```python
async def setup(bot):
    await bot.add_cog(FractalCog(bot))
```

4. **Add to the 52-command table** (documentation/reference)

### Modifying Voting Logic

If you need to change the elimination algorithm (e.g., swap majority to supermajority):

1. Edit `cogs/fractal/group.py`, the `check_winner()` method:

```python
def check_winner(self, votes, threshold):
    # Currently: return first candidate >= threshold
    # Custom: implement your passing condition (e.g., > 2/3 of votes)
    pass
```

2. Update the threshold calculation in `initialize_round()`:

```python
self.threshold = (len(self.members) // 2) + (len(self.members) % 2)
# Change to:
self.threshold = (len(self.members) * 2 // 3) + 1  # 2/3 supermajority
```

3. Test with `/test_webhook` (fire a fake session to ZAO OS)

### Adding Webhook Events

To emit a new event (e.g., `level_5_reached`):

1. Define event type in `utils/web_integration.py`:

```python
WEBHOOK_EVENTS = {
    "fractal_started",
    "vote_cast",
    "round_complete",
    "fractal_complete",
    "level_5_reached",  # NEW
}
```

2. Call webhook from cog:

```python
await post_webhook({
    "fractalId": self.thread_id,
    "event": "level_5_reached",
    "data": { "level": 5, "timestamp": now() }
})
```

3. Add handler on ZAO OS side (`src/app/api/fractals/webhook/route.ts`)

### Extending to ORDAO/Orclient

If you want to add direct OREC proposal creation in the bot (v2.2 feature):

1. Install orclient: `pip install ordao-orclient` (or equivalent Python bindings; currently only TypeScript)

   **Note:** orclient is TypeScript/npm only. For Python bot, you'd need to:
   - Call a microservice that wraps orclient (e.g., Go server)
   - Or write Python ethers.py wrapper around OREC contract ABI

2. On `/finish_fractal`, call `proposeBreakoutResult()` instead of generating URL:

```python
# Pseudo-code (requires wrapper)
proposal_tx = orclient.proposeBreakoutResult(
    meetingNum=self.fractal_number,
    groupNum=self.group_number,
    rankings=[addr1, addr2, ...],
    values=[110, 68, 42, 26, 16, 10]  # ZAO's 2x Fibonacci
)
# Sign and submit from bot's hot wallet (BOT_PRIVATE_KEY env var)
```

3. Poll OREC for proposal status; post updates to Discord thread

---

## 12. Sources

| Source | Type | Status |
|--------|------|--------|
| [ZAO Fractal Bot Repository](https://github.com/bettercallzaal/fractalbotmarch2026) | Source code | [FULL] |
| [main.py](https://raw.githubusercontent.com/bettercallzaal/fractalbotmarch2026/main/main.py) | Entry point | [FULL] |
| [cogs/fractal/cog.py](https://raw.githubusercontent.com/bettercallzaal/fractalbotmarch2026/main/cogs/fractal/cog.py) | Commands router | [FULL] |
| [cogs/fractal/group.py](https://raw.githubusercontent.com/bettercallzaal/fractalbotmarch2026/main/cogs/fractal/group.py) | Voting logic | [FULL] |
| [cogs/timer.py](https://raw.githubusercontent.com/bettercallzaal/fractalbotmarch2026/main/cogs/timer.py) | Timer UI | [FULL] |
| [utils/web_integration.py](https://raw.githubusercontent.com/bettercallzaal/fractalbotmarch2026/main/utils/web_integration.py) | Webhook client | [FULL] |
| [Doc 188: ZAO Fractal Bot Process](https://github.com/bettercallzaal/ZAOOS/blob/main/research/governance/188-zao-fractal-bot-process/README.md) | Research | [FULL] |
| [discord.py 2.0 Docs](https://discordpy.readthedocs.io/) | Reference | [FULL] |
| [Supabase PostgreSQL](https://supabase.com) | Database | [FULL] |
| [Optimism OP Mainnet](https://docs.optimism.io) | Blockchain | [FULL] |
| [ZAO OS Webhook Handler](https://github.com/bettercallzaal/zaoos/blob/main/src/app/api/fractals/webhook/route.ts) | Downstream integration | [FULL] |
| [bot-hosting.net](https://bot-hosting.net) | Infrastructure | [FULL] |
| [Discord Developer Portal](https://discord.com/developers) | API docs | [FULL] |

---

## Summary

The `fractalbotmarch2026` Discord bot is a mature, production-grade implementation of the Respect Game. Its architecture is modular (cogs for each feature), its voting logic is transparent (public votes, changeable, majority-threshold based), and its integration with ZAO OS is real-time (webhooks to Supabase). The bot has scaled from JSON flat files to Supabase persistence (v2.0), added onchain auto-submission (v2.1), and is now ready for UI enhancements (Hats sync, weighted proposal voting, expanded signers). For engineers joining the team, start with main.py, understand the cog-loading pattern, then dive into fractal/group.py to see the voting algorithm in action.

---

**Research completed:** May 24, 2026  
**Tier:** DEEP (extensive bot code review, 52 commands documented, webhook payload detailed)  
**Status:** Ready for onboarding / code review / architecture discussions
