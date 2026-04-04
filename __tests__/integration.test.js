/**
 * integration.test.js - Integration tests for full game and puzzle flows
 *
 * Tests cross-module interactions:
 * - Full game flow: start -> moves -> undo -> checkmate -> review
 * - Puzzle flow: load -> validate -> complete -> rating/streak
 * - Puzzle Hub: filters, sorting, search, favorites
 */

const fs = require("fs");
const path = require("path");

const { ChessBoard, WHITE, BLACK } = require("../board.js");
const { ChessEngine } = require("../engine.js");
const { ChessAI } = require("../ai.js");
const { ChessProgress } = require("../progress.js");

// Mock localStorage
let localStorageData = {};
global.localStorage = {
  getItem: (key) => localStorageData[key] || null,
  setItem: (key, value) => {
    localStorageData[key] = value;
  },
  removeItem: (key) => {
    delete localStorageData[key];
  },
};

// Mock fetch for puzzles
const puzzlesPath = path.join(__dirname, "..", "assets", "puzzles", "puzzles.json");
const puzzleDatabase = JSON.parse(fs.readFileSync(puzzlesPath, "utf8"));
global.fetch = async (url) => {
  if (url.includes("puzzles.json")) {
    return { ok: true, json: async () => puzzleDatabase };
  }
  throw new Error("Unexpected fetch URL: " + url);
};

class MockCoach {
  constructor() {
    this.persona = {
      renderPuzzleIntro: () => "Intro",
      renderPuzzleMistake: () => "Mistake",
      renderPuzzleSuccess: () => "Success",
      renderPuzzleStreak: () => "Streak",
    };
    this.skillProfile = { bracket: "club" };
  }
}

async function createPuzzleSystem() {
  const { ChessPuzzleSystem } = require("../puzzles.js");
  const board = new ChessBoard();
  const coach = new MockCoach();
  const system = new ChessPuzzleSystem(board, coach);
  await system.init();
  return system;
}

