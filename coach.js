/**
 * coach.js - Chess Coach Mode
 *
 * The friendly voice behind the app: highlights legal moves,
 * analyzes move quality, and keeps the player motivated with
 * encouraging, kid-friendly feedback.
 */

class ChessCoach {
  constructor(board, engine) {
    this.board = board;
    this.engine = engine;
    this.enabled = true;
    this.currentSuggestions = [];
    this.lastMoveAnalysis = null;
    this.hintMove = null;
    this.legalMoveHighlights = [];

    // Quick pick-me-ups when the player needs encouragement
    this.encouragingMessages = [
      "You're doing great! Keep practicing! 🌟",
      "Every move is a learning opportunity! 💡",
      "Chess is fun! Enjoy the game! 🎮",
      "You're getting better with each move! 📈",
      "Great effort! Keep thinking! 🤔",
      "I believe in you! You can do this! 💪",
      "Chess masters practice every day! You're on your way! ♟️",
      "Take your time and think about your options! ⏰"
    ];
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.clearHighlights();
  }

  isEnabled() { return this.enabled; }

  // ============================================
  // Legal Move Highlights
  // ============================================

  /**
   * When the player clicks a piece, show everywhere it can legally go.
   * The UI reads `legalMoveHighlights` to paint the dots on the board.
   */
  getLegalMovesForSquare(row, col) {
    if (!this.enabled) return [];
    const piece = this.board.getPiece(row, col);
    if (!piece || !this.board.isOwnPiece(piece)) return [];
    this.legalMoveHighlights = this.board.generateLegalMovesForPiece(row, col);
    return this.legalMoveHighlights;
  }

  clearHighlights() {
    this.legalMoveHighlights = [];
    this.hintMove = null;
  }

  /**
   * Flatten the move list into simple {row, col, isCapture} objects
   * that the UI can use for styling.
   */
  getHighlightSquares() {
    return this.legalMoveHighlights.map(move => ({
      row: move.to.row, col: move.to.col, isCapture: !!move.capture
    }));
  }

  // ============================================
  // Move Suggestions
  // ============================================

  /**
   * Ask the engine for the best move so the coach can hint at it.
   */
  getSuggestedMove() {
    if (!this.enabled || this.board.isGameOver()) return null;
    this.hintMove = this.engine.findBestMove(this.board, 2);
    return this.hintMove;
  }

  /**
   * Return the from/to squares of the current hint so the UI can
   * draw a subtle arrow or glow.
   */
  getSuggestionHighlight() {
    if (!this.hintMove) return null;
    return {
      from: { row: this.hintMove.from.row, col: this.hintMove.from.col },
      to: { row: this.hintMove.to.row, col: this.hintMove.to.col }
    };
  }

  // ============================================
  // Move Analysis
  // ============================================

  /**
   * Run the engine's analysis on the move the player just made.
   * We analyze *before* the move is permanently committed so we
   * can compare the position before and after.
   */
  analyzeMove(move) {
    if (!this.enabled) return { quality: 'unknown', feedback: '', scoreDiff: 0 };
    this.lastMoveAnalysis = this.engine.analyzeMove(this.board, move);
    return this.lastMoveAnalysis;
  }

  getFeedbackMessage(analysis) {
    return analysis?.feedback || '';
  }

  getEncouragingMessage() {
    return this.encouragingMessages[Math.floor(Math.random() * this.encouragingMessages.length)];
  }

  // ============================================
  // Kid-Friendly Explanations
  // ============================================

  /**
   * Break down why a move might be risky — in plain language.
   * Checks for hanging pieces, moving into check, and undefended pieces.
   */
  explainBadMove(move, analysis) {
    if (!this.enabled) return '';

    const explanations = [];

    if (this.isPieceHanging(move.to.row, move.to.col)) {
      explanations.push("Be careful! Your piece might be captured there!");
    }

    // Temporarily play the move to see if it exposes the king
    const tempState = this.board.makeMove(move);
    if (this.board.isInCheck()) {
      explanations.push("Oh no! That move puts your king in danger!");
    }
    this.board.undoMove(tempState);

    if (this.isLeavingPieceUndefended(move)) {
      explanations.push("Try to keep your pieces protecting each other!");
    }

    return explanations.length > 0 ? explanations[0]
      : analysis?.feedback || "Let's think about this move again!";
  }

