/**
 * app.js - Main Application Orchestrator
 *
 * Wires together the board, engine, AI, coach, UI, and progress
 * tracker. Handles game flow, user input, and settings persistence.
 */

class ChessApp {
  constructor() {
    // Core subsystems
    this.board = null;
    this.engine = null;
    this.ai = null;
    this.coach = null;
    this.ui = null;
    this.progress = null;

    // Game state
    this.pendingMove = null;   // Held while the promotion modal is open
    this.gameActive = false;
    this.playerColor = WHITE;  // Chosen by the player in the ELO modal
    this.aiColor = BLACK;
    this.selectedElo = 1200;

    // User preferences (persisted in localStorage)
    this.showCoachSays = true;
    this.enableTimer = false;
    this.timerMinutes = 10;    // Default when the timer is enabled
    this.autoPlayAgain = false;
    this.timerInterval = null;
    this.timerSeconds = 600;

    // Global reference so other modules can reach back to the app
    window.chessApp = this;
  }

  /**
   * Boot everything: create components, wire callbacks, load saved
   * settings, and show the ELO selection screen.
   */
  init() {
    // Instantiate subsystems
    this.board = new ChessBoard();
    this.engine = new ChessEngine();
    this.ai = new ChessAI(this.engine);
    this.coach = new ChessCoach(this.board, this.engine);
    this.ui = new ChessUI();
    this.progress = new ChessProgress();

    this.loadSettings();

    // Wire UI events back to app methods
    this.ui.onSquareClick = (row, col) => this.handleSquareClick(row, col);
    this.ui.onPromotionChoice = (piece) => this.handlePromotionChoice(piece);
    this.ui.onNewGame = () => this.showEloModal();
    this.ui.onUndo = () => this.undoMove();
    this.ui.onCoachToggle = (enabled) => this.coach.setEnabled(enabled);
    this.ui.onEloSelect = (elo) => this.selectElo(elo);
    this.ui.onColorSelect = (color) => this.selectColor(color);

    this.ui.onShowProgress = () => this.showProgress();
    this.ui.onResetProgress = () => this.resetProgress();
    this.ui.onCloseProgress = () => this.ui.hideProgressModal();
    this.ui.onCloseEloModal = () => this.ui.hideEloModal();
    this.ui.onCoachSaysToggle = (enabled) => this.toggleCoachSays(enabled);
    this.ui.onAutoPlayToggle = (enabled) => this.toggleAutoPlay(enabled);
    this.ui.onTimerToggle = (enabled) => this.toggleTimerInEloModal(enabled);
    this.ui.onTimerSelect = (minutes) => this.selectTimerDuration(minutes);

    this.ui.init();
    this.updateSettingsUI();

    // Start on the difficulty selection screen
    this.ui.hideGameOverModal();
    this.ui.showEloModal();
  }

  // ============================================
  // Game Management
  // ============================================

  showEloModal() {
    this.ui.hideGameOverModal();
    this.ui.showEloModal();
    this.updateEloModalTimerUI();  // Restore saved timer settings in the modal
  }

  selectElo(elo) {
    this.selectedElo = elo;
    this.ai.setElo(elo);
    this.updateDifficultyDisplay();
  }

  /**
   * Player picked a color. Apply the timer settings from the modal,
   * flip the board if needed, and kick off the game.
   */
  selectColor(color) {
    this.playerColor = color;
    this.aiColor = color === WHITE ? BLACK : WHITE;

    this.ui.setFlipped(color === BLACK);
    this.updateDifficultyDisplay();

    // Read timer choices from the modal UI
    const timerEnabled = document.getElementById('eloTimerToggle')?.checked || false;
    const selectedTimerBtn = document.querySelector('.timer-btn.selected');
    const minutes = selectedTimerBtn ? parseInt(selectedTimerBtn.dataset.minutes) : this.timerMinutes;
    this.applyTimerSettings(timerEnabled, minutes);

    this.ui.hideEloModal();
    this.startNewGame();
  }

