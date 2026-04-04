/**
 * persistence.test.js - Tests for localStorage-based session and settings persistence
 */

const path = require('path');

const { ChessBoard } = require('../board.js');
const { ChessProgress } = require('../progress.js');

// Mock localStorage
let localStorageData = {};
global.localStorage = {
  getItem: (key) => localStorageData[key] || null,
  setItem: (key, value) => { localStorageData[key] = value; },
  removeItem: (key) => { delete localStorageData[key]; }
};

// Mock fetch
const puzzlesPath = path.join(__dirname, '..', 'assets', 'puzzles', 'puzzles.json');
const fs = require('fs');
const puzzleDatabase = JSON.parse(fs.readFileSync(puzzlesPath, 'utf8'));

global.fetch = async (url) => {
  if (url.includes('puzzles.json')) {
    return { ok: true, json: async () => puzzleDatabase };
  }
  throw new Error('Unexpected fetch URL: ' + url);
};

// Load modules
require('../board.js');
require('../engine.js');
require('../progress.js');

class MockCoach {
  persona = {
    renderPuzzleIntro: () => 'Intro',
    renderPuzzleMistake: () => 'Mistake',
    renderPuzzleSuccess: () => 'Success',
    renderPuzzleStreak: () => 'Streak'
  };
  skillProfile = { bracket: 'club' };
  exportState() { return {}; }
  importState() {}
  getSettings() { return { enabled: true }; }
  getModeLabel() { return 'Guided'; }
}

async function createPuzzleSystem() {
  const { ChessPuzzleSystem } = require('../puzzles.js');
  const board = new ChessBoard();
  const coach = new MockCoach();
  const system = new ChessPuzzleSystem(board, coach);
  await system.init();
  return system;
}

describe('Persistence', () => {
  beforeEach(() => {
    localStorageData = {};
  });

  describe('ChessProgress', () => {
    test('starts with default values', () => {
      const progress = new ChessProgress();
      expect(progress.gamesPlayed).toBe(0);
      expect(progress.bestStreak).toBe(0);
      expect(progress.playerElo).toBe(1200);
    });

    test('saves and loads progress', () => {
      const progress = new ChessProgress();
      progress.gamesPlayed = 10;
      progress.bestStreak = 5;
      progress.playerElo = 1400;
      progress.saveProgress();

      const progress2 = new ChessProgress();
      expect(progress2.gamesPlayed).toBe(10);
      expect(progress2.bestStreak).toBe(5);
      expect(progress2.playerElo).toBe(1400);
    });

    test('records game played', () => {
      const progress = new ChessProgress();
      progress.recordGamePlayed();
      expect(progress.gamesPlayed).toBe(1);
    });

    test('updates ELO correctly on win', () => {
      const progress = new ChessProgress();
      progress.updatePlayerElo(1200, 1);
      expect(progress.playerElo).toBeGreaterThan(1200);
    });

    test('updates ELO correctly on loss', () => {
      const progress = new ChessProgress();
      progress.updatePlayerElo(1200, 0);
      expect(progress.playerElo).toBeLessThan(1200);
    });

    test('ELO is clamped between 400 and 3000 on update', () => {
      const progress = new ChessProgress();
      progress.playerElo = 400;
      progress.updatePlayerElo(3000, 1);
      expect(progress.playerElo).toBeGreaterThanOrEqual(400);
      expect(progress.playerElo).toBeLessThanOrEqual(3000);
    });

    test('updates best streak', () => {
      const progress = new ChessProgress();
      progress.updateBestStreak(3);
      expect(progress.bestStreak).toBe(3);
      progress.updateBestStreak(2);
      expect(progress.bestStreak).toBe(3);
      progress.updateBestStreak(5);
      expect(progress.bestStreak).toBe(5);
    });

    test('reset progress', () => {
      const progress = new ChessProgress();
      progress.gamesPlayed = 10;
      progress.bestStreak = 5;
      progress.playerElo = 1500;
      progress.resetProgress();
      expect(progress.gamesPlayed).toBe(0);
      expect(progress.bestStreak).toBe(0);
      expect(progress.playerElo).toBe(1200);
    });
  });

  describe('Puzzle State Persistence', () => {
    let system;

    beforeEach(async () => {
      system = await createPuzzleSystem();
    });

    test('saves puzzle state to localStorage', () => {
      system.state.rating = 1300;
      system.state.favorites = [1001];
      system.saveState();

      const stored = localStorage.getItem(system.storageKey);
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored);
      expect(parsed.rating).toBe(1300);
      expect(parsed.favorites).toContain(1001);
    });

    test('loads puzzle state from localStorage', async () => {
      localStorageData[system.storageKey] = JSON.stringify({
        rating: 1500,
        favorites: [1002],
        completed: { 1001: { solved: true, completedAt: new Date().toISOString() } },
        achievements: { 'first-solve': new Date().toISOString() }
      });

      jest.resetModules();
      global.WHITE = 'w';
      global.BLACK = 'b';
      require('../board.js');
      const loadedSystem = await createPuzzleSystem();

      expect(loadedSystem.state.rating).toBe(1500);
      expect(loadedSystem.state.favorites).toContain(1002);
      expect(loadedSystem.state.completed['1001']).toBeDefined();
    });

    test('serializes and restores puzzle session', async () => {
      const session = system.startPractice({ tier: 'beginner' });
      expect(session).not.toBeNull();

      const exported = system.exportSession();
      expect(exported).toHaveProperty('type');
      expect(exported).toHaveProperty('puzzleId');
      expect(exported).toHaveProperty('acceptedMoves');

      system.clearCurrentSession();
      expect(system.getCurrentSession()).toBeNull();
    });

    test('session restores step index', async () => {
      const session = system.startPractice({ tier: 'beginner' });
      session.stepIndex = 2;
      session.attempts = 3;

      const exported = system.exportSession();
      const restored = system.restoreSession(exported);

      expect(restored).not.toBeNull();
      expect(restored.stepIndex).toBe(2);
      expect(restored.attempts).toBe(3);
    });

    test('rush session persists timer data', async () => {
      system.startRush('3m', 1200);
      const exported = system.exportSession();
      expect(exported.rush).not.toBeNull();
      expect(exported.rush.mode).toBe('3m');
    });

    test('duel session persists score', async () => {
      const session = system.startDuel(1200);
      session.duel.score.p1 = 3;
      const exported = system.exportSession();
      expect(exported.duel.score.p1).toBe(3);
    });
  });

  describe('Settings persistence', () => {
    test('simulates settings save/load pattern', () => {
      const settingsKey = 'testChessSettings';
      const settings = {
        coachEnabled: true,
        moveHintsEnabled: false,
        coachMode: 'review'
      };
      localStorage.setItem(settingsKey, JSON.stringify(settings));

      const loaded = JSON.parse(localStorage.getItem(settingsKey));
      expect(loaded.coachEnabled).toBe(true);
      expect(loaded.moveHintsEnabled).toBe(false);
      expect(loaded.coachMode).toBe('review');
    });
  });
});
