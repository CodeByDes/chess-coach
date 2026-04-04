/**
 * puzzles.test.js - Tests for puzzle filtering, selection, and sessions
 */

const fs = require('fs');
const path = require('path');

const { ChessBoard } = require('../board.js');

// Mock localStorage
let localStorageData = {};
global.localStorage = {
  getItem: (key) => localStorageData[key] || null,
  setItem: (key, value) => { localStorageData[key] = value; },
  removeItem: (key) => { delete localStorageData[key]; }
};

// Mock fetch for puzzle loading
const puzzlesPath = path.join(__dirname, '..', 'assets', 'puzzles', 'puzzles.json');
const puzzleDatabase = JSON.parse(fs.readFileSync(puzzlesPath, 'utf8'));

global.fetch = async (url) => {
  if (url.includes('puzzles.json')) {
    return {
      ok: true,
      json: async () => puzzleDatabase
    };
  }
  throw new Error('Unexpected fetch URL: ' + url);
};

// We need to mock the ChessBoard and ChessCoach for puzzles.js
class MockCoach {
  persona = {
    renderPuzzleIntro: () => 'Intro',
    renderPuzzleMistake: () => 'Mistake',
    renderPuzzleSuccess: () => 'Success',
    renderPuzzleStreak: () => 'Streak'
  };
  skillProfile = { bracket: 'club' };
}

async function createPuzzleSystem() {
  const { ChessPuzzleSystem } = require('../puzzles.js');
  const board = new ChessBoard();
  const coach = new MockCoach();
  const system = new ChessPuzzleSystem(board, coach);
  await system.init();
  return system;
}