  /**
   * Reset the board, apply settings, and start the clock.
   * If the player chose Black, the AI moves first.
   */
  startNewGame() {
    this.board.reset();

    // Timer visibility and countdown
    this.ui.showTimerDisplay(this.enableTimer);
    this.resetTimer();
    if (this.enableTimer) this.startTimer();

    // Clear leftover UI state
    this.ui.hideGameOverModal();
    this.ui.hidePromotionModal();
    this.ui.clearSelection();
    this.ui.updateTurnIndicator(this.board.currentTurn);

    // Welcome message — always shown, even when Coach Says is off
    const config = this.ai.getConfig();
    if (this.coach.isEnabled()) {
      this.ui.showMessage(`Playing against ${config.name} (${this.selectedElo} ELO). ${this.coach.getWelcomeMessage()}`, 'encouraging', true);
    } else {
      this.ui.showMessage(`New game started! Playing against ${config.name}. White to move.`, '', true);
    }

    this.gameActive = true;

    if (this.ui.svgLoaded) this.ui.refresh();

    // AI goes first when the player chose Black
    if (this.playerColor === BLACK && this.gameActive) {
      setTimeout(() => this.makeAIMove(), 500);
    }
  }

  // ============================================
  // Player Input
  // ============================================

  /**
   * Handle clicks on the board. Selects pieces and triggers move attempts.
   * Ignores clicks during the AI's turn.
   */
  handleSquareClick(row, col) {
    if (!this.gameActive) return;
    if (this.board.currentTurn === this.aiColor || this.ai.getIsThinking()) return;

    const clickedPiece = this.board.getPiece(row, col);
    const isOwnPiece = clickedPiece && this.board.isOwnPiece(clickedPiece);

    // If a piece is already selected, try to move
    if (this.ui.selectedSquare) {
      const { row: fromRow, col: fromCol } = this.ui.selectedSquare;

      // Clicking the same square deselects it
      if (fromRow === row && fromCol === col) { this.ui.clearSelection(); return; }

      // Clicking another own piece switches the selection
      if (isOwnPiece) { this.ui.selectSquare(row, col); this.updateCoachHighlights(); return; }

      this.tryMove(fromRow, fromCol, row, col);
      return;
    }

    // Nothing selected yet — select the piece if it belongs to the player
    if (isOwnPiece) { this.ui.selectSquare(row, col); this.updateCoachHighlights(); }
  }

  /**
   * Validate the attempted move. Shows the promotion modal if needed,
   * otherwise executes immediately.
   */
  tryMove(fromRow, fromCol, toRow, toCol) {
    const legalMoves = this.board.generateLegalMovesForPiece(fromRow, fromCol);
    const move = legalMoves.find(m => m.to.row === toRow && m.to.col === toCol);

    if (!move) {
      if (this.coach.isEnabled()) this.ui.showMessage("That's not a legal move. Try again!", 'warning');
      this.ui.clearSelection();
      return;
    }

    // Pawn reaching the back rank — let the player choose the promotion piece
    if (move.promotion) {
      this.pendingMove = move;
      this.ui.showPromotionModal(this.board.currentTurn);
      return;
    }

    this.executeMove(move);
  }

  handlePromotionChoice(piece) {
    if (!this.pendingMove) return;
    this.pendingMove.promotion = piece;
    this.executeMove(this.pendingMove);
    this.pendingMove = null;
  }

  /**
   * Run a move through the full pipeline: coach analysis → board update
   * → UI refresh → game-over check → AI response.
   */
  executeMove(move) {
    const isPlayerMove = this.board.currentTurn === this.playerColor;

    // Coach analyzes the move before it's committed
    let analysis = null;
    if (this.coach.isEnabled() && isPlayerMove) {
      analysis = this.coach.analyzeMove(move);
    }

    this.board.executeMove(move);
    this.ui.animateMove(move.from.row, move.from.col, move.to.row, move.to.col);
    this.ui.refresh();
    this.ui.clearSelection();

    if (this.board.isGameOver()) { this.handleGameOver(); return; }

    const inCheck = this.board.isInCheck();
    this.ui.updateTurnIndicator(this.board.currentTurn, inCheck);

    // Feedback for the player's move
    if (this.coach.isEnabled() && isPlayerMove) {
      this.showMoveFeedback(analysis, move);
    }

    // AI responds after a short pause
    if (this.gameActive && this.board.currentTurn === this.aiColor) {
      setTimeout(() => this.makeAIMove(), 500);
    }
  }

  // ============================================
  // AI Moves
  // ============================================

