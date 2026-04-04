/**
 * board.test.js - Tests for ChessBoard move generation and validation
 */

require('../board.js');
require('../engine.js');
require('../ai.js');

// board.js defines WHITE/BLACK/PAWN/etc as globals, plus ChessBoard class
const { ChessBoard } = require('../board.js');

describe('ChessBoard', () => {
  let board;

  beforeEach(() => {
    board = new ChessBoard();
  });

  describe('initialization', () => {
    test('starts with correct turn order', () => {
      expect(board.currentTurn).toBe('w');
    });

    test('starts at move 1', () => {
      expect(board.moveNumber).toBe(1);
    });

    test('has pieces on starting squares', () => {
      expect(board.getPiece(0, 0)).toBe('r'); // Black rook a8
      expect(board.getPiece(7, 0)).toBe('R'); // White rook a1
      expect(board.getPiece(1, 0)).toBe('p'); // Black pawn a7
      expect(board.getPiece(6, 0)).toBe('P'); // White pawn a2
      expect(board.getPiece(7, 4)).toBe('K'); // White king e1
      expect(board.getPiece(0, 4)).toBe('k'); // Black king e8
    });

    test('has empty center squares', () => {
      expect(board.getPiece(3, 3)).toBeNull();
      expect(board.getPiece(3, 4)).toBeNull();
      expect(board.getPiece(4, 3)).toBeNull();
      expect(board.getPiece(4, 4)).toBeNull();
    });
  });

  describe('piece color detection', () => {
    test('identifies White pieces', () => {
      expect(board.getPieceColor('R')).toBe('w');
      expect(board.getPieceColor('K')).toBe('w');
    });

    test('identifies Black pieces', () => {
      expect(board.getPieceColor('r')).toBe('b');
      expect(board.getPieceColor('k')).toBe('b');
    });

    test('returns null for empty square', () => {
      expect(board.getPieceColor(null)).toBeNull();
    });
  });

  describe('legal move generation', () => {
    test('White has 20 legal moves from starting position', () => {
      const moves = board.generateAllLegalMoves();
      expect(moves.length).toBe(20);
    });

    test('can generate pawn moves from starting position', () => {
      const moves = board.generateLegalMovesForPiece(6, 4); // e2 pawn
      expect(moves.length).toBe(2); // e3, e4
    });

    test('can generate knight moves from starting position', () => {
      const moves = board.generateLegalMovesForPiece(7, 1); // b1 knight
      expect(moves.length).toBe(2); // Na3, Nc3
    });

    test('sliding pieces are blocked by own pieces', () => {
      const moves = board.generateLegalMovesForPiece(7, 2); // c1 bishop
      expect(moves.length).toBe(0); // Blocked by own pawns/pieces
    });
  });

  describe('move execution and undo', () => {
    test('executes a move and switches turn', () => {
      const moves = board.generateLegalMovesForPiece(6, 4); // e2 pawn
      const move = moves.find(m => m.to.row === 5); // e3
      expect(move).toBeDefined();

      board.executeMove(move);
      expect(board.currentTurn).toBe('b');
      expect(board.getPiece(5, 4)).toBe('P');
      expect(board.getPiece(6, 4)).toBeNull();
    });

    test('records move in history', () => {
      const moves = board.generateLegalMovesForPiece(6, 4);
      board.executeMove(moves[0]);
      expect(board.moveHistory.length).toBe(1);
    });

    test('undoes a move and restores state', () => {
      const moves = board.generateLegalMovesForPiece(6, 4);
      board.executeMove(moves[0]);
      board.undoLastMove();

      expect(board.currentTurn).toBe('w');
      expect(board.getPiece(6, 4)).toBe('P');
      expect(board.moveHistory.length).toBe(0);
    });
  });

  describe('check detection', () => {
    test('detects check', () => {
      board.board = board.board.map(row => row.map(() => null));
      board.board[0][4] = 'k'; // Black king on e8
      board.board[7][4] = 'K'; // White king on e1
      board.board[2][4] = 'Q'; // White queen on e6 — checking king

      expect(board.isSquareAttacked(0, 4, 'w')).toBe(true);
    });
  });

  describe('game-over detection', () => {
    test('detects checkmate — king trapped by queen and own piece', () => {
      // Classic checkmate: Black king on h8, White queen on g7, White king on g6
      board.board = board.board.map(row => row.map(() => null));
      board.board[0][7] = 'k'; // Black king on h8
      board.board[1][6] = 'Q'; // White queen on g7 — checking
      board.board[2][6] = 'K'; // White king on g6 — covering escape
      board.currentTurn = 'b';

      expect(board.isColorInCheck('b')).toBe(true);
      expect(board.hasLegalMoves()).toBe(false);
      expect(board.isCheckmate()).toBe(true);
    });

    test('detects stalemate — king trapped but not in check', () => {
      // Black king on a8, White queen on c7, White king on b6
      // Q on c7 attacks a7 (rank) and b8 (diagonal) but NOT a8
      // K on b6 attacks a7, b7, c7
      // Black king has no legal moves and is not in check
      board.board = board.board.map(row => row.map(() => null));
      board.board[0][0] = 'k'; // Black king on a8
      board.board[1][2] = 'Q'; // White queen on c7
      board.board[2][1] = 'K'; // White king on b6
      board.currentTurn = 'b';

      expect(board.isColorInCheck('b')).toBe(false);
      expect(board.hasLegalMoves()).toBe(false);
      expect(board.isStalemate()).toBe(true);
    });

    test('detects insufficient material K vs K', () => {
      board.board = board.board.map(row => row.map(() => null));
      board.board[0][0] = 'k';
      board.board[7][7] = 'K';

      expect(board.isInsufficientMaterial()).toBe(true);
    });

    test('returns game over reason', () => {
      board.board = board.board.map(row => row.map(() => null));
      board.board[0][0] = 'k'; // Black king on a8
      board.board[1][2] = 'Q'; // White queen on c7
      board.board[2][1] = 'K'; // White king on b6
      board.currentTurn = 'b';

      expect(board.isGameOver()).toBe(true);
      expect(board.getGameOverReason()).toContain('Stalemate');
    });
  });

  describe('FEN serialization', () => {
    test('generates valid FEN from starting position', () => {
      const fen = board.getFEN();
      expect(fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    });

    test('loads FEN correctly', () => {
      board.loadFEN('8/8/8/8/8/8/8/8 w - - 0 1');
      expect(board.getPiece(0, 0)).toBeNull();
      expect(board.currentTurn).toBe('w');
    });

    test('serializes and restores state', () => {
      const moves = board.generateLegalMovesForPiece(6, 4);
      board.executeMove(moves[0]);

      const state = board.serializeState();
      const newBoard = new ChessBoard();
      newBoard.loadState(state);

      expect(newBoard.currentTurn).toBe(board.currentTurn);
      expect(newBoard.getPiece(5, 4)).toBe('P');
    });
  });

  describe('UCI move conversion', () => {
    test('converts move to UCI', () => {
      const moves = board.generateLegalMovesForPiece(6, 4);
      const uci = board.moveToUci(moves[0]);
      expect(uci).toMatch(/e2e[34]/);
    });

    test('finds move by UCI', () => {
      const move = board.findMoveByUci('e2e4');
      expect(move).toBeDefined();
      expect(move.from.row).toBe(6);
      expect(move.from.col).toBe(4);
      expect(move.to.row).toBe(4);
      expect(move.to.col).toBe(4);
    });
  });

  describe('castling', () => {
    test('can castle kingside when path is clear', () => {
      board.board = board.board.map(row => row.map(() => null));
      board.board[7][4] = 'K';
      board.board[7][7] = 'R';
      board.board[0][4] = 'k';

      const moves = board.generateLegalMovesForPiece(7, 4);
      const castle = moves.find(m => m.isCastling === 'kingside');
      expect(castle).toBeDefined();
    });

    test('cannot castle if king has moved', () => {
      board.board = board.board.map(row => row.map(() => null));
      board.board[7][4] = 'K';
      board.board[7][7] = 'R';
      board.board[0][4] = 'k';

      // Move the king first
      const kingMoves = board.generateLegalMovesForPiece(7, 4);
      const normalMove = kingMoves.find(m => !m.isCastling);
      board.executeMove(normalMove);
      board.undoLastMove();

      // Revoke castling rights manually
      board.castlingRights['w'].kingSide = false;

      const moves = board.generateLegalMovesForPiece(7, 4);
      const castle = moves.find(m => m.isCastling === 'kingside');
      expect(castle).toBeUndefined();
    });
  });
});
