# ♔ Chess Coach

A friendly, browser-based chess coach that helps you learn and improve at chess. Play against an AI opponent with adjustable difficulty, get real-time feedback on your moves, and track your progress over time.

Built with vanilla JavaScript — no frameworks, no build tools, no dependencies. Just open `index.html` and play.

---

## ✨ Features

- **7 difficulty levels** — From Beginner (400 ELO) to Grandmaster (2800 ELO)
- **Smart AI opponent** — Makes intentional mistakes at lower levels so beginners can compete
- **Coach mode** — Highlights legal moves, analyzes your moves, and gives kid-friendly feedback
- **Move analysis** — Rates each move as best, good, inaccuracy, mistake, or blunder
- **Progress tracking** — Tracks games played, win streaks, and estimated ELO (saved in localStorage)
- **Player timer** — Configurable countdown timer (1, 3, 5, 10, 15, or 30 minutes)
- **Undo moves** — Take back your last move and try again
- **Pawn promotion** — Choose your promotion piece when a pawn reaches the back rank
- **Board flipping** — Automatically flips when you play as Black
- **Fully responsive** — Works on desktop, tablet, and mobile screens

---

## 📸 Screenshots

| Desktop | Mobile |
|------------|-------------|
| [<img src="https://i.imgur.com/sxZMQJk.png" width="600">](https://i.imgur.com/sxZMQJk.png) | <em>Mobile screenshot coming soon |





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
├── coach.js                # Coach mode: legal moves, feedback, tips
├── ui.js                   # DOM rendering, SVG loading, modals
├── app.js                  # Main orchestrator: game flow, settings
├── progress.js             # ELO tracking, localStorage persistence
├── assets/
│   └── pieces/             # 12 piece SVGs (SVG chess pieces)
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
| Storage | localStorage (progress & settings) |
| Dependencies | None |

The project uses a clean class-based architecture:

- **`ChessBoard`** — Core chess rules and move validation
- **`ChessEngine`** — Position evaluation and minimax search
- **`ChessAI`** — ELO-based difficulty wrapper around the engine
- **`ChessCoach`** — Move analysis and player feedback
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
5. **Read the coach** — The coach panel gives feedback on every move
6. **Track your progress** — View your stats from the View → Progress menu

### Controls

| Action | How |
|--------|-----|
| Select a piece | Click on it |
| Make a move | Click the destination square |
| Undo | Click the Undo button (or Ctrl+Z) |
| New game | Click New Game |
| Close modal | Click ✕ or press Escape |

---

## ⚙️ Settings

| Setting | Description |
|---------|-------------|
| **Coach Mode** | Highlights legal moves and analyzes your moves |
| **Show Coach Says Messages** | Toggle move-by-move commentary (initial welcome message always shows) |
| **Auto Play Again** | Automatically return to the difficulty screen after a game ends |

---

## 🐛 Known Issues

- **Stalemate detection** — Works correctly, but the coach's stalemate message could be more informative
- **Insufficient material** — Covers K vs K, K+B vs K, and K+N vs K. Does not cover rare cases like same-color bishop draws
- **ELO system** — Uses a simple ±15 per game model. A proper Elo formula with K-factor would be more accurate

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

<p align="center">Built with ♔ by <a href="https://github.com/CodeByDes">Desmond</a></p>