  async makeAIMove() {
    if (!this.gameActive || this.board.currentTurn !== this.aiColor) return;

    this.ui.showAIThinking(true);
    const move = await this.ai.makeMove(this.board, this.aiColor);
    this.ui.showAIThinking(false);

    if (move && this.gameActive) {
      this.board.executeMove(move);
      this.ui.animateMove(move.from.row, move.from.col, move.to.row, move.to.col);
      this.ui.clearSelection();
      this.ui.refresh();

      if (this.board.isGameOver()) { this.handleGameOver(); return; }

      const inCheck = this.board.isInCheck();
      this.ui.updateTurnIndicator(this.board.currentTurn, inCheck);
    }
  }

  // ============================================
  // Feedback & Game Over
  // ============================================

  showMoveFeedback(analysis, move) {
    // Check takes priority over move quality
    if (this.board.isInCheck()) {
      this.ui.showMessage(this.coach.getGameStateFeedback().message, 'warning');
      return;
    }

    const explanation = this.coach.getMoveExplanation(analysis, move);
    if (explanation.message) {
      this.ui.showMessage(explanation.message, explanation.style);
    } else {
      this.ui.showMessage(this.coach.getEncouragingMessage(), 'encouraging');
    }
  }

  handleGameOver() {
    this.gameActive = false;
    this.stopTimer();

    const reason = this.board.getGameOverReason();
    const stateFeedback = this.coach.getGameStateFeedback();
    if (stateFeedback) this.ui.showMessage(stateFeedback.message, stateFeedback.style);

    // Track the game in progress stats
    this.progress?.recordGamePlayed();

    // Track win streak
    const playerWon = (this.board.isCheckmate() && this.board.currentTurn !== this.playerColor) || this.board.isStalemate();
    if (playerWon) {
      this.currentStreak = (this.currentStreak || 0) + 1;
      this.progress?.updateBestStreak(this.currentStreak);
    } else {
      this.currentStreak = 0;
    }

    this.updatePlayerElo();

    // Clean up the message for the modal (avoid repeating "Checkmate!")
    let displayMessage = reason;
    if (this.board.isCheckmate()) {
      const winner = this.board.currentTurn === WHITE ? 'Black' : 'White';
      displayMessage = `${winner} wins!`;
    }

    const title = this.board.isCheckmate() ? '🏆 Game Over' : 'Game Over';
    this.ui.showGameOverModal(title, displayMessage);

    // Auto-queue another game if the player enabled it
    if (this.autoPlayAgain) {
      setTimeout(() => { this.ui.hideGameOverModal(); this.showEloModal(); }, 1500);
    }
  }

  /**
   * Simple ELO adjustment: +15 win, −15 loss, +5 draw.
   * Could be replaced with a proper Elo formula later.
   */
  updatePlayerElo() {
    if (!this.progress) return;

    const playerWon = (this.board.isCheckmate() && this.board.currentTurn !== this.playerColor) || this.board.isStalemate();
    const playerLost = this.board.isCheckmate() && this.board.currentTurn === this.playerColor;

    if (playerWon)      this.progress.updatePlayerElo(15);
    else if (playerLost) this.progress.updatePlayerElo(-15);
    else                 this.progress.updatePlayerElo(5);  // Draw
  }

  // ============================================
  // Undo
  // ============================================

  /**
   * Take back the last full round (player move + AI response).
   * Can't undo during the AI's turn or if there are no moves.
   */
  undoMove() {
    if (this.board.moveHistory.length === 0 || this.board.currentTurn === this.aiColor || this.ai.getIsThinking()) return;

    let undidPlayerMove = false;

    if (this.board.moveHistory.length >= 2) {
      this.board.undoLastMove();  // AI's move
      this.board.undoLastMove();  // Player's move
      undidPlayerMove = true;
    } else if (this.board.moveHistory.length === 1) {
      this.board.undoLastMove();
      undidPlayerMove = true;
    }

    this.ui.refresh();
    this.ui.clearSelection();
    this.ui.updateTurnIndicator(this.board.currentTurn, this.board.isInCheck());

    if (undidPlayerMove && this.coach.isEnabled()) {
      this.ui.showMessage('Move undone. Take another look!', 'encouraging');
    }

    this.gameActive = true;
  }

  // ============================================
  // Coach Features
  // ============================================

  updateCoachHighlights() {
    if (!this.coach.isEnabled() || !this.ui.selectedSquare) return;
    const { row, col } = this.ui.selectedSquare;
    this.coach.getLegalMovesForSquare(row, col);
    this.ui.updateHighlights();
  }

  showProgress() {
    this.progress.displayProgress(this.ui);
    this.ui.showProgressModal(true);
  }

