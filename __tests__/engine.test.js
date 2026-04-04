/**
 * engine.test.js - Tests for ChessEngine evaluation and move selection
 */

const { ChessBoard } = require('../board.js');
const { ChessEngine } = require('../engine.js');

describe('ChessEngine', () => {
  let board;
  let engine;

  beforeEach(() => {
    board = new ChessBoard();
    engine = new ChessEngine();
  });

  describe('material evaluation', () => {
    test('starting position is roughly equal', () => {
      const score = engine.evaluate(board);
      expect(score).toBe(0); // Equal material
    });

    test('extra piece gives positive score for White', () => {
      board.board = board.board.map(row => row.map(() => null));
      board.board[7][4] = 'K';
      board.board[0][4] = 'k';
      board.board[4][4] = 'Q'; // White queen in center

      const score = engine.evaluate(board);
      expect(score).toBeGreaterThan(0);
    });

    test('extra piece gives negative score for Black', () => {
      board.board = board.board.map(row => row.map(() => null));
      board.board[7][4] = 'K';
      board.board[0][4] = 'k';
      board.board[4][4] = 'q'; // Black queen in center

      const score = engine.evaluate(board);
      expect(score).toBeLessThan(0);
    });
  });

  describe('positional evaluation', () => {
    test('centralized knight is rewarded', () => {
      board.board = board.board.map(row => row.map(() => null));
      board.board[7][4] = 'K';
      board.board[0][4] = 'k';
      board.board[3][3] = 'N'; // White knight on d5

      const score = engine.evaluate(board);
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('mobility evaluation', () => {
    test('more legal moves = higher mobility score', () => {
      board.board = board.board.map(row => row.map(() => null));
      board.board[7][4] = 'K';
      board.board[0][4] = 'k';

      const savedTurn = board.currentTurn;
      board.currentTurn = 'w';
      const whiteMobility = board.generateAllLegalMoves().length;
      board.currentTurn = 'b';
      const blackMobility = board.generateAllLegalMoves().length;
      board.currentTurn = savedTurn;

      expect(whiteMobility).toBe(blackMobility);
    });
  });

  describe('center control', () => {
    test('controlling center squares is rewarded', () => {
      board.board = board.board.map(row => row.map(() => null));
      board.board[7][4] = 'K';
      board.board[0][4] = 'k';
      board.board[3][3] = 'P'; // White pawn on d5

      const score = engine.evaluate(board);
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('move selection', () => {
    test('finds a best move in a simple capture position', () => {
      board.board = board.board.map(row => row.map(() => null));
      board.board[7][4] = 'K';
      board.board[0][4] = 'k';
      board.board[3][3] = 'Q'; // White queen
      board.board[3][4] = 'p'; // Black pawn (can be captured)

      const bestMove = engine.findBestMove(board, 2);
      expect(bestMove).toBeDefined();
      expect(bestMove.capture).toBe('p');
    });

    test('returns null when no legal moves exist', () => {
      // Position where side to move has no legal moves (stalemate)
      board.board = board.board.map(row => row.map(() => null));
      board.board[0][0] = 'k'; // Black king on a8
      board.board[1][2] = 'Q'; // White queen on c7
      board.board[2][1] = 'K'; // White king on b6
      board.currentTurn = 'b';

      const bestMove = engine.findBestMove(board, 2);
      expect(bestMove).toBeNull();
    });

    test('getTopMoves returns scored moves', () => {
      const topMoves = engine.getTopMoves(board, 2, 3);
      expect(topMoves.length).toBeGreaterThan(0);
      expect(topMoves[0]).toHaveProperty('move');
      expect(topMoves[0]).toHaveProperty('score');
    });

    test('evaluates move quality', () => {
      const moves = board.generateAllLegalMoves();
      const move = moves[0];
      const analysis = engine.analyzeMove(board, move);

      expect(analysis).toHaveProperty('quality');
      expect(analysis).toHaveProperty('feedback');
      expect(analysis).toHaveProperty('scoreBefore');
      expect(analysis).toHaveProperty('scoreAfter');
      expect(['best', 'good', 'inaccuracy', 'mistake', 'blunder']).toContain(analysis.quality);
    });
  });

  describe('move comparison', () => {
    test('correctly identifies equal moves', () => {
      const moveA = { from: { row: 6, col: 4 }, to: { row: 4, col: 4 } };
      const moveB = { from: { row: 6, col: 4 }, to: { row: 4, col: 4 } };
      expect(engine.movesEqual(moveA, moveB)).toBe(true);
    });

    test('correctly identifies different moves', () => {
      const moveA = { from: { row: 6, col: 4 }, to: { row: 4, col: 4 } };
      const moveB = { from: { row: 6, col: 3 }, to: { row: 4, col: 3 } };
      expect(engine.movesEqual(moveA, moveB)).toBe(false);
    });

    test('handles promotion comparison', () => {
      const moveA = { from: { row: 1, col: 0 }, to: { row: 0, col: 0 }, promotion: 'q' };
      const moveB = { from: { row: 1, col: 0 }, to: { row: 0, col: 0 }, promotion: 'q' };
      expect(engine.movesEqual(moveA, moveB)).toBe(true);

      const moveC = { from: { row: 1, col: 0 }, to: { row: 0, col: 0 }, promotion: 'r' };
      expect(engine.movesEqual(moveA, moveC)).toBe(false);
    });
  });

  describe('move hint', () => {
    test('provides a hint for the current position', () => {
      const hint = engine.getMoveHint(board);
      expect(typeof hint).toBe('string');
      expect(hint.length).toBeGreaterThan(0);
    });
  });

  describe('debug mode', () => {
    test('debug log captures messages when enabled', () => {
      engine.setDebugMode(true);
      engine.evaluate(board);
      const log = engine.getDebugLog();
      expect(log.length).toBeGreaterThan(0);
      engine.setDebugMode(false);
    });

    test('debug log is empty when disabled', () => {
      engine.setDebugMode(false);
      engine.evaluate(board);
      const log = engine.getDebugLog();
      expect(log).toBe('');
    });
  });
});