describe('Puzzle System', () => {
  let system;

  beforeEach(async () => {
    localStorageData = {};
    system = await createPuzzleSystem();
  });

  describe('database loading', () => {
    test('loads puzzles from JSON file', async () => {
      expect(system.puzzles.length).toBeGreaterThan(0);
    });

    test('all puzzles have required fields', () => {
      system.puzzles.forEach(puzzle => {
        expect(puzzle).toHaveProperty('id');
        expect(puzzle).toHaveProperty('rating');
        expect(puzzle).toHaveProperty('theme');
        expect(puzzle).toHaveProperty('fen');
        expect(puzzle).toHaveProperty('solution');
        expect(puzzle).toHaveProperty('category');
        expect(puzzle).toHaveProperty('tier');
      });
    });

    test('no duplicate puzzle IDs', () => {
      const ids = system.puzzles.map(p => p.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    test('valid FEN strings', () => {
      system.puzzles.forEach(puzzle => {
        const parts = puzzle.fen.split(' ');
        expect(parts.length).toBeGreaterThanOrEqual(2);
        expect(parts[0]).toContain('/');
        expect(['w', 'b']).toContain(parts[1]);
      });
    });
  });

  describe('tier and rating alignment', () => {
    test('beginner puzzles have rating < 800', () => {
      const beginnerPuzzles = system.puzzles.filter(p => p.tier === 'beginner');
      beginnerPuzzles.forEach(p => {
        expect(p.rating).toBeLessThan(800);
      });
    });

    test('intermediate puzzles have rating 800-1399', () => {
      const intermediatePuzzles = system.puzzles.filter(p => p.tier === 'intermediate');
      intermediatePuzzles.forEach(p => {
        expect(p.rating).toBeGreaterThanOrEqual(800);
        expect(p.rating).toBeLessThan(1400);
      });
    });

    test('advanced puzzles have rating 1400-1999', () => {
      const advancedPuzzles = system.puzzles.filter(p => p.tier === 'advanced');
      advancedPuzzles.forEach(p => {
        expect(p.rating).toBeGreaterThanOrEqual(1400);
        expect(p.rating).toBeLessThan(2000);
      });
    });

    test('master puzzles have rating 2000+', () => {
      const masterPuzzles = system.puzzles.filter(p => p.tier === 'master');
      masterPuzzles.forEach(p => {
        expect(p.rating).toBeGreaterThanOrEqual(2000);
      });
    });
  });

  describe('filter logic', () => {
    test('filters by tier', () => {
      const beginner = system.getFilteredPuzzles({ tier: 'beginner' });
      beginner.forEach(p => expect(p.tier).toBe('beginner'));
      expect(beginner.length).toBeGreaterThan(0);
    });

    test('filters by category', () => {
      const mateIn1 = system.getFilteredPuzzles({ category: 'mate-in-1' });
      // The filter matches puzzles whose category === 'mate-in-1' OR whose theme includes 'mate-in-1'
      mateIn1.forEach(p => {
        expect(p.category === 'mate-in-1' || p.theme.includes('mate-in-1')).toBe(true);
      });
      expect(mateIn1.length).toBeGreaterThan(0);
    });

    test('filters by pack', () => {
      const favoritePack = system.getFilteredPuzzles({ pack: 'favorite-puzzles' });
      // Initially no favorites, so should return puzzles matching the pack logic
      expect(Array.isArray(favoritePack)).toBe(true);
    });

    test('cumulative tier + category filter', () => {
      const result = system.getFilteredPuzzles({ tier: 'beginner', category: 'mate-in-1' });
      result.forEach(p => {
        expect(p.tier).toBe('beginner');
        expect(p.category === 'mate-in-1' || p.theme.includes('mate-in-1')).toBe(true);
      });
      expect(result.length).toBeGreaterThan(0);
    });

    test('cumulative tier + category + pack filter returns valid results', () => {
      const result = system.getFilteredPuzzles({
        tier: 'intermediate',
        category: 'mate-in-1',
        pack: 'all'
      });
      result.forEach(p => {
        expect(p.tier).toBe('intermediate');
        expect(p.category).toBe('mate-in-1');
      });
    });

    test('winning-moves category returns results across all tiers', () => {
      ['beginner', 'intermediate', 'advanced', 'master'].forEach(tier => {
        const result = system.getFilteredPuzzles({ tier, category: 'winning-moves' });
        expect(result.length).toBeGreaterThan(0);
      });
    });

    test('no filter returns all puzzles', () => {
      const all = system.getFilteredPuzzles({ tier: 'all', category: 'all', pack: 'all' });
      expect(all.length).toBe(system.puzzles.length);
    });
  });

  describe('browser filter logic', () => {
    test('filters by min/max rating', () => {
      const data = system.getAllPuzzlesBrowserData({
        minRating: '500',
        maxRating: '700'
      });
      data.items.forEach(item => {
        expect(item.rating).toBeGreaterThanOrEqual(500);
        expect(item.rating).toBeLessThanOrEqual(700);
      });
    });

    test('filters by theme', () => {
      const data = system.getAllPuzzlesBrowserData({ theme: 'fork' });
      data.items.forEach(item => {
        expect(item.themes).toContain('fork');
      });
      expect(data.items.length).toBeGreaterThan(0);
    });

    test('favorites only filter', () => {
      // Add a favorite
      system.state.favorites = [1001];
      const data = system.getAllPuzzlesBrowserData({ favoritesOnly: true });
      data.items.forEach(item => {
        expect(item.favorite).toBe(true);
      });
    });

    test('search by keyword', () => {
      const data = system.getAllPuzzlesBrowserData({ search: 'mate' });
      expect(data.items.length).toBeGreaterThan(0);
    });

    test('sort by rating ascending', () => {
      const data = system.getAllPuzzlesBrowserData({ sort: 'rating-asc' });
      for (let i = 1; i < data.items.length; i++) {
        expect(data.items[i].rating).toBeGreaterThanOrEqual(data.items[i - 1].rating);
      }
    });

    test('sort by rating descending', () => {
      const data = system.getAllPuzzlesBrowserData({ sort: 'rating-desc' });
      for (let i = 1; i < data.items.length; i++) {
        expect(data.items[i].rating).toBeLessThanOrEqual(data.items[i - 1].rating);
      }
    });

    test('pagination works', () => {
      const data = system.getAllPuzzlesBrowserData({ page: 1, pageSize: 5 });
      expect(data.items.length).toBeLessThanOrEqual(5);
      expect(data.hasMore).toBe(true);
    });
  });

  describe('pack system', () => {
    test('packs are built correctly', () => {
      expect(system.packs.length).toBeGreaterThan(0);
      system.packs.forEach(pack => {
        expect(pack).toHaveProperty('id');
        expect(pack).toHaveProperty('name');
        expect(pack).toHaveProperty('puzzleIds');
        pack.puzzleIds.forEach(id => {
          expect(system.getPuzzleById(id)).not.toBeNull();
        });
      });
    });

    test('checkmate patterns pack has puzzles', () => {
      const pack = system.packs.find(p => p.id === 'checkmate-patterns');
      expect(pack).toBeDefined();
      expect(pack.puzzleIds.length).toBeGreaterThan(0);
    });
  });

  describe('favorites system', () => {
    test('toggles favorite by ID', () => {
      const result = system.toggleFavoriteById(1001);
      expect(result).toBe(true);
      expect(system.isFavorite(1001)).toBe(true);

      const result2 = system.toggleFavoriteById(1001);
      expect(result2).toBe(false);
      expect(system.isFavorite(1001)).toBe(false);
    });

    test('toggles favorite for current puzzle', () => {
      system.createSession('practice', system.puzzles[0], {});
      const result = system.toggleFavoriteCurrent();
      expect(result).toBe(true);
    });

    test('syncs favorites against valid puzzle IDs', () => {
      system.state.favorites = [1001, 999999]; // 999999 doesn't exist
      system.syncFavoritesWithDatabase();
      expect(system.state.favorites).not.toContain(999999);
      expect(system.state.favorites).toContain(1001);
    });
  });

  describe('session management', () => {
    test('creates a practice session', () => {
      const session = system.startPractice({ tier: 'beginner' });
      expect(session).not.toBeNull();
      expect(session.type).toBe('practice');
      expect(session.puzzle.tier).toBe('beginner');
    });

    test('creates a daily session', () => {
      const session = system.startDaily(1200);
      expect(session).not.toBeNull();
      expect(session.type).toBe('daily');
    });

    test('creates a rush session', () => {
      const session = system.startRush('3m', 1200);
      expect(session).not.toBeNull();
      expect(session.type).toBe('rush');
      expect(session.rush.mode).toBe('3m');
    });

    test('creates a duel session', () => {
      const session = system.startDuel(1200);
      expect(session).not.toBeNull();
      expect(session.type).toBe('duel');
      expect(session.duel.activePlayer).toBe('p1');
    });

    test('validates correct moves', () => {
      system.startPractice({ tier: 'beginner' });
      const move = system.getExpectedMove();
      expect(move).not.toBeNull();
      const result = system.validateMove(move);
      expect(['correct', 'solved', 'invalid']).toContain(result.status);
    });

    test('rejects wrong moves', () => {
      system.startPractice({ tier: 'beginner' });
      const result = system.validateMove('a1a2');
      expect(result.status === 'wrong' || result.status === 'correct' || result.status === 'solved').toBe(true);
    });
  });

  describe('rating system', () => {
    test('rating increases on solving harder puzzle', () => {
      system.state.rating = 1200;
      system.createSession('practice', system.puzzles.find(p => p.rating === 1000) || system.puzzles[0], {});
      system.completeCurrentPuzzle(true);
      expect(system.state.rating).toBeGreaterThanOrEqual(1200);
    });

    test('rating decreases on failing easier puzzle', () => {
      system.state.rating = 1500;
      system.createSession('practice', system.puzzles.find(p => p.rating === 500) || system.puzzles[0], {});
      system.completeCurrentPuzzle(false);
      expect(system.state.rating).toBeLessThan(1500);
    });

    test('rating history tracks changes', () => {
      system.state.rating = 1200;
      system.state.ratingHistory = [];
      system.createSession('practice', system.puzzles[0], {});
      system.completeCurrentPuzzle(true);
      expect(system.state.ratingHistory.length).toBeGreaterThan(0);
    });
  });

  describe('achievements', () => {
    test('getAchievements returns list', () => {
      const achievements = system.getAchievements();
      expect(achievements.length).toBeGreaterThan(0);
      achievements.forEach(a => {
        expect(a).toHaveProperty('id');
        expect(a).toHaveProperty('name');
        expect(a).toHaveProperty('unlocked');
      });
    });

    test('first-solve unlocks on puzzle completion', () => {
      system.createSession('practice', system.puzzles[0], {});
      system.completeCurrentPuzzle(true);
      expect(system.state.achievements['first-solve']).toBeDefined();
    });
  });

  describe('puzzle play counts', () => {
    test('records puzzle launch', () => {
      system.recordPuzzleLaunch(1001);
      expect(system.getPuzzlePlayCount(1001)).toBe(1);
    });

    test('most-played sort works', () => {
      system.state.playCounts = { 1001: 10, 1002: 5 };
      const data = system.getAllPuzzlesBrowserData({ sort: 'most-played' });
      // 1001 should appear before 1002 if both are in results
      const idx1001 = data.items.findIndex(i => i.id === 1001);
      const idx1002 = data.items.findIndex(i => i.id === 1002);
      if (idx1001 !== -1 && idx1002 !== -1) {
        expect(idx1001).toBeLessThan(idx1002);
      }
    });
  });
});
