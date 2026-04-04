# ♔ Chess Coach

A friendly, browser-based chess coach that helps you learn and improve at chess. Play against an AI opponent with adjustable difficulty, get real-time feedback on your moves, and track your progress over time.
---

## ✨ Features

- **7 difficulty levels** — From Beginner (400 ELO) to Grandmaster (2800 ELO)
- **Smart AI opponent** — Makes intentional mistakes at lower levels so beginners can compete
- **Coach mode** — Separate from Visual Hints, with reactive in-game commentary, tactical warnings, and skill-aware teaching
- **Visual Hints** — Independent legal-move highlighting with green move dots and red capture rings for the selected piece
- **Puzzles Mode** — Full local puzzle ecosystem with filtered practice, validation, retries, hints, full solutions, favorites, and performance tracking
- **Puzzle UX polish** — Live puzzle sessions focus on player-facing info like tier, theme, and mistakes instead of internal puzzle IDs, duplicate side actions, or repeated info cards
- **Daily Puzzle** — One locally selected puzzle per day based on your puzzle rating, with timer, streak tracking, and shareable result text
- **Puzzle Packs** — Curated local packs including Beginner Tactics, Endgame Essentials, Opening Traps, Positional Mastery, and Checkmate Patterns
- **Favorite Puzzles pack** — Favorited puzzles now appear in their own reusable pack and can also be selected from the pack filter
- **Live favorites syncing** — Favoriting or unfavoriting a puzzle immediately refreshes the Puzzle Hub pack filter and pack cards
- **Your Favorites section** — Puzzle Hub now shows a dedicated favorites list with puzzle details and click-to-start access
- **Puzzle Rush** — Timed 3-minute, 5-minute, and survival puzzle runs with adaptive difficulty scaling
- **Puzzle Duel** — Local two-player race mode with shared puzzles, alternating active solver control, and first-to-5 scoring
- **Achievements & leaderboards** — Local badges, streak records, best rush score, fastest solve, and weekly puzzle totals
- **All Puzzles browser** — Search, filter, sort, preview, and launch any puzzle in the full local database directly from Puzzle Hub
- **Live favorite stars** — Every card in the All Puzzles browser has a clickable favorite star that updates the browser and favorites section instantly
- **3 interaction modes** — Passive, Guided, and Review coaching styles
- **Move analysis** — Rates each move as best, good, inaccuracy, mistake, or blunder
- **Post-game review** — Saves learning moments, strategic themes, and improvement goals for later review
- **Progress tracking** — Tracks games played, win streaks, and an Elo-based player rating estimate (saved in localStorage)
- **Session persistence** — Restores unfinished games and coach review state across sessions
- **Optional local voice** — Uses the browser Speech Synthesis API for free text-to-speech coaching
- **Player timer** — Configurable countdown timer (1, 3, 5, 10, 15, or 30 minutes)
- **Undo moves** — Take back your last move and try again
- **Pawn promotion** — Choose your promotion piece when a pawn reaches the back rank
- **Board flipping** — Automatically flips when you play as Black
- **Fully responsive** — Works on desktop, tablet, and mobile screens

---

## 📸 Screenshots

