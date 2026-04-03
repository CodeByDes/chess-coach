/**
 * ui.js - User Interface Management
 *
 * Handles all DOM interaction: rendering the board, painting pieces,
 * wiring up buttons and modals, and displaying coach messages.
 * The app class calls these methods — this file doesn't make game decisions.
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

    // State
    this.selectedSquare = null;
    this.draggedPiece = null;
    this.flipped = false;   // false = White at bottom, true = Black at bottom
    this.svgLoaded = false;  // Board waits for SVGs before first render

    // Cached piece SVGs (loaded once at startup)
    this.pieceSVGs = {};

    // Callbacks — set by app.js so the UI can push events back up
    this.onSquareClick = null;
    this.onPromotionChoice = null;
    this.onNewGame = null;
    this.onUndo = null;
    this.onCoachToggle = null;
    this.onEloSelect = null;
    this.onColorSelect = null;
    this.onShowProgress = null;
    this.onResetProgress = null;
    this.onCloseProgress = null;
    this.onCloseEloModal = null;
    this.onCoachSaysToggle = null;
    this.onAutoPlayToggle = null;
    this.onTimerToggle = null;   // Timer on/off inside the ELO modal
    this.onTimerSelect = null;   // Duration button inside the ELO modal
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
          if (!response.ok) throw new Error('SVG not found');
          return response.text();
        })
        .then(svgContent => {
          const parser = new DOMParser();
          const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
          const svgElement = svgDoc.querySelector('svg');

          if (svgElement) {
            // Re-wrap the inner paths/groups in a clean SVG wrapper
            let innerContent = '';
            for (const child of svgElement.children) innerContent += child.outerHTML;
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
      if (square) this.onSquareClick?.(parseInt(square.dataset.row), parseInt(square.dataset.col));
    });

    // Core buttons
    document.getElementById('undoBtn')?.addEventListener('click', () => this.onUndo?.());
    document.getElementById('resetBtn')?.addEventListener('click', () => this.onNewGame?.());
    document.getElementById('newGameBtn')?.addEventListener('click', () => this.onNewGame?.());

    // Coach mode toggle
    document.getElementById('coachToggle')?.addEventListener('change', (e) => {
      document.getElementById('coachStatus').textContent = e.target.checked ? 'ON' : 'OFF';
      this.onCoachToggle?.(e.target.checked);
    });

    // Promotion modal — buttons are populated dynamically based on color
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
    document.getElementById('progressBtn')?.addEventListener('click', () => this.onShowProgress?.());
    document.getElementById('resetProgressBtn')?.addEventListener('click', () => this.onResetProgress?.());
    document.getElementById('closeProgressBtn')?.addEventListener('click', () => this.onCloseProgress?.());

    // Settings toggles
    document.getElementById('coachSaysToggle')?.addEventListener('change', (e) => this.onCoachSaysToggle?.(e.target.checked));
    document.getElementById('autoPlayToggle')?.addEventListener('change', (e) => this.onAutoPlayToggle?.(e.target.checked));

    // Timer controls inside the ELO modal
    document.getElementById('eloTimerToggle')?.addEventListener('change', (e) => {
      const timerOptions = document.getElementById('timerOptions');
      if (timerOptions) timerOptions.style.display = e.target.checked ? 'flex' : 'none';
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
        this.selectedSquare = null;
        this.renderBoard();
      }
    });
  }

  // ============================================
  // Board Rendering
  // ============================================

  /**
   * Build the 8×8 grid from scratch. Called after SVGs load,
   * after every move, and when the board is flipped.
   */
  renderBoard() {
    if (!this.boardElement) return;
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
        if (piece) square.appendChild(this.createPieceElement(piece));

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

    // Drag events — the app handles the actual drop logic
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
    if (!this.boardElement || this.boardElement.children.length === 0) return;

    // Strip every highlight class first — clean slate
    this.boardElement.querySelectorAll('.square').forEach(sq => {
      sq.classList.remove('selected', 'legal-move', 'last-move', 'check', 'hint', 'capture');
    });

    const board = window.chessApp?.board;
    const coach = window.chessApp?.coach;
    if (!board) return;

    // Selected square + its legal moves
    if (this.selectedSquare) {
      const { row, col } = this.selectedSquare;
      const square = this.getSquareElement(row, col);
      const piece = board.getPiece(row, col);
      square?.classList.add('selected');

      if (coach?.isEnabled() && piece && board.isOwnPiece(piece)) {
        board.generateLegalMovesForPiece(row, col).forEach(move => {
          const target = this.getSquareElement(move.to.row, move.to.col);
          if (target) {
            target.classList.add('legal-move');
            if (move.capture) target.classList.add('capture');
          }
        });
      }
    }

    // Last move — highlight both the origin and destination
    const lastMove = board.moveHistory.length > 0 ? board.moveHistory[board.moveHistory.length - 1] : null;
    if (lastMove?.move?.from && lastMove.move.to) {
      this.getSquareElement(lastMove.move.from.row, lastMove.move.from.col)?.classList.add('last-move');
      this.getSquareElement(lastMove.move.to.row, lastMove.move.to.col)?.classList.add('last-move');
    }

    // King in check
    if (board.isInCheck()) {
      const kingPos = board.findKing(board.currentTurn);
      if (kingPos) this.getSquareElement(kingPos.row, kingPos.col)?.classList.add('check');
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
   * `force: true` bypasses the "Coach Says" setting — used for the
   * initial welcome message so players always see the difficulty.
   */
  showMessage(message, style = '', force = false) {
    if (!this.messageElement) return;

    const app = window.chessApp;
    if (!force && app && !app.showCoachSays) return;

    this.messageElement.classList.remove('good', 'warning', 'encouraging');
    if (style) this.messageElement.classList.add(style);

    // Fade transition
    this.messageElement.style.opacity = '0';
    setTimeout(() => {
      this.messageElement.innerHTML = `<p>${message}</p>`;
      this.messageElement.style.opacity = '1';
    }, 200);
  }

  clearMessage() { this.showMessage(''); }

  // ============================================
  // Turn Indicator
  // ============================================

  updateTurnIndicator(color, inCheck = false) {
    if (!this.turnTextElement || !this.turnPieceElement) return;

    const piece = color === WHITE ? '♔' : '♚';
    const name = color === WHITE ? "White" : "Black";

    if (inCheck) {
      this.turnTextElement.textContent = `${name}'s Turn — CHECK!`;
      this.turnTextElement.style.color = '#f44336';
    } else {
      this.turnTextElement.textContent = `${name}'s Turn`;
      this.turnTextElement.style.color = 'white';
    }
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
    if (!this.promotionModal) return;
    const pieces = color === WHITE ? ['♕','♖','♗','♘'] : ['♛','♜','♝','♞'];
    this.promotionModal.querySelectorAll('.promotion-btn').forEach((btn, i) => { btn.textContent = pieces[i]; });
    this.promotionModal.classList.remove('hidden');
  }

  hidePromotionModal() { this.promotionModal?.classList.add('hidden'); }

  showGameOverModal(title, message) {
    if (!this.gameOverModal) return;
    document.getElementById('gameOverTitle').textContent = title;
    document.getElementById('gameOverMessage').textContent = message;
    this.gameOverModal.classList.remove('hidden');
  }

  hideGameOverModal() { this.gameOverModal?.classList.add('hidden'); }

  showEloModal() { if (this.eloModal) this.eloModal.classList.remove('hidden'); }
  hideEloModal() { this.eloModal?.classList.add('hidden'); }

  showProgressModal(showing) {
    if (!this.progressModal) return;
    this.progressModal.classList.toggle('hidden', !showing);
  }

  hideProgressModal() { this.showProgressModal(false); }

  // ============================================
  // AI Thinking Indicator
  // ============================================

  showAIThinking(showing) {
    if (!this.aiThinking) return;
    if (showing) {
      this.aiThinking.classList.remove('hidden');
      const aiColor = window.chessApp?.aiColor || BLACK;
      const thinkingPiece = this.aiThinking.querySelector('.thinking-piece');
      if (thinkingPiece) thinkingPiece.textContent = aiColor === WHITE ? '♔' : '♚';
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
    if (!this.timerDisplay) return;
    this.timerDisplay.classList.toggle('hidden', !showing);
  }

  /**
   * Update the countdown timer text. Turns red and pulses when
   * under one minute remains.
   */
  updateTimerDisplay(timeStr) {
    if (!this.timerValue) return;
    this.timerValue.textContent = timeStr;

    const parts = timeStr.split(':');
    const seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
    this.timerDisplay.classList.toggle('urgent', seconds < 60);
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
