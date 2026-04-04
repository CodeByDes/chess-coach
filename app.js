/**
 * app.js - Main Application Orchestrator
 *
 * Wires together the board, engine, AI, coach, UI, and progress
 * tracker. Handles game flow, user input, settings persistence,
 * coach reviews, and session restore.
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
    this.puzzleSystem = null;

    // Game state
    this.pendingMove = null;
    this.gameActive = false;
    this.playerColor = WHITE;
    this.aiColor = BLACK;
    this.selectedElo = 1200;
    this.currentStreak = 0;
    this.latestReview = null;
    this.currentMode = 'standard';
    this.lastCompletedMode = 'standard';
    this.lastPuzzleReplayMode = null;

    // User preferences
    this.coachEnabled = true;
    this.moveHintsEnabled = true;
    this.showCoachSays = true;
    this.coachMode = 'guided';
    this.voiceEnabled = false;
    this.motivationalMessages = true;
    this.threatReminders = true;
    this.enableTimer = false;
    this.timerMinutes = 10;
    this.timerInterval = null;
    this.timerSeconds = 600;

    this.storageKeys = {
      settings: 'chessCoachSettings',
      session: 'chessCoachActiveSession',
      reviews: 'chessCoachReviews'
    };

    window.chessApp = this;
  }

  async init() {
    this.board = new ChessBoard();
    this.engine = new ChessEngine();
    this.ai = new ChessAI(this.engine);
    this.coach = new ChessCoach(this.board, this.engine);
    this.ui = new ChessUI();
    this.progress = new ChessProgress();
    this.puzzleSystem = new ChessPuzzleSystem(this.board, this.coach);

    this.loadSettings();
    this.loadSavedReviews();
    try {
      await this.puzzleSystem.init();
    } catch (error) {
      // Puzzles are unavailable on file:// (fetch blocked by browser security).
      // The game still works fully — only puzzle modes are disabled.
      console.warn('Puzzle system unavailable. Use a local server to enable puzzle modes.', error);
    }

    this.ui.onSquareClick = (row, col) => this.handleSquareClick(row, col);
    this.ui.onPromotionChoice = (piece) => this.handlePromotionChoice(piece);
    this.ui.onNewGame = () => this.showEloModal();
    this.ui.onPlayAgain = () => this.handlePlayAgain();
    this.ui.onUndo = () => this.undoMove();
    this.ui.onCoachToggle = (enabled) => this.toggleCoach(enabled);
    this.ui.onMoveHintsToggle = (enabled) => this.toggleMoveHints(enabled);
    this.ui.onCoachModeSelect = (mode) => this.setCoachMode(mode);
    this.ui.onVoiceToggle = (enabled) => this.toggleVoice(enabled);
    this.ui.onMotivationToggle = (enabled) => this.toggleMotivationalMessages(enabled);
    this.ui.onRemindersToggle = (enabled) => this.toggleThreatReminders(enabled);
    this.ui.onEloSelect = (elo) => this.selectElo(elo);
    this.ui.onColorSelect = (color) => this.selectColor(color);
    this.ui.onShowProgress = () => this.showProgress();
    this.ui.onResetProgress = () => this.resetProgress();
    this.ui.onCloseProgress = () => this.ui.hideProgressModal();
    this.ui.onCloseEloModal = () => this.ui.hideEloModal();
    this.ui.onCloseGameOver = () => this.ui.hideGameOverModal();
    this.ui.onCoachSaysToggle = (enabled) => this.toggleCoachSays(enabled);
    this.ui.onTimerToggle = (enabled) => this.toggleTimerInEloModal(enabled);
    this.ui.onTimerSelect = (minutes) => this.selectTimerDuration(minutes);
    this.ui.onShowReview = () => this.showLatestReview();
    this.ui.onCloseReview = () => this.ui.hideReviewModal();
    this.ui.onRequestHint = () => this.requestHint();
    this.ui.onShowHelp = () => this.ui.showHelpModal(true);
    this.ui.onCloseHelp = () => this.ui.hideHelpModal();
    this.ui.onShowPuzzleHelp = () => this.ui.showPuzzleHelpModal(true);
    this.ui.onClosePuzzleHelp = () => this.ui.hidePuzzleHelpModal();
    this.ui.onShowPuzzleHub = () => this.showPuzzleHub();
    this.ui.onClosePuzzleHub = () => this.ui.hidePuzzleHubModal();
    this.ui.onStartStandardMode = () => this.startStandardMode();
    this.ui.onStartDailyPuzzle = () => this.startDailyPuzzle();
    this.ui.onStartPuzzleRush = (mode) => this.startPuzzleRush(mode);
    this.ui.onStartPuzzleDuel = () => this.startPuzzleDuel();
    this.ui.onStartPracticePuzzle = () => this.startPracticePuzzle();
    this.ui.onRetryPuzzle = () => this.retryPuzzle();
    this.ui.onShowPuzzleHint = () => this.showPuzzleHint();
    this.ui.onShowPuzzleSolution = () => this.showPuzzleSolution();
    this.ui.onNextPuzzle = () => this.nextPuzzle();
    this.ui.onToggleFavoritePuzzle = () => this.toggleFavoritePuzzle();
    this.ui.onShareDailyResult = () => this.shareDailyResult();
    this.ui.onSetDuelPlayer = (playerId) => this.setDuelPlayer(playerId);
    this.ui.onStartFavoritePuzzle = (puzzleId) => this.startFavoritePuzzle(puzzleId);
    this.ui.onPuzzleBrowserChange = () => this.handlePuzzleBrowserChange();
    this.ui.onLoadMorePuzzles = () => this.loadMorePuzzleBrowserResults();
    this.ui.onPreviewPuzzle = (puzzleId) => this.previewPuzzle(puzzleId);
    this.ui.onClosePuzzlePreview = () => this.ui.hidePuzzlePreviewModal();
    this.ui.onStartPreviewPuzzle = () => this.startPreviewedPuzzle();
    this.ui.onToggleBrowserFavorite = (puzzleId) => this.toggleBrowserFavorite(puzzleId);

    this.puzzleBrowserPage = 1;
    this.previewPuzzleId = null;

    this.ui.init();
    this.refreshPuzzleHubUI();

    this.applyCoachSettings();
    this.updateSettingsUI();
    this.updateCoachDisplay();
    this.updateDifficultyDisplay();
    this.ui.hideGameOverModal();

    if (!this.restoreSavedSession()) {
      this.ui.showEloModal();
    }
  }

  showEloModal() {
    this.ui.hideGameOverModal();
    this.ui.showEloModal();
    this.updateEloModalTimerUI();
  }

  selectElo(elo) {
    this.selectedElo = elo;
    this.ai.setElo(elo);
    this.updateDifficultyDisplay();
  }

  selectColor(color) {
    this.playerColor = color;
    this.aiColor = color === WHITE ? BLACK : WHITE;

    this.ui.setFlipped(color === BLACK);
    this.updateDifficultyDisplay();

    const timerEnabled = document.getElementById('eloTimerToggle')?.checked || false;
    const selectedTimerBtn = document.querySelector('.timer-btn.selected');
    const minutes = selectedTimerBtn ? parseInt(selectedTimerBtn.dataset.minutes) : this.timerMinutes;
    this.applyTimerSettings(timerEnabled, minutes);

    this.ui.hideEloModal();
    this.startNewGame();
  }

  startNewGame() {
    this.currentMode = 'standard';
    this.board.reset();
    this.latestReview = null;
    this.coach.startGame({ skillRating: this.progress.getStats().playerElo });
    this.applyCoachSettings();

    this.ui.setPuzzleModeActive(false);
    this.ui.showTimerDisplay(this.enableTimer);
    this.resetTimer();
    if (this.enableTimer) {this.startTimer();}

    this.ui.hideGameOverModal();
    this.ui.hidePromotionModal();
    this.ui.hideReviewModal();
    this.ui.clearSelection();
    this.ui.updateTurnIndicator(this.board.currentTurn);

    const config = this.ai.getConfig();
    const welcome = this.coach.getWelcomeMessage();
    this.showCoachMessage(
      this.coachEnabled
        ? `Playing against ${config.name} (${this.selectedElo} ELO). ${welcome}`
        : `New game started. Playing against ${config.name}. White to move.`,
      this.coachEnabled ? 'encouraging' : '',
      true,
      false
    );

    this.gameActive = true;
    if (this.ui.svgLoaded) {this.ui.refresh();}

    this.saveSession();

    if (this.playerColor === BLACK && this.gameActive) {
      setTimeout(() => this.makeAIMove(), 500);
    }
  }

  handleSquareClick(row, col) {
<<<<<<< HEAD
    if (this.isPuzzleMode()) {
      this.handlePuzzleSquareClick(row, col);
      return;
    }

    if (!this.gameActive) {
      const clickedPiece = this.board.getPiece(row, col);
      if (clickedPiece) {
        this.showCoachMessage('No game is active yet. Click "New Game" to start playing.', 'warning', true);
      }
      return;
    }
    if (this.board.currentTurn === this.aiColor || this.ai.getIsThinking()) {return;}
=======
    if (!this.gameActive) {
      const clickedPiece = this.board.getPiece(row, col);
      if (clickedPiece) {
        this.ui.showMessage('No game is active yet. Click "New Game" to start playing.', 'warning', true);
      }
      return;
    }
    if (this.board.currentTurn === this.aiColor || this.ai.getIsThinking()) return;
>>>>>>> 7aaa216d0d6291fc3638f54184ef047ae273ebea

    const clickedPiece = this.board.getPiece(row, col);
    const isOwnPiece = clickedPiece && this.board.isOwnPiece(clickedPiece);

    if (this.ui.selectedSquare) {
      const { row: fromRow, col: fromCol } = this.ui.selectedSquare;

      if (fromRow === row && fromCol === col) {
        this.ui.clearSelection();
        return;
      }

      if (isOwnPiece) {
        this.ui.selectSquare(row, col);
        this.updateCoachHighlights();
        return;
      }

      this.tryMove(fromRow, fromCol, row, col);
      return;
    }

    if (isOwnPiece) {
      this.ui.selectSquare(row, col);
      this.updateCoachHighlights();
    }
  }

  handlePuzzleSquareClick(row, col) {
    const clickedPiece = this.board.getPiece(row, col);
    const isOwnPiece = clickedPiece && this.board.isOwnPiece(clickedPiece);

    if (this.ui.selectedSquare) {
      const { row: fromRow, col: fromCol } = this.ui.selectedSquare;

      if (fromRow === row && fromCol === col) {
        this.ui.clearSelection();
        return;
      }

      if (isOwnPiece) {
        this.ui.selectSquare(row, col);
        this.updateCoachHighlights();
        return;
      }

      this.tryPuzzleMove(fromRow, fromCol, row, col);
      return;
    }

    if (isOwnPiece) {
      this.ui.selectSquare(row, col);
      this.updateCoachHighlights();
    }
  }

  tryMove(fromRow, fromCol, toRow, toCol) {
    const legalMoves = this.board.generateLegalMovesForPiece(fromRow, fromCol);
    const move = legalMoves.find(m => m.to.row === toRow && m.to.col === toCol);

    if (!move) {
      if (this.coachEnabled) {this.showCoachMessage("That isn't legal. Reset and compare the safe squares again.", 'warning');}
      this.ui.clearSelection();
      return;
    }

    if (move.promotion) {
      this.pendingMove = move;
      this.ui.showPromotionModal(this.board.currentTurn);
      return;
    }

    this.executeMove(move);
  }

  tryPuzzleMove(fromRow, fromCol, toRow, toCol) {
    const legalMoves = this.board.generateLegalMovesForPiece(fromRow, fromCol);
    const move = legalMoves.find(m => m.to.row === toRow && m.to.col === toCol);

    if (!move) {
      this.showCoachMessage('That move is not legal in this puzzle position. Re-check the forcing options.', 'warning');
      this.ui.clearSelection();
      return;
    }

    const result = this.puzzleSystem.validateMove(this.board.moveToUci(move));
    this.ui.refresh();
    this.ui.clearSelection();
    this.handlePuzzleResult(result, move);
  }

  handlePromotionChoice(piece) {
    if (!this.pendingMove) {return;}
    this.pendingMove.promotion = piece;
    this.executeMove(this.pendingMove);
    this.pendingMove = null;
  }

  executeMove(move) {
    const isPlayerMove = this.board.currentTurn === this.playerColor;
    let analysis = null;

    if (this.coachEnabled && isPlayerMove) {
      analysis = this.coach.analyzeMove(move, { playerColor: this.playerColor });
    }

    this.board.executeMove(move);
    this.ui.animateMove(move.from.row, move.from.col, move.to.row, move.to.col);
    this.ui.refresh();
    this.ui.clearSelection();

    if (isPlayerMove && analysis) {
      const lastRecord = this.board.moveHistory[this.board.moveHistory.length - 1];
      this.coach.recordPlayerMove(analysis, move, this.board.serializeState(), {
        notation: lastRecord?.notation,
        moveNumber: this.board.moveNumber
      });
    }

    if (this.board.isGameOver()) {
      this.saveSession();
      this.handleGameOver();
      return;
    }

    const inCheck = this.board.isInCheck();
    this.ui.updateTurnIndicator(this.board.currentTurn, inCheck);

    if (this.coachEnabled && isPlayerMove) {
      this.showMoveFeedback(analysis);
    }

    this.saveSession();

    if (this.gameActive && this.board.currentTurn === this.aiColor) {
      setTimeout(() => this.makeAIMove(), 500);
    }
  }

  async makeAIMove() {
    if (!this.gameActive || this.board.currentTurn !== this.aiColor) {return;}

    this.ui.showAIThinking(true);
    const move = await this.ai.makeMove(this.board, this.aiColor);
    this.ui.showAIThinking(false);

    if (move && this.gameActive) {
      this.board.executeMove(move);
      this.ui.animateMove(move.from.row, move.from.col, move.to.row, move.to.col);
      this.ui.clearSelection();
      this.ui.refresh();

      if (this.board.isGameOver()) {
        this.saveSession();
        this.handleGameOver();
        return;
      }

      const inCheck = this.board.isInCheck();
      this.ui.updateTurnIndicator(this.board.currentTurn, inCheck);
      this.saveSession();
    }
  }

  showMoveFeedback(analysis) {
    if (this.board.isInCheck()) {
      const stateFeedback = this.coach.getGameStateFeedback();
      if (stateFeedback) {this.showCoachMessage(stateFeedback.message, stateFeedback.style, false, true);}
      return;
    }

    const explanation = this.coach.getMoveExplanation(analysis);
    if (explanation.message) {
      this.showCoachMessage(explanation.message, explanation.style, false, explanation.speak);
    }
  }

  handleGameOver() {
    this.gameActive = false;
    this.lastCompletedMode = 'standard';
    this.stopTimer();

    const reason = this.board.getGameOverReason();
    const stateFeedback = this.coach.getGameStateFeedback();
    if (stateFeedback) {this.showCoachMessage(stateFeedback.message, stateFeedback.style);}

    this.progress?.recordGamePlayed();

    const playerWon = this.board.isCheckmate() && this.board.currentTurn !== this.playerColor;
    if (playerWon) {
      this.currentStreak = (this.currentStreak || 0) + 1;
      this.progress?.updateBestStreak(this.currentStreak);
    } else {
      this.currentStreak = 0;
    }

    this.updatePlayerElo();

    let displayMessage = reason;
    if (this.board.isCheckmate()) {
      const winner = this.board.currentTurn === WHITE ? 'Black' : 'White';
      displayMessage = `${winner} wins!`;
    }

    const title = this.board.isCheckmate() ? 'Game Over' : 'Game Finished';
    this.ui.showGameOverModal(title, displayMessage, { showReview: true });

    this.latestReview = this.coach.buildPostGameReview({
      outcome: displayMessage,
      opponent: this.ai.getConfig().name,
      playerColor: this.playerColor
    });
    this.saveReview(this.latestReview);
    this.clearSavedSession();

  }

  updatePlayerElo() {
    if (!this.progress) {return;}

    const playerWon = this.board.isCheckmate() && this.board.currentTurn !== this.playerColor;
    const playerLost = this.board.isCheckmate() && this.board.currentTurn === this.playerColor;
    const actualScore = playerWon ? 1 : playerLost ? 0 : 0.5;

    this.progress.updatePlayerElo(this.selectedElo, actualScore);

    this.coach.setSkillLevel(this.progress.getStats().playerElo);
  }

  undoMove() {
    if (this.isPuzzleMode()) {
      this.showCoachMessage('Puzzle mode does not use undo. Use Retry Puzzle to restart the position cleanly.', 'warning', true);
      return;
    }

    if (this.board.moveHistory.length === 0 || this.board.currentTurn === this.aiColor || this.ai.getIsThinking()) {return;}

    let undidPlayerMove = false;

    if (this.board.moveHistory.length >= 2) {
      this.board.undoLastMove();
      this.board.undoLastMove();
      undidPlayerMove = true;
    } else if (this.board.moveHistory.length === 1) {
      this.board.undoLastMove();
      undidPlayerMove = true;
    }

    this.ui.refresh();
    this.ui.clearSelection();
    this.ui.updateTurnIndicator(this.board.currentTurn, this.board.isInCheck());

    if (undidPlayerMove && this.coachEnabled) {
      this.showCoachMessage('Move undone. Re-check tactics, king safety, and loose pieces before trying again.', 'encouraging');
    }

    this.gameActive = true;
    this.saveSession();
  }

  updateCoachHighlights() {
    if (!this.coach.isMoveHintsEnabled() || !this.ui.selectedSquare) {return;}
    const { row, col } = this.ui.selectedSquare;
    this.coach.getLegalMovesForSquare(row, col);
    this.ui.updateHighlights();
  }

  isPuzzleMode() {
    return ['practice', 'daily', 'rush', 'duel'].includes(this.currentMode);
  }

  startStandardMode() {
    this.currentMode = 'standard';
    this.stopPuzzleTimer();
    this.puzzleSystem.clearCurrentSession();
    this.clearSavedSession();
    this.ui.setPuzzleModeActive(false);
    this.ui.hidePuzzleHubModal();
    this.ui.showTimerDisplay(this.enableTimer);
    this.showEloModal();
  }

  showPuzzleHub() {
    this.currentMode = 'hub';
    this.puzzleSystem.unlockAchievement('puzzle-apprentice');
    this.puzzleBrowserPage = 1;
    this.previewPuzzleId = null;
    this.ui.hidePuzzlePreviewModal();
    this.refreshPuzzleHubUI();
    this.ui.showPuzzleHubModal(true);
  }

  refreshPuzzleHubUI() {
    this.ui.populatePuzzleSelectors({
      categories: this.puzzleSystem.getCategoryOptions(),
      packs: this.puzzleSystem.getPackOptions()
    });
    this.ui.populatePuzzleBrowserSelectors({
      categories: this.puzzleSystem.getCategoryOptions(),
      packs: this.puzzleSystem.getPackOptions(),
      themes: this.puzzleSystem.getThemeOptions()
    });
    this.ui.updatePuzzleDashboard(this.puzzleSystem.getDashboardData());
    this.renderPuzzleBrowser();
  }

  startPracticePuzzle() {
    const filters = this.ui.getPuzzleFilters();
    const session = this.puzzleSystem.startPractice(filters);
    if (!session) {
      this.showCoachMessage('No puzzles matched that filter. Try a broader tier or category.', 'warning', true);
      return;
    }
    this.loadPuzzleSession(session, 'Practice');
  }

  startFavoritePuzzle(puzzleId) {
    const puzzle = this.puzzleSystem.getPuzzleById(puzzleId);
    if (!puzzle) {
      this.showCoachMessage('That favorite puzzle is no longer available in the current database.', 'warning', true);
      this.refreshPuzzleHubUI();
      return;
    }

    const session = this.puzzleSystem.createSession('practice', puzzle, {
      filters: { pack: 'favorite-puzzles' }
    });
    this.loadPuzzleSession(session, 'Practice');
  }

  handlePuzzleBrowserChange() {
    this.puzzleBrowserPage = 1;
    this.renderPuzzleBrowser();
  }

  loadMorePuzzleBrowserResults() {
    this.puzzleBrowserPage += 1;
    this.renderPuzzleBrowser();
  }

  renderPuzzleBrowser() {
    const filters = this.ui.getPuzzleBrowserFilters?.() || {};
    const data = this.puzzleSystem.getAllPuzzlesBrowserData({
      ...filters,
      page: 1,
      pageSize: Math.max(12, this.puzzleBrowserPage * 12)
    });
    this.ui.updateAllPuzzleBrowser(data, filters);
  }

  getPuzzleModeLabel(session = this.puzzleSystem.getCurrentSession()) {
    if (!session) {return 'Practice';}
    if (session.type === 'daily') {return 'Daily Puzzle';}
    if (session.type === 'rush') {return session.rush?.mode === 'survival' ? 'Puzzle Rush Survival' : `Puzzle Rush ${session.rush?.mode === '3m' ? '3 Min' : '5 Min'}`;}
    if (session.type === 'duel') {return 'Puzzle Duel';}
    return 'Practice';
  }

  previewPuzzle(puzzleId) {
    const puzzle = this.puzzleSystem.getPuzzleById(puzzleId);
    if (!puzzle) {
      this.showCoachMessage('That puzzle is no longer available in the current database.', 'warning', true);
      this.refreshPuzzleHubUI();
      return;
    }

    this.previewPuzzleId = puzzleId;
    this.ui.updatePuzzlePreview(puzzle);
    this.ui.showPuzzlePreviewModal(true);
  }

  startPreviewedPuzzle() {
    if (!this.previewPuzzleId) {return;}
    const puzzle = this.puzzleSystem.getPuzzleById(this.previewPuzzleId);
    if (!puzzle) {
      this.ui.hidePuzzlePreviewModal();
      this.showCoachMessage('That puzzle is no longer available in the current database.', 'warning', true);
      this.refreshPuzzleHubUI();
      return;
    }

    this.ui.hidePuzzlePreviewModal();
    this.previewPuzzleId = null;
    const session = this.puzzleSystem.createSession('practice', puzzle, {
      filters: { browser: true }
    });
    this.loadPuzzleSession(session, 'Practice');
  }

  startDailyPuzzle() {
    const session = this.puzzleSystem.startDaily(this.puzzleSystem.state.rating);
    if (!session) {return;}
    this.loadPuzzleSession(session, 'Daily Puzzle');
  }

  startPuzzleRush(mode = '3m') {
    const session = this.puzzleSystem.startRush(mode, this.puzzleSystem.state.rating);
    if (!session) {return;}
    this.lastPuzzleReplayMode = { type: 'rush', mode };
    this.loadPuzzleSession(session, mode === 'survival' ? 'Puzzle Rush Survival' : `Puzzle Rush ${mode === '3m' ? '3 Min' : '5 Min'}`);
  }

  startPuzzleDuel() {
    const session = this.puzzleSystem.startDuel(this.puzzleSystem.state.rating);
    if (!session) {return;}
    this.lastPuzzleReplayMode = { type: 'duel' };
    this.loadPuzzleSession(session, 'Puzzle Duel');
  }

  loadPuzzleSession(session, modeLabel) {
    this.currentMode = session.type;
    this.lastCompletedMode = session.type;
    if (session.type === 'practice') {this.lastPuzzleReplayMode = { type: 'practice', filters: { ...(session.filters || {}) } };}
    if (session.type === 'daily') {this.lastPuzzleReplayMode = { type: 'daily' };}
    this.gameActive = false;
    this.stopTimer();
    this.ui.hideEloModal();
    this.ui.hidePuzzleHubModal();
    this.ui.hidePuzzlePreviewModal();
    this.ui.hideGameOverModal();
    this.ui.showReviewModal(false);
    this.ui.setFlipped(session.playerColor === BLACK);
    this.ui.setPuzzleModeActive(true);
    this.ui.refresh();
    this.ui.clearSelection();
    this.ui.setTurnIndicatorText(`${modeLabel}`, '🧩');

    const puzzle = session.puzzle;
    this.ui.updatePuzzlePanel({
      mode: modeLabel,
      rating: this.puzzleSystem.state.rating,
      score: session.rush?.score || session.duel?.round || Object.keys(this.puzzleSystem.state.completed).length,
      title: puzzle.title,
      prompt: puzzle.prompt,
      categoryLabel: puzzle.category.replace(/-/g, ' '),
      tierLabel: puzzle.tier,
      mistakes: session.attempts,
      favorite: this.puzzleSystem.isFavorite(puzzle.id),
      showShare: session.type === 'daily',
      showDuelControls: session.type === 'duel',
      duelScore: session.duel ? `${session.duel.score.p1} - ${session.duel.score.p2}` : '0 - 0'
    });
    this.showCoachMessage(this.coach.persona.renderPuzzleIntro(puzzle, this.coach.skillProfile), 'encouraging', true);
    this.startPuzzleTimer();
    this.saveSession();
  }

  handlePuzzleResult(result, attemptedMove) {
    const session = this.puzzleSystem.getCurrentSession();
    if (!session) {return;}

    if (result.status === 'wrong') {
      const message = this.coach.persona.renderPuzzleMistake(session.puzzle, result.expected, this.board.moveToUci(attemptedMove), this.coach.skillProfile);
      this.showCoachMessage(message, 'warning');
      this.refreshPuzzlePanel();
      return;
    }

    if (result.status === 'correct') {
      const message = 'Correct so far. Keep calculating the forced continuation.';
      this.showCoachMessage(message, 'good');
      this.refreshPuzzlePanel();
      return;
    }

    if (result.status === 'solved') {
      const summary = result.result;
      const successMessage = `${this.coach.persona.renderPuzzleSuccess(session.puzzle, summary, this.coach.skillProfile)} ${this.coach.persona.renderPuzzleStreak(this.puzzleSystem.state.currentStreak)}`;
      this.showCoachMessage(successMessage, 'good', true, true);
      this.ui.updatePuzzleDashboard(this.puzzleSystem.getDashboardData());
      this.refreshPuzzlePanel();

      if (this.currentMode === 'rush') {
        const next = this.puzzleSystem.getNextPuzzleForCurrentMode();
        if (next) {
          setTimeout(() => this.loadPuzzleSession(next, session.rush.mode === 'survival' ? 'Puzzle Rush Survival' : `Puzzle Rush ${session.rush.mode === '3m' ? '3 Min' : '5 Min'}`), 700);
        }
      } else if (this.currentMode === 'duel') {
        if (session.duel.score.p1 >= session.duel.target || session.duel.score.p2 >= session.duel.target) {
          const winner = session.duel.score.p1 > session.duel.score.p2 ? 'Player 1' : 'Player 2';
          this.lastCompletedMode = 'duel';
          this.clearSavedSession();
          this.ui.showGameOverModal('Puzzle Duel Finished', `${winner} wins the duel ${session.duel.score.p1}-${session.duel.score.p2}.`, { showReview: false });
        } else {
          const updated = this.puzzleSystem.getCurrentSession();
          if (updated) {this.loadPuzzleSession(updated, 'Puzzle Duel');}
        }
      }
      return;
    }

    if (result.status === 'failed' && this.currentMode === 'rush') {
      this.stopPuzzleTimer();
      this.lastCompletedMode = 'rush';
      this.clearSavedSession();
      this.ui.showGameOverModal('Puzzle Rush Over', `Final score: ${session.rush.score}`, { showReview: false });
      this.ui.updatePuzzleDashboard(this.puzzleSystem.getDashboardData());
    }
  }

  handlePlayAgain() {
    this.ui.hideGameOverModal();

    if (this.lastCompletedMode === 'rush' && this.lastPuzzleReplayMode?.type === 'rush') {
      this.startPuzzleRush(this.lastPuzzleReplayMode.mode || '3m');
      return;
    }

    if (this.lastCompletedMode === 'duel' && this.lastPuzzleReplayMode?.type === 'duel') {
      this.startPuzzleDuel();
      return;
    }

    if (this.lastCompletedMode === 'daily') {
      this.startDailyPuzzle();
      return;
    }

    if (this.lastCompletedMode === 'practice') {
      const filters = this.lastPuzzleReplayMode?.filters || this.ui.getPuzzleFilters();
      const session = this.puzzleSystem.startPractice(filters);
      if (session) {
        this.loadPuzzleSession(session, 'Practice');
        return;
      }
    }

    this.showEloModal();
  }

  refreshPuzzlePanel() {
    const session = this.puzzleSystem.getCurrentSession();
    if (!session) {return;}
    const puzzle = session.puzzle;
    this.ui.updatePuzzlePanel({
      mode: this.getPuzzleModeLabel(session),
      rating: this.puzzleSystem.state.rating,
      score: session.rush?.score || session.duel?.round || Object.keys(this.puzzleSystem.state.completed).length,
      title: puzzle.title,
      prompt: puzzle.prompt,
      categoryLabel: puzzle.category.replace(/-/g, ' '),
      tierLabel: puzzle.tier,
      mistakes: session.attempts,
      favorite: this.puzzleSystem.isFavorite(puzzle.id),
      showShare: this.currentMode === 'daily',
      showDuelControls: this.currentMode === 'duel',
      duelScore: session.duel ? `${session.duel.score.p1} - ${session.duel.score.p2}` : '0 - 0'
    });
    this.saveSession();
  }

  retryPuzzle() {
    const session = this.puzzleSystem.retryCurrentPuzzle();
    if (!session) {return;}
    this.ui.refresh();
    this.ui.clearSelection();
    this.showCoachMessage('Puzzle reset. Look for the strongest forcing move first.', 'encouraging');
    this.refreshPuzzlePanel();
  }

  showPuzzleHint() {
    const session = this.puzzleSystem.getCurrentSession();
    if (!session) {return;}
    const hintUci = this.puzzleSystem.getHint();
    const text = this.coach.persona.renderPuzzleHint(session.puzzle, hintUci, this.board);
    this.showCoachMessage(text, 'encouraging', true, true);
    this.refreshPuzzlePanel();
  }

  showPuzzleSolution() {
    const session = this.puzzleSystem.getCurrentSession();
    if (!session) {return;}
    const line = this.puzzleSystem.showFullSolution();
    this.ui.refresh();
    this.ui.clearSelection();
    const message = `Solution line: ${line.join(' → ')}`;
    this.showCoachMessage(message, 'warning', true);
    this.refreshPuzzlePanel();
  }

  nextPuzzle() {
    const next = this.puzzleSystem.getNextPuzzleForCurrentMode();
    if (!next) {
      this.showCoachMessage('No next puzzle was available for that filter.', 'warning', true);
      return;
    }
    const label = this.currentMode === 'practice' ? 'Practice' : this.currentMode === 'daily' ? 'Daily Puzzle' : this.currentMode === 'rush' ? `Puzzle Rush ${next.rush.mode === 'survival' ? 'Survival' : next.rush.mode === '3m' ? '3 Min' : '5 Min'}` : 'Puzzle Duel';
    this.loadPuzzleSession(next, label);
  }

  toggleFavoritePuzzle() {
    const favorite = this.puzzleSystem.toggleFavoriteCurrent();
    this.refreshPuzzlePanel();
    this.refreshPuzzleHubUI();
    if (this.previewPuzzleId) {
      const previewPuzzle = this.puzzleSystem.getPuzzleById(this.previewPuzzleId);
      if (previewPuzzle) {this.ui.updatePuzzlePreview(previewPuzzle);}
    }
    this.showCoachMessage(favorite ? 'Puzzle added to favorites.' : 'Puzzle removed from favorites.', 'encouraging', true);
  }

  toggleBrowserFavorite(puzzleId) {
    const favorite = this.puzzleSystem.toggleFavoriteById(puzzleId);
    this.refreshPuzzleHubUI();
    if (this.previewPuzzleId === puzzleId) {
      const previewPuzzle = this.puzzleSystem.getPuzzleById(puzzleId);
      if (previewPuzzle) {this.ui.updatePuzzlePreview(previewPuzzle);}
    }
    this.showCoachMessage(favorite ? 'Puzzle added to favorites.' : 'Puzzle removed from favorites.', 'encouraging', true);
  }

  async shareDailyResult() {
    const text = this.puzzleSystem.formatDailyShareResult();
    if (!text) {return;}
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      this.showCoachMessage('Daily puzzle result copied to your clipboard.', 'good', true);
    } else {
      this.showCoachMessage(text, 'encouraging', true);
    }
  }

  setDuelPlayer(playerId) {
    this.puzzleSystem.setActiveDuelPlayer(playerId);
    this.showCoachMessage(`${playerId === 'p1' ? 'Player 1' : 'Player 2'} is now the active solver.`, 'encouraging', true);
  }

  startPuzzleTimer() {
    this.stopTimer();
    if (!this.isPuzzleMode()) {return;}

    this.ui.showTimerDisplay(this.currentMode === 'daily' || this.currentMode === 'rush');
    this.updatePuzzleTimerDisplay();

    this.timerInterval = setInterval(() => {
      if (!this.isPuzzleMode()) {return;}
      this.updatePuzzleTimerDisplay();

      if (this.currentMode === 'rush' && this.puzzleSystem.shouldRushEndOnTime()) {
        const rush = this.puzzleSystem.finishRush(false);
        this.stopPuzzleTimer();
        this.lastCompletedMode = 'rush';
        this.ui.showGameOverModal('Puzzle Rush Over', `Final score: ${rush?.score || 0}`, { showReview: false });
      }
    }, 1000);
  }

  stopPuzzleTimer() {
    if (this.isPuzzleMode()) {this.ui.showTimerDisplay(false);}
    this.stopTimer();
  }

  updatePuzzleTimerDisplay() {
    const session = this.puzzleSystem.getCurrentSession();
    if (!session) {return;}

    if (this.currentMode === 'daily') {
      const elapsed = Math.max(0, Math.floor((Date.now() - session.startedAt) / 1000));
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      this.ui.updateTimerDisplay(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      return;
    }

    if (this.currentMode === 'rush') {
      if (session.rush.mode === 'survival') {
        this.ui.updateTimerDisplay(`M${session.rush.mistakes}/${session.rush.mistakesAllowed}`);
      } else {
        const remaining = Math.max(0, Math.floor(this.puzzleSystem.getRushTimeRemaining() / 1000));
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        this.ui.updateTimerDisplay(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    }
  }

  requestHint() {
    if (this.isPuzzleMode()) {
      this.showPuzzleHint();
      return;
    }

    if (!this.gameActive || !this.coachEnabled) {
      this.showCoachMessage('Start a game with Coach Mode on if you want contextual hints.', 'warning', true);
      return;
    }

    const hint = this.coach.getHintMessage();
    this.showCoachMessage(hint, 'encouraging', true, true);
  }

  showProgress() {
    this.progress.displayProgress(this.ui);
    this.ui.showProgressModal(true);
  }

  resetProgress() {
    if (confirm('⚠️ Are you sure you want to reset all progress? This cannot be undone!\n\nThis will reset:\n- Games played\n- Best streak\n- Your ELO estimate')) {
      this.progress.resetProgress();
      this.progress.displayProgress(this.ui);
      this.coach.setSkillLevel(this.progress.getStats().playerElo);
      this.showCoachMessage('Progress has been reset.', 'warning');
    }
  }

  showLatestReview() {
    const review = this.latestReview || this.loadSavedReviews()[0] || null;
    this.ui.updateReviewDisplay(review);
    this.ui.showReviewModal(true);
  }

  loadSavedReviews() {
    try {
      const stored = localStorage.getItem(this.storageKeys.reviews);
      const reviews = stored ? JSON.parse(stored) : [];
      this.latestReview = reviews[0] || null;
      return reviews;
    } catch { /* istanbul ignore next */ 
      this.latestReview = null;
      return [];
    }
  }

  saveReview(review) {
    if (!review) {return;}
    const reviews = this.loadSavedReviews().filter(item => item.id !== review.id);
    reviews.unshift(review);
    localStorage.setItem(this.storageKeys.reviews, JSON.stringify(reviews.slice(0, 12)));
    this.latestReview = review;
  }

  loadSettings() {
    try {
      const stored = localStorage.getItem(this.storageKeys.settings);
      const settings = stored ? JSON.parse(stored) : {};

      this.coachEnabled = settings.coachEnabled !== false;
      this.moveHintsEnabled = settings.moveHintsEnabled !== false;
      this.showCoachSays = settings.showCoachSays !== false;
      this.coachMode = settings.coachMode || 'guided';
      this.voiceEnabled = settings.voiceEnabled === true;
      this.motivationalMessages = settings.motivationalMessages !== false;
      this.threatReminders = settings.threatReminders !== false;
      this.enableTimer = settings.timerEnabled === true;
      this.timerMinutes = settings.timerMinutes ? parseInt(settings.timerMinutes) : 10;
    } catch { /* istanbul ignore next */ 
      this.coachEnabled = true;
      this.moveHintsEnabled = true;
      this.showCoachSays = true;
      this.coachMode = 'guided';
      this.voiceEnabled = false;
      this.motivationalMessages = true;
      this.threatReminders = true;
      this.enableTimer = false;
      this.timerMinutes = 10;
    }
  }

  saveSettings() {
    localStorage.setItem(this.storageKeys.settings, JSON.stringify({
      coachEnabled: this.coachEnabled,
      moveHintsEnabled: this.moveHintsEnabled,
      showCoachSays: this.showCoachSays,
      coachMode: this.coachMode,
      voiceEnabled: this.voiceEnabled,
      motivationalMessages: this.motivationalMessages,
      threatReminders: this.threatReminders,
      timerEnabled: this.enableTimer,
      timerMinutes: this.timerMinutes
    }));
  }

  applyCoachSettings() {
    this.coach.setEnabled(this.coachEnabled);
    this.coach.setMoveHintsEnabled(this.moveHintsEnabled);
    this.coach.setInteractionMode(this.coachMode);
    this.coach.setVoiceEnabled(this.voiceEnabled);
    this.coach.setMessageCardsEnabled(this.showCoachSays);
    this.coach.setMotivationalEnabled(this.motivationalMessages);
    this.coach.setRemindersEnabled(this.threatReminders);
    this.coach.setSkillLevel(this.progress?.getStats().playerElo || 1200);
    this.ai.setElo(this.selectedElo);
  }

  updateSettingsUI() {
    const setChecked = (id, value) => {
      const element = document.getElementById(id);
      if (element) {element.checked = value;}
    };

    setChecked('coachToggle', this.coachEnabled);
    setChecked('moveHintsToggle', this.moveHintsEnabled);
    setChecked('coachSaysToggle', this.showCoachSays);
    setChecked('voiceToggle', this.voiceEnabled);
    setChecked('motivationToggle', this.motivationalMessages);
    setChecked('remindersToggle', this.threatReminders);
    const coachModeSelect = document.getElementById('coachModeSelect');
    if (coachModeSelect) {coachModeSelect.value = this.coachMode;}

    this.updateCoachDisplay();
  }

  updateCoachDisplay() {
    this.ui.updateCoachStatus({
      enabled: this.coachEnabled,
      modeLabel: this.coach.getModeLabel(),
      moveHintsEnabled: this.moveHintsEnabled
    });
  }

  toggleCoach(enabled) {
    this.coachEnabled = enabled;
    this.applyCoachSettings();
    this.updateCoachDisplay();
    this.saveSettings();
  }

  toggleMoveHints(enabled) {
    this.moveHintsEnabled = enabled;
    this.coach.setMoveHintsEnabled(enabled);
    if (!enabled) {this.ui.updateHighlights();}
    this.updateCoachDisplay();
    this.saveSettings();
  }

  toggleCoachSays(enabled) {
    this.showCoachSays = enabled;
    this.applyCoachSettings();
    this.saveSettings();
  }

  setCoachMode(mode) {
    this.coachMode = mode;
    this.coach.setInteractionMode(mode);
    this.updateCoachDisplay();
    this.saveSettings();
  }

  toggleVoice(enabled) {
    this.voiceEnabled = enabled;
    this.coach.setVoiceEnabled(enabled);
    this.saveSettings();
  }

  toggleMotivationalMessages(enabled) {
    this.motivationalMessages = enabled;
    this.coach.setMotivationalEnabled(enabled);
    this.saveSettings();
  }

  toggleThreatReminders(enabled) {
    this.threatReminders = enabled;
    this.coach.setRemindersEnabled(enabled);
    this.saveSettings();
  }

  applyTimerSettings(enabled, minutes) {
    this.enableTimer = enabled;
    this.timerMinutes = minutes;
    this.saveSettings();
    this.ui.showTimerDisplay(enabled);
    if (!enabled) {this.stopTimer();}
  }

  toggleTimerInEloModal(enabled) { this.enableTimer = enabled; }
  selectTimerDuration(minutes) { this.timerMinutes = minutes; }

  startTimer() {
    this.stopTimer();
    this.updateTimerDisplay();

    this.timerInterval = setInterval(() => {
      if (this.gameActive && this.board.currentTurn === this.playerColor) {
        this.timerSeconds--;
        this.updateTimerDisplay();
        if (this.timerSeconds <= 0) {
          this.stopTimer();
          this.handleTimeoutLoss();
        }
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
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

  updateDifficultyDisplay() {
    const config = this.ai.getConfig();
    const difficultyText = document.getElementById('difficultyText');
    if (difficultyText) {difficultyText.textContent = `${config.name} (${this.selectedElo})`;}
  }

  updateEloModalTimerUI() {
    const timerToggle = document.getElementById('eloTimerToggle');
    const timerOptions = document.getElementById('timerOptions');

    if (timerToggle) {timerToggle.checked = this.enableTimer;}
    if (timerOptions) {timerOptions.style.display = this.enableTimer ? 'flex' : 'none';}

    document.querySelectorAll('.timer-btn').forEach(btn => {
      btn.classList.toggle('selected', parseInt(btn.dataset.minutes) === this.timerMinutes);
    });
  }

  showCoachMessage(message, style = '', force = false, speak = false) {
    this.ui.showMessage(message, style, force);
    if (speak && this.voiceEnabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  }

  saveSession() {
    if (this.isPuzzleMode()) {
      const puzzleSession = this.puzzleSystem.exportSession();
      if (!puzzleSession) {return;}
      localStorage.setItem(this.storageKeys.session, JSON.stringify({
        kind: 'puzzle',
        currentMode: this.currentMode,
        boardState: this.board.serializeState(),
        puzzleSession
      }));
      return;
    }

    if (!this.gameActive) {return;}

    const payload = {
      kind: 'standard',
      selectedElo: this.selectedElo,
      playerColor: this.playerColor,
      aiColor: this.aiColor,
      enableTimer: this.enableTimer,
      timerMinutes: this.timerMinutes,
      timerSeconds: this.timerSeconds,
      gameActive: this.gameActive,
      boardState: this.board.serializeState(),
      coachState: this.coach.exportState()
    };

    localStorage.setItem(this.storageKeys.session, JSON.stringify(payload));
  }

  restoreSavedSession() {
    try {
      const stored = localStorage.getItem(this.storageKeys.session);
      if (!stored) {return false;}

      const session = JSON.parse(stored);
      if (session?.kind === 'puzzle') {
        const restoredPuzzleSession = this.puzzleSystem.restoreSession(session.puzzleSession, session.boardState);
        if (!restoredPuzzleSession) {return false;}

        this.currentMode = restoredPuzzleSession.type;
        this.lastCompletedMode = restoredPuzzleSession.type;
        if (restoredPuzzleSession.type === 'practice') {this.lastPuzzleReplayMode = { type: 'practice', filters: { ...(restoredPuzzleSession.filters || {}) } };}
        if (restoredPuzzleSession.type === 'daily') {this.lastPuzzleReplayMode = { type: 'daily' };}
        if (restoredPuzzleSession.type === 'rush') {this.lastPuzzleReplayMode = { type: 'rush', mode: restoredPuzzleSession.rush?.mode || '3m' };}
        if (restoredPuzzleSession.type === 'duel') {this.lastPuzzleReplayMode = { type: 'duel' };}

        this.gameActive = false;
        this.ui.hideEloModal();
        this.ui.setPuzzleModeActive(true);
        this.ui.setFlipped(restoredPuzzleSession.playerColor === BLACK);
        this.ui.refresh();
        this.ui.clearSelection();
        this.ui.setTurnIndicatorText(this.getPuzzleModeLabel(restoredPuzzleSession), '🧩');
        this.refreshPuzzlePanel();
        this.showCoachMessage('Resumed your puzzle session right where you left it.', 'encouraging', true);
        this.startPuzzleTimer();
        return true;
      }

      if (!session?.boardState?.board) {return false;}

      this.selectedElo = session.selectedElo || 1200;
      this.playerColor = session.playerColor || WHITE;
      this.aiColor = session.aiColor || BLACK;
      this.enableTimer = session.enableTimer === true;
      this.timerMinutes = session.timerMinutes || 10;
      this.timerSeconds = Number.isInteger(session.timerSeconds) ? session.timerSeconds : this.timerMinutes * 60;

      this.board.loadState(session.boardState);
      this.coach.importState(session.coachState);
      this.applyCoachSettings();
      this.currentMode = 'standard';
      this.ui.setPuzzleModeActive(false);
      this.ui.setFlipped(this.playerColor === BLACK);
      this.ui.showTimerDisplay(this.enableTimer);
      this.updateTimerDisplay();
      this.ui.refresh();
      this.ui.updateTurnIndicator(this.board.currentTurn, this.board.isInCheck());
      this.gameActive = session.gameActive !== false;
      this.updateDifficultyDisplay();
      this.updateSettingsUI();

      this.showCoachMessage('Resumed your unfinished game. The board, coach state, and review notes are right where you left them.', 'encouraging', true);
      if (this.enableTimer && this.gameActive) {this.startTimer();}
      return true;
    } catch { /* istanbul ignore next */ 
      this.clearSavedSession();
      return false;
    }
  }

  clearSavedSession() {
    localStorage.removeItem(this.storageKeys.session);
  }

  handleTimeoutLoss() {
    this.gameActive = false;
    this.lastCompletedMode = 'standard';
    this.progress?.recordGamePlayed();
    this.progress?.updatePlayerElo(this.selectedElo, 0);
    this.currentStreak = 0;
    this.coach.setSkillLevel(this.progress?.getStats().playerElo || 1200);
    this.showCoachMessage("Time's up. Review the game and look for the moments where you spent time without improving the position.", 'warning');
    this.ui.showGameOverModal('Game Over', 'You lost on time.', { showReview: true });
    this.latestReview = this.coach.buildPostGameReview({
      outcome: 'You lost on time.',
      opponent: this.ai.getConfig().name,
      playerColor: this.playerColor
    });
    this.saveReview(this.latestReview);
    this.clearSavedSession();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new ChessApp();
  app.init();
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ChessApp };
}
if (typeof window !== 'undefined') {
  window.ChessApp = ChessApp;
}
