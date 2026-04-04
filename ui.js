/**
 * ui.js - User Interface Management
 *
 * Handles all DOM interaction: rendering the board, painting pieces,
 * wiring up buttons and modals, and displaying coach messages.
 * The app class calls these methods â€” this file doesn't make game decisions.
 */

class ChessUI {
  constructor() {
    // DOM element references (populated in init())
    this.boardElement = null;
    this.messageElement = null;
    this.turnTextElement = null;
    this.turnPieceElement = null;
    this.timerDisplay = null;
    this.timerValue = null;
    this.promotionModal = null;
    this.gameOverModal = null;
    this.eloModal = null;
    this.aiThinking = null;
    this.progressModal = null;
    this.reviewModal = null;
    this.helpModal = null;
    this.puzzleHelpModal = null;
    this.puzzleHubModal = null;

    // State
    this.selectedSquare = null;
    this.draggedPiece = null;
    this.flipped = false;   // false = White at bottom, true = Black at bottom
    this.svgLoaded = false;  // Board waits for SVGs before first render

    // Cached piece SVGs (loaded once at startup)
    this.pieceSVGs = {};

    // Callbacks â€” set by app.js so the UI can push events back up
    this.onSquareClick = null;
    this.onPromotionChoice = null;
    this.onNewGame = null;
    this.onPlayAgain = null;
    this.onUndo = null;
    this.onCoachToggle = null;
    this.onEloSelect = null;
    this.onColorSelect = null;
    this.onShowProgress = null;
    this.onResetProgress = null;
    this.onCloseProgress = null;
    this.onCloseEloModal = null;
    this.onCloseGameOver = null;
    this.onCoachSaysToggle = null;
    this.onTimerToggle = null;   // Timer on/off inside the ELO modal
    this.onTimerSelect = null;   // Duration button inside the ELO modal
    this.onMoveHintsToggle = null;
    this.onCoachModeSelect = null;
    this.onVoiceToggle = null;
    this.onMotivationToggle = null;
    this.onRemindersToggle = null;
    this.onShowReview = null;
    this.onCloseReview = null;
    this.onRequestHint = null;
    this.onShowHelp = null;
    this.onCloseHelp = null;
    this.onShowPuzzleHelp = null;
    this.onClosePuzzleHelp = null;
    this.onShowPuzzleHub = null;
    this.onClosePuzzleHub = null;
    this.onStartStandardMode = null;
    this.onStartDailyPuzzle = null;
    this.onStartPuzzleRush = null;
    this.onStartPuzzleDuel = null;
    this.onStartPracticePuzzle = null;
    this.onRetryPuzzle = null;
    this.onShowPuzzleHint = null;
    this.onShowPuzzleSolution = null;
    this.onNextPuzzle = null;
    this.onToggleFavoritePuzzle = null;
    this.onShareDailyResult = null;
    this.onSetDuelPlayer = null;
    this.onStartFavoritePuzzle = null;
    this.onPuzzleBrowserChange = null;
    this.onLoadMorePuzzles = null;
    this.onPreviewPuzzle = null;
    this.onClosePuzzlePreview = null;
    this.onStartPreviewPuzzle = null;
    this.onToggleBrowserFavorite = null;
  }

  /**
   * Grab DOM references and kick off SVG loading.
   * The board won't render until every piece SVG is ready.
   */
  init() {
    this.boardElement = document.getElementById('chessboard');
    this.messageElement = document.getElementById('coachMessage');
    this.turnTextElement = document.getElementById('turnText');
    this.turnPieceElement = document.getElementById('turnPiece');
    this.timerDisplay = document.getElementById('timerDisplay');
    this.timerValue = document.getElementById('playerTimer');
    this.promotionModal = document.getElementById('promotionModal');
    this.gameOverModal = document.getElementById('gameOverModal');
    this.eloModal = document.getElementById('eloModal');
    this.aiThinking = document.getElementById('aiThinking');
    this.progressModal = document.getElementById('progressModal');
    this.reviewModal = document.getElementById('reviewModal');
    this.helpModal = document.getElementById('helpModal');
    this.puzzleHelpModal = document.getElementById('puzzleHelpModal');
    this.puzzleHubModal = document.getElementById('puzzleHubModal');

    this.setupEventListeners();
    this.loadPieceSVGs();
  }

  /**
   * Fetch all 12 piece SVGs from the assets folder.
   * Falls back to a generated placeholder if a file is missing.
   */
  loadPieceSVGs() {
    const pieces = ['wP','bP','wR','bR','wN','bN','wB','bB','wQ','bQ','wK','bK'];
    let loadedCount = 0;

    pieces.forEach(piece => {
      fetch(`assets/pieces/${piece}.svg`)
        .then(response => {
          if (!response.ok) {throw new Error('SVG not found');}
          return response.text();
        })
        .then(svgContent => {
          const parser = new DOMParser();
          const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
          const svgElement = svgDoc.querySelector('svg');

          if (svgElement) {
            // Re-wrap the inner paths/groups in a clean SVG wrapper
            let innerContent = '';
            for (const child of svgElement.children) {innerContent += child.outerHTML;}
            this.pieceSVGs[piece] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">${innerContent}</svg>`;
          } else {
            throw new Error('No SVG element found');
          }
        })
        .catch(() => {
          this.pieceSVGs[piece] = this.createPlaceholderPiece(piece);
        })
        .finally(() => {
          loadedCount++;
          if (loadedCount >= pieces.length) {
            this.svgLoaded = true;
            this.renderBoard();
          }
        });
    });
  }

