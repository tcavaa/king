# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Vite dev server (default http://localhost:5173)
npm run build    # production build to dist/
npm run preview  # serve the production build locally
npm run lint     # ESLint over the repo
```

There is **no test framework** wired up — no `npm test`, no test files. Verify changes by running the app. ESLint flags unused vars as errors but ignores names matching `^[A-Z_]` (so unused imported components/constants are allowed).

## Environment

Two `VITE_`-prefixed env vars are required for the Supabase client (`src/lib/supabase.js`) to work at runtime; they live in `.env` (gitignored):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Without them the app still loads the live-game UI, but anything touching Supabase (history, players, seasons, saving completed games) fails. Deployment is Netlify (`netlify.toml`): builds `dist/`, SPA-redirects all routes to `index.html`.

## What this app is

A score tracker for "King" — a multi-round card game for 3 or 4 players. Each player must play each of the **nine game types exactly once**, so a game is exactly `players.length × 9` rounds (27 or 36). Highest cumulative score wins. The README has the full scoring rules but is otherwise partly stale (it predates Supabase, the online API, achievements, seasons, and analytics).

## Architecture

### `GAME_TYPES` is the single source of truth (`src/constants/gameTypes.js`)

Every game type is a data object with a `kind` that drives all scoring, validation, and UI:

- **`kind: 'count'`** — players collectively distribute exactly `totalUnits` (e.g. 4 Queens, 8 Hearts, 10 tricks); each unit is worth `pointsPerUnit`. Score = `units × pointsPerUnit` per player.
- **`kind: 'single'`** — one player "takes it" (`singleTargetPlayerId`); that player gets `points`, everyone else 0. Only `K` (King of hearts, −40) uses this.

The three `P1/P2/P3` codes are the three positive "Plus" rounds (+8/trick). Adding or changing a game type ripples through scoring, the selector's validation, the matrix, analytics, and achievements — change it in the constant, not in consumers.

### App state lives in `App.jsx` and nowhere else

`App.jsx` is the hub for the **active game**. State is a `useReducer` over `{ players, activePlayerIndex, rounds }`:

- Actions: `START`, `END_ROUND` (appends a round, rotates leader), `EDIT_LAST`, `UNDO_LAST`, `RESET`, `HYDRATE`.
- The whole state is persisted to `localStorage['king-score-state']` on every change and hydrated on mount (with a guard that drops legacy `p1`/`p2`-style player ids).
- `usedTypesByPlayer` and `targetRoundsCount` are derived with `useMemo` — a player can't pick a type twice, and the game is "finished" once `rounds.length >= players.length × 9`.

**A round record** (the shape stored in `rounds` and persisted to the DB) is:
```js
{ gameTypeCode, leaderPlayerId, countsByPlayerId, singleTargetPlayerId, scores }
```
`scores` is `{ [playerId]: number }`, precomputed by `computeScoresForRound` (`src/utils/scoring.js`). Totals are always derived by summing `round.scores` across rounds — they are never stored as a running total. If you add fields to a round, update `EDIT_LAST` in `App.jsx` and the achievement/analytics readers that destructure rounds.

### Two separate backends — don't conflate them

1. **Supabase** (`src/lib/supabase.js`) — the primary store, accessed through hooks in `src/hooks/`:
   - `game_results` (winner_name, participants, played_at) + `game_details` (full players + rounds JSON) — written together when a game completes (`saveGameToDB` in `App.jsx`), read by `useGameResults` / `useAllGameDetails`. **Ties:** every top scorer wins; tied winners are stored in `winner_name` joined with `' & '` ("A & B"). NEVER compare `winner_name === name` directly — use the helpers in `src/utils/winners.js` (`isWinnerOf`, `winnerNamesOf`, `isOnlineWinner`, `isChampionName`), which all readers (analytics, achievements, champion badges, season champion computation) go through.
   - `players` (`usePlayers`) — the roster, with an `online_name` mapping.
   - `seasons` (`useSeasons`) — completed seasons have `ended_at` set; the CURRENT season is the single row with `ended_at IS NULL` and carries the user-chosen `name` + `theme` (casual/summer/mountain/christmas — see `src/utils/themes.js`; requires `supabase-migration.sql`). "End Season" (History → PIN → `SeasonEndModal`) closes the current row with the computed champion (co-champions joined `' & '` on tied win counts) and opens the next named row. `currentChampion` = most recent completed season's champion, used to badge players in the UI. The season's theme is applied app-wide as a `theme-*` class on `<body>`.
2. **A remote REST API** at `https://king.rretrocar.ge/api/public` (`src/hooks/useOnlineData.js`) — a *different* system's leaderboard/games, surfaced read-only in the History view's online tabs. Unrelated to Supabase. The API returns **championship games only** by default (King Online tags each game `championship` or `public`); seasonal wins/analytics therefore never count casual online games. Game objects carry a `winners` array (ties) beside the legacy single `winner`.

