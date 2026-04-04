# Changelog

All notable changes to this project will be documented in this file.


## [1.1.0] - 2026-04-03

### Added

- Added puzzle system + 159 puzzles covering discovered attacks, deflection, zugzwang, back-rank mates, defensive motifs, and positional squeezes.
- Added engine audit test suite (40 tests) verifying check, checkmate, stalemate, castling, en passant, promotion, pinned pieces, double check, king adjacency, attack map, and FEN loading.
- Added Jest integration test suite (18 tests) covering full game flows, puzzle flows, puzzle hub interactions, and cross-mode consistency.
- Added Playwright E2E test suite (18 tests) for browser-level verification of board rendering, modals, filters, favorites, coach panel, and game flow.
- Added ESLint v10 flat config with `curly`, `eqeqeq`, `prefer-const`, and `no-unused-vars` rules for consistent code quality.
- Added Prettier configuration for automatic code formatting.
- Added GitHub Actions CI workflow with four parallel jobs: Lint, Jest Tests, Data Verification, and Playwright E2E Tests.
- Added context-aware empty filter state messages in the puzzle browser that describe which active filters produced zero results.
- Added `puzzles-data.js` script loader so puzzles work when opening `index.html` directly via `file://` — no local server required.

### Changed

- Auto-fixed 290+ ESLint `curly` violations across all source files for consistent brace style.
- Updated `package.json` with proper project metadata, MIT license, and test/lint/format scripts.
- Updated the README Quick Start section to reflect that `file://` works for game play, coach, and puzzles.

## [1.0.0] - Initial public release

### Added

- Initial browser-based chess coach with playable AI opponent, move analysis, progress tracking, timers, undo, and responsive UI.
