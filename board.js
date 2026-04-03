/**
 * board.js - Chess Board Logic and Move Validation
 *
 * Core chess rules: move generation, legality checks, special moves,
 * and game-over detection. No UI here — just pure board state.
 */

// Piece types (stored as single chars on the board array)
const EMPTY = null;
const PAWN = 'p';
const ROOK = 'r';
const KNIGHT = 'n';
const BISHOP = 'b';
const QUEEN = 'q';
const KING = 'k';

// Colors
const WHITE = 'w';
const BLACK = 'b';

// Starting position — uppercase for White, lowercase for Black
const INITIAL_BOARD = [
  ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],  // Black back rank
  ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],  // Black pawns
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],  // White pawns
  ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']   // White back rank
];

class ChessBoard {
  constructor() {
    this.reset();
  }

  /**
   * Wipe the board back to the starting position.
   * Also resets castling rights, en passant, and move counters.
   */
  reset() {
    this.board = INITIAL_BOARD.map(row => [...row]);
    this.currentTurn = WHITE;
    this.moveHistory = [];
    this.capturedPieces = { [WHITE]: [], [BLACK]: [] };

    // Track whether each side still has castling rights
    this.castlingRights = {
      [WHITE]: { kingSide: true, queenSide: true },
      [BLACK]: { kingSide: true, queenSide: true }
    };

    // Set when a pawn advances two squares — only valid for one turn
    this.enPassantTarget = null;

    // Counts moves since the last pawn move or capture (for the 50-move draw rule)
    this.halfmoveClock = 0;
    this.moveNumber = 1;
  }

  getPiece(row, col) {
    if (row < 0 || row > 7 || col < 0 || col > 7) return null;
    return this.board[row][col];
  }

  setPiece(row, col, piece) {
    this.board[row][col] = piece;
  }

  isValidSquare(row, col) {
    return row >= 0 && row <= 7 && col >= 0 && col <= 7;
  }

  /**
   * Returns 'w', 'b', or null based on the piece character.
   * Uppercase = White, lowercase = Black.
   */
  getPieceColor(piece) {
    if (!piece) return null;
    return piece === piece.toUpperCase() ? WHITE : BLACK;
  }

  getPieceType(piece) {
    if (!piece) return null;
    return piece.toLowerCase();
  }

  isOwnPiece(piece) {
    return this.getPieceColor(piece) === this.currentTurn;
  }

  isOpponentPiece(piece) {
    return this.getPieceColor(piece) !== null &&
           this.getPieceColor(piece) !== this.currentTurn;
  }

  // ============================================
  // Move Generation
  // ============================================

  /**
   * Generate all pseudo-legal moves for a piece.
   * "Pseudo-legal" means the moves follow piece movement rules but
   * may still leave the king in check — that gets filtered later.
   */
  generatePseudoLegalMoves(row, col) {
    const piece = this.getPiece(row, col);
    if (!piece || !this.isOwnPiece(piece)) return [];

    const pieceType = this.getPieceType(piece);
    const moves = [];

    switch (pieceType) {
      case PAWN:   moves.push(...this.generatePawnMoves(row, col)); break;
      case KNIGHT: moves.push(...this.generateKnightMoves(row, col)); break;
      case BISHOP: moves.push(...this.generateBishopMoves(row, col)); break;
      case ROOK:   moves.push(...this.generateRookMoves(row, col)); break;
      case QUEEN:  moves.push(...this.generateQueenMoves(row, col)); break;
      case KING:   moves.push(...this.generateKingMoves(row, col)); break;
    }

    return moves;
  }