### Achievements & analytics are computed client-side, not stored

`src/utils/achievements.js` recomputes everything from raw game data on the fly:
- `computePerGameAchievements(players, rounds)` — per-game badges (Perfect Plus, Untouchable, Underdog, etc.) derived by replaying the rounds.
- `computeAllLifetimeAchievements(allGameDetails, allResults)` — aggregates across all games for milestone/streak badges, keyed by **player name** (not id, since ids are per-game).

Because these replay round data, they depend on the round-record shape above and on `GAME_TYPES`. `src/utils/analytics.js` similarly derives per-type unit/score breakdowns. The score chart and analytics use `recharts`; the winner moment uses `canvas-confetti` and sound effects (`src/utils/sounds.js`, gated on a localStorage sound toggle).

### Game clock & theme scenery

The reducer state carries `startedAt`/`endedAt` (ms epochs, persisted in the localStorage snapshot): START stamps `startedAt`, entering the final round stamps `endedAt`, UNDO of the final round clears it. `GameTimer` renders a fixed pill (top-right) whenever a game exists and freezes on the final duration; `saveGameToDB` writes `game_results.duration_seconds` (needs `supabase-migration.sql`; falls back to saving without it). Durations surface on the finish screen, history cards and game details via `formatDuration` (`src/utils/time.js`).

`ThemeDecorations` (rendered once in App) draws fixed, pointer-events-none scenery per theme: summer = sky/sea/waves + a sun that rides `--scroll-p` (scroll progress set by a rAF scroll listener) down into the sea; mountain = 3 parallax ridges + drifting fog + CSS birds; christmas = falling snow (z 940, above content) plus CSS snow caps on `.card`/`.bottom-nav` tops. Background scenes use `z-index: -1` inside `.app`'s stacking context — do NOT raise it to 0, positioned z:0 paints over static siblings' backgrounds.

### View routing

No router. `App.jsx` keeps a `view` string (`'home' | 'history' | 'stats' | 'more' | 'players'`) in `useState`; a fixed `BottomNav` (Score/History/Stats/More) drives it, plus circular quick-action chips on the Score tab. `'home'` itself switches between player setup, live game, and the finished-game screen based on whether `players` exists and `gameFinished`. `'stats'` renders `StatsPage` (season-filtered Global Analytics), `'more'` renders `MorePage` (players entry, sound/dark toggles, season rename/theme, reset). A `SeasonBanner` under the header always shows the current season's name/theme + reigning champion. Player colors are a shared constant `PLAYER_COLORS` exported from `App.jsx`. Dark mode toggles a `dark` class on `<body>` (persists to localStorage) and stacks with the season `theme-*` class.

## Conventions

- React 19, functional components + hooks only. Plain CSS (`src/styles/main.css`, `src/index.css`) — no Tailwind, no component library.
- Data fetching is always a custom hook in `src/hooks/` wrapping the Supabase client; components don't call `supabase` directly (except `App.jsx`'s save path).
- Player `id`s are only stable within a single game. For anything cross-game (history, achievements, leaderboards), key by player **name**.
