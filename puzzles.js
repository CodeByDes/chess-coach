/**
 * puzzles.js - Chess Puzzle Ecosystem
 *
 * Fully local puzzle database + persistence layer for:
 * - Practice puzzles
 * - Daily puzzle
 * - Puzzle packs
 * - Puzzle Rush
 * - Puzzle Duel
 * - Achievements and local leaderboards
 */

class ChessPuzzleSystem {
  constructor(board, coach) {
    this.board = board;
    this.coach = coach;

    this.storageKey = 'chessCoachPuzzleState';
    this.puzzles = [];
    this.packs = [];
    this.session = null;

    this.state = {
      rating: 1200,
      completed: {},
      favorites: [],
      currentStreak: 0,
      bestStreak: 0,
      longestDailyStreak: 0,
      dailyStreak: 0,
      lastDailyPlayed: null,
      highestRating: 1200,
      solvedThisWeek: [],
      rushScores: [],
      duelStats: { wins: 0, losses: 0, points: 0, matches: 0 },
      timeSpentMs: 0,
      accuracy: { correct: 0, wrong: 0 },
      ratingHistory: [{ date: new Date().toISOString(), rating: 1200 }],
      achievements: {},
      completedDaily: {},
      statsByTheme: {},
      lastSessionSummary: null,
      playCounts: {}
    };
  }

  async init() {
    await this.loadDatabase();
    this.loadState();
    this.syncFavoritesWithDatabase();
    this.buildPacks();
  }

  async loadDatabase() {
    // Prefer the globally-loaded puzzle data (works on file:// via <script> tag).
    // Fall back to fetch() for local-server setups that don't include the script.
    if (typeof window !== 'undefined' && Array.isArray(window.PUZZLE_DATA)) {
      this.puzzles = window.PUZZLE_DATA;
      return;
    }
    try {
      const response = await fetch('assets/puzzles/puzzles.json');
      if (!response.ok) {throw new Error('Unable to load puzzle database.');}
      const contentType = response.headers?.get?.('content-type') || '';
      if (contentType && !contentType.includes('application/json') && !contentType.includes('text/plain')) {
        throw new Error('Puzzle database returned wrong content type.');
      }
      const data = await response.json();
      this.puzzles = Array.isArray(data) ? data : [];
    } catch { /* istanbul ignore next */
      this.puzzles = [];
    }
  }

