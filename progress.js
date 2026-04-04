/**
 * progress.js - Player Progress Tracking
 *
 * Persists games played, best win streak, and estimated ELO
 * in localStorage so nothing is lost between sessions.
 */

class ChessProgress {
  constructor() {
    this.gamesPlayed = 0;
    this.bestStreak = 0;
    this.playerElo = 1200;  // Starting point for a new player
    this.loadProgress();
  }

  /**
   * Pull saved stats from localStorage. Falls back to defaults
   * if this is the player's first time here.
   */
  loadProgress() {
    const games = localStorage.getItem('chessGamesPlayed');
    const streak = localStorage.getItem('chessBestStreak');
    const elo = localStorage.getItem('chessPlayerElo');

    this.gamesPlayed = games ? parseInt(games) : 0;
    this.bestStreak = streak ? parseInt(streak) : 0;
    this.playerElo = elo ? parseInt(elo) : 1200;
  }

  saveProgress() {
    localStorage.setItem('chessGamesPlayed', this.gamesPlayed.toString());
    localStorage.setItem('chessBestStreak', this.bestStreak.toString());
    localStorage.setItem('chessPlayerElo', this.playerElo.toString());
  }

  recordGamePlayed() {
    this.gamesPlayed++;
    this.saveProgress();
  }

  /**
   * Adjust the player's ELO estimate. Positive delta for wins,
   * negative for losses. Clamped to 400–3000.
   */
  updatePlayerElo(opponentElo, actualScore) {
    const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - this.playerElo) / 400));
    const kFactor = this.getKFactor();
    const delta = Math.round(kFactor * (actualScore - expectedScore));

    this.playerElo += delta;
    this.playerElo = Math.max(400, Math.min(3000, this.playerElo));
    this.saveProgress();
    return delta;
  }

  getKFactor() {
    if (this.gamesPlayed < 30) {return 32;}
    if (this.playerElo >= 2400) {return 16;}
    return 24;
  }

  updateBestStreak(streak) {
    if (streak > this.bestStreak) {
      this.bestStreak = streak;
      this.saveProgress();
    }
  }

  getStats() {
    return { gamesPlayed: this.gamesPlayed, bestStreak: this.bestStreak, playerElo: this.playerElo };
  }

  displayProgress(ui) {
    if (ui) {ui.updateProgressDisplay(this.getStats());}
  }

  /**
   * Wipe everything back to square one. Only called after the
   * player explicitly confirms in the UI.
   */
  resetProgress() {
    this.gamesPlayed = 0;
    this.bestStreak = 0;
    this.playerElo = 1200;
    this.saveProgress();
  }
}

// Export for both Node.js modules and browser global scope
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ChessProgress };
}
if (typeof window !== 'undefined') {
  window.ChessProgress = ChessProgress;
}