  /**
   * Generate a simple circular placeholder when an SVG file can't be loaded.
   */
  createPlaceholderPiece(pieceCode) {
    const color = pieceCode[0] === 'w' ? '#ffffff' : '#333333';
    const stroke = pieceCode[0] === 'w' ? '#333333' : '#ffffff';
    const pieceType = pieceCode[1].toUpperCase();
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <circle cx="22.5" cy="22.5" r="18" fill="${color}" stroke="${stroke}" stroke-width="2"/>
      <text x="22.5" y="28" text-anchor="middle" font-size="20" fill="${stroke}" font-weight="bold">${pieceType}</text>
    </svg>`;
  }

  // ============================================
  // Event Wiring
  // ============================================

  setupEventListeners() {
    // Board clicks delegate to app.js
    this.boardElement.addEventListener('click', (e) => {
      const square = e.target.closest('.square');
      if (square) {this.onSquareClick?.(parseInt(square.dataset.row), parseInt(square.dataset.col));}
    });

    // Core buttons
    document.getElementById('undoBtn')?.addEventListener('click', () => this.onUndo?.());
    document.getElementById('resetBtn')?.addEventListener('click', () => this.onNewGame?.());
    document.getElementById('newGameBtn')?.addEventListener('click', () => this.onPlayAgain?.());

    // Coach mode toggle
    document.getElementById('coachToggle')?.addEventListener('change', (e) => {
      document.getElementById('coachStatus').textContent = e.target.checked ? 'ON' : 'OFF';
      this.onCoachToggle?.(e.target.checked);
    });

    // Promotion modal â€” buttons are populated dynamically based on color
    document.querySelectorAll('.promotion-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.promotionModal.classList.add('hidden');
        this.onPromotionChoice?.(btn.dataset.piece);
      });
    });

    // ELO difficulty buttons
    document.querySelectorAll('.elo-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.onEloSelect?.(parseInt(btn.dataset.elo));
        document.querySelectorAll('.elo-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });

    // Color selection (White / Black)
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.addEventListener('click', () => this.onColorSelect?.(btn.dataset.color));
    });

    // Close buttons
    document.getElementById('closeEloBtn')?.addEventListener('click', () => this.onCloseEloModal?.());
    document.getElementById('closeGameOverBtn')?.addEventListener('click', () => this.onCloseGameOver?.());
    document.getElementById('progressBtn')?.addEventListener('click', () => this.onShowProgress?.());
    document.getElementById('reviewBtn')?.addEventListener('click', () => this.onShowReview?.());
    document.getElementById('helpBtn')?.addEventListener('click', () => this.onShowHelp?.());
    document.getElementById('puzzleHelpBtn')?.addEventListener('click', () => this.onShowPuzzleHelp?.());
    document.getElementById('standardModeBtn')?.addEventListener('click', () => this.onStartStandardMode?.());
    document.getElementById('puzzlesModeBtn')?.addEventListener('click', () => this.onShowPuzzleHub?.());
    document.getElementById('dailyPuzzleBtn')?.addEventListener('click', () => this.onStartDailyPuzzle?.());
    document.getElementById('puzzleRushBtn')?.addEventListener('click', () => this.onStartPuzzleRush?.('3m'));
    document.getElementById('puzzleDuelBtn')?.addEventListener('click', () => this.onStartPuzzleDuel?.());
    document.getElementById('resetProgressBtn')?.addEventListener('click', () => this.onResetProgress?.());
    document.getElementById('closeProgressBtn')?.addEventListener('click', () => this.onCloseProgress?.());
    document.getElementById('openReviewBtn')?.addEventListener('click', () => this.onShowReview?.());
    document.getElementById('reviewGameBtn')?.addEventListener('click', () => this.onShowReview?.());
    document.getElementById('closeReviewBtn')?.addEventListener('click', () => this.onCloseReview?.());
    document.getElementById('closeHelpBtn')?.addEventListener('click', () => this.onCloseHelp?.());
    document.getElementById('closePuzzleHelpBtn')?.addEventListener('click', () => this.onClosePuzzleHelp?.());
    document.getElementById('closePuzzleHubBtn')?.addEventListener('click', () => this.onClosePuzzleHub?.());
    document.getElementById('coachHintBtn')?.addEventListener('click', () => this.onRequestHint?.());
    document.getElementById('startPracticePuzzleBtn')?.addEventListener('click', () => this.onStartPracticePuzzle?.());
    document.getElementById('startDailyPuzzleBtn')?.addEventListener('click', () => this.onStartDailyPuzzle?.());
    document.getElementById('rush3Btn')?.addEventListener('click', () => this.onStartPuzzleRush?.('3m'));
    document.getElementById('rush5Btn')?.addEventListener('click', () => this.onStartPuzzleRush?.('5m'));
    document.getElementById('rushSurvivalBtn')?.addEventListener('click', () => this.onStartPuzzleRush?.('survival'));
    document.getElementById('startDuelBtn')?.addEventListener('click', () => this.onStartPuzzleDuel?.());
    document.getElementById('retryPuzzleBtn')?.addEventListener('click', () => this.onRetryPuzzle?.());
    document.getElementById('showPuzzleHintBtn')?.addEventListener('click', () => this.onShowPuzzleHint?.());
    document.getElementById('showPuzzleSolutionBtn')?.addEventListener('click', () => this.onShowPuzzleSolution?.());
    document.getElementById('nextPuzzleBtn')?.addEventListener('click', () => this.onNextPuzzle?.());
    document.getElementById('favoritePuzzleBtn')?.addEventListener('click', () => this.onToggleFavoritePuzzle?.());
    document.getElementById('shareDailyResultBtn')?.addEventListener('click', () => this.onShareDailyResult?.());
    document.getElementById('duelPlayerOneBtn')?.addEventListener('click', () => this.onSetDuelPlayer?.('p1'));
    document.getElementById('duelPlayerTwoBtn')?.addEventListener('click', () => this.onSetDuelPlayer?.('p2'));
    document.getElementById('loadMorePuzzlesBtn')?.addEventListener('click', () => this.onLoadMorePuzzles?.());
    document.getElementById('closePuzzlePreviewBtn')?.addEventListener('click', () => this.onClosePuzzlePreview?.());
    document.getElementById('startPreviewPuzzleBtn')?.addEventListener('click', () => this.onStartPreviewPuzzle?.());

    ['puzzleSearchInput', 'browserCategorySelect', 'browserTierSelect', 'browserThemeSelect', 'browserPackSelect', 'browserSortSelect', 'browserMinRatingInput', 'browserMaxRatingInput', 'browserFavoritesOnlyToggle']
      .forEach(id => {
        const eventName = id === 'puzzleSearchInput' || id.endsWith('Input') ? 'input' : 'change';
        document.getElementById(id)?.addEventListener(eventName, () => this.onPuzzleBrowserChange?.());
      });

    // Settings toggles
    document.getElementById('coachSaysToggle')?.addEventListener('change', (e) => this.onCoachSaysToggle?.(e.target.checked));
    document.getElementById('moveHintsToggle')?.addEventListener('change', (e) => this.onMoveHintsToggle?.(e.target.checked));
    document.getElementById('coachModeSelect')?.addEventListener('change', (e) => this.onCoachModeSelect?.(e.target.value));
    document.getElementById('voiceToggle')?.addEventListener('change', (e) => this.onVoiceToggle?.(e.target.checked));
    document.getElementById('motivationToggle')?.addEventListener('change', (e) => this.onMotivationToggle?.(e.target.checked));
    document.getElementById('remindersToggle')?.addEventListener('change', (e) => this.onRemindersToggle?.(e.target.checked));

    // Timer controls inside the ELO modal
    document.getElementById('eloTimerToggle')?.addEventListener('change', (e) => {
      const timerOptions = document.getElementById('timerOptions');
      if (timerOptions) {timerOptions.style.display = e.target.checked ? 'flex' : 'none';}
      this.onTimerToggle?.(e.target.checked);
    });

    document.querySelectorAll('.timer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.onTimerSelect?.(parseInt(btn.dataset.minutes));
        document.querySelectorAll('.timer-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd+Z = undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        this.onUndo?.();
      }
      // Escape = close modals or deselect
      if (e.key === 'Escape') {
        const eloModal = document.getElementById('eloModal');
        if (eloModal && !eloModal.classList.contains('hidden')) {
          this.onCloseEloModal?.();
          return;
        }
        const gameOverModal = document.getElementById('gameOverModal');
        if (gameOverModal && !gameOverModal.classList.contains('hidden')) {
          this.onCloseGameOver?.();
          return;
        }
        const reviewModal = document.getElementById('reviewModal');
        if (reviewModal && !reviewModal.classList.contains('hidden')) {
          this.onCloseReview?.();
          return;
        }
        const helpModal = document.getElementById('helpModal');
        if (helpModal && !helpModal.classList.contains('hidden')) {
          this.onCloseHelp?.();
          return;
        }
        const puzzleHelpModal = document.getElementById('puzzleHelpModal');
        if (puzzleHelpModal && !puzzleHelpModal.classList.contains('hidden')) {
          this.onClosePuzzleHelp?.();
          return;
        }
        const puzzleHubModal = document.getElementById('puzzleHubModal');
        if (puzzleHubModal && !puzzleHubModal.classList.contains('hidden')) {
          const puzzlePreviewModal = document.getElementById('puzzlePreviewModal');
          if (puzzlePreviewModal && !puzzlePreviewModal.classList.contains('hidden')) {
            this.onClosePuzzlePreview?.();
            return;
          }
          this.onClosePuzzleHub?.();
          return;
        }
        this.selectedSquare = null;
        this.renderBoard();
      }
    });
  }

  // ============================================
  // Board Rendering
  // ============================================

  /**
   * Build the 8Ã—8 grid from scratch. Called after SVGs load,
   * after every move, and when the board is flipped.
   */
  renderBoard() {
    if (!this.boardElement) {return;}
    this.boardElement.innerHTML = '';

    // When flipped (playing as Black), reverse the render order
    const rows = this.flipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];
    const cols = this.flipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];

    for (const boardRow of rows) {
      for (const boardCol of cols) {
        const displayRow = this.flipped ? 7 - boardRow : boardRow;
        const displayCol = this.flipped ? 7 - boardCol : boardCol;

        const square = document.createElement('div');
        square.className = `square ${(displayRow + displayCol) % 2 === 0 ? 'light' : 'dark'}`;
        square.dataset.row = boardRow;
        square.dataset.col = boardCol;

        const piece = window.chessApp?.board?.getPiece(boardRow, boardCol);
        if (piece) {square.appendChild(this.createPieceElement(piece));}

        this.boardElement.appendChild(square);
      }
    }

    this.updateBoardLabels();
    this.updateHighlights();
  }

  /**
   * Swap the file/rank labels when the board is flipped so they
   * always read correctly from the player's perspective.
   */
  updateBoardLabels() {
    const filesEl = document.querySelector('.board-labels.files');
    const ranksEl = document.querySelector('.board-labels.ranks');

    if (filesEl) {
      const files = ['a','b','c','d','e','f','g','h'];
      filesEl.innerHTML = this.flipped
        ? [...files].reverse().map(f => `<span>${f}</span>`).join('')
        : files.map(f => `<span>${f}</span>`).join('');
    }
    if (ranksEl) {
      const ranks = ['8','7','6','5','4','3','2','1'];
      ranksEl.innerHTML = this.flipped
        ? [...ranks].reverse().map(r => `<span>${r}</span>`).join('')
        : ranks.map(r => `<span>${r}</span>`).join('');
    }
  }

  setFlipped(flipped) { this.flipped = flipped; this.renderBoard(); }

  /**
   * Build a DOM element for a chess piece using the cached SVG.
   * Also wires up drag-start events.
   */
  createPieceElement(piece) {
    const color = piece === piece.toUpperCase() ? 'w' : 'b';
    const pieceType = piece.toUpperCase();
    const pieceCode = color + pieceType;  // e.g. "wR", "bN"

    const container = document.createElement('div');
    container.className = 'piece';
    container.draggable = true;

    if (this.pieceSVGs[pieceCode]) {
      container.innerHTML = this.pieceSVGs[pieceCode];
    } else {
      container.textContent = piece;
    }

    // Drag events â€” the app handles the actual drop logic
    container.addEventListener('dragstart', (e) => {
      this.draggedPiece = {
        row: parseInt(container.parentElement.dataset.row),
        col: parseInt(container.parentElement.dataset.col),
        piece
      };
      container.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    container.addEventListener('dragend', () => {
      container.classList.remove('dragging');
      this.draggedPiece = null;
    });

    return container;
  }

  /**
   * Paint highlights on the board: selected piece, legal move dots,
   * last-move glow, and check warning on the king.
   */
  updateHighlights() {
    if (!this.boardElement || this.boardElement.children.length === 0) {return;}

    // Strip every highlight class first â€” clean slate
    this.boardElement.querySelectorAll('.square').forEach(sq => {
      sq.classList.remove('selected', 'legal-move', 'last-move', 'check', 'hint', 'capture');
    });

    const board = window.chessApp?.board;
    const coach = window.chessApp?.coach;
    if (!board) {return;}

    // Selected square + its legal moves
    if (this.selectedSquare) {
      const { row, col } = this.selectedSquare;
      const square = this.getSquareElement(row, col);
      const piece = board.getPiece(row, col);
      square?.classList.add('selected');

      if (coach?.isMoveHintsEnabled() && piece && board.isOwnPiece(piece)) {
        board.generateLegalMovesForPiece(row, col).forEach(move => {
          const target = this.getSquareElement(move.to.row, move.to.col);
          if (target) {
            target.classList.add('legal-move');
            if (move.capture) {target.classList.add('capture');}
          }
        });
      }
    }

    // Last move â€” highlight both the origin and destination
    const lastMove = board.moveHistory.length > 0 ? board.moveHistory[board.moveHistory.length - 1] : null;
    if (lastMove?.move?.from && lastMove.move.to) {
      this.getSquareElement(lastMove.move.from.row, lastMove.move.from.col)?.classList.add('last-move');
      this.getSquareElement(lastMove.move.to.row, lastMove.move.to.col)?.classList.add('last-move');
    }

    // King in check
    if (board.isInCheck()) {
      const kingPos = board.findKing(board.currentTurn);
      if (kingPos) {this.getSquareElement(kingPos.row, kingPos.col)?.classList.add('check');}
    }
  }

  getSquareElement(row, col) {
    return this.boardElement?.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
  }

  refresh() { this.renderBoard(); }

  // ============================================
  // Message Display
  // ============================================

  /**
   * Show a coach message in the side panel.
   * `force: true` bypasses the "Coach Says" setting â€” used for the
   * initial welcome message so players always see the difficulty.
   */
  showMessage(message, style = '', force = false) {
    if (!this.messageElement) {return;}

    const app = window.chessApp;
    if (!force && app && !app.showCoachSays) {return;}

    this.messageElement.classList.remove('good', 'warning', 'encouraging');
    if (style) {this.messageElement.classList.add(style);}

    // Fade transition
    this.messageElement.style.opacity = '0';
    setTimeout(() => {
      this.messageElement.innerHTML = `<p>${message}</p>`;
      this.messageElement.style.opacity = '1';
    }, 200);
  }

  updateCoachStatus(details = {}) {
    const coachStatus = document.getElementById('coachStatus');
    const coachModeLabel = document.getElementById('coachModeLabel');
    const coachPersonaMode = document.getElementById('coachPersonaMode');
    const moveHintsStatus = document.getElementById('moveHintsStatus');

    if (coachStatus) {coachStatus.textContent = details.enabled ? 'ON' : 'OFF';}
    if (coachModeLabel) {coachModeLabel.textContent = details.modeLabel || 'Guided';}
    if (coachPersonaMode) {coachPersonaMode.textContent = details.modeLabel || 'Guided';}
    if (moveHintsStatus) {moveHintsStatus.textContent = details.moveHintsEnabled ? 'ON' : 'OFF';}
  }

  clearMessage() { this.showMessage(''); }

  // ============================================
  // Turn Indicator
  // ============================================

  updateTurnIndicator(color, inCheck = false) {
    if (!this.turnTextElement || !this.turnPieceElement) {return;}

    const piece = color === WHITE ? '♔' : '♚';
    const name = color === WHITE ? "White" : "Black";

    if (inCheck) {
      this.turnTextElement.textContent = `${name}'s Turn - CHECK!`;
      this.turnTextElement.style.color = '#f44336';
    } else {
      this.turnTextElement.textContent = `${name}'s Turn`;
      this.turnTextElement.style.color = 'white';
    }
    this.turnPieceElement.textContent = piece;
  }

  setTurnIndicatorText(text, piece = '♟') {
    if (!this.turnTextElement || !this.turnPieceElement) {return;}
    this.turnTextElement.textContent = text;
    this.turnTextElement.style.color = 'white';
    this.turnPieceElement.textContent = piece;
  }

  // ============================================
  // Selection
  // ============================================

  selectSquare(row, col) { this.selectedSquare = { row, col }; this.updateHighlights(); }
  clearSelection() { this.selectedSquare = null; this.updateHighlights(); }

  // ============================================
  // Modals
  // ============================================

  showPromotionModal(color) {
    if (!this.promotionModal) {return;}
    const pieces = color === WHITE ? ['♕','♖','♗','♘'] : ['♛','♜','♝','♞'];
    this.promotionModal.querySelectorAll('.promotion-btn').forEach((btn, i) => { btn.textContent = pieces[i]; });
    this.promotionModal.classList.remove('hidden');
  }

  hidePromotionModal() { this.promotionModal?.classList.add('hidden'); }

  showGameOverModal(title, message, options = {}) {
    if (!this.gameOverModal) {return;}
    const reviewButton = document.getElementById('reviewGameBtn');
    const playAgainButton = document.getElementById('newGameBtn');
    const showReview = options.showReview !== false;
    document.getElementById('gameOverTitle').textContent = title;
    document.getElementById('gameOverMessage').textContent = message;
    if (reviewButton) {reviewButton.classList.toggle('hidden', !showReview);}
    if (playAgainButton) {playAgainButton.classList.toggle('full-width', !showReview);}
    this.gameOverModal.classList.remove('hidden');
  }

  hideGameOverModal() { this.gameOverModal?.classList.add('hidden'); }

  showEloModal() { if (this.eloModal) {this.eloModal.classList.remove('hidden');} }
  hideEloModal() { this.eloModal?.classList.add('hidden'); }

  showProgressModal(showing) {
    if (!this.progressModal) {return;}
    this.progressModal.classList.toggle('hidden', !showing);
  }

  hideProgressModal() { this.showProgressModal(false); }

  showReviewModal(showing) {
    if (!this.reviewModal) {return;}
    this.reviewModal.classList.toggle('hidden', !showing);
  }

  hideReviewModal() { this.showReviewModal(false); }

  showHelpModal(showing) {
    if (!this.helpModal) {return;}
    if (showing) {this.hidePuzzleHelpModal();}
    this.helpModal.classList.toggle('hidden', !showing);
  }

  hideHelpModal() { this.showHelpModal(false); }

  showPuzzleHelpModal(showing) {
    if (!this.puzzleHelpModal) {return;}
    if (showing) {this.hideHelpModal();}
    this.puzzleHelpModal.classList.toggle('hidden', !showing);
  }

  hidePuzzleHelpModal() { this.showPuzzleHelpModal(false); }

  showPuzzleHubModal(showing) {
    if (!this.puzzleHubModal) {return;}
    this.puzzleHubModal.classList.toggle('hidden', !showing);
  }

  hidePuzzleHubModal() { this.showPuzzleHubModal(false); }

  populatePuzzleSelectors({ categories = [], packs = [] } = {}) {
    const applyOptions = (elementId, options) => {
      const element = document.getElementById(elementId);
      if (!element) {return;}
      const previousValue = element.value;
      element.innerHTML = options.map(option => `<option value="${option.value}">${option.label}</option>`).join('');
      if (options.some(option => option.value === previousValue)) {
        element.value = previousValue;
      }
    };

    applyOptions('puzzleCategorySelect', categories);
    applyOptions('puzzlePackSelect', packs);
  }

  populatePuzzleBrowserSelectors({ categories = [], packs = [], themes = [] } = {}) {
    const applyOptions = (elementId, options) => {
      const element = document.getElementById(elementId);
      if (!element) {return;}
      const previousValue = element.value;
      element.innerHTML = options.map(option => `<option value="${option.value}">${option.label}</option>`).join('');
      if (options.some(option => option.value === previousValue)) {
        element.value = previousValue;
      }
    };

    applyOptions('browserCategorySelect', categories);
    applyOptions('browserPackSelect', [{ value: 'all', label: 'All Packs' }, { value: 'favorite-puzzles', label: 'Favorite Puzzles' }, ...packs.filter(option => option.value !== 'all' && option.value !== 'favorite-puzzles')]);
    applyOptions('browserThemeSelect', themes);
  }

  getPuzzleFilters() {
    return {
      tier: document.getElementById('puzzleTierSelect')?.value || 'all',
      category: document.getElementById('puzzleCategorySelect')?.value || 'all',
      pack: document.getElementById('puzzlePackSelect')?.value || 'all'
    };
  }

  getPuzzleBrowserFilters() {
    return {
      search: document.getElementById('puzzleSearchInput')?.value || '',
      category: document.getElementById('browserCategorySelect')?.value || 'all',
      tier: document.getElementById('browserTierSelect')?.value || 'all',
      theme: document.getElementById('browserThemeSelect')?.value || 'all',
      pack: document.getElementById('browserPackSelect')?.value || 'all',
      sort: document.getElementById('browserSortSelect')?.value || 'rating-asc',
      minRating: document.getElementById('browserMinRatingInput')?.value || '',
      maxRating: document.getElementById('browserMaxRatingInput')?.value || '',
      favoritesOnly: document.getElementById('browserFavoritesOnlyToggle')?.checked || false
    };
  }

  updatePuzzleDashboard(data = {}) {
    const leaderboard = document.getElementById('leaderboardSummary');
    const achievementGrid = document.getElementById('achievementGrid');
    const packCards = document.getElementById('puzzlePackCards');
    const favoriteList = document.getElementById('favoritePuzzleList');

    if (leaderboard) {
      leaderboard.innerHTML = (data.leaderboards || []).map(item => `
        <div class="leaderboard-row">
          <span>${item.label}</span>
          <strong>${item.value}</strong>
        </div>
      `).join('');
    }

    if (achievementGrid) {
      achievementGrid.innerHTML = (data.achievements || []).map(item => `
        <article class="achievement-card ${item.unlocked ? 'unlocked' : ''}">
          <strong>${item.name}</strong>
          <p>${item.description}</p>
        </article>
      `).join('');
    }

    if (packCards) {
      packCards.innerHTML = (data.packs || []).map(item => `
        <button class="pack-card" data-pack="${item.id}">
          <strong>${item.name}</strong>
          <span>${item.count} puzzles</span>
        </button>
      `).join('');

      packCards.querySelectorAll('.pack-card').forEach(button => {
        button.addEventListener('click', () => {
          const packSelect = document.getElementById('puzzlePackSelect');
          if (packSelect) {packSelect.value = button.dataset.pack;}
        });
      });
    }

    if (favoriteList) {
      const favorites = data.favorites || [];
      if (favorites.length === 0) {
        favoriteList.innerHTML = `
          <div class="empty-state-card">
            <p>You haven't favorited any puzzles yet. Tap the &#9733; icon on a puzzle to add it to your Favorites.</p>
          </div>
        `;
      } else {
        favoriteList.innerHTML = favorites.map(item => `
          <button class="favorite-puzzle-card" data-puzzle-id="${item.id}">
            <div class="favorite-puzzle-top">
              <strong>${item.title}</strong>
              <span>${item.rating}</span>
            </div>
            <p>${item.prompt}</p>
            <div class="favorite-puzzle-meta">
              <span>${item.category.replace(/-/g, ' ')}</span>
              <span>${item.tier}</span>
              <span>${item.themes.join(', ')}</span>
            </div>
          </button>
        `).join('');

        favoriteList.querySelectorAll('.favorite-puzzle-card').forEach(button => {
          button.addEventListener('click', () => {
            this.onStartFavoritePuzzle?.(parseInt(button.dataset.puzzleId));
          });
        });
      }
    }
  }

  updateAllPuzzleBrowser(data = {}, filters = {}) {
    const list = document.getElementById('allPuzzleList');
    const resultCount = document.getElementById('puzzleBrowserResultCount');
    const loadMoreButton = document.getElementById('loadMorePuzzlesBtn');
    if (!list || !resultCount || !loadMoreButton) {return;}

    resultCount.textContent = `${data.total || 0} puzzles`;

    if (!data.items || data.items.length === 0) {
      const hint = this.buildEmptyFilterMessage(filters);
      list.innerHTML = `
        <div class="empty-state-card">
          <p>${hint}</p>
        </div>
      `;
      loadMoreButton.classList.add('hidden');
      return;
    }

    list.innerHTML = data.items.map(item => `
      <article class="all-puzzle-card" data-puzzle-id="${item.id}" tabindex="0" role="button" aria-label="Preview puzzle ${item.id}: ${item.title}">
        <div class="favorite-puzzle-top">
          <strong>${item.title}</strong>
          <div class="puzzle-card-top-actions">
            <span>${item.rating}</span>
            <button class="favorite-star-btn ${item.favorite ? 'active' : ''}" data-puzzle-id="${item.id}" aria-label="${item.favorite ? 'Remove from favorites' : 'Add to favorites'}">${item.favorite ? '&#9733;' : '&#9734;'}</button>
          </div>
        </div>
        <p>${item.prompt}</p>
        <div class="favorite-puzzle-meta">
          <span>${item.category.replace(/-/g, ' ')}</span>
          <span>${item.tier}</span>
          <span>${item.themes.join(', ')}</span>
          <span>Played ${item.playCount}</span>
        </div>
      </article>
    `).join('');

    list.querySelectorAll('.favorite-star-btn').forEach(button => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        this.onToggleBrowserFavorite?.(parseInt(button.dataset.puzzleId));
      });
    });

    list.querySelectorAll('.all-puzzle-card').forEach(button => {
      button.addEventListener('click', () => {
        this.onPreviewPuzzle?.(parseInt(button.dataset.puzzleId));
      });
      button.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          this.onPreviewPuzzle?.(parseInt(button.dataset.puzzleId));
        }
      });
    });

    loadMoreButton.classList.toggle('hidden', !data.hasMore);
  }

  buildEmptyFilterMessage(filters = {}) {
    const parts = [];
    if (filters.tier && filters.tier !== 'all') {parts.push(`tier "${filters.tier}"`);}
    if (filters.category && filters.category !== 'all') {parts.push(`category "${filters.category.replace(/-/g, ' ')}"`);}
    if (filters.theme && filters.theme !== 'all') {parts.push(`theme "${filters.theme.replace(/-/g, ' ')}"`);}
    if (filters.pack && filters.pack !== 'all') {parts.push(`pack "${filters.pack.replace(/-/g, ' ')}"`);}
    if (filters.favoritesOnly) {parts.push('favorites only');}
    if (filters.minRating || filters.maxRating) {
      const range = [filters.minRating, filters.maxRating].filter(Boolean).join('–');
      parts.push(`rating ${range}`);
    }
    if (filters.search) {parts.push(`search "${filters.search}"`);}

    if (parts.length === 0) {
      return 'No puzzles are available with the current filters. Try adjusting your criteria.';
    }

    return `No puzzles match ${parts.join(', ')}. Try broadening your filters — for example, select a different category, tier, or remove the search term.`;
  }

  showPuzzlePreviewModal(showing) {
    document.getElementById('puzzlePreviewModal')?.classList.toggle('hidden', !showing);
  }

  hidePuzzlePreviewModal() { this.showPuzzlePreviewModal(false); }

  updatePuzzlePreview(puzzle) {
    const title = document.getElementById('puzzlePreviewTitle');
    const prompt = document.getElementById('puzzlePreviewPrompt');
    const meta = document.getElementById('puzzlePreviewMeta');
    const board = document.getElementById('puzzlePreviewBoard');
    const startButton = document.getElementById('startPreviewPuzzleBtn');
    if (!title || !prompt || !meta || !board || !startButton || !puzzle) {return;}

    title.textContent = puzzle.title;
    prompt.textContent = puzzle.prompt;
    startButton.dataset.puzzleId = String(puzzle.id);
    meta.innerHTML = `
      <span>ID ${puzzle.id}</span>
      <span>Rating ${puzzle.rating}</span>
      <span>${puzzle.category.replace(/-/g, ' ')}</span>
      <span>${puzzle.tier}</span>
      <span>${(puzzle.theme || []).join(', ')}</span>
    `;
    board.innerHTML = this.renderFenPreview(puzzle.fen);
  }

  renderFenPreview(fen) {
    const pieceMap = {
      p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚',
      P: '♙', R: '♖', N: '♘', B: '♗', Q: '♕', K: '♔'
    };
    const placement = (fen || '').split(' ')[0] || '';
    const rows = placement.split('/');
    return rows.map((row, rowIndex) => {
      const squares = [];
      row.split('').forEach(symbol => {
        if (/\d/.test(symbol)) {
          for (let i = 0; i < Number(symbol); i++) {squares.push('');}
        } else {
          squares.push(pieceMap[symbol] || '');
        }
      });
      return squares.map((piece, colIndex) => `
        <div class="mini-fen-square ${(rowIndex + colIndex) % 2 === 0 ? 'light' : 'dark'}">${piece}</div>
      `).join('');
    }).join('');
  }

  setPuzzleModeActive(active) {
    const gameControlsSection = document.getElementById('gameControlsSection');
    const coachModeSection = document.getElementById('coachModeSection');
    const puzzlePanel = document.getElementById('puzzlePanel');
    const turnIndicatorCard = document.getElementById('turnIndicatorCard');
    const difficultyDisplayCard = document.getElementById('difficultyDisplayCard');
    const coachActions = document.querySelector('.coach-actions');
    const leftPanel = document.querySelector('.left-panel');
    document.body?.classList.toggle('puzzle-mode-active', active);
    leftPanel?.classList.toggle('puzzle-layout-active', active);

    if (gameControlsSection) {
      gameControlsSection.classList.toggle('hidden', active);
      gameControlsSection.hidden = active;
      gameControlsSection.style.display = active ? 'none' : '';
      gameControlsSection.setAttribute('aria-hidden', active ? 'true' : 'false');
    }

    if (puzzlePanel) {
      puzzlePanel.classList.toggle('hidden', !active);
      puzzlePanel.hidden = !active;
      puzzlePanel.style.display = active ? '' : 'none';
      puzzlePanel.setAttribute('aria-hidden', active ? 'false' : 'true');
    }

    [coachModeSection, turnIndicatorCard, difficultyDisplayCard].forEach((element) => {
      if (!element) {return;}
      element.classList.toggle('hidden', active);
      element.hidden = active;
      element.style.display = active ? 'none' : '';
      element.setAttribute('aria-hidden', active ? 'true' : 'false');
    });

    if (coachActions) {
      coachActions.classList.toggle('hidden', active);
      coachActions.hidden = active;
      coachActions.style.display = active ? 'none' : '';
      coachActions.setAttribute('aria-hidden', active ? 'true' : 'false');
    }
  }

  updatePuzzlePanel(details = {}) {
    const setText = (id, value) => {
      const element = document.getElementById(id);
      if (element) {element.textContent = value;}
    };
    const secondaryMeta = document.getElementById('puzzleSecondaryMeta');
    const metaChips = [
      details.categoryLabel ? `Category: ${details.categoryLabel}` : '',
      details.tierLabel ? `Tier: ${details.tierLabel}` : '',
      `Mistakes: ${details.mistakes ?? 0}`
    ].filter(Boolean);

    setText('puzzleModeText', details.mode || 'Practice');
    setText('puzzleRatingText', details.rating ?? '1200');
    setText('puzzleScoreText', details.score ?? '0');
    setText('puzzleTitle', details.title || 'Puzzle');
    setText('puzzlePrompt', details.prompt || 'Find the best continuation.');
    if (secondaryMeta) {
      secondaryMeta.innerHTML = metaChips.map(chip => `<span class="puzzle-meta-chip">${chip}</span>`).join('');
    }
    setText('duelScoreText', details.duelScore || '0 - 0');

    const favoriteBtn = document.getElementById('favoritePuzzleBtn');
    if (favoriteBtn) {favoriteBtn.textContent = details.favorite ? '★ Favorite' : '☆ Favorite';}

    document.getElementById('shareDailyResultBtn')?.classList.toggle('hidden', !details.showShare);
    document.getElementById('duelControls')?.classList.toggle('hidden', !details.showDuelControls);
  }

  updateReviewDisplay(review) {
    const summary = document.getElementById('reviewSummary');
    const themes = document.getElementById('reviewThemes');
    const entries = document.getElementById('reviewEntries');
    if (!summary || !themes || !entries) {return;}

    if (!review) {
      summary.innerHTML = '<p>No saved review yet. Finish a game to generate a coach walkthrough.</p>';
      themes.innerHTML = '';
      entries.innerHTML = '';
      return;
    }

    summary.innerHTML = `
      <div class="review-summary-card">
        <h3>${review.outcome}</h3>
        <p>${review.moveCount} half-moves • ${review.skillLabel} profile • ${new Date(review.createdAt).toLocaleString()}</p>
      </div>
    `;

    themes.innerHTML = `
      <h3>Key Themes</h3>
      <div class="theme-chip-row">
        ${(review.themes || []).map(theme => `<span class="theme-chip">${theme}</span>`).join('') || '<span class="theme-chip">General technique</span>'}
      </div>
      <div class="review-goals">
        ${(review.goals || []).map(goal => `<p>${goal}</p>`).join('')}
      </div>
    `;

    entries.innerHTML = `
      <h3>Learning Moments</h3>
      ${(review.entries || []).map(entry => `
        <article class="review-entry ${entry.severity}">
          <div class="review-entry-top">
            <strong>${entry.notation || 'Position'}</strong>
            <span>${entry.quality}</span>
          </div>
          <p>${entry.coachText}</p>
          ${(entry.alternatives || []).length > 0 ? `<p class="review-alt">Ideas: ${entry.alternatives.join(' ')}</p>` : ''}
        </article>
      `).join('') || '<p>No major swings in this game. That usually means your decisions stayed practical and stable.</p>'}
    `;
  }

  // ============================================
  // AI Thinking Indicator
  // ============================================

  showAIThinking(showing) {
    if (!this.aiThinking) {return;}
    if (showing) {
      this.aiThinking.classList.remove('hidden');
      const aiColor = window.chessApp?.aiColor || BLACK;
      const thinkingPiece = this.aiThinking.querySelector('.thinking-piece');
      if (thinkingPiece) {thinkingPiece.textContent = aiColor === WHITE ? '♔' : '♚';}
    } else {
      this.aiThinking.classList.add('hidden');
    }
  }

  // ============================================
  // Progress & Timer Displays
  // ============================================

  updateProgressDisplay(stats) {
    document.getElementById('gamesPlayed').textContent = stats.gamesPlayed;
    document.getElementById('bestStreak').textContent = stats.bestStreak;
    document.getElementById('playerElo').textContent = stats.playerElo;
  }

  showTimerDisplay(showing) {
    if (!this.timerDisplay) {return;}
    this.timerDisplay.classList.toggle('hidden', !showing);
  }

  /**
   * Update the countdown timer text. Turns red and pulses when
   * under one minute remains.
   */
  updateTimerDisplay(timeStr) {
    if (!this.timerValue) {return;}
    this.timerValue.textContent = timeStr;

    if (!timeStr.includes(':')) {
      this.timerDisplay.classList.remove('urgent');
      return;
    }

    const parts = timeStr.split(':');
    const seconds = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    this.timerDisplay.classList.toggle('urgent', Number.isFinite(seconds) && seconds < 60);
  }

  // ============================================
  // Utilities
  // ============================================

  toAlgebraic(row, col) {
    return 'abcdefgh'[col] + '87654321'[row];
  }

  /**
   * Quick flash animation on the from/to squares after a move.
   */
  animateMove(fromRow, fromCol, toRow, toCol) {
    const fromSquare = this.getSquareElement(fromRow, fromCol);
    const toSquare = this.getSquareElement(toRow, toCol);
    if (fromSquare && toSquare) {
      fromSquare.classList.add('celebrate');
      toSquare.classList.add('celebrate');
      setTimeout(() => {
        fromSquare.classList.remove('celebrate');
        toSquare.classList.remove('celebrate');
      }, 500);
    }
  }
}

// Export for both Node.js modules and browser global scope
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ChessUI };
}
if (typeof window !== 'undefined') {
  window.ChessUI = ChessUI;
}