  /**
   * Pawn moves are the most complex: forward pushes, captures,
   * double-push from the starting rank, en passant, and promotion.
   */
  generatePawnMoves(row, col) {
    const moves = [];
    const color = this.getPieceColor(this.getPiece(row, col));
    const direction = color === WHITE ? -1 : 1;
    const startRow = color === WHITE ? 6 : 1;
    const promotionRow = color === WHITE ? 0 : 7;

    // Single push
    const newRow = row + direction;
    if (this.isValidSquare(newRow, col) && !this.getPiece(newRow, col)) {
      if (newRow === promotionRow) {
        // Pawn reached the back rank — generate all four promotion options
        ['q', 'r', 'b', 'n'].forEach(promo => {
          moves.push({ from: { row, col }, to: { row: newRow, col }, promotion: promo });
        });
      } else {
        moves.push({ from: { row, col }, to: { row: newRow, col } });

        // Double push from starting position (only if the path is clear)
        if (row === startRow) {
          const doubleRow = row + 2 * direction;
          if (!this.getPiece(doubleRow, col)) {
            moves.push({ from: { row, col }, to: { row: doubleRow, col }, isDoublePush: true });
          }
        }
      }
    }

    // Diagonal captures
    for (const dc of [-1, 1]) {
      const newCol = col + dc;
      if (this.isValidSquare(newRow, newCol)) {
        const targetPiece = this.getPiece(newRow, newCol);

        // Regular capture
        if (this.isOpponentPiece(targetPiece)) {
          if (newRow === promotionRow) {
            ['q', 'r', 'b', 'n'].forEach(promo => {
              moves.push({ from: { row, col }, to: { row: newRow, col: newCol }, promotion: promo, capture: targetPiece });
            });
          } else {
            moves.push({ from: { row, col }, to: { row: newRow, col: newCol }, capture: targetPiece });
          }
        }

        // En passant — the target square must match the stored en passant target
        if (this.enPassantTarget &&
            this.enPassantTarget.row === newRow &&
            this.enPassantTarget.col === newCol) {
          moves.push({
            from: { row, col },
            to: { row: newRow, col: newCol },
            isEnPassant: true,
            capture: this.getPiece(row, newCol)  // The captured pawn sits on the original row
          });
        }
      }
    }

    return moves;
  }

  generateKnightMoves(row, col) {
    const moves = [];
    const offsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];

    for (const [dr, dc] of offsets) {
      const newRow = row + dr;
      const newCol = col + dc;
      if (this.isValidSquare(newRow, newCol)) {
        const targetPiece = this.getPiece(newRow, newCol);
        if (!targetPiece || this.isOpponentPiece(targetPiece)) {
          moves.push({ from: { row, col }, to: { row: newRow, col: newCol }, capture: targetPiece || undefined });
        }
      }
    }