  isSquareAttacked(row, col) {
    const opponentColor = this.board.currentTurn === WHITE ? BLACK : WHITE;
    return this.board.isSquareAttacked(row, col, opponentColor);
  }

  /**
   * A piece is "hanging" if it sits on an attacked square with no
   * obvious defender. Simplified for coaching — not engine-grade.
   */
  isPieceHanging(row, col) {
    if (!this.isSquareAttacked(row, col)) return false;
    const piece = this.board.getPiece(row, col);
    if (!piece) return false;
    return true;  // If it's attacked, flag it as potentially hanging
  }

  // Placeholder — a full implementation would trace piece defenses
  isLeavingPieceUndefended(move) { return false; }

  // ============================================
  // Chess Tips for Beginners
  // ============================================

  getChessTip() {
    const tips = [
      "💡 Control the center of the board with your pawns and pieces!",
      "💡 Develop your knights and bishops early in the game!",
      "💡 Castle early to keep your king safe!",
      "💡 Don't move the same piece twice in the opening!",
      "💡 Think about what your opponent wants to do!",
      "💡 Protect your pieces — don't leave them where they can be captured!",
      "💡 A knight on the edge of the board is not very strong!",
      "💡 Rooks work best on open files!",
      "💡 Keep your king safe — it's your most important piece!",
      "💡 Look for checks, captures, and threats on every move!",
      "💡 Trade pieces when you're ahead in material!",
      "💡 Don't bring your queen out too early!"
    ];
    return tips[Math.floor(Math.random() * tips.length)];
  }

  /**
   * Context-aware tips: check status, opening phase, or material balance.
   */
  getStateSpecificTip() {
    if (this.board.isColorInCheck(this.board.currentTurn)) {
      const name = this.board.currentTurn === WHITE ? 'White' : 'Black';
      return `⚠️ ${name}'s king is in check! Get out of check right now!`;
    }

    if (this.board.moveNumber <= 5) {
      return "💡 Opening tip: Control the center and develop your pieces!";
    }

    const whiteCaptured = this.board.capturedPieces[WHITE].length;
    const blackCaptured = this.board.capturedPieces[BLACK].length;

    if (whiteCaptured > blackCaptured + 2) return "💡 You're ahead! Try to trade pieces to simplify!";
    if (blackCaptured > whiteCaptured + 2) return "💡 You're behind! Look for tactics to win material back!";

    return this.getChessTip();
  }

  // ============================================
  // Game State Feedback
  // ============================================

  getGameStateFeedback() {
    if (this.board.isCheckmate()) {
      const winner = this.board.currentTurn === WHITE ? 'Black' : 'White';
      return { type: 'gameover', message: `Checkmate! ${winner} wins! Great game! 🎉`, style: 'good' };
    }
    if (this.board.isStalemate()) {
      return { type: 'gameover', message: "Stalemate! The game is a draw. That's okay — stalemate is a clever chess rule! 🤝", style: 'warning' };
    }
    if (this.board.isColorInCheck(this.board.currentTurn)) {
      const name = this.board.currentTurn === WHITE ? 'White' : 'Black';
      return { type: 'check', message: `⚠️ ${name}'s king is in check!`, style: 'warning' };
    }
    if (this.board.isInsufficientMaterial()) {
      return { type: 'gameover', message: "Draw! There isn't enough material to checkmate. Good practice though! 👍", style: 'good' };
    }
    return null;
  }

