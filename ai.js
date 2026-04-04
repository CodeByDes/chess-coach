/**
 * ai.js - Chess AI Opponent
 *
 * Wraps the engine with ELO-based difficulty. Lower ratings make
 * more intentional mistakes so beginners have a fair chance.
 */

class ChessAI {
  constructor(engine) {
    this.engine = engine;
    this.elo = 1200;
    this.isThinking = false;

    // Each level controls how deep the AI searches and how often it blunders
    this.eloConfig = {
      400:  { name: 'Beginner',    depth: 1, mistakeChance: 0.7,  blunderChance: 0.3,   thinkTime: 300,  description: 'Just learning the rules' },
      800:  { name: 'Novice',      depth: 1, mistakeChance: 0.5,  blunderChance: 0.2,   thinkTime: 400,  description: 'Knows basic moves' },
      1200: { name: 'Intermediate',depth: 2, mistakeChance: 0.3,  blunderChance: 0.1,   thinkTime: 500,  description: 'Casual player' },
      1600: { name: 'Advanced',    depth: 2, mistakeChance: 0.15, blunderChance: 0.05,  thinkTime: 600,  description: 'Club player' },
      2000: { name: 'Expert',      depth: 2, mistakeChance: 0.05, blunderChance: 0.02,  thinkTime: 700,  description: 'Strong player' },
      2400: { name: 'Master',      depth: 3, mistakeChance: 0.02, blunderChance: 0.01,  thinkTime: 800,  description: 'Master level' },
      2800: { name: 'Grandmaster', depth: 3, mistakeChance: 0.01, blunderChance: 0.005, thinkTime: 1000, description: 'World class' }
    };
  }

  /**
   * Map the requested ELO to the closest configured difficulty level.
   */
  setElo(elo) {
    this.elo = Math.max(400, Math.min(2800, elo));
    const configElos = Object.keys(this.eloConfig).map(Number);
    const closestElo = configElos.reduce((prev, curr) =>
      Math.abs(curr - this.elo) < Math.abs(prev - this.elo) ? curr : prev
    );
    this.currentConfig = this.eloConfig[closestElo];
  }

  getEloLevels() {
    return Object.keys(this.eloConfig).map(elo => ({
      elo: parseInt(elo),
      name: this.eloConfig[elo].name,
      description: this.eloConfig[elo].description
    }));
  }

  getConfig() {
    return this.currentConfig || this.eloConfig[1200];
  }

  /**
   * Decide on a move. The AI might blunder, make a weak move, or play
   * its best — depending on the current difficulty setting.
   */
  async makeMove(board, _aiColor) {
    this.isThinking = true;
    const config = this.getConfig();

    // Fake "thinking" delay so the game feels natural
    await this.sleep(config.thinkTime);

    const legalMoves = board.generateAllLegalMoves();
    if (legalMoves.length === 0) { this.isThinking = false; return null; }

    let move;
    const roll = Math.random();

    if (roll < config.blunderChance) {
      // Pick any legal move at random — could be terrible
      move = this.pickRandomMove(legalMoves);
    } else if (roll < config.mistakeChance) {
      // Pick from the worst half of evaluated moves
      move = this.pickWeakMove(board, legalMoves, config.depth);
    } else {
      // Play the strongest move the engine can find
      move = this.pickBestMove(board, legalMoves, config.depth);
    }

    this.isThinking = false;
    return move;
  }

  pickRandomMove(moves) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  /**
   * Evaluate every legal move and pick one from the bottom half.
   * This simulates a weaker player missing the best continuation.
   */
  pickWeakMove(board, moves, _depth) {
    const evaluated = moves.map(move => {
      const state = board.makeMove(move);
      const score = -this.engine.evaluate(board);  // Negate — turn flips after the move
      board.undoMove(state);
      return { move, score };
    });

    evaluated.sort((a, b) => a.score - b.score);  // Worst first
    const bottomHalf = evaluated.slice(0, Math.ceil(evaluated.length / 2));
    return bottomHalf[Math.floor(Math.random() * bottomHalf.length)].move;
  }

  /**
   * Evaluate all legal moves and return the highest-scoring one.
   * For depth 3+ we delegate to the full minimax search.
   */
  pickBestMove(board, moves, depth) {
    if (depth <= 2) {
      const evaluated = moves.map(move => {
        const state = board.makeMove(move);
        const score = -this.engine.evaluate(board);
        board.undoMove(state);
        return { move, score };
      });
      evaluated.sort((a, b) => b.score - a.score);  // Best first
      return evaluated[0].move;
    }
    return this.engine.findBestMove(board, depth);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getIsThinking() {
    return this.isThinking;
  }
}

// Export for both Node.js modules and browser global scope
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ChessAI };
}
if (typeof window !== 'undefined') {
  window.ChessAI = ChessAI;
}