  resetProgress() {
    if (confirm('⚠️ Are you sure you want to reset all progress? This cannot be undone!\n\nThis will reset:\n- Games played\n- Best streak\n- Your ELO estimate')) {
      this.progress.resetProgress();
      this.progress.displayProgress(this.ui);
      this.ui.showMessage('Progress has been reset.', 'warning');
    }
  }

  // ============================================
  // Settings Persistence
  // ============================================

  loadSettings() {
    const coachSays = localStorage.getItem('coachSaysEnabled');
    const autoPlay = localStorage.getItem('autoPlayEnabled');
    const timerEnabled = localStorage.getItem('timerEnabled');
    const timerMins = localStorage.getItem('timerMinutes');

    this.showCoachSays = coachSays !== 'false';
    this.autoPlayAgain = autoPlay === 'true';
    this.enableTimer = timerEnabled === 'true';
    this.timerMinutes = timerMins ? parseInt(timerMins) : 10;
  }

  saveSettings() {
    localStorage.setItem('coachSaysEnabled', this.showCoachSays);
    localStorage.setItem('autoPlayEnabled', this.autoPlayAgain);
    localStorage.setItem('timerEnabled', this.enableTimer);
    localStorage.setItem('timerMinutes', this.timerMinutes.toString());
  }

  updateSettingsUI() {
    document.getElementById('coachSaysToggle').checked = this.showCoachSays;
    document.getElementById('autoPlayToggle').checked = this.autoPlayAgain;
  }

  toggleCoachSays(enabled) { this.showCoachSays = enabled; this.saveSettings(); }

  /**
   * Called when the player confirms timer choices in the ELO modal.
   * Persists the settings and shows/hides the timer display.
   */
  applyTimerSettings(enabled, minutes) {
    this.enableTimer = enabled;
    this.timerMinutes = minutes;
    this.saveSettings();
    this.ui.showTimerDisplay(enabled);
    if (!enabled) this.stopTimer();
  }

  toggleAutoPlay(enabled) { this.autoPlayAgain = enabled; this.saveSettings(); }

  // Temporary state while the player is still in the ELO modal
  toggleTimerInEloModal(enabled) { this.enableTimer = enabled; }
  selectTimerDuration(minutes) { this.timerMinutes = minutes; }

  // ============================================
  // Timer
  // ============================================

  /**
   * Countdown that only ticks during the player's turn.
   * Reaches zero = loss on time.
   */
  startTimer() {
    this.stopTimer();
    this.timerSeconds = this.timerMinutes * 60;
    this.updateTimerDisplay();

    this.timerInterval = setInterval(() => {
      if (this.gameActive && this.board.currentTurn === this.playerColor) {
        this.timerSeconds--;
        this.updateTimerDisplay();
        if (this.timerSeconds <= 0) {
          this.stopTimer();
          this.ui.showMessage('⏰ Time\'s up! You lost on time.', 'warning');
          this.gameActive = false;
        }
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
  }

  updateTimerDisplay() {
    const minutes = Math.floor(this.timerSeconds / 60);
    const seconds = this.timerSeconds % 60;
    this.ui.updateTimerDisplay(`${minutes}:${seconds.toString().padStart(2, '0')}`);
  }

  resetTimer() {
    if (this.enableTimer) {
      this.timerSeconds = this.timerMinutes * 60;
      this.updateTimerDisplay();
    }
  }

  // ============================================
  // Display Helpers
  // ============================================

  updateDifficultyDisplay() {
    const config = this.ai.getConfig();
    document.getElementById('difficultyText').textContent = `${config.name} (${this.selectedElo})`;
  }

  /**
   * Sync the ELO modal's timer controls with whatever the player
   * saved from their last game.
   */
  updateEloModalTimerUI() {
    const timerToggle = document.getElementById('eloTimerToggle');
    const timerOptions = document.getElementById('timerOptions');

    if (timerToggle) timerToggle.checked = this.enableTimer;
    if (timerOptions) timerOptions.style.display = this.enableTimer ? 'flex' : 'none';

    // Highlight the previously saved duration
    document.querySelectorAll('.timer-btn').forEach(btn => {
      btn.classList.toggle('selected', parseInt(btn.dataset.minutes) === this.timerMinutes);
    });
  }
}

// Kick off when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new ChessApp();
  app.init();
});

// Export for both Node.js modules and browser global scope
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ChessApp };
}
if (typeof window !== 'undefined') {
  window.ChessApp = ChessApp;
}