  loadState() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {return;}
      const parsed = JSON.parse(stored);
      this.state = {
        ...this.state,
        ...parsed,
        duelStats: { ...this.state.duelStats, ...(parsed.duelStats || {}) },
        accuracy: { ...this.state.accuracy, ...(parsed.accuracy || {}) },
        playCounts: { ...this.state.playCounts, ...(parsed.playCounts || {}) }
      };
    } catch { /* istanbul ignore next */ 
      // Fall back to defaults on malformed local data.
    }
  }

  saveState() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.state));
  }

  syncFavoritesWithDatabase() {
    const validPuzzleIds = new Set(this.puzzles.map(puzzle => puzzle.id));
    const uniqueFavorites = [...new Set(this.state.favorites || [])];
    const filteredFavorites = uniqueFavorites.filter(id => validPuzzleIds.has(id));
    const changed = filteredFavorites.length !== uniqueFavorites.length;
    this.state.favorites = filteredFavorites;
    if (changed) {this.saveState();}
  }

  buildPacks() {
    const buildPack = (id, name, matcher) => ({
      id,
      name,
      puzzleIds: this.puzzles.filter(matcher).slice(0, 12).map(puzzle => puzzle.id)
    });

    const favoriteIds = new Set(this.state.favorites);

    this.packs = [
      {
        id: 'favorite-puzzles',
        name: 'Favorite Puzzles',
        puzzleIds: this.puzzles
          .filter(puzzle => favoriteIds.has(puzzle.id))
          .map(puzzle => puzzle.id)
      },
      buildPack('beginner-tactics', 'Beginner Tactics Pack', puzzle => puzzle.tier === 'beginner' && ['fork', 'pin', 'skewer', 'hanging-piece'].some(theme => puzzle.theme.includes(theme))),
      buildPack('endgame-essentials', 'Endgame Essentials Pack', puzzle => puzzle.theme.includes('endgame') || puzzle.theme.includes('defensive')),
      buildPack('opening-traps', 'Opening Traps Pack', puzzle => puzzle.theme.includes('opening-trap')),
      buildPack('positional-mastery', 'Positional Mastery Pack', puzzle => puzzle.theme.includes('positional') || puzzle.theme.includes('defensive')),
      buildPack('checkmate-patterns', 'Checkmate Patterns Pack', puzzle => puzzle.theme.includes('mate-in-1') || puzzle.theme.includes('mate-in-2') || puzzle.theme.includes('mate-in-3'))
    ];
  }

  getCategoryOptions() {
    return [
      { value: 'all', label: 'All Categories' },
      { value: 'mate-in-1', label: 'Checkmate in 1' },
      { value: 'mate-in-2', label: 'Checkmate in 2' },
      { value: 'mate-in-3', label: 'Checkmate in 3' },
      { value: 'fork', label: 'Forks' },
      { value: 'pin', label: 'Pins' },
      { value: 'skewer', label: 'Skewers' },
      { value: 'hanging-piece', label: 'Hanging Pieces' },
      { value: 'defensive', label: 'Defensive Puzzles' },
      { value: 'endgame', label: 'Endgame Puzzles' },
      { value: 'positional', label: 'Positional Puzzles' },
      { value: 'opening-trap', label: 'Opening Traps' },
      { value: 'blunder', label: 'Spot the Blunder' },
      { value: 'winning-moves', label: 'Find All Winning Moves' }
    ];
  }

  getPackOptions() {
    return [{ value: 'all', label: 'All Packs' }, ...this.packs.map(pack => ({ value: pack.id, label: pack.name }))];
  }

  getFavoritePuzzles() {
    const favoriteIds = new Set(this.state.favorites || []);
    return this.puzzles.filter(puzzle => favoriteIds.has(puzzle.id));
  }

  getThemeOptions() {
    const themes = new Set();
    this.puzzles.forEach(puzzle => (puzzle.theme || []).forEach(theme => themes.add(theme)));
    return [
      { value: 'all', label: 'All Themes' },
      ...[...themes]
        .sort((a, b) => a.localeCompare(b))
        .map(theme => ({ value: theme, label: theme.replace(/-/g, ' ') }))
    ];
  }

  getTierForRating(rating = this.state.rating) {
    if (rating < 800) {return 'beginner';}
    if (rating < 1400) {return 'intermediate';}
    if (rating < 2000) {return 'advanced';}
    return 'master';
  }

  getFilteredPuzzles({ tier = 'all', category = 'all', pack = 'all' } = {}) {
    let candidates = [...this.puzzles];

    if (tier !== 'all') {
      candidates = candidates.filter(puzzle => (puzzle.tier || this.getTierForRating(puzzle.rating)) === tier);
    }

    if (category !== 'all') {
      candidates = candidates.filter(puzzle => puzzle.category === category || (puzzle.theme || []).includes(category));
    }

    if (pack !== 'all') {
      const packDef = this.packs.find(item => item.id === pack);
      if (packDef) {
        const allowed = new Set(packDef.puzzleIds);
        candidates = candidates.filter(puzzle => allowed.has(puzzle.id));
      }
    }

    return candidates;
  }

  getPuzzleById(id) {
    return this.puzzles.find(puzzle => puzzle.id === id) || null;
  }

  getPuzzlePlayCount(id) {
    return this.state.playCounts[id] || 0;
  }

  recordPuzzleLaunch(id) {
    if (!id) {return;}
    this.state.playCounts[id] = this.getPuzzlePlayCount(id) + 1;
    this.saveState();
  }

  getRandomPuzzle(filters = {}) {
    const candidates = this.getFilteredPuzzles(filters);
    if (candidates.length === 0) {return null;}

    const unsolved = candidates.filter(puzzle => !this.state.completed[puzzle.id]);
    const pool = unsolved.length > 0 ? unsolved : candidates;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  createSession(mode, puzzle, options = {}) {
    const playerColor = puzzle.fen.split(' ')[1] === 'b' ? BLACK : WHITE;
    const acceptedMoves = Array.isArray(puzzle.moves) && puzzle.moves.length > 0 ? puzzle.moves.map(item => item.toLowerCase()) : [puzzle.solution[0].toLowerCase()];

    this.session = {
      type: mode,
      puzzle,
      initialFen: puzzle.fen,
      playerColor,
      acceptedMoves,
      stepIndex: 0,
      solved: false,
      failed: false,
      attempts: 0,
      usedHint: false,
      usedSolution: false,
      startedAt: Date.now(),
      filters: options.filters || {},
      rush: options.rush || null,
      duel: options.duel || null,
      daily: options.daily || null
    };

    this.board.loadFEN(puzzle.fen);
    this.recordPuzzleLaunch(puzzle.id);
    return this.session;
  }

  getAllPuzzlesBrowserData({
    page = 1,
    pageSize = 12,
    search = '',
    category = 'all',
    tier = 'all',
    theme = 'all',
    pack = 'all',
    favoritesOnly = false,
    minRating = '',
    maxRating = '',
    sort = 'rating-asc'
  } = {}) {
    const searchValue = String(search || '').trim().toLowerCase();
    const min = Number.isFinite(Number(minRating)) && String(minRating).trim() !== '' ? Number(minRating) : null;
    const max = Number.isFinite(Number(maxRating)) && String(maxRating).trim() !== '' ? Number(maxRating) : null;
    const favoriteIds = new Set(this.state.favorites || []);
    let puzzles = this.getFilteredPuzzles({ category, tier, pack });

    if (theme !== 'all') {
      puzzles = puzzles.filter(puzzle => (puzzle.theme || []).includes(theme));
    }

    if (favoritesOnly) {
      puzzles = puzzles.filter(puzzle => favoriteIds.has(puzzle.id));
    }

    if (min !== null) {
      puzzles = puzzles.filter(puzzle => puzzle.rating >= min);
    }

    if (max !== null) {
      puzzles = puzzles.filter(puzzle => puzzle.rating <= max);
    }

    if (searchValue) {
      puzzles = puzzles.filter(puzzle => {
        const haystack = [
          puzzle.id,
          puzzle.rating,
          puzzle.category,
          puzzle.tier,
          ...(puzzle.theme || []),
          puzzle.title,
          puzzle.prompt
        ].join(' ').toLowerCase();
        return haystack.includes(searchValue);
      });
    }

    const sorted = [...puzzles].sort((a, b) => {
      if (sort === 'rating-desc') {return b.rating - a.rating;}
      if (sort === 'newest') {return b.id - a.id;}
      if (sort === 'oldest') {return a.id - b.id;}
      if (sort === 'most-played') {return this.getPuzzlePlayCount(b.id) - this.getPuzzlePlayCount(a.id) || a.id - b.id;}
      if (sort === 'least-played') {return this.getPuzzlePlayCount(a.id) - this.getPuzzlePlayCount(b.id) || a.id - b.id;}
      return a.rating - b.rating;
    });

    const startIndex = Math.max(0, (page - 1) * pageSize);
    const items = sorted.slice(startIndex, startIndex + pageSize).map(puzzle => ({
      id: puzzle.id,
      title: puzzle.title,
      prompt: puzzle.prompt,
      rating: puzzle.rating,
      category: puzzle.category,
      tier: puzzle.tier,
      themes: puzzle.theme || [],
      favorite: favoriteIds.has(puzzle.id),
      playCount: this.getPuzzlePlayCount(puzzle.id),
      fen: puzzle.fen
    }));

    return {
      items,
      total: sorted.length,
      page,
      pageSize,
      hasMore: startIndex + pageSize < sorted.length
    };
  }

  startPractice(filters = {}) {
    const puzzle = this.getRandomPuzzle(filters);
    if (!puzzle) {return null;}
    return this.createSession('practice', puzzle, { filters });
  }

  startDaily(userRating) {
    const dailyKey = this.getTodayKey();
    const tier = this.getTierForRating(userRating);
    const candidates = this.getFilteredPuzzles({ tier });
    if (candidates.length === 0) {return null;}

    const index = this.hashString(`${dailyKey}:${tier}`) % candidates.length;
    const puzzle = candidates[index];
    return this.createSession('daily', puzzle, { daily: { key: dailyKey, timerStartedAt: Date.now() } });
  }

  startRush(mode = '3m', userRating) {
    const timeLimitMs = mode === '3m' ? 180000 : mode === '5m' ? 300000 : null;
    const mistakesAllowed = mode === 'survival' ? 3 : 1;
    const tier = this.getTierForRating(userRating);
    const puzzle = this.getRandomPuzzle({ tier });
    if (!puzzle) {return null;}

    return this.createSession('rush', puzzle, {
      rush: {
        mode,
        score: 0,
        mistakes: 0,
        mistakesAllowed,
        timeLimitMs,
        expiresAt: timeLimitMs ? Date.now() + timeLimitMs : null
      }
    });
  }

  startDuel(userRating) {
    const puzzle = this.getRandomPuzzle({ tier: this.getTierForRating(userRating) });
    if (!puzzle) {return null;}

    return this.createSession('duel', puzzle, {
      duel: {
        score: { p1: 0, p2: 0 },
        activePlayer: 'p1',
        round: 1,
        target: 5
      }
    });
  }

  setActiveDuelPlayer(playerId) {
    if (this.session?.duel) {this.session.duel.activePlayer = playerId;}
  }

  getCurrentPuzzle() {
    return this.session?.puzzle || null;
  }

  getCurrentSession() {
    return this.session;
  }

  retryCurrentPuzzle() {
    if (!this.session) {return null;}
    this.session.stepIndex = 0;
    this.session.solved = false;
    this.session.failed = false;
    this.session.attempts = 0;
    this.session.usedHint = false;
    this.session.usedSolution = false;
    this.session.startedAt = Date.now();
    this.board.loadFEN(this.session.initialFen);
    this.saveState();
    return this.session;
  }

  getExpectedMove() {
    if (!this.session) {return null;}
    return this.session.puzzle.solution[this.session.stepIndex]?.toLowerCase() || null;
  }

  getHint() {
    if (!this.session) {return '';}
    this.session.usedHint = true;
    this.saveState();
    const expected = this.getExpectedMove();
    if (!expected) {return 'The critical move has already been played. Review the full line for the finish.';}
    return expected;
  }

  toggleFavoriteCurrent() {
    const puzzle = this.getCurrentPuzzle();
    if (!puzzle) {return false;}
    return this.toggleFavoriteById(puzzle.id);
  }

  toggleFavoriteById(puzzleId) {
    if (!this.getPuzzleById(puzzleId)) {return false;}
    const favorites = new Set(this.state.favorites);
    if (favorites.has(puzzleId)) {favorites.delete(puzzleId);}
    else {favorites.add(puzzleId);}
    this.state.favorites = [...favorites];
    this.syncFavoritesWithDatabase();
    this.buildPacks();
    this.saveState();
    return favorites.has(puzzleId);
  }

  isFavorite(id) {
    return this.state.favorites.includes(id);
  }

  validateMove(moveUci) {
    if (!this.session || this.session.solved) {return { status: 'idle' };}

    const normalized = moveUci.toLowerCase();
    const expected = this.getExpectedMove();
    const isMultiWinPuzzle = this.session.puzzle.theme.includes('winning-moves');
    const acceptedMoves = this.session.stepIndex === 0 ? this.session.acceptedMoves : [expected];

    if (!acceptedMoves.includes(normalized)) {
      this.session.attempts += 1;
      this.state.accuracy.wrong += 1;
      this.saveState();

      if (this.session.type === 'rush') {
        this.session.rush.mistakes += 1;
        const ended = this.session.rush.mistakes >= this.session.rush.mistakesAllowed;
        if (ended) {
          this.finishRush(false);
          return { status: 'failed', ended: true };
        }
      }

      return { status: 'wrong', expected };
    }

    const move = this.board.findMoveByUci(normalized);
    if (!move) {
      return { status: 'invalid' };
    }

    this.board.executeMove(move);
    this.session.stepIndex += 1;
    this.state.accuracy.correct += 1;

    if (isMultiWinPuzzle) {
      this.session.solved = true;
      return { status: 'solved', result: this.completeCurrentPuzzle(true) };
    }

    while (!this.session.solved && this.session.stepIndex < this.session.puzzle.solution.length && this.board.currentTurn !== this.session.playerColor) {
      const replyUci = this.session.puzzle.solution[this.session.stepIndex].toLowerCase();
      const replyMove = this.board.findMoveByUci(replyUci);
      if (!replyMove) {break;}
      this.board.executeMove(replyMove);
      this.session.stepIndex += 1;
    }

    if (this.session.stepIndex >= this.session.puzzle.solution.length) {
      this.session.solved = true;
      return { status: 'solved', result: this.completeCurrentPuzzle(true) };
    }

    this.saveState();
    return { status: 'correct', nextExpected: this.getExpectedMove() };
  }

  showFullSolution() {
    if (!this.session) {return [];}
    this.session.usedSolution = true;
    this.board.loadFEN(this.session.initialFen);

    const played = [];
    for (const uci of this.session.puzzle.solution) {
      const move = this.board.findMoveByUci(uci.toLowerCase());
      if (!move) {break;}
      this.board.executeMove(move);
      played.push(uci.toLowerCase());
    }

    this.saveState();
    return played;
  }

  completeCurrentPuzzle(success) {
    if (!this.session) {return null;}

    const now = Date.now();
    const durationMs = now - this.session.startedAt;
    const puzzle = this.session.puzzle;
    const themeKey = puzzle.theme[0];
    const ratingDelta = this.updateRating(puzzle.rating, success ? 1 : 0, this.session.usedHint);
    const summary = {
      puzzleId: puzzle.id,
      success,
      durationMs,
      attempts: this.session.attempts,
      usedHint: this.session.usedHint,
      usedSolution: this.session.usedSolution,
      ratingDelta
    };

    this.state.timeSpentMs += durationMs;
    this.state.completed[puzzle.id] = {
      solved: success,
      completedAt: new Date().toISOString(),
      durationMs,
      attempts: this.session.attempts,
      usedHint: this.session.usedHint
    };
    this.state.statsByTheme[themeKey] = (this.state.statsByTheme[themeKey] || 0) + (success ? 1 : 0);
    this.state.solvedThisWeek.push(new Date().toISOString());
    this.state.solvedThisWeek = this.state.solvedThisWeek.filter(item => Date.now() - new Date(item).getTime() < 7 * 24 * 60 * 60 * 1000);

    if (success) {
      this.state.currentStreak += 1;
      this.state.bestStreak = Math.max(this.state.bestStreak, this.state.currentStreak);
      this.state.highestRating = Math.max(this.state.highestRating, this.state.rating);
      this.handleDailySuccess();
      this.handleRushSuccess(durationMs);
      this.handleDuelSuccess();
      this.unlockThemeAchievements(puzzle);
    } else {
      this.state.currentStreak = 0;
    }

    this.state.lastSessionSummary = summary;
    this.evaluateAchievements(summary, puzzle);
    this.saveState();
    return summary;
  }

  handleDailySuccess() {
    if (this.session?.type !== 'daily') {return;}
    const dailyKey = this.session.daily.key;
    this.state.completedDaily[dailyKey] = true;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = this.getLocalDateKey(yesterday);

    if (this.state.lastDailyPlayed === yesterdayKey) {this.state.dailyStreak += 1;}
    else if (this.state.lastDailyPlayed !== dailyKey) {this.state.dailyStreak = 1;}

    this.state.lastDailyPlayed = dailyKey;
    this.state.longestDailyStreak = Math.max(this.state.longestDailyStreak, this.state.dailyStreak);
  }

  handleRushSuccess(durationMs) {
    if (this.session?.type !== 'rush') {return;}
    this.session.rush.score += 1;
    this.state.rushScores.push({
      mode: this.session.rush.mode,
      score: this.session.rush.score,
      durationMs,
      date: new Date().toISOString()
    });
    this.state.rushScores = this.state.rushScores.slice(-30);
  }

  handleDuelSuccess() {
    if (this.session?.type !== 'duel') {return;}
    const player = this.session.duel.activePlayer;
    this.session.duel.score[player] += 1;
    this.state.duelStats.points += 1;

    if (this.session.duel.score[player] >= this.session.duel.target) {
      this.state.duelStats.matches += 1;
      if (player === 'p1') {this.state.duelStats.wins += 1;}
      else {this.state.duelStats.losses += 1;}
      return;
    }

    this.session.duel.round += 1;
    const nextPuzzle = this.getRandomPuzzle({ tier: this.getTierForRating(this.state.rating) });
    if (nextPuzzle) {
      this.createSession('duel', nextPuzzle, {
        duel: {
          ...this.session.duel,
          score: { ...this.session.duel.score }
        }
      });
    }
  }

  finishRush(forceSuccess) {
    if (!this.session?.rush) {return null;}
    const final = {
      mode: this.session.rush.mode,
      score: this.session.rush.score,
      mistakes: this.session.rush.mistakes,
      finishedAt: new Date().toISOString(),
      success: forceSuccess
    };
    this.state.rushScores.push(final);
    this.state.rushScores = this.state.rushScores.slice(-30);
    this.saveState();
    return final;
  }

  getRushTimeRemaining() {
    if (!this.session?.rush?.expiresAt) {return null;}
    return Math.max(0, this.session.rush.expiresAt - Date.now());
  }

  shouldRushEndOnTime() {
    return this.session?.type === 'rush' && this.session.rush.expiresAt && this.getRushTimeRemaining() <= 0;
  }

  getNextPuzzleForCurrentMode() {
    if (!this.session) {return null;}
    if (this.session.type === 'practice') {return this.startPractice(this.session.filters || {});}
    if (this.session.type === 'daily') {return this.startDaily(this.state.rating);}
    if (this.session.type === 'rush') {
      const nextTier = this.getAdaptiveTier(this.state.rating, this.session.rush.score);
      const next = this.getRandomPuzzle({ tier: nextTier });
      if (!next) {return null;}
      return this.createSession('rush', next, { rush: { ...this.session.rush } });
    }
    return null;
  }

  exportSession() {
    if (!this.session) {return null;}
    return {
      type: this.session.type,
      puzzleId: this.session.puzzle.id,
      playerColor: this.session.playerColor,
      acceptedMoves: [...this.session.acceptedMoves],
      stepIndex: this.session.stepIndex,
      solved: this.session.solved,
      failed: this.session.failed,
      attempts: this.session.attempts,
      usedHint: this.session.usedHint,
      usedSolution: this.session.usedSolution,
      startedAt: this.session.startedAt,
      filters: { ...(this.session.filters || {}) },
      rush: this.session.rush ? JSON.parse(JSON.stringify(this.session.rush)) : null,
      duel: this.session.duel ? JSON.parse(JSON.stringify(this.session.duel)) : null,
      daily: this.session.daily ? JSON.parse(JSON.stringify(this.session.daily)) : null
    };
  }

  restoreSession(payload, boardState = null) {
    if (!payload?.puzzleId || !payload?.type) {return null;}
    const puzzle = this.getPuzzleById(payload.puzzleId);
    if (!puzzle) {return null;}

    this.createSession(payload.type, puzzle, {
      filters: payload.filters || {},
      rush: payload.rush || null,
      duel: payload.duel || null,
      daily: payload.daily || null
    });

    this.session = {
      ...this.session,
      playerColor: payload.playerColor || this.session.playerColor,
      acceptedMoves: Array.isArray(payload.acceptedMoves) && payload.acceptedMoves.length > 0 ? payload.acceptedMoves : this.session.acceptedMoves,
      stepIndex: Number.isInteger(payload.stepIndex) ? payload.stepIndex : 0,
      solved: payload.solved === true,
      failed: payload.failed === true,
      attempts: Number.isInteger(payload.attempts) ? payload.attempts : 0,
      usedHint: payload.usedHint === true,
      usedSolution: payload.usedSolution === true,
      startedAt: payload.startedAt || Date.now(),
      filters: payload.filters || {}
    };

    if (boardState?.board) {this.board.loadState(boardState);}
    return this.session;
  }

  clearCurrentSession() {
    this.session = null;
  }

  getAdaptiveTier(baseRating, solvedCount = 0) {
    const adjusted = baseRating + solvedCount * 80;
    return this.getTierForRating(adjusted);
  }

  updateRating(puzzleRating, actualScore, usedHint = false) {
    const expected = 1 / (1 + Math.pow(10, (puzzleRating - this.state.rating) / 400));
    const kFactor = this.state.rating >= 2000 ? 16 : this.state.rating < 1000 ? 32 : 24;
    const hintPenalty = usedHint ? 0.15 : 0;
    const delta = Math.round(kFactor * ((actualScore - hintPenalty) - expected));
    this.state.rating = Math.max(400, Math.min(3000, this.state.rating + delta));
    this.state.ratingHistory.push({ date: new Date().toISOString(), rating: this.state.rating });
    this.state.ratingHistory = this.state.ratingHistory.slice(-60);
    return delta;
  }

  getLeaderboardSummary() {
    const fastest = Object.values(this.state.completed)
      .filter(entry => entry.solved)
      .sort((a, b) => a.durationMs - b.durationMs)[0];

    const weeklyCount = this.state.solvedThisWeek.length;
    const bestRush = this.state.rushScores.reduce((best, score) => Math.max(best, score.score || 0), 0);

    return [
      { label: 'Longest Streak', value: this.state.bestStreak },
      { label: 'Fastest Solve', value: fastest ? `${Math.max(1, Math.round(fastest.durationMs / 1000))}s` : '—' },
      { label: 'Highest Puzzle Rating', value: this.state.highestRating },
      { label: 'Most Solved This Week', value: weeklyCount },
      { label: 'Best Rush Score', value: bestRush }
    ];
  }

  getAchievements() {
    const definitions = this.getAchievementDefinitions();
    return definitions.map(def => ({
      ...def,
      unlocked: !!this.state.achievements[def.id]
    }));
  }

  getAchievementDefinitions() {
    return [
      { id: 'first-solve', name: 'First Puzzle Solved', description: 'Solve your first puzzle.' },
      { id: 'streak-10', name: '10-Puzzle Streak', description: 'Solve 10 puzzles in a row.' },
      { id: 'master-tactician', name: 'Master Tactician', description: 'Reach a puzzle rating of 2000.' },
      { id: 'endgame-expert', name: 'Endgame Expert', description: 'Solve five endgame puzzles.' },
      { id: 'daily-grinder', name: 'Daily Grinder', description: 'Complete three daily puzzles in a row.' },
      { id: 'perfect-accuracy', name: 'Perfect Accuracy', description: 'Solve a puzzle without a wrong move, hint, or solution reveal.' },
      { id: 'puzzle-apprentice', name: 'Puzzle Apprentice', description: 'Open the puzzle hub and start building your training routine.' },
      { id: 'rush-runner', name: 'Rush Runner', description: 'Score at least 5 in Puzzle Rush.' },
      { id: 'duel-winner', name: 'Duel Winner', description: 'Win a local Puzzle Duel match.' }
    ];
  }

  evaluateAchievements(summary, _puzzle) {
    if (summary.success) {this.unlockAchievement('first-solve');}
    if (this.state.bestStreak >= 10) {this.unlockAchievement('streak-10');}
    if (this.state.rating >= 2000) {this.unlockAchievement('master-tactician');}
    if ((this.state.statsByTheme.endgame || 0) >= 5) {this.unlockAchievement('endgame-expert');}
    if (this.state.dailyStreak >= 3) {this.unlockAchievement('daily-grinder');}
    if (summary.success && summary.attempts === 0 && !summary.usedHint && !summary.usedSolution) {this.unlockAchievement('perfect-accuracy');}
    if (this.session?.type === 'rush' && this.session.rush.score >= 5) {this.unlockAchievement('rush-runner');}
    if (this.session?.type === 'duel') {
      const duelScore = this.session.duel.score;
      if (duelScore.p1 >= this.session.duel.target) {this.unlockAchievement('duel-winner');}
    }
  }

  unlockThemeAchievements(puzzle) {
    if (puzzle.theme.includes('endgame') && (this.state.statsByTheme.endgame || 0) >= 5) {this.unlockAchievement('endgame-expert');}
  }

  unlockAchievement(id, persist = true) {
    if (!this.state.achievements[id]) {
      this.state.achievements[id] = new Date().toISOString();
      if (persist) {this.saveState();}
    }
  }

  getDashboardData() {
    return {
      packs: this.packs.map(pack => ({
        ...pack,
        count: pack.puzzleIds.length
      })),
      favorites: this.getFavoritePuzzles().map(puzzle => ({
        id: puzzle.id,
        title: puzzle.title,
        prompt: puzzle.prompt,
        rating: puzzle.rating,
        category: puzzle.category,
        tier: puzzle.tier,
        themes: puzzle.theme
      })),
      leaderboards: this.getLeaderboardSummary(),
      achievements: this.getAchievements(),
      rating: this.state.rating,
      streak: this.state.currentStreak,
      tier: this.getTierForRating(this.state.rating)
    };
  }

  getTodayKey() {
    return this.getLocalDateKey(new Date());
  }

  getLocalDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  hashString(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = ((hash << 5) - hash) + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  formatDailyShareResult() {
    if (!this.session?.daily) {return '';}
    const summary = this.state.lastSessionSummary;
    if (!summary) {return '';}
    const icon = summary.success ? '✅' : '❌';
    const seconds = Math.max(1, Math.round(summary.durationMs / 1000));
    return `Chess Coach Daily Puzzle ${this.session.daily.key}\n${icon} Rating ${this.state.rating}\nSolved in ${seconds}s with ${summary.attempts} mistakes.`;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ChessPuzzleSystem };
}
if (typeof window !== 'undefined') {
  window.ChessPuzzleSystem = ChessPuzzleSystem;
}
