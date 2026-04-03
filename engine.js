/**
 * engine.js - Chess Engine with Heuristic Evaluation
 *
 * Evaluates board positions and picks the best move using minimax
 * with alpha-beta pruning. Kept at depth 1-2 so it runs smoothly
 * in the browser without freezing the UI.
 */

// Piece values in centipawns (1 pawn = 100)
const PIECE_VALUES = {
  'p': 100,   'n': 320,   'b': 330,
  'r': 500,   'q': 900,   'k': 20000  // King is priceless
};

// ============================================
// Piece-Square Tables
//
// These reward pieces for occupying strong squares.
// Values are from White's perspective — we flip the row
// index when evaluating Black's pieces.
// ============================================

// Pawns: push toward the center and advance up the board
const PAWN_TABLE = [
  [  0,  0,  0,  0,  0,  0,  0,  0],
  [ 50, 50, 50, 50, 50, 50, 50, 50],
  [ 10, 10, 20, 30, 30, 20, 10, 10],
  [  5,  5, 10, 25, 25, 10,  5,  5],
  [  0,  0,  0, 20, 20,  0,  0,  0],
  [  5, -5,-10,  0,  0,-10, -5,  5],
  [  5, 10, 10,-20,-20, 10, 10,  5],
  [  0,  0,  0,  0,  0,  0,  0,  0]
];

// Knights: thrive in the center, suffer on the rim
const KNIGHT_TABLE = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50]
];

// Bishops: prefer long diagonals and open positions
const BISHOP_TABLE = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5, 10, 10,  5,  0,-10],
  [-10,  5,  5, 10, 10,  5,  5,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10, 10, 10, 10, 10, 10, 10,-10],
  [-10,  5,  0,  0,  0,  0,  5,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20]
];

// Rooks: bonus for the 7th rank and open files
const ROOK_TABLE = [
  [  0,  0,  0,  0,  0,  0,  0,  0],
  [  5, 10, 10, 10, 10, 10, 10,  5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [  0,  0,  0,  5,  5,  0,  0,  0]
];

// Queens: active in the center but don't wander too early
const QUEEN_TABLE = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5,  5,  5,  5,  0,-10],
  [ -5,  0,  5,  5,  5,  5,  0, -5],
  [  0,  0,  5,  5,  5,  5,  0, -5],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [-10,  0,  5,  0,  0,  0,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20]
];

// King: stay tucked behind pawns in the middlegame
const KING_TABLE_MIDDLE = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [ 20, 20,  0,  0,  0,  0, 20, 20],
  [ 20, 30, 10,  0,  0, 10, 30, 20]
];

class ChessEngine {
  constructor() {
    this.debugMode = false;
    this.debugLog = [];
  }

  setDebugMode(enabled) { this.debugMode = enabled; }

  log(message) {
    if (this.debugMode) {
      this.debugLog.push(message);
      console.log('[Engine]', message);
    }
  }

  getDebugLog() {
    const log = this.debugLog.join('\n');
    this.debugLog = [];
    return log;
  }

  // ============================================
  // Board Evaluation
  // ============================================

  /**
   * Score the position from White's perspective.
   * Positive = White is better, negative = Black is better.
   * We combine material, piece placement, mobility, king safety,
   * and center control into one number.
   */
  evaluate(board) {
    let score = 0;
    score += this.evaluateMaterial(board);
    score += this.evaluatePosition(board);
    score += this.evaluateMobility(board);
    score += this.evaluateKingSafety(board);
    score += this.evaluateCenterControl(board);

    this.log(`Eval: ${score} (material: ${this.evaluateMaterial(board)}, positional: ${this.evaluatePosition(board)})`);
    return score;
  }

