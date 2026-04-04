/**
 * data-verification.test.js - CI checks for puzzle data integrity
 */

const fs = require('fs');
const path = require('path');

const puzzlesPath = path.join(__dirname, '..', 'assets', 'puzzles', 'puzzles.json');
const puzzles = JSON.parse(fs.readFileSync(puzzlesPath, 'utf8'));

describe('Puzzle Data Verification', () => {
  describe('integrity', () => {
    test('no duplicate puzzle IDs', () => {
      const ids = puzzles.map(p => p.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    test('all FENs are valid', () => {
      puzzles.forEach(puzzle => {
        const parts = puzzle.fen.split(' ');
        expect(parts.length).toBeGreaterThanOrEqual(2);
        expect(parts[0]).toContain('/');
        expect(['w', 'b']).toContain(parts[1]);
      });
    });

    test('all puzzles have required fields', () => {
      const requiredFields = ['id', 'rating', 'theme', 'fen', 'solution', 'category', 'tier', 'title', 'prompt'];
      puzzles.forEach(puzzle => {
        requiredFields.forEach(field => {
          expect(puzzle).toHaveProperty(field);
          expect(puzzle[field]).not.toBeNull();
          expect(puzzle[field]).not.toBeUndefined();
        });
      });
    });

    test('all puzzles have non-empty solution arrays', () => {
      puzzles.forEach(puzzle => {
        expect(Array.isArray(puzzle.solution)).toBe(true);
        expect(puzzle.solution.length).toBeGreaterThan(0);
      });
    });
  });

  describe('rating-tier alignment', () => {
    const getTierForRating = (rating) => {
      if (rating < 800) {return 'beginner';}
      if (rating < 1400) {return 'intermediate';}
      if (rating < 2000) {return 'advanced';}
      return 'master';
    };

    test('all puzzles have tier matching their rating', () => {
      puzzles.forEach(puzzle => {
        const expectedTier = getTierForRating(puzzle.rating);
        expect(puzzle.tier).toBe(expectedTier);
      });
    });
  });

  describe('tier-category coverage', () => {
    const requiredCategories = [
      'mate-in-1', 'mate-in-2', 'mate-in-3',
      'fork', 'pin', 'skewer', 'hanging-piece',
      'defensive', 'endgame', 'positional',
      'opening-trap', 'blunder', 'winning-moves'
    ];
    const expectedTiers = ['beginner', 'intermediate', 'advanced', 'master'];

    test('every tier has every category represented', () => {
      const tierCategoryMap = {};
      puzzles.forEach(p => {
        if (!tierCategoryMap[p.tier]) {tierCategoryMap[p.tier] = new Set();}
        tierCategoryMap[p.tier].add(p.category);
      });

      expectedTiers.forEach(tier => {
        requiredCategories.forEach(cat => {
          expect(tierCategoryMap[tier]).toBeDefined();
          expect(tierCategoryMap[tier].has(cat)).toBe(true);
        });
      });
    });

    test('winning-moves category has puzzles in every tier', () => {
      expectedTiers.forEach(tier => {
        const winningMovesPuzzles = puzzles.filter(p => p.tier === tier && p.category === 'winning-moves');
        expect(winningMovesPuzzles.length).toBeGreaterThan(0);
      });
    });
  });

  describe('pack validity', () => {
    const allPuzzleIds = new Set(puzzles.map(p => p.id));

    test('all pack puzzle IDs reference existing puzzles', () => {
      const packMatchers = {
        'beginner-tactics': p => p.tier === 'beginner' && ['fork', 'pin', 'skewer', 'hanging-piece'].some(t => p.theme.includes(t)),
        'endgame-essentials': p => p.theme.includes('endgame') || p.theme.includes('defensive'),
        'opening-traps': p => p.theme.includes('opening-trap'),
        'positional-mastery': p => p.theme.includes('positional') || p.theme.includes('defensive'),
        'checkmate-patterns': p => p.theme.includes('mate-in-1') || p.theme.includes('mate-in-2') || p.theme.includes('mate-in-3')
      };

      Object.values(packMatchers).forEach(matcher => {
        const matchedPuzzles = puzzles.filter(matcher);
        matchedPuzzles.forEach(p => {
          expect(allPuzzleIds.has(p.id)).toBe(true);
        });
      });
    });

    test('beginner tactics pack has puzzles', () => {
      const count = puzzles.filter(p =>
        p.tier === 'beginner' && ['fork', 'pin', 'skewer', 'hanging-piece'].some(t => p.theme.includes(t))
      ).length;
      expect(count).toBeGreaterThan(0);
    });

    test('checkmate patterns pack has puzzles', () => {
      const count = puzzles.filter(p =>
        p.theme.includes('mate-in-1') || p.theme.includes('mate-in-2') || p.theme.includes('mate-in-3')
      ).length;
      expect(count).toBeGreaterThan(0);
    });

    test('opening traps pack has puzzles', () => {
      const count = puzzles.filter(p => p.theme.includes('opening-trap')).length;
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('filter combinations', () => {
    test('tier + category combination returns results', () => {
      const categories = [...new Set(puzzles.map(p => p.category))];
      const tiers = [...new Set(puzzles.map(p => p.tier))];

      tiers.forEach(tier => {
        categories.forEach(cat => {
          const result = puzzles.filter(p => p.tier === tier && p.category === cat);
          expect(result.length).toBeGreaterThan(0);
        });
      });
    });

    test('theme filter works with tier filter', () => {
      const themes = new Set();
      puzzles.forEach(p => p.theme.forEach(t => themes.add(t)));

      themes.forEach(theme => {
        const result = puzzles.filter(p => p.theme.includes(theme));
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });
});