  getWelcomeMessage() {
    return [
      "Welcome! Click on a piece to see where it can move! I'll help you learn! 🎯",
      "Hi there! Ready to play chess? Select a piece to get started! ♟️",
      "Hello! I'm your chess coach! Let's learn together! Pick a piece! 🌟",
      "Welcome to chess practice! Click any piece to see your options! 💡"
    ][Math.floor(Math.random() * 4)];
  }

  getTurnMessage(color) {
    const piece = color === WHITE ? '♔' : '♚';
    const name = color === WHITE ? "White" : "Black";
    if (this.board.isInCheck()) return `⚠️ ${name}'s turn — King is in check! ${piece}`;
    return `${name}'s turn to move ${piece}`;
  }

  // ============================================
  // Move Explanations
  // ============================================

  /**
   * Translate the engine's quality rating into a warm, readable message.
   * Every move gets feedback — even if it's just encouragement.
   */
  getMoveExplanation(analysis, move) {
    if (!analysis || !analysis.quality) {
      return { message: this.getGoodMoveExplanation(move), style: 'encouraging' };
    }

    const { quality, scoreDiff } = analysis;
    let message = '', style = 'encouraging';

    switch (quality) {
      case 'best':       message = this.getBestMoveExplanation(move);       style = 'good'; break;
      case 'good':       message = this.getGoodMoveExplanation(move);       style = 'encouraging'; break;
      case 'inaccuracy': message = this.getInaccuracyExplanation(move);     style = 'warning'; break;
      case 'mistake':    message = this.getMistakeExplanation(move);        style = 'warning'; break;
      case 'blunder':    message = this.getBlunderExplanation(move);        style = 'warning'; break;
      default:           message = this.getNeutralExplanation();            style = '';
    }

    return { message, style };
  }

  getBestMoveExplanation(move) {
    if (move.capture) return "Great capture! You won material! 🎯";
    if (move.isCastling) return "Perfect! Your king is safe now! Great thinking! 🏰";
    return [
      "Excellent! You found the best move! 🌟",
      "Perfect! That's exactly what a master would play! 🏆",
      "Amazing! You're thinking like a champion! ♔",
      "Wow! That move improves your position perfectly! 💪"
    ][Math.floor(Math.random() * 4)];
  }

  getGoodMoveExplanation(move) {
    if (move.capture) return "Nice capture! You got their piece!";
    return [
      "Good move! You're controlling the center.",
      "Nice! You improved your position.",
      "Well done! Your pieces are working together.",
      "Solid move! Keep up the good work!",
      "Good thinking! You're developing your pieces."
    ][Math.floor(Math.random() * 5)];
  }

  getInaccuracyExplanation(move) {
    if (move.capture) return "That capture is okay, but there might be a better target.";
    return [
      "Not bad, but there's a slightly better move!",
      "Okay move, but you could improve your position more.",
      "Good idea, but look for a stronger continuation.",
      "That's alright, but try to find the best move next time."
    ][Math.floor(Math.random() * 4)];
  }

  getMistakeExplanation(move) {
    if (move.capture) return "Be careful with that capture. It might not be safe.";
    return [
      "Careful. That move leaves your piece unprotected.",
      "Hmm, this move weakens your position.",
      "Think again. There's a better move available.",
      "This move isn't ideal. Look for safer options."
    ][Math.floor(Math.random() * 4)];
  }

  getBlunderExplanation(move) {
    if (move.capture) return "Don't take that piece! It's a trap!";
    return [
      "Oh no! This move is very dangerous!",
      "Warning! This move could lose you the game!",
      "Be careful! Your opponent can punish this move.",
      "This is a big mistake. Try to find a safer move!"
    ][Math.floor(Math.random() * 4)];
  }

  getNeutralExplanation() {
    return [
      "Interesting move. Let's see what happens!",
      "You made a move. Keep thinking!",
      "Okay. What's your plan?"
    ][Math.floor(Math.random() * 3)];
  }
}

// Export for both Node.js modules and browser global scope
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ChessCoach };
}
if (typeof window !== 'undefined') {
  window.ChessCoach = ChessCoach;
}