| Desktop | Mobile |
|------------|-------------|
| [<img src="https://i.imgur.com/cMFSjk8.png" width="500">](https://i.imgur.com/sxZMQJk.png) | [<img src="https://i.imgur.com/7t6xKqK.jpeg" height="400" >](https://i.imgur.com/cMFSjk8.png) |

| Coach Review | Puzzle Hub |
|------------|-------------|
| [<img src="https://i.imgur.com/9ucVUHN.png" width="500">](https://i.imgur.com/9ucVUHN.png) | [<img src="https://i.imgur.com/JoVMrJ2.png" width="500" >](https://i.imgur.com/JoVMrJ2.png) |







---

## 🚀 Getting Started

### Quick Start

1. Clone or download this repository
2. Open `index.html` in your browser
3. That's it — no build step, no dependencies

### Using a Local Server (Recommended)

For the best experience (piece SVGs load correctly), serve the repository with any local server:

```bash
# Python 3
python -m http.server 8000

# Node.js (npx)
npx serve .

# PHP
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

---

## 📁 Project Structure

```
├── index.html              # Main entry point
├── styles.css              # All styles and responsive design
├── board.js                # Chess rules, move validation, 8×8 board
├── engine.js               # Heuristic evaluation, minimax, alpha-beta pruning
├── ai.js                   # AI opponent with ELO-based difficulty
├── coach.js                # Layered coach system: evaluator, policy, persona, review generation
├── puzzles.js              # Puzzle database loading, sessions, ratings, packs, achievements
├── ui.js                   # DOM rendering, SVG loading, modals
├── app.js                  # Main orchestrator: game flow, settings
├── progress.js             # ELO tracking, localStorage persistence
├── assets/
│   ├── pieces/             # 12 piece SVGs (SVG chess pieces)
│   └── puzzles/            # Local JSON puzzle database
├── README.md
├── LICENSE
└── .gitignore
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | Vanilla JavaScript (ES6+) |
| Styling | CSS3 with CSS Variables, Grid, Flexbox |
| Markup | HTML5 |
| Storage | localStorage (progress, settings, session restore, reviews) |
| Puzzle Data | Local JSON puzzle database |
| Voice | Browser Speech Synthesis API |
| Dependencies | None |

The project uses a clean class-based architecture:

- **`ChessBoard`** — Core chess rules and move validation
- **`ChessEngine`** — Position evaluation and minimax search
- **`ChessAI`** — ELO-based difficulty wrapper around the engine
- **`ChessCoach`** — Layered coach system with position evaluation, teaching policy, persona rendering, and review generation
- **`ChessPuzzleSystem`** — Local puzzle selection, validation, packs, achievements, daily puzzle, rush, duel, and rating tracking
- **`ChessUI`** — All DOM rendering and event handling
- **`ChessApp`** — Orchestrates everything together
- **`ChessProgress`** — Persistent stats and ELO tracking

---

## 📱 Mobile Responsiveness

The site is fully responsive across all screen sizes:

| Breakpoint | Target |
|-----------|--------|
| `> 1024px` | Desktop — full three-column layout |
| `768px–1024px` | Tablets — stacked panels, full-width board |
| `600px–768px` | Small tablets — tighter spacing, scaled board |
| `480px–600px` | Phones — compact UI, smaller board squares |
| `< 480px` | Small phones — single-column modals, stacked buttons |
| `< 360px` | Tiny screens — minimal board size, 2-column ELO grid |

Touch-friendly features:
- All interactive elements meet 48×48px minimum tap targets
- Menu dropdowns work on both hover and touch
- Modals scroll properly on iOS Safari
- No horizontal scrolling on any screen size

---

## 🎮 How to Play

1. **Choose your difficulty** — Select an ELO rating from 400 to 2800
2. **Pick your color** — Play as White or Black
3. **Set your timer** (optional) — Choose from 1 to 30 minutes
4. **Make your moves** — Click a piece, then click where you want to move it
5. **Read the coach** — The coach panel speaks up on important moments based on Passive, Guided, or Review mode
6. **Ask for a hint** — Use the hint button for option-based coaching without auto-playing moves
7. **Track your progress** — View your stats from the View → Progress menu
8. **Review your game** — Open the saved coach review after the game or revisit it later from View → Game Review
9. **Open Help** — Use Help → `How It Works` for general app guidance or Help → `Puzzle Guide` for puzzle-specific training help
10. **Train with puzzles** — Open Modes → Puzzle Hub for filtered practice, daily training, Puzzle Rush, Puzzle Duel, and packs

### Controls

| Action | How |
|--------|-----|
| Select a piece | Click on it |
| Make a move | Click the destination square |
| Undo | Click the Undo button (or Ctrl+Z) |
| New game | Click New Game |
| Request a hint | Click `Need a Hint` |
| Open saved review | Click `Open Review` or View → `Game Review` |
| Open help | Click Help → `How It Works` or `Puzzle Guide` |
| Open Puzzle Hub | Click Modes → `Puzzle Hub` |
| Start Daily Puzzle | Click Modes → `Daily Puzzle` |
| Close modal | Click ✕ or press Escape |

---

## ⚙️ Settings

| Setting | Description |
|---------|-------------|
| **Coach Mode** | Enables the AI Chess Coach’s commentary, warnings, and post-game teaching |
| **Visual Hints** | Independently shows green move dots and red capture rings for the selected piece |
| **Interaction Mode** | `Passive`, `Guided`, or `Review` coaching intensity |
| **Show Coach Says Messages** | Toggle move-by-move commentary (initial welcome message always shows) |
| **Coach Voice** | Uses your browser’s free local speech synthesis for spoken advice |
| **Motivational Messages** | Enables encouragement when the coach chooses not to give a tactical note |
| **Threat Reminders** | Lets the coach call out loose pieces, tactical danger, and king-safety issues |
### Coach System

- **Passive Mode** — Only speaks on big tactical swings, direct threats, and high-value teaching moments
- **Guided Mode** — Gives more frequent nudges about tactics, development, king safety, and positional play
- **Review Mode** — Maximizes explanation depth, alternative ideas, and post-game teaching detail

Coach feedback adapts to the player’s estimated strength using the saved Elo-style rating estimate from progress tracking.

### Puzzle System

- **Practice Puzzle** — Load filtered puzzles by tier, category, or pack
- **Favorites workflow** — Favorite any active puzzle to add it to the dedicated `Favorite Puzzles` pack for later replay
- **Favorites browsing** — The `Your Favorites` section in Puzzle Hub lists saved puzzles and shows a friendly empty state when none are saved
- **All Puzzles browser** — Browse every puzzle with category, tier, rating, theme, pack, favorites-only, and search controls plus sorting and preview before launch
- **Expanded puzzle coverage** — The local dataset now fills tier/category gaps so each category is represented across Beginner, Intermediate, Advanced, and Master filters
- **Difficulty tiers** — `Beginner (400–800)`, `Intermediate (800–1400)`, `Advanced (1400–2000)`, and `Master (2000+)`
- **Daily Puzzle** — Uses the current puzzle rating tier to select one puzzle per calendar day
- **Puzzle Packs** — Curated subsets of the full local database for focused training
- **Puzzle Rush** — Timed score attack with increasing difficulty as your run continues
- **Puzzle Duel** — Local multiplayer race to solve shared puzzles first
- **Coach integration** — Puzzle intros, hints, mistake explanations, streak encouragement, and solution commentary adjust to skill level
- **Puzzle HUD layout** — During puzzle play, the active puzzle panel moves to the top of the left column while the standard game controls, sidebar Coach Mode summary, turn card, AI difficulty card, live streak stat, duplicate puzzle info card, and standard `Need a Hint` / `Open Review` coach actions stay out of the way
- **Context-aware replay** — The game-over `Play Again` button now restarts the current puzzle mode instead of sending puzzle players back to standard-game setup
- **Puzzle-focused game over modal** — Puzzle results hide the standard `Game Review` action so the replay flow stays focused on puzzle play
- **Dismissible result popups** — Puzzle result popups now include a close button so you can exit them without immediately replaying

### Puzzle Rating

- Puzzle rating uses a lightweight Elo-style update against each puzzle’s own rating
- Solving higher-rated puzzles gives larger gains, while struggling against easier puzzles slows progress
- Using hints applies a small penalty so the rating reflects independent solving strength
- The saved puzzle rating drives daily puzzle selection and adaptive Puzzle Rush scaling

### Adding New Puzzles

Add new entries to `assets/puzzles/puzzles.json` using the local JSON format:

```json
{
  "id": 1023,
  "rating": 1450,
  "theme": ["fork", "tactic"],
  "fen": "FEN_STRING_HERE",
  "moves": ["move1", "move2", "move3"],
  "solution": ["move1", "move2", "move3"]
}
```

For each puzzle:
- `id` should be unique
- `rating` should reflect expected solving strength
- `theme` should include the tactical or strategic tags used by filters and packs
- `fen` should place the board on the exact starting position
- `moves` should list accepted winning first moves when applicable
- `solution` should contain the full forcing line in UCI format

The included puzzle ecosystem ships with 159 local puzzles distributed across mates, tactics, defensive problems, endgames, positional ideas, opening traps, blunder punishment, winning-move sequences, discovered attacks, deflection, zugzwang, and back-rank mates. Every category is represented across all four difficulty tiers (Beginner, Intermediate, Advanced, Master).

### Development

The project includes a test suite, linter, formatter, and CI pipeline for local development and automated checks.

#### Running Tests

```bash
# Unit and integration tests
npm test

# End-to-end browser tests
npm run test:e2e
```

The test suite covers:
- **ChessBoard** — Move generation, check/checkmate/stalemate detection, FEN serialization, castling, undo
- **ChessEngine** — Material/positional evaluation, move selection, move analysis, debug logging
- **Puzzle System** — Database loading, filter logic, sessions, favorites, achievements, rating updates
- **Persistence** — localStorage save/load for progress, puzzle state, and settings
- **Data Verification** — Unique IDs, valid FENs, tier-rating alignment, tier-category coverage, pack validity
- **Integration** — Full game flows, puzzle flows, puzzle hub interactions, cross-mode consistency
- **E2E (Playwright)** — Browser-level tests for board rendering, modals, filters, favorites, coach panel

#### Linting and Formatting

```bash
# Check for lint issues
npm run lint

# Auto-format code
npm run format
```

ESLint enforces consistent JavaScript style, and Prettier handles formatting automatically.

#### Continuous Integration

A GitHub Actions workflow runs on every push and pull request:
- **Lint** — ESLint with zero warnings
- **Tests** — Full Jest test suite
- **Data Verification** — Puzzle database integrity checks (unique IDs, valid FENs, filter coverage)

### Help Menu

- **How It Works** — Explains the difference between Coach Mode, Visual Hints, and the `Need a Hint` button
- **Settings overview** — Summarizes interaction modes, voice, motivation, and threat reminder options
- **Puzzle Guide** — Covers Practice, Daily Puzzle, Puzzle Rush, Puzzle Duel, favorites, browser filters, and puzzle-specific controls
- **Persistence overview** — Explains that rating, unfinished games, and reviews are saved locally in the browser

---

## 🐛 Known Issues

- **Stalemate detection** — Works correctly, but the coach's stalemate message could be more informative
- **Insufficient material** — Covers K vs K, K+B vs K, and K+N vs K. Does not cover rare cases like same-color bishop draws
- **Elo estimate** — Uses a lightweight Elo formula against fixed AI reference ratings, so it is more realistic than flat point changes but still not a full federation-style rating system

---

## 🤝 Contributing

Contributions are welcome! Feel free to:

- Report bugs or suggest improvements
- Submit pull requests
- Improve the AI engine
- Add new features or polish the UI

No contribution is too small — typo fixes, better comments, and CSS improvements are all appreciated.

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## 💛 Support the Project

If Chess Coach has helped you learn, teach, or enjoy chess more, consider supporting its continued development. Your contributions help fund new features, UI improvements, and long-term maintenance.

| Platform | Link |
|----------|------|
| **PayPal** | [paypal.me/dhughes428](https://paypal.me/dhughes428) |
| **Buy Me a Coffee** | [buymeacoffee.com/dhughes428](https://buymeacoffee.com/dhughes428) |
| **Ko-fi** | [ko-fi.com/dhughes428](https://ko-fi.com/dhughes428) |
| **GitHub Sponsors** | [github.com/sponsors/CodeByDes](https://github.com/sponsors/CodeByDes) |

Thank you for helping keep open-source software thriving. 🙏

---

## 👨‍💻 Credits

**Developed by [Desmond](https://github.com/CodeByDes)**

Chess Coach was built with a focus on clarity, accessibility, and a love for helping people learn the game in a fun, intuitive way.

Special thanks to the open-source community whose tools and libraries make projects like this possible.

---

<p align="center">Built by <a href="https://github.com/CodeByDes">Desmond</a></p>
