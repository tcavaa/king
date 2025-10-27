# King Score App

A clean, modern React (Vite) application for tracking scores in a multi-round card game variant. Players choose from a set of game types each round, enter results, and the app calculates per-player scores, prevents duplicate type selections per player, and shows the overall winner.

## Features

- Player setup: 3 or 4 players with custom names
- Game flow: each round, the current player chooses one of the nine game types and inputs results
- Strict validations for each type (distribute exact totals, pick a single taker when needed)
- Per-player type availability matrix with visual markers (used ✕ / available •)
- Column-oriented score table by rounds, with totals row and winner banner
- Simple, responsive UI using plain CSS (no Tailwind, no UI libs)
- Fast dev experience via Vite

## Game Types and Scoring

- K (No King of hearts): −40 points to the player who took it (single unit)
- Q (No Queens): −10 per Queen; distribute exactly 4 Queens
- J (No Jacks): −10 per Jack; distribute exactly 4 Jacks
- <3 (No Hearts): −5 per Heart; distribute exactly 8 Hearts (7 through Ace)
- L2 (No Last 2): −20 per card; distribute exactly 2 last cards
- – (No Tricks): −4 per trick; distribute exactly 10 tricks
- + (Pluses) P1, P2, P3: +8 per trick; distribute exactly 10 tricks for each plus round

Rules:
- Each player must play each of the nine types exactly once
- A player cannot pick the same type twice; once used by that player it becomes unavailable
- After entering a round’s result, hit “End Round” to lock it in and rotate the leader to the next player
- Game ends after 27 rounds (3 players) or 36 rounds (4 players). Highest total wins

## Tech Stack

- React 18 (functional components + hooks)
- Vite 7
- Plain CSS with component-oriented styles (no Tailwind/Bootstrap)

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
# → open the Local URL printed by Vite (e.g. http://localhost:5173)

# Build for production
npm run build

# Preview the production build locally
npm run preview
```

## Project Structure

```
/src
  /components
    GameTypeSelector.jsx    # choose a type and enter values for the round
    GameTypeMatrix.jsx      # availability matrix per player and type
    PlayerInput.jsx         # player count + names
    ScoreTable.jsx          # column-oriented scores by round, totals row
  /styles
    main.css                # global theme and component styles
  App.jsx                   # app state + flow
  main.jsx                  # React root
index.html                  # Vite entry HTML
```

## Design

- Color palette inspired by a schedule poster: warm cream background with dark navy headers and strong grid lines
- Thick table borders; uppercase header bars; accessible contrast levels
- Responsive grids for inputs, matrix, and score table

## Implementation Notes

- App state is kept in `App.jsx` using `useState` and `useMemo`
- `usedTypesByPlayer` is derived from rounds to disable already-picked types for each player
- Inputs enforce exact distribution counts for types with totals (Hearts: 8, L2: 2, No Tricks: 10, Pluses: 10)

## Roadmap / Ideas

- LocalStorage persistence for in-progress games
- Export results as CSV/JSON
- Tooltips for type codes and rules
- Keyboard shortcuts and mobile-optimized inputs
- Undo last round

## Contributing

PRs and suggestions are welcome. Please keep the code style simple and readable.

## License

MIT