    return moves;
  }

  /**
   * Sliding piece — ray casting in four diagonal directions.
   * Stops at the first piece encountered (capture if opponent, block if own).
   */
  generateBishopMoves(row, col) {
    const moves = [];
    const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

    for (const [dr, dc] of directions) {
      let newRow = row + dr;
      let newCol = col + dc;

      while (this.isValidSquare(newRow, newCol)) {
        const targetPiece = this.getPiece(newRow, newCol);
        if (!targetPiece) {
          moves.push({ from: { row, col }, to: { row: newRow, col: newCol } });
        } else {
          if (this.isOpponentPiece(targetPiece)) {
            moves.push({ from: { row, col }, to: { row: newRow, col: newCol }, capture: targetPiece });
          }
          break;  // Ray blocked
        }
        newRow += dr;
        newCol += dc;
      }
    }

    return moves;
  }

  /**
   * Sliding piece — ray casting in four cardinal directions.
   */
  generateRookMoves(row, col) {
    const moves = [];
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    for (const [dr, dc] of directions) {
      let newRow = row + dr;
      let newCol = col + dc;

      while (this.isValidSquare(newRow, newCol)) {
        const targetPiece = this.getPiece(newRow, newCol);
        if (!targetPiece) {
          moves.push({ from: { row, col }, to: { row: newRow, col: newCol } });
        } else {
          if (this.isOpponentPiece(targetPiece)) {
            moves.push({ from: { row, col }, to: { row: newRow, col: newCol }, capture: targetPiece });
          }
          break;  // Ray blocked
        }
        newRow += dr;
        newCol += dc;
      }
    }

    return moves;
  }

  // Queen = bishop + rook combined
  generateQueenMoves(row, col) {
    return [...this.generateBishopMoves(row, col), ...this.generateRookMoves(row, col)];
  }

  generateKingMoves(row, col) {
    const moves = [];
    const offsets = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];

    for (const [dr, dc] of offsets) {
      const newRow = row + dr;
      const newCol = col + dc;
      if (this.isValidSquare(newRow, newCol)) {
        const targetPiece = this.getPiece(newRow, newCol);
        if (!targetPiece || this.isOpponentPiece(targetPiece)) {
          moves.push({ from: { row, col }, to: { row: newRow, col: newCol }, capture: targetPiece || undefined });
        }
      }
    }

    // Castling is a special king move — handled separately
    moves.push(...this.generateCastlingMoves(row, col));
    return moves;
  }

  /**
   * Castling rules:
   *  - Neither king nor the relevant rook may have moved before
   *  - No pieces between the king and rook
   *  - King cannot be in check, pass through check, or land in check
   */
  generateCastlingMoves(row, col) {
    const moves = [];
    const color = this.currentTurn;
    const rights = this.castlingRights[color];
    const backRank = color === WHITE ? 7 : 0;

    // King must be on its starting square
    if (row !== backRank || col !== 4) return moves;

    // Can't castle out of check
    if (this.isSquareAttacked(row, col, color === WHITE ? BLACK : WHITE)) return moves;

    // King-side: squares f and g must be empty and safe
    if (rights.kingSide) {
      if (!this.getPiece(backRank, 5) && !this.getPiece(backRank, 6)) {
        if (!this.isSquareAttacked(backRank, 5, color === WHITE ? BLACK : WHITE) &&
            !this.isSquareAttacked(backRank, 6, color === WHITE ? BLACK : WHITE)) {
          moves.push({ from: { row, col }, to: { row: backRank, col: 6 }, isCastling: 'kingside' });
        }
      }
    }

    // Queen-side: squares b, c, d must be empty; c and d must be safe
    if (rights.queenSide) {
      if (!this.getPiece(backRank, 1) && !this.getPiece(backRank, 2) && !this.getPiece(backRank, 3)) {
        if (!this.isSquareAttacked(backRank, 2, color === WHITE ? BLACK : WHITE) &&
            !this.isSquareAttacked(backRank, 3, color === WHITE ? BLACK : WHITE)) {
          moves.push({ from: { row, col }, to: { row: backRank, col: 2 }, isCastling: 'queenside' });
        }
      }
    }

    return moves;
  }

  // ============================================
  // Move Validation
  // ============================================

  /**
   * Check whether a square is attacked by any piece of the given color.
   * Used for check detection and castling legality.
   */
  isSquareAttacked(row, col, byColor) {
    // Pawn attacks (pawns capture diagonally, not straight)
    const pawnDirection = byColor === WHITE ? -1 : 1;
    for (const attackCol of [col - 1, col + 1]) {
      const pawnRow = row - pawnDirection;
      if (this.isValidSquare(pawnRow, attackCol)) {
        const piece = this.getPiece(pawnRow, attackCol);
        if (piece === (byColor === WHITE ? 'P' : 'p')) return true;
      }
    }

    // Knight attacks
    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
      const nr = row + dr, nc = col + dc;
      if (this.isValidSquare(nr, nc) && this.getPiece(nr, nc) === (byColor === WHITE ? 'N' : 'n')) return true;
    }

    // King attacks (one square in any direction)
    for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
      const nr = row + dr, nc = col + dc;
      if (this.isValidSquare(nr, nc) && this.getPiece(nr, nc) === (byColor === WHITE ? 'K' : 'k')) return true;
    }

    // Sliding pieces — straight lines (rook/queen)
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      let nr = row + dr, nc = col + dc;
      while (this.isValidSquare(nr, nc)) {
        const piece = this.getPiece(nr, nc);
        if (piece) {
          if (this.getPieceColor(piece) === byColor) {
            const t = this.getPieceType(piece);
            if (t === ROOK || t === QUEEN) return true;
          }
          break;  // Blocked
        }
        nr += dr; nc += dc;
      }
    }

    // Sliding pieces — diagonals (bishop/queen)
    for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
      let nr = row + dr, nc = col + dc;
      while (this.isValidSquare(nr, nc)) {
        const piece = this.getPiece(nr, nc);
        if (piece) {
          if (this.getPieceColor(piece) === byColor) {
            const t = this.getPieceType(piece);
            if (t === BISHOP || t === QUEEN) return true;
          }
          break;  // Blocked
        }
        nr += dr; nc += dc;
      }
    }

    return false;
  }

  findKing(color) {
    const kingChar = color === WHITE ? 'K' : 'k';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (this.getPiece(row, col) === kingChar) return { row, col };
      }
    }
    return null;
  }

  isInCheck() {
    const kingPos = this.findKing(this.currentTurn);
    if (!kingPos) return false;
    return this.isSquareAttacked(kingPos.row, kingPos.col, this.currentTurn === WHITE ? BLACK : WHITE);
  }

  isColorInCheck(color) {
    const kingPos = this.findKing(color);
    if (!kingPos) return false;
    return this.isSquareAttacked(kingPos.row, kingPos.col, color === WHITE ? BLACK : WHITE);
  }

  /**
   * Temporarily apply a move and snapshot the board state so we can
   * test legality (does this leave the king in check?) and undo cleanly.
   */
  makeMove(move) {
    const { from, to } = move;
    const piece = this.getPiece(from.row, from.col);
    const capturedPiece = this.getPiece(to.row, to.col);

    // Snapshot everything we might need to restore
    const state = {
      board: this.board.map(row => [...row]),
      castlingRights: JSON.parse(JSON.stringify(this.castlingRights)),
      enPassantTarget: this.enPassantTarget,
      capturedPieces: { [WHITE]: [...this.capturedPieces[WHITE]], [BLACK]: [...this.capturedPieces[BLACK]] }
    };

    // Move the piece
    this.setPiece(to.row, to.col, piece);
    this.setPiece(from.row, from.col, null);

    // En passant: remove the captured pawn from its actual square
    if (move.isEnPassant) {
      const capturedPawn = this.getPiece(from.row, to.col);
      this.setPiece(from.row, to.col, null);
      if (capturedPawn) this.capturedPieces[this.currentTurn].push(capturedPawn);
    }

    // Castling: shuffle the rook to its new file
    if (move.isCastling) {
      const backRank = from.row;
      if (move.isCastling === 'kingside') {
        this.setPiece(backRank, 5, this.getPiece(backRank, 7));
        this.setPiece(backRank, 7, null);
      } else {
        this.setPiece(backRank, 3, this.getPiece(backRank, 0));
        this.setPiece(backRank, 0, null);
      }
    }

    // Promotion: swap the pawn for the chosen piece
    if (move.promotion) {
      this.setPiece(to.row, to.col, this.currentTurn === WHITE ? move.promotion.toUpperCase() : move.promotion.toLowerCase());
    }

    // Regular capture
    if (capturedPiece && !move.isEnPassant) {
      this.capturedPieces[this.currentTurn].push(capturedPiece);
    }

    // Set en passant target for the next turn (only after a double push)
    this.enPassantTarget = move.isDoublePush ? { row: (from.row + to.row) / 2, col: from.col } : null;

    // Update castling rights if a king or rook moved
    this.updateCastlingRights(piece, from, to);

    return state;
  }

  /**
   * Revoke castling rights when a king or rook moves, or when a rook is captured.
   */
  updateCastlingRights(piece, from, to) {
    const pieceType = this.getPieceType(piece);

    // King moves — lose both rights for that color
    if (pieceType === KING) {
      this.castlingRights[this.currentTurn].kingSide = false;
      this.castlingRights[this.currentTurn].queenSide = false;
    }

    // Rook moves from its home square
    if (pieceType === ROOK) {
      const backRank = this.currentTurn === WHITE ? 7 : 0;
      if (from.row === backRank) {
        if (from.col === 0) this.castlingRights[this.currentTurn].queenSide = false;
        if (from.col === 7) this.castlingRights[this.currentTurn].kingSide = false;
      }
    }

    // If a rook was captured, the opponent loses that side's rights
    if (to.row === 0 || to.row === 7) {
      const opponentColor = this.currentTurn === WHITE ? BLACK : WHITE;
      if (to.col === 0) this.castlingRights[opponentColor].queenSide = false;
      if (to.col === 7) this.castlingRights[opponentColor].kingSide = false;
    }
  }

  undoMove(state) {
    this.board = state.board;
    this.castlingRights = state.castlingRights;
    this.enPassantTarget = state.enPassantTarget;
    this.capturedPieces = state.capturedPieces;
  }

  /**
   * A move is legal only if it doesn't leave the moving side's king in check.
   * We simulate the move, check for check, then roll back.
   */
  isMoveLegal(move) {
    const state = this.makeMove(move);
    const inCheck = this.isInCheck();
    this.undoMove(state);
    return !inCheck;
  }

  generateAllLegalMoves() {
    const legalMoves = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.getPiece(row, col);
        if (piece && this.isOwnPiece(piece)) {
          for (const move of this.generatePseudoLegalMoves(row, col)) {
            if (this.isMoveLegal(move)) legalMoves.push(move);
          }
        }
      }
    }
    return legalMoves;
  }

  generateLegalMovesForPiece(row, col) {
    return this.generatePseudoLegalMoves(row, col).filter(move => this.isMoveLegal(move));
  }

  // ============================================
  // Game State Detection
  // ============================================

  hasLegalMoves() {
    return this.generateAllLegalMoves().length > 0;
  }

  isCheckmate() {
    return this.isInCheck() && !this.hasLegalMoves();
  }

  isStalemate() {
    return !this.isInCheck() && !this.hasLegalMoves();
  }

  /**
   * Draw by insufficient material: K vs K, K+B vs K, or K+N vs K.
   * Doesn't cover rare cases like K+B vs K+B (same-color bishops).
   */
  isInsufficientMaterial() {
    const pieces = { [WHITE]: [], [BLACK]: [] };
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.getPiece(row, col);
        if (piece) pieces[this.getPieceColor(piece)].push(this.getPieceType(piece));
      }
    }

    // King vs King
    if (pieces[WHITE].length === 1 && pieces[BLACK].length === 1) return true;

    // King + minor piece vs King
    if (pieces[WHITE].length === 1 && pieces[BLACK].length === 2) {
      const minor = pieces[BLACK].filter(p => p !== KING);
      if (minor.length === 1 && (minor[0] === BISHOP || minor[0] === KNIGHT)) return true;
    }
    if (pieces[BLACK].length === 1 && pieces[WHITE].length === 2) {
      const minor = pieces[WHITE].filter(p => p !== KING);
      if (minor.length === 1 && (minor[0] === BISHOP || minor[0] === KNIGHT)) return true;
    }

    return false;
  }

  isGameOver() {
    return this.isCheckmate() || this.isStalemate() || this.isInsufficientMaterial();
  }

  getGameOverReason() {
    if (this.isCheckmate()) return `Checkmate! ${this.currentTurn === WHITE ? 'Black' : 'White'} wins!`;
    if (this.isStalemate()) return 'Stalemate! The game is a draw.';
    if (this.isInsufficientMaterial()) return 'Draw! Insufficient material to checkmate.';
    return null;
  }

  // ============================================
  // Move Execution
  // ============================================

  /**
   * Permanently apply a move, record it in history, and switch turns.
   * Returns the previous state in case something needs to roll back.
   */
  executeMove(move) {
    const previousState = {
      board: this.board.map(row => [...row]),
      currentTurn: this.currentTurn,
      castlingRights: JSON.parse(JSON.stringify(this.castlingRights)),
      enPassantTarget: this.enPassantTarget,
      capturedPieces: { [WHITE]: [...this.capturedPieces[WHITE]], [BLACK]: [...this.capturedPieces[BLACK]] },
      moveHistory: [...this.moveHistory],
      moveNumber: this.moveNumber,
      halfmoveClock: this.halfmoveClock
    };

    this.makeMove(move);

    // Store the move in algebraic notation for display
    const notation = this.getMoveNotation(move, previousState.board);
    this.moveHistory.push({ move, notation, color: this.currentTurn });

    // Advance the full-move counter after Black moves
    if (this.currentTurn === BLACK) this.moveNumber++;
    this.currentTurn = this.currentTurn === WHITE ? BLACK : WHITE;

    // Reset the 50-move clock on pawn moves or captures
    const pieceType = this.getPieceType(this.getPiece(move.to.row, move.to.col));
    this.halfmoveClock = (pieceType === PAWN || move.capture) ? 0 : this.halfmoveClock + 1;

    return previousState;
  }

  /**
   * Build standard algebraic notation for a move (e.g. "Nf3", "exd5", "O-O").
   */
  getMoveNotation(move, boardBefore) {
    const piece = boardBefore[move.from.row][move.from.col];
    const pieceType = this.getPieceType(piece);
    const files = 'abcdefgh';
    const ranks = '87654321';

    if (move.isCastling === 'kingside') return 'O-O';
    if (move.isCastling === 'queenside') return 'O-O-O';

    let notation = '';

    // Piece letter (pawns are implicit)
    if (pieceType !== PAWN) notation += pieceType.toUpperCase();

    // Capture
    if (move.capture || move.isEnPassant) {
      if (pieceType === PAWN) notation += files[move.from.col];
      notation += 'x';
    }

    // Destination
    notation += files[move.to.col] + ranks[move.to.row];

    // Promotion
    if (move.promotion) notation += '=' + move.promotion.toUpperCase();

    return notation;
  }

  /**
   * Undo the most recent move — restores the board, captured pieces,
   * castling rights, and turn order. Used by the "Undo" button.
   */
  undoLastMove() {
    if (this.moveHistory.length === 0) return null;

    const lastMoveRecord = this.moveHistory.pop();
    const lastMove = lastMoveRecord.move;
    const movingColor = lastMoveRecord.color;
    const pieceAtDest = this.getPiece(lastMove.to.row, lastMove.to.col);

    // Restore the original piece (a promoted pawn becomes a pawn again)
    let originalPiece = pieceAtDest;
    if (lastMove.promotion) originalPiece = movingColor === WHITE ? 'P' : 'p';

    this.setPiece(lastMove.from.row, lastMove.from.col, originalPiece);
    this.setPiece(lastMove.to.row, lastMove.to.col, null);

    // En passant: put the captured pawn back
    if (lastMove.isEnPassant) {
      this.setPiece(lastMove.from.row, lastMove.to.col, movingColor === WHITE ? 'p' : 'P');
      const idx = this.capturedPieces[movingColor].lastIndexOf(movingColor === WHITE ? 'p' : 'P');
      if (idx >= 0) this.capturedPieces[movingColor].splice(idx, 1);
    }

    // Castling: move the rook back to its corner
    if (lastMove.isCastling) {
      const backRank = lastMove.from.row;
      if (lastMove.isCastling === 'kingside') {
        this.setPiece(backRank, 7, this.getPiece(backRank, 5));
        this.setPiece(backRank, 5, null);
      } else {
        this.setPiece(backRank, 0, this.getPiece(backRank, 3));
        this.setPiece(backRank, 3, null);
      }
    }

    // Regular capture: restore the captured piece
    if (lastMove.capture && !lastMove.isEnPassant) {
      this.setPiece(lastMove.to.row, lastMove.to.col, lastMove.capture);
      const idx = this.capturedPieces[movingColor].lastIndexOf(lastMove.capture);
      if (idx >= 0) this.capturedPieces[movingColor].splice(idx, 1);
    }

    // Recalculate castling rights from piece positions (simplified)
    if (this.getPiece(7, 4) !== 'K') { this.castlingRights[WHITE].kingSide = false; this.castlingRights[WHITE].queenSide = false; }
    if (this.getPiece(0, 4) !== 'k') { this.castlingRights[BLACK].kingSide = false; this.castlingRights[BLACK].queenSide = false; }

    // Switch the turn back
    this.currentTurn = movingColor;
    if (movingColor === BLACK) this.moveNumber = Math.max(1, this.moveNumber - 1);
    this.enPassantTarget = null;

    return lastMoveRecord;
  }

  /**
   * Serialize the board state into FEN notation — useful for debugging
   * and for the engine's move analysis logging.
   */
  getFEN() {
    let fen = '';

    // Piece placement
    for (let row = 0; row < 8; row++) {
      let emptyCount = 0;
      for (let col = 0; col < 8; col++) {
        const piece = this.getPiece(row, col);
        if (piece) {
          if (emptyCount > 0) { fen += emptyCount; emptyCount = 0; }
          fen += piece;
        } else {
          emptyCount++;
        }
      }
      if (emptyCount > 0) fen += emptyCount;
      if (row < 7) fen += '/';
    }

    // Active color
    fen += ' ' + (this.currentTurn === WHITE ? 'w' : 'b');

    // Castling availability
    let castling = '';
    if (this.castlingRights[WHITE].kingSide) castling += 'K';
    if (this.castlingRights[WHITE].queenSide) castling += 'Q';
    if (this.castlingRights[BLACK].kingSide) castling += 'k';
    if (this.castlingRights[BLACK].queenSide) castling += 'q';
    fen += ' ' + (castling || '-');

    // En passant target square
    if (this.enPassantTarget) {
      const files = 'abcdefgh';
      const ranks = '87654321';
      fen += ' ' + files[this.enPassantTarget.col] + ranks[this.enPassantTarget.row];
    } else {
      fen += ' -';
    }

    // Halfmove clock and fullmove number
    fen += ' ' + this.halfmoveClock + ' ' + this.moveNumber;

    return fen;
  }
}

// Export for both Node.js modules and browser global scope
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ChessBoard, WHITE, BLACK, PAWN, ROOK, KNIGHT, BISHOP, QUEEN, KING };
}
if (typeof window !== 'undefined') {
  window.ChessBoard = ChessBoard;
  window.WHITE = WHITE;
  window.BLACK = BLACK;
  window.PAWN = PAWN;
  window.ROOK = ROOK;
  window.KNIGHT = KNIGHT;
  window.BISHOP = BISHOP;
  window.QUEEN = QUEEN;
  window.KING = KING;
}