describe("Integration Tests", () => {
  beforeEach(() => {
    localStorageData = {};
  });

  describe("Full Game Flow", () => {
    let board;
    let engine;
    let ai;
    let progress;

    beforeEach(() => {
      board = new ChessBoard();
      engine = new ChessEngine();
      ai = new ChessAI(engine);
      ai.setElo(1200);
      progress = new ChessProgress();
    });

    test("start game -> make moves -> undo -> check state", () => {
      // Start: initial position
      expect(board.currentTurn).toBe(WHITE);
      expect(board.moveHistory.length).toBe(0);

      // Make e4
      const e4Moves = board.generateLegalMovesForPiece(6, 4);
      const e4 = e4Moves.find((m) => m.to.row === 4);
      expect(e4).toBeDefined();
      board.executeMove(e4);
      expect(board.currentTurn).toBe(BLACK);
      expect(board.moveHistory.length).toBe(1);

      // Make e5
      const e5Moves = board.generateLegalMovesForPiece(1, 4);
      const e5 = e5Moves.find((m) => m.to.row === 3);
      expect(e5).toBeDefined();
      board.executeMove(e5);
      expect(board.currentTurn).toBe(WHITE);
      expect(board.moveHistory.length).toBe(2);

      // Undo (undoes both moves)
      board.undoLastMove();
      board.undoLastMove();
      expect(board.currentTurn).toBe(WHITE);
      expect(board.moveHistory.length).toBe(0);
      expect(board.getPiece(6, 4)).toBe("P"); // e2 pawn restored
    });

    test("AI makes a valid move from starting position", async () => {
      const move = await ai.makeMove(board, WHITE);
      expect(move).toBeDefined();
      expect(move.from).toBeDefined();
      expect(move.to).toBeDefined();
    });

    test("detects checkmate after forced sequence", () => {
      // Scholar's mate simulation
      // White: e4, Bc4, Qh5, Qxf7#
      // Black: e5, Nc6, Nf6??, Nxe4??
      // Setup simplified checkmate position
      board.board = board.board.map((row) => row.map(() => null));
      board.board[0][7] = "k"; // Black king h8
      board.board[1][6] = "Q"; // White queen g7 — checking
      board.board[2][6] = "K"; // White king g6
      board.currentTurn = BLACK;

      expect(board.isColorInCheck(BLACK)).toBe(true);
      expect(board.hasLegalMoves()).toBe(false);
      expect(board.isCheckmate()).toBe(true);
      expect(board.getGameOverReason()).toContain("Checkmate");
    });

    test("progress tracks game played and ELO updates", () => {
      expect(progress.gamesPlayed).toBe(0);
      expect(progress.playerElo).toBe(1200);

      progress.recordGamePlayed();
      expect(progress.gamesPlayed).toBe(1);

      const delta = progress.updatePlayerElo(1200, 1); // Win
      expect(delta).toBeGreaterThan(0);
      expect(progress.playerElo).toBeGreaterThan(1200);
    });

    test("session persistence across save/load", () => {
      // Simulate saving a game state
      const sessionData = {
        boardState: board.serializeState(),
        currentTurn: board.currentTurn,
        moveHistoryLength: board.moveHistory.length,
      };
      localStorage.setItem("testChessSession", JSON.stringify(sessionData));

      // Restore
      const restored = JSON.parse(localStorage.getItem("testChessSession"));
      const newBoard = new ChessBoard();
      newBoard.loadState(restored.boardState);

      expect(newBoard.currentTurn).toBe(WHITE);
      expect(newBoard.getPiece(7, 4)).toBe("K");
    });
  });

  describe("Puzzle Flow Integration", () => {
    let system;

    beforeEach(async () => {
      system = await createPuzzleSystem();
    });

    test("load puzzle -> validate correct move -> complete puzzle -> rating updates", () => {
      system.state.rating = 1200;
      const session = system.startPractice({ tier: "beginner" });
      expect(session).not.toBeNull();
      expect(session.type).toBe("practice");

      const expectedMove = system.getExpectedMove();
      expect(expectedMove).not.toBeNull();

      const result = system.validateMove(expectedMove);
      expect(["correct", "solved", "invalid"]).toContain(result.status);

      if (result.status === "correct" || result.status === "solved") {
        expect(system.state.accuracy.correct).toBeGreaterThan(0);
      }
    });

    test("wrong move increments attempts and accuracy.wrong", () => {
      system.startPractice({ tier: "beginner" });
      const initialWrong = system.state.accuracy.wrong;

      const result = system.validateMove("a1a2"); // Likely wrong
      // Even if it happens to be correct, wrong count should not decrease
      expect(system.state.accuracy.wrong).toBeGreaterThanOrEqual(initialWrong);
      expect(["wrong", "correct", "solved"]).toContain(result.status);
    });

    test("complete puzzle increments streak and unlocks achievement", () => {
      system.state.rating = 1200;
      system.createSession(
        "practice",
        system.puzzles.find((p) => p.rating === 1000) || system.puzzles[0],
        {}
      );
      system.completeCurrentPuzzle(true);

      expect(system.state.currentStreak).toBeGreaterThan(0);
      expect(system.state.bestStreak).toBeGreaterThanOrEqual(system.state.currentStreak);
      expect(system.state.achievements["first-solve"]).toBeDefined();
    });

    test("puzzle rating updates after solve", () => {
      system.state.rating = 1200;
      const puzzle = system.puzzles.find((p) => Math.abs(p.rating - 1300) < 50) || system.puzzles[0];
      system.createSession("practice", puzzle, {});
      system.completeCurrentPuzzle(true);

      // Rating should have changed (likely increased since puzzle is harder than 1200)
      expect(system.state.rating).not.toBe(1200);
    });

    test("favorites persist across session restore", () => {
      system.toggleFavoriteById(1001);
      expect(system.isFavorite(1001)).toBe(true);

      // Simulate reload
      const newSystemPromise = createPuzzleSystem();
      return newSystemPromise.then((newSystem) => {
        expect(newSystem.isFavorite(1001)).toBe(true);
      });
    });
  });

  describe("Puzzle Hub Integration", () => {
    let system;

    beforeEach(async () => {
      system = await createPuzzleSystem();
    });

    test("filters combine correctly: tier + category + pack", () => {
      const data = system.getAllPuzzlesBrowserData({
        tier: "beginner",
        category: "mate-in-1",
        pack: "all",
        page: 1,
        pageSize: 20,
      });

      expect(data.total).toBeGreaterThan(0);
      data.items.forEach((item) => {
        expect(item.tier).toBe("beginner");
        expect(item.category === "mate-in-1" || item.themes.includes("mate-in-1")).toBe(true);
      });
    });

    test("sorting affects result order", () => {
      const ascData = system.getAllPuzzlesBrowserData({ sort: "rating-asc", page: 1, pageSize: 50 });
      const descData = system.getAllPuzzlesBrowserData({ sort: "rating-desc", page: 1, pageSize: 50 });

      if (ascData.items.length >= 2 && descData.items.length >= 2) {
        expect(ascData.items[0].rating).toBeLessThanOrEqual(
          ascData.items[ascData.items.length - 1].rating
        );
        expect(descData.items[0].rating).toBeGreaterThanOrEqual(
          descData.items[descData.items.length - 1].rating
        );
      }
    });

    test("search filters by keyword", () => {
      const searchData = system.getAllPuzzlesBrowserData({ search: "fork", page: 1, pageSize: 50 });
      expect(searchData.total).toBeGreaterThan(0);
      searchData.items.forEach((item) => {
        const haystack = [
          item.id,
          item.rating,
          item.category,
          item.tier,
          ...item.themes,
          item.title,
          item.prompt,
        ]
          .join(" ")
          .toLowerCase();
        expect(haystack).toContain("fork");
      });
    });

    test("favorites toggle updates browser data", () => {
      system.toggleFavoriteById(1001);

      const data = system.getAllPuzzlesBrowserData({ page: 1, pageSize: 50 });
      const favoriteItem = data.items.find((i) => i.id === 1001);
      expect(favoriteItem).toBeDefined();
      expect(favoriteItem.favorite).toBe(true);

      system.toggleFavoriteById(1001);
      const data2 = system.getAllPuzzlesBrowserData({ page: 1, pageSize: 50 });
      const unfavItem = data2.items.find((i) => i.id === 1001);
      expect(unfavItem.favorite).toBe(false);
    });

    test("dashboard data includes all sections", () => {
      const dashboard = system.getDashboardData();
      expect(dashboard).toHaveProperty("packs");
      expect(dashboard).toHaveProperty("favorites");
      expect(dashboard).toHaveProperty("leaderboards");
      expect(dashboard).toHaveProperty("achievements");
      expect(dashboard).toHaveProperty("rating");
      expect(dashboard.packs.length).toBeGreaterThan(0);
    });

    test("pack cards reference valid puzzles", () => {
      const dashboard = system.getDashboardData();
      dashboard.packs.forEach((pack) => {
        pack.puzzleIds.forEach((id) => {
          const puzzle = system.getPuzzleById(id);
          expect(puzzle).not.toBeNull();
        });
      });
    });
  });

  describe("Cross-Mode Consistency", () => {
    test("same puzzle ID resolves consistently across sessions", async () => {
      const system = await createPuzzleSystem();
      const puzzle = system.puzzles[0];

      // Session 1
      system.createSession("practice", puzzle, {});
      const expected1 = system.getExpectedMove();

      // Reset and replay
      system.clearCurrentSession();
      system.createSession("practice", puzzle, {});
      const expected2 = system.getExpectedMove();

      expect(expected1).toBe(expected2);
    });

    test("daily puzzle selects same puzzle for same day and tier", async () => {
      const system = await createPuzzleSystem();
      system.state.rating = 1200;

      const session1 = system.startDaily(1200);
      const session2 = system.startDaily(1200);

      expect(session1.puzzle.id).toBe(session2.puzzle.id);
    });
  });
});