  /**
   * Sum up the raw material on the board.
   */
  evaluateMaterial(board) {
    let materialScore = 0;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board.getPiece(row, col);
        if (piece) {
          const value = PIECE_VALUES[board.getPieceType(piece)];
          materialScore += board.getPieceColor(piece) === WHITE ? value : -value;
        }
      }
    }
    return materialScore;
  }

  /**
   * Reward pieces for sitting on good squares using the piece-square tables above.
   */
  evaluatePosition(board) {
    let positionScore = 0;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board.getPiece(row, col);
        if (!piece) continue;

        const pieceType = board.getPieceType(piece);
        const color = board.getPieceColor(piece);

        // Look up the positional bonus from the right table
        const tables = { p: PAWN_TABLE, n: KNIGHT_TABLE, b: BISHOP_TABLE, r: ROOK_TABLE, q: QUEEN_TABLE, k: KING_TABLE_MIDDLE };
        const table = tables[pieceType];
        if (!table) continue;

        // Black's perspective is the mirror image — flip the row
        const lookupRow = color === BLACK ? 7 - row : row;
        const tableValue = table[lookupRow][col];

        positionScore += color === WHITE ? tableValue : -tableValue;
      }
    }

    return positionScore;
  }

  /**
   * Count how many legal moves each side has. More options usually
   * means a freer, more active position. Weighted lightly.
   */
  evaluateMobility(board) {
    const savedTurn = board.currentTurn;
    board.currentTurn = WHITE;
    const whiteMobility = board.generateAllLegalMoves().length;
    board.currentTurn = BLACK;
    const blackMobility = board.generateAllLegalMoves().length;
    board.currentTurn = savedTurn;
    return (whiteMobility - blackMobility) * 2;
  }

  /**
   * Reward kings that have a pawn shield in front of them.
   * Penalize exposed kings on open files.
   */
  evaluateKingSafety(board) {
    let safetyScore = 0;

    for (const color of [WHITE, BLACK]) {
      const kingPos = board.findKing(color);
      if (!kingPos) continue;

      const { row: kingRow, col: kingCol } = kingPos;
      let safety = 0;
      const direction = color === WHITE ? 1 : -1;
      const pawnChar = color === WHITE ? 'P' : 'p';

      // Pawns directly in front of the king
      for (let dc = -1; dc <= 1; dc++) {
        const r = kingRow + direction, c = kingCol + dc;
        if (board.isValidSquare(r, c) && board.getPiece(r, c) === pawnChar) safety += 20;
      }

      // Penalty if there's no pawn on the king's file at all
      let hasPawnOnFile = false;
      for (let r = 0; r < 8; r++) {
        if (board.getPiece(r, kingCol) === pawnChar && color === board.getPieceColor(board.getPiece(r, kingCol))) {
          hasPawnOnFile = true;
          break;
        }
      }
      if (!hasPawnOnFile) safety -= 15;

      safetyScore += color === WHITE ? safety : -safety;
    }

    return safetyScore;
  }

  /**
   * Reward control over the central squares (d4, e4, d5, e5) and
   * the ring of squares around them.
   */
  evaluateCenterControl(board) {
    const centerSquares = [{r:3,c:3},{r:3,c:4},{r:4,c:3},{r:4,c:4}];
    const extendedCenter = [
      {r:2,c:2},{r:2,c:3},{r:2,c:4},{r:2,c:5},
      {r:3,c:2},                  {r:3,c:5},
      {r:4,c:2},                  {r:4,c:5},
      {r:5,c:2},{r:5,c:3},{r:5,c:4},{r:5,c:5}
    ];

    let centerScore = 0;
    for (const sq of centerSquares) {
      const piece = board.getPiece(sq.r, sq.c);
      if (piece) centerScore += board.getPieceColor(piece) === WHITE ? 10 : -10;
    }
    for (const sq of extendedCenter) {
      const piece = board.getPiece(sq.r, sq.c);
      if (piece) centerScore += board.getPieceColor(piece) === WHITE ? 3 : -3;
    }
    return centerScore;
  }

  // ============================================
  // Move Selection (Minimax with Alpha-Beta)
  // ============================================

  /**
   * Search the move tree and return the best move found.
   * Uses alpha-beta pruning to skip branches that can't affect the result.
   */
  findBestMove(board, depth = 2) {
    this.log(`Finding best move at depth ${depth}`);

    const legalMoves = board.generateAllLegalMoves();
    if (legalMoves.length === 0) { this.log('No legal moves'); return null; }
    if (legalMoves.length === 1) { this.log('Only one move'); return legalMoves[0]; }

    let bestMove = null;
    let bestScore = board.currentTurn === WHITE ? -Infinity : Infinity;
    const isMaximizing = board.currentTurn === WHITE;

    // Try the most promising moves first — improves pruning
    const orderedMoves = this.orderMoves(board, legalMoves);

    for (const move of orderedMoves) {
      const state = board.makeMove(move);
      const score = this.minimax(board, depth - 1, -Infinity, Infinity, !isMaximizing);
      board.undoMove(state);

      this.log(`Move ${this.moveToString(move)}: score = ${score}`);

      if (isMaximizing ? score > bestScore : score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    this.log(`Best move: ${bestMove ? this.moveToString(bestMove) : 'none'} (${bestScore})`);
    return bestMove || legalMoves[0];  // Fallback, shouldn't happen
  }

  /**
   * Standard minimax with alpha-beta pruning.
   * At depth 0 or game over, we fall back to the static evaluator.
   */
  minimax(board, depth, alpha, beta, isMaximizing) {
    if (depth === 0 || board.isGameOver()) return this.evaluate(board);

    const legalMoves = board.generateAllLegalMoves();
    if (legalMoves.length === 0) return this.evaluate(board);

    if (isMaximizing) {
      let maxScore = -Infinity;
      for (const move of legalMoves) {
        const state = board.makeMove(move);
        const score = this.minimax(board, depth - 1, alpha, beta, false);
        board.undoMove(state);
        maxScore = Math.max(maxScore, score);
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break;  // Prune — opponent won't allow this line
      }
      return maxScore;
    } else {
      let minScore = Infinity;
      for (const move of legalMoves) {
        const state = board.makeMove(move);
        const score = this.minimax(board, depth - 1, alpha, beta, true);
        board.undoMove(state);
        minScore = Math.min(minScore, score);
        beta = Math.min(beta, score);
        if (beta <= alpha) break;  // Prune — we won't choose this line
      }
      return minScore;
    }
  }

  /**
   * Sort moves so the search tries the most interesting ones first.
   * Captures (especially high-value ones) and promotions get priority —
   * this dramatically improves alpha-beta cutoffs.
   */
  orderMoves(board, moves) {
    return moves.sort((a, b) => {
      let scoreA = 0, scoreB = 0;

      // MVV-LVA: prefer capturing valuable pieces with cheap attackers
      if (a.capture) {
        const atkVal = PIECE_VALUES[board.getPieceType(board.getPiece(a.from.row, a.from.col))];
        const vicVal = PIECE_VALUES[board.getPieceType(a.capture)];
        scoreA += 10 * vicVal - atkVal;
      }
      if (b.capture) {
        const atkVal = PIECE_VALUES[board.getPieceType(board.getPiece(b.from.row, b.from.col))];
        const vicVal = PIECE_VALUES[board.getPieceType(b.capture)];
        scoreB += 10 * vicVal - atkVal;
      }

      if (a.promotion) scoreA += PIECE_VALUES[a.promotion];
      if (b.promotion) scoreB += PIECE_VALUES[b.promotion];
      if (a.isCastling) scoreA += 50;
      if (b.isCastling) scoreB += 50;

      return scoreB - scoreA;  // Descending — best first
    });
  }

  moveToString(move) {
    const files = 'abcdefgh', ranks = '87654321';
    let str = files[move.from.col] + ranks[move.from.row] + files[move.to.col] + ranks[move.to.row];
    if (move.promotion) str += '=' + move.promotion;
    return str;
  }

  // ============================================
  // Move Analysis for Coaching
  // ============================================

  /**
   * Compare the move the player just made against the engine's best move.
   * Returns a quality rating (best/good/inaccuracy/mistake/blunder) and
   * a kid-friendly feedback message.
   */
  analyzeMove(board, move) {
    this.log(`Analyzing move: ${this.moveToString(move)}`);

    const bestMove = this.findBestMove(board, 2);
    const scoreBefore = this.evaluate(board);

    // Simulate the move and evaluate from the opponent's perspective
    const state = board.makeMove(move);
    const scoreAfter = -this.evaluate(board);  // Negate because the turn flips
    board.undoMove(state);

    const scoreDiff = scoreAfter - scoreBefore;
    this.log(`Before: ${scoreBefore}, After: ${scoreAfter}, Diff: ${scoreDiff}`);

    // Classify the move
    let quality, feedback;
    if (scoreDiff < -200)      { quality = 'blunder';    feedback = this.getBlunderFeedback(move, board); }
    else if (scoreDiff < -50)  { quality = 'mistake';    feedback = this.getMistakeFeedback(move, board); }
    else if (scoreDiff < 0)    { quality = 'inaccuracy'; feedback = this.getInaccuracyFeedback(move, board); }
    else if (move === bestMove || Math.abs(scoreDiff) < 20) { quality = 'best'; feedback = this.getBestMoveFeedback(move, board); }
    else                       { quality = 'good';       feedback = this.getGoodMoveFeedback(move, board); }

    return { move, bestMove, scoreBefore, scoreAfter, scoreDiff, quality, feedback };
  }

  // Kid-friendly feedback messages for each move quality
  getBlunderFeedback(move, board) {
    const pieceType = board.getPieceType(board.getPiece(move.from.row, move.from.col));
    const pieceName = this.getPieceName(pieceType);

    if (move.capture) {
      const capturedName = this.getPieceName(board.getPieceType(move.capture));
      return [
        `That capture might not be safe!`,
        `Are you sure about taking that ${capturedName}?`,
        `Hmm, taking that ${capturedName} could be a trap!`
      ][Math.floor(Math.random() * 3)];
    }

    return [
      `Oh no! That move puts your ${pieceName} in danger!`,
      `Hmm, try to protect your ${pieceName}!`,
      `That move might lose your ${pieceName}. Can you find a safer move?`,
      `Oops! Look out — your ${pieceName} could be captured!`,
      `Let's think again — is your ${pieceName} safe there?`
    ][Math.floor(Math.random() * 5)];
  }

  getMistakeFeedback(move, board) {
    const pieceName = this.getPieceName(board.getPieceType(board.getPiece(move.from.row, move.from.col)));
    return [
      `That's not the best move. Maybe try something else?`,
      `There might be a better move for your ${pieceName}.`,
      `Good try, but I think you can do better!`,
      `Let's look for a stronger move.`,
      `That move is okay, but there's a better one!`
    ][Math.floor(Math.random() * 5)];
  }

  getInaccuracyFeedback() {
    return [
      `Not bad, but there's a slightly better move!`,
      `That's okay, but try to find the best move!`,
      `Good idea, but maybe there's an even better spot!`,
      `Nice try! Want to see a stronger move?`
    ][Math.floor(Math.random() * 4)];
  }

  getBestMoveFeedback(move) {
    if (move.capture) return [`Nice capture! 🎯`, `Great capture! Well done! ⭐`, `Excellent! You got their piece! 🏆`][Math.floor(Math.random() * 3)];
    if (move.isCastling) return `Great! You castled! Your king is safe now! 🏰`;
    return [`Great move! 🌟`, `Excellent! That's the best move! 🎉`, `Perfect! You're thinking like a champion! ♔`, `Wow! That's a really strong move! 💪`, `Amazing! Keep up the great work! ⭐`, `Fantastic move! You're getting better! 🏆`][Math.floor(Math.random() * 6)];
  }

  getGoodMoveFeedback() {
    return [`Good move!`, `Nice!`, `Solid move!`, `Well done!`, `Good thinking!`][Math.floor(Math.random() * 5)];
  }

  getPieceName(pieceType) {
    return { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }[pieceType] || 'piece';
  }

  /**
   * Translate the engine's best move into a hint the coach can speak out loud.
   */
  getMoveHint(board) {
    const bestMove = this.findBestMove(board, 2);
    if (!bestMove) return "Hmm, I'm not sure what to suggest. Look for safe moves!";

    const pieceName = this.getPieceName(board.getPieceType(board.getPiece(bestMove.from.row, bestMove.from.col)));
    const files = 'abcdefgh', ranks = '87654321';
    const toSquare = files[bestMove.to.col] + ranks[bestMove.to.row];

    if (bestMove.capture) {
      const capturedName = this.getPieceName(board.getPieceType(bestMove.capture));
      return `Try taking their ${capturedName} with your ${pieceName}!`;
    }
    if (bestMove.isCastling) {
      return `Castle your king to safety! Move your king toward the ${bestMove.isCastling === 'kingside' ? 'right' : 'left'}!`;
    }
    if (bestMove.promotion) {
      return `Promote your pawn to a ${this.getPieceName(bestMove.promotion)}!`;
    }

    return [`Try moving your ${pieceName} to ${toSquare}!`, `How about moving your ${pieceName}?`, `Consider moving your ${pieceName} to a better position!`, `Your ${pieceName} could go to ${toSquare}!`][Math.floor(Math.random() * 4)];
  }
}

// Export for both Node.js modules and browser global scope
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ChessEngine, PIECE_VALUES };
}
if (typeof window !== 'undefined') {
  window.ChessEngine = ChessEngine;
  window.PIECE_VALUES = PIECE_VALUES;
}
