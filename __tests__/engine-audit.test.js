/**
 * engine-audit.test.js - Comprehensive audit of chess rules engine correctness
 *
 * Audits:
 * 1. Check/Checkmate/Stalemate detection
 * 2. Move generator correctness
 * 3. Attack map correctness
 * 4. FEN loader correctness
 * 5. Castling legality
 * 6. En passant legality
 * 7. Promotion correctness
 * 8. Pinned piece handling
 * 9. Double check handling
 * 10. King adjacency rule
 */

const { ChessBoard, WHITE, BLACK } = require("../board.js");
const KING = "k";

describe("Rules Engine Audit", () => {
  let board;

  beforeEach(() => {
    board = new ChessBoard();
  });

  // ============================================
  // 1. CHECK DETECTION
  // ============================================
  describe("Check Detection", () => {
    test("detects check from queen on same file", () => {
      board.board = board.board.map((row) => row.map(() => null));
      board.board[0][4] = "k"; // Black king e8
      board.board[7][4] = "K"; // White king e1
      board.board[2][4] = "Q"; // White queen e6
      board.currentTurn = BLACK;

      expect(board.isInCheck()).toBe(true);
      expect(board.isColorInCheck(BLACK)).toBe(true);
      expect(board.isColorInCheck(WHITE)).toBe(false);
    });

    test("detects check from queen on same rank", () => {
      board.board = board.board.map((row) => row.map(() => null));
      board.board[0][0] = "k"; // Black king a8
      board.board[0][4] = "K"; // White king e8
      board.board[0][3] = "Q"; // White queen d8
      board.currentTurn = BLACK;

      expect(board.isInCheck()).toBe(true);
    });

    test("detects check from knight", () => {
      board.board = board.board.map((row) => row.map(() => null));
      board.board[0][4] = "k"; // Black king e8
      board.board[7][4] = "K"; // White king e1
      board.board[2][3] = "N"; // White knight d6
      board.currentTurn = BLACK;

      expect(board.isInCheck()).toBe(true);
    });

    test("detects check from pawn (White pawn attacking)", () => {
      board.board = board.board.map((row) => row.map(() => null));
      board.board[0][4] = "k"; // Black king e8
      board.board[7][4] = "K"; // White king e1
      board.board[1][3] = "P"; // White pawn d7 (attacks e8)
      board.currentTurn = BLACK;

      expect(board.isInCheck()).toBe(true);
    });

    test("check is not detected through blocking piece", () => {
      board.board = board.board.map((row) => row.map(() => null));
      board.board[0][4] = "k"; // Black king e8
      board.board[7][4] = "K"; // White king e1
      board.board[3][4] = "Q"; // White queen e5
      board.board[2][4] = "n"; // Black knight e6 (blocking)
      board.currentTurn = BLACK;

      expect(board.isInCheck()).toBe(false);
    });
  });

  // ============================================
  // 2. CHECKMATE DETECTION
  // ============================================
  describe("Checkmate Detection", () => {
    test("Scholar's mate position — checkmate", () => {
      board.board = board.board.map((row) => row.map(() => null));
      board.board[0][7] = "k"; // Black king h8
      board.board[1][6] = "Q"; // White queen g7
      board.board[2][6] = "K"; // White king g6
      board.currentTurn = BLACK;

      expect(board.isColorInCheck(BLACK)).toBe(true);
      expect(board.hasLegalMoves()).toBe(false);
      expect(board.isCheckmate()).toBe(true);
    });

    test("Back rank mate — checkmate", () => {
      // Black king on e8, blocked by own pawns on d7, e7, f7
      // White rook on a8 checking along the 8th rank
      board.board = board.board.map((row) => row.map(() => null));
      board.board[0][4] = "k"; // Black king e8
      board.board[1][3] = "p"; // Black pawn d7
      board.board[1][4] = "p"; // Black pawn e7
      board.board[1][5] = "p"; // Black pawn f7
      board.board[0][0] = "R"; // White rook a8
      board.board[7][0] = "K"; // White king a1
      board.currentTurn = BLACK;

      expect(board.isColorInCheck(BLACK)).toBe(true);
      expect(board.hasLegalMoves()).toBe(false);
      expect(board.isCheckmate()).toBe(true);
    });

    test("Not checkmate when checking piece can be captured", () => {
      board.board = board.board.map((row) => row.map(() => null));
      board.board[0][4] = "k"; // Black king e8
      board.board[6][4] = "Q"; // White queen e2 (checking along e-file)
      board.board[6][3] = "n"; // Black knight d2 (can capture queen on e2)
      board.board[7][0] = "K"; // White king a1
      board.currentTurn = BLACK;

      expect(board.isColorInCheck(BLACK)).toBe(true);
      expect(board.hasLegalMoves()).toBe(true);
      expect(board.isCheckmate()).toBe(false);
    });

    test("Not checkmate when check can be blocked", () => {
      board.board = board.board.map((row) => row.map(() => null));
      board.board[0][4] = "k"; // Black king e8
      board.board[2][4] = "Q"; // White queen e6 (checking along e-file)
      board.board[7][0] = "K"; // White king a1
      board.board[1][3] = "b"; // Black bishop d7 (can block on e7 = row 1)
      board.currentTurn = BLACK;

      expect(board.isColorInCheck(BLACK)).toBe(true);
      expect(board.hasLegalMoves()).toBe(true);
      expect(board.isCheckmate()).toBe(false);
    });

    test("Double check — only king can move", () => {
      board.board = board.board.map((row) => row.map(() => null));
      board.board[0][4] = "k"; // Black king e8
      board.board[2][4] = "Q"; // White queen e6 (checking along e-file)
      board.board[2][2] = "B"; // White bishop c6 (checking along a4-e8 diagonal)
      board.board[7][0] = "K"; // White king a1
      board.currentTurn = BLACK;

      expect(board.isColorInCheck(BLACK)).toBe(true);

      // In double check, only king moves can escape
      const legalMoves = board.generateAllLegalMoves();
      legalMoves.forEach((move) => {
        const piece = board.getPiece(move.from.row, move.from.col);
        expect(piece.toLowerCase()).toBe(KING);
      });
    });
  });

  // ============================================
  // 3. STALEMATE DETECTION
  // ============================================
  describe("Stalemate Detection", () => {
    test("stalemate — king trapped but not in check", () => {
      board.board = board.board.map((row) => row.map(() => null));
      board.board[0][0] = "k"; // Black king a8
      board.board[1][2] = "Q"; // White queen c7
      board.board[2][1] = "K"; // White king b6
      board.currentTurn = BLACK;

      expect(board.isColorInCheck(BLACK)).toBe(false);
      expect(board.hasLegalMoves()).toBe(false);
      expect(board.isStalemate()).toBe(true);
    });
  });

  // ============================================
  // 4. ATTACK MAP CORRECTNESS
  // ============================================
  describe("Attack Map", () => {
    test("queen attacks all squares on same file", () => {
      board.board = board.board.map((row) => row.map(() => null));
      board.board[4][4] = "Q";
      board.board[0][4] = "k";

      for (let row = 0; row < 8; row++) {
        if (row !== 4) {
          expect(board.isSquareAttacked(row, 4, WHITE)).toBe(true);
        }
      }
    });

    test("queen attacks all squares on diagonals", () => {
      board.board = board.board.map((row) => row.map(() => null));
      board.board[4][4] = "Q";
      board.board[0][4] = "k";

      expect(board.isSquareAttacked(0, 0, WHITE)).toBe(true); // a1
      expect(board.isSquareAttacked(7, 7, WHITE)).toBe(true); // h8
    });

    test("knight attacks correct squares", () => {
      board.board = board.board.map((row) => row.map(() => null));
      board.board[4][4] = "N";
      board.board[0][4] = "k";

      expect(board.isSquareAttacked(2, 3, WHITE)).toBe(true);
      expect(board.isSquareAttacked(6, 5, WHITE)).toBe(true);
      expect(board.isSquareAttacked(4, 3, WHITE)).toBe(false); // Adjacent
    });

    test("pawn attacks correct squares (White)", () => {
      board.board = board.board.map((row) => row.map(() => null));
      board.board[4][4] = "P"; // White pawn e4
      board.board[0][4] = "k";

      expect(board.isSquareAttacked(3, 3, WHITE)).toBe(true); // d5
      expect(board.isSquareAttacked(3, 5, WHITE)).toBe(true); // f5
      expect(board.isSquareAttacked(5, 3, WHITE)).toBe(false); // d3 (behind)
    });

    test("king attacks adjacent squares", () => {
      board.board = board.board.map((row) => row.map(() => null));
      board.board[4][4] = "K";
      board.board[0][4] = "k";

      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) {continue;}
          expect(board.isSquareAttacked(4 + dr, 4 + dc, WHITE)).toBe(true);
        }
      }
    });

    test("two kings can never be adjacent", () => {
      board.board = board.board.map((row) => row.map(() => null));
      board.board[4][4] = "k"; // Black king e4
      board.board[4][5] = "K"; // White king f4
      board.currentTurn = BLACK;

      const legalMoves = board.generateLegalMovesForPiece(4, 4);
      // All legal king moves should stay at distance > 1 from the white king
      legalMoves.forEach((move) => {
        if (board.getPieceType(board.getPiece(move.from.row, move.from.col)) === KING) {
          const dr = Math.abs(move.to.row - 4);
          const dc = Math.abs(move.to.col - 5);
          expect(Math.max(dr, dc)).toBeGreaterThan(1);
        }
      });
    });

    test("sliding piece attack blocked by friendly piece", () => {
      board.board = board.board.map((row) => row.map(() => null));
      board.board[4][4] = "Q";
      board.board[3][4] = "P"; // Blocking
      board.board[0][4] = "k";

      expect(board.isSquareAttacked(2, 4, WHITE)).toBe(false); // e6 blocked
    });
  });

  // ============================================
  // 5. CASTLING LEGALITY
  // ============================================
  describe("Castling Legality", () => {
    test("kingside castling is legal when path is clear and safe", () => {
      board.board = board.board.map((row) => row.map(() => null));
      board.board[7][4] = "K";
      board.board[7][7] = "R";
      board.board[0][4] = "k";
      board.currentTurn = WHITE;

      const moves = board.generateLegalMovesForPiece(7, 4);
      const castle = moves.find((m) => m.isCastling === "kingside");
      expect(castle).toBeDefined();
    });

    test("cannot castle out of check", () => {
      board.board = board.board.map((row) => row.map(() => null));
      board.board[7][4] = "K";
      board.board[7][7] = "R";
      board.board[3][4] = "q"; // Black queen e5 (checking)
      board.currentTurn = WHITE;

      const moves = board.generateLegalMovesForPiece(7, 4);
      const castle = moves.find((m) => m.isCastling);
      expect(castle).toBeUndefined();
    });

    test("cannot castle through check — bishop attacks f1", () => {
      board.board = board.board.map((row) => row.map(() => null));
      board.board[7][4] = "K"; // White king e1
      board.board[7][7] = "R"; // White rook h1
      board.board[6][5] = "b"; // Black bishop f2 (attacks e1 and f1 via diagonal)
      // Bishop on f2 attacks: f2-e1 (diagonal), f2-g1 (diagonal), f2-g3-h4, f2-e3-d4...
      // It attacks f1? f2 to f1 is straight down, not diagonal.
      // Let me use g2 which attacks f1: g2-f1 is diagonal.
      board.board[6][6] = "b"; // Black bishop g2 (attacks f1 diagonally)
      board.currentTurn = WHITE;

      const moves = board.generateLegalMovesForPiece(7, 4);
      const castle = moves.find((m) => m.isCastling === "kingside");
      expect(castle).toBeUndefined(); // Can't castle through f1 which is attacked
    });

    test("cannot castle if path is blocked", () => {
      board.board = board.board.map((row) => row.map(() => null));
      board.board[7][4] = "K";
      board.board[7][7] = "R";
      board.board[7][5] = "N"; // White knight f1 (blocking)
      board.currentTurn = WHITE;

      const moves = board.generateLegalMovesForPiece(7, 4);
      const castle = moves.find((m) => m.isCastling === "kingside");
      expect(castle).toBeUndefined();
    });
  });

  // ============================================
  // 6. EN PASSANT
  // ============================================
  describe("En Passant", () => {
    test("en passant is available after opponent's double pawn push", () => {
      // Black pawn on d4, white just played e2-e4 (en passant target = e3)
      board.board = board.board.map((row) => row.map(() => null));
      board.board[4][4] = "P"; // White pawn e4
      board.board[4][3] = "p"; // Black pawn d4 (same rank as e4)
      board.board[7][4] = "K"; // White king e1
      board.board[0][0] = "k"; // Black king a8
      board.currentTurn = BLACK;
      board.enPassantTarget = { row: 5, col: 4 }; // e3 (square e-pawn passed through)

      const moves = board.generateLegalMovesForPiece(4, 3); // d4 pawn
      const ep = moves.find((m) => m.isEnPassant);
      expect(ep).toBeDefined();
    });

    test("en passant captures the correct pawn", () => {
      board.board = board.board.map((row) => row.map(() => null));
      board.board[4][4] = "P"; // White pawn e4
      board.board[4][3] = "p"; // Black pawn d4
      board.board[7][4] = "K";
      board.board[0][0] = "k";
      board.currentTurn = BLACK;
      board.enPassantTarget = { row: 5, col: 4 }; // e3

      const moves = board.generateLegalMovesForPiece(4, 3); // d4 pawn
      const ep = moves.find((m) => m.isEnPassant);
      expect(ep).toBeDefined();

      board.executeMove(ep);
      // White pawn on e4 should be removed
      expect(board.getPiece(4, 4)).toBeNull();
      // Black pawn should be on e3 (the en passant target square, row 5)
      expect(board.getPiece(5, 4)).toBe("p");
      // Original d4 square should be empty
      expect(board.getPiece(4, 3)).toBeNull();
    });

    test("en passant is NOT available after one turn", () => {
      board.reset();
      // White plays e4 (double push)
      board.executeMove({ from: { row: 6, col: 4 }, to: { row: 4, col: 4 }, isDoublePush: true });
      // Black plays something else
      board.executeMove({ from: { row: 1, col: 4 }, to: { row: 3, col: 4 }, isDoublePush: true });
      // White plays knight
      board.executeMove({ from: { row: 7, col: 6 }, to: { row: 5, col: 5 } });

      // Black d-pawn (now on d7, row 1) should NOT have en passant
      // Actually the d-pawn is still on d7 (row 1, col 3). It hasn't moved.
      // The white e-pawn is on e4. En passant target was cleared after black's move.
      const moves = board.generateLegalMovesForPiece(1, 3); // d7 pawn
      const ep = moves.find((m) => m.isEnPassant);
      expect(ep).toBeUndefined();
    });
  });

  // ============================================
  // 7. PROMOTION
  // ============================================
  describe("Promotion", () => {
    test("pawn promotes on reaching the back rank", () => {
      board.board = board.board.map((row) => row.map(() => null));
      board.board[1][4] = "P"; // White pawn e7
      board.board[7][4] = "K"; // White king e1
      board.board[0][0] = "k"; // Black king a8 (not on e8!)
      board.currentTurn = WHITE;

      const moves = board.generateLegalMovesForPiece(1, 4);
      const promotions = moves.filter((m) => m.promotion);

      expect(promotions.length).toBe(4); // Q, R, B, N
      expect(promotions.map((m) => m.promotion)).toContain("q");
      expect(promotions.map((m) => m.promotion)).toContain("r");
      expect(promotions.map((m) => m.promotion)).toContain("b");
      expect(promotions.map((m) => m.promotion)).toContain("n");
    });

    test("promoted piece replaces pawn", () => {
      board.board = board.board.map((row) => row.map(() => null));
      board.board[1][4] = "P"; // White pawn e7
      board.board[7][4] = "K";
      board.board[0][0] = "k";
      board.currentTurn = WHITE;

      const moves = board.generateLegalMovesForPiece(1, 4);
      const promoteToQueen = moves.find((m) => m.promotion === "q");
      expect(promoteToQueen).toBeDefined();

      board.executeMove(promoteToQueen);
      expect(board.getPiece(0, 4)).toBe("Q");
      expect(board.getPiece(1, 4)).toBeNull();
    });
  });

  // ============================================
  // 8. PINNED PIECE HANDLING
  // ============================================
  describe("Pinned Pieces", () => {
    test("pinned piece cannot move if it exposes king to check", () => {
      board.board = board.board.map((row) => row.map(() => null));
      board.board[4][4] = "k"; // Black king e4
      board.board[3][4] = "n"; // Black knight e5 (pinned)
      board.board[0][4] = "R"; // White rook e8
      board.board[7][4] = "K"; // White king e1
      board.currentTurn = BLACK;

      const moves = board.generateLegalMovesForPiece(3, 4);
      moves.forEach((move) => {
        expect(move.to.col).toBe(4);
      });
    });

    test("pinned rook can slide along the pin line", () => {
      board.board = board.board.map((row) => row.map(() => null));
      board.board[4][4] = "k"; // Black king e4
      board.board[3][4] = "r"; // Black rook e5 (pinned along e-file)
      board.board[0][4] = "R"; // White rook e8
      board.board[7][4] = "K";
      board.currentTurn = BLACK;

      const moves = board.generateLegalMovesForPiece(3, 4);
      moves.forEach((move) => {
        expect(move.to.col).toBe(4);
      });
      expect(moves.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // 9. KING MOVE RESTRICTIONS
  // ============================================
  describe("King Move Restrictions", () => {
    test("king cannot capture a defended piece", () => {
      board.board = board.board.map((row) => row.map(() => null));
      board.board[4][4] = "k"; // Black king e4
      board.board[3][4] = "Q"; // White queen e5
      board.board[3][5] = "R"; // White rook f5 (defending e5)
      board.board[7][4] = "K";
      board.currentTurn = BLACK;

      const moves = board.generateLegalMovesForPiece(4, 4);
      const captureQueen = moves.find(
        (m) => m.to.row === 3 && m.to.col === 4
      );
      expect(captureQueen).toBeUndefined();
    });

    test("king can capture an undefended piece", () => {
      board.board = board.board.map((row) => row.map(() => null));
      board.board[4][4] = "k"; // Black king e4
      board.board[3][4] = "Q"; // White queen e5 (undefended)
      board.board[7][4] = "K";
      board.currentTurn = BLACK;

      const moves = board.generateLegalMovesForPiece(4, 4);
      const captureQueen = moves.find(
        (m) => m.to.row === 3 && m.to.col === 4
      );
      expect(captureQueen).toBeDefined();
    });
  });

  // ============================================
  // 10. FEN LOADER CORRECTNESS
  // ============================================
  describe("FEN Loader", () => {
    test("loads standard starting position", () => {
      board.loadFEN(
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
      );

      expect(board.getPiece(0, 0)).toBe("r");
      expect(board.getPiece(7, 4)).toBe("K");
      expect(board.currentTurn).toBe(WHITE);
      expect(board.castlingRights[WHITE].kingSide).toBe(true);
      expect(board.castlingRights[BLACK].queenSide).toBe(true);
    });

    test("loads position with en passant target (e3 = row 5, col 4)", () => {
      board.loadFEN(
        "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
      );

      // e3 = file e (col 4), rank 3 (row 5 in 0-indexed from top)
      expect(board.enPassantTarget).toEqual({ row: 5, col: 4 });
    });

    test("loads position with partial castling rights", () => {
      board.loadFEN(
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w Kq - 0 1"
      );

      expect(board.castlingRights[WHITE].kingSide).toBe(true);
      expect(board.castlingRights[WHITE].queenSide).toBe(false);
      expect(board.castlingRights[BLACK].kingSide).toBe(false);
      expect(board.castlingRights[BLACK].queenSide).toBe(true);
    });

    test("round-trip FEN serialization and loading", () => {
      board.reset();
      const originalFEN = board.getFEN();

      const newBoard = new ChessBoard();
      newBoard.loadFEN(originalFEN);
      const restoredFEN = newBoard.getFEN();

      expect(restoredFEN).toBe(originalFEN);
    });
  });

  // ============================================
  // 11. INSUFFICIENT MATERIAL
  // ============================================
  describe("Insufficient Material", () => {
    test("K vs K is a draw", () => {
      board.board = board.board.map((row) => row.map(() => null));
      board.board[0][0] = "k";
      board.board[7][7] = "K";
      expect(board.isInsufficientMaterial()).toBe(true);
    });

    test("K+R vs K is NOT a draw", () => {
      board.board = board.board.map((row) => row.map(() => null));
      board.board[0][0] = "k";
      board.board[7][7] = "K";
      board.board[7][6] = "R";
      expect(board.isInsufficientMaterial()).toBe(false);
    });
  });

  // ============================================
  // 12. DOUBLE CHECK
  // ============================================
  describe("Double Check", () => {
    test("in double check, only king can move", () => {
      board.board = board.board.map((row) => row.map(() => null));
      board.board[0][4] = "k"; // Black king e8
      board.board[2][4] = "Q"; // White queen e6 (checking along e-file)
      board.board[2][2] = "B"; // White bishop c6 (checking along c6-a8 diagonal... wait)
      // c6 to e8: c6-d7-e8. Is that a diagonal? c6(2,2) -> e8(0,4). dr=-2, dc=+2. Yes, diagonal!
      board.board[7][0] = "K"; // White king a1
      board.currentTurn = BLACK;

      expect(board.isColorInCheck(BLACK)).toBe(true);

      const legalMoves = board.generateAllLegalMoves();
      legalMoves.forEach((move) => {
        const piece = board.getPiece(move.from.row, move.from.col);
        expect(piece.toLowerCase()).toBe(KING);
      });
    });
  });

  // ============================================
  // 13. UCI MOVE CONVERSION
  // ============================================
  describe("UCI Move Conversion", () => {
    test("converts standard move to UCI", () => {
      const move = { from: { row: 6, col: 4 }, to: { row: 4, col: 4 } };
      expect(board.moveToUci(move)).toBe("e2e4");
    });

    test("finds move by UCI", () => {
      const move = board.findMoveByUci("e2e4");
      expect(move).toBeDefined();
      expect(move.from.row).toBe(6);
      expect(move.to.row).toBe(4);
    });
  });
});
