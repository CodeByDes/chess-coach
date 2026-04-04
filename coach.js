/**
 * coach.js - Layered AI Chess Coach
 *
 * Splits coaching into four layers:
 * 1. Position evaluator
 * 2. Teaching policy
 * 3. Persona renderer
 * 4. Settings filter
 */

class CoachPositionEvaluator {
  constructor(engine) {
    this.engine = engine;
  }

  analyze(board, move, context = {}) {
    const engineAnalysis = this.engine.analyzeMove(board, move);
    const moveState = board.makeMove(move);
    const postMove = this.inspectPosition(board, move, context);
    board.undoMove(moveState);

    const alternatives = (engineAnalysis.candidates || [])
      .filter(candidate => !this.engine.movesEqual(candidate.move, move))
      .slice(0, 2)
      .map(candidate => ({
        move: candidate.move,
        score: candidate.score,
        label: this.describeIdea(board, candidate.move)
      }));

    return {
      ...engineAnalysis,
      phase: this.getPhase(board),
      motifs: postMove.motifs,
      warnings: postMove.warnings,
      strengths: postMove.strengths,
      threatLevel: postMove.threatLevel,
      alternatives,
      summary: this.getSummary(engineAnalysis, postMove)
    };
  }

  inspectPosition(board, move, context = {}) {
    const moverColor = context.playerColor || board.currentTurn;
    const opponentColor = moverColor === WHITE ? BLACK : WHITE;
    const movedPiece = board.getPiece(move.to.row, move.to.col);
    const movedPieceType = board.getPieceType(movedPiece);
    const motifs = [];
    const warnings = [];
    const strengths = [];
    let threatLevel = 'quiet';

    if (move.capture) {
      motifs.push('material');
      strengths.push('Won material or forced a trade.');
    }

    if (move.isCastling) {
      motifs.push('king-safety');
      strengths.push('Castling improved king safety.');
    }

    if (board.isColorInCheck(opponentColor)) {
      motifs.push('check');
      strengths.push('The move creates immediate pressure on the king.');
      threatLevel = 'critical';
    }

    if (this.isCenterSquare(move.to.row, move.to.col)) {
      motifs.push('center');
      strengths.push('This move increases central influence.');
    }

    if (this.isDevelopingMove(move, movedPieceType, moverColor, board.moveNumber)) {
      motifs.push('development');
      strengths.push('A minor piece became more active.');
    }

    const attacked = board.isSquareAttacked(move.to.row, move.to.col, opponentColor);
    const defended = this.isSquareDefended(board, move.to.row, move.to.col, moverColor);
    if (attacked && !defended && movedPieceType !== KING) {
      motifs.push('hanging-piece');
      warnings.push(`The ${this.getPieceName(movedPieceType)} on ${this.toSquare(move.to.row, move.to.col)} may be loose.`);
      threatLevel = threatLevel === 'critical' ? 'critical' : 'high';
    }

    const hangingOpponentPieces = this.findLoosePieces(board, opponentColor);
    if (hangingOpponentPieces.length > 0) {
      motifs.push('pressure');
      strengths.push(`You are pressuring ${this.describePieceList(hangingOpponentPieces)}.`);
    }

    const ownLoosePieces = this.findLoosePieces(board, moverColor).filter(piece => piece.square !== this.toSquare(move.to.row, move.to.col));
    if (ownLoosePieces.length > 0) {
      warnings.push(`Keep an eye on ${this.describePieceList(ownLoosePieces)}.`);
      threatLevel = threatLevel === 'critical' ? 'critical' : 'medium';
    }

    if (movedPieceType === QUEEN && board.moveNumber <= 6) {
      warnings.push('Early queen moves can cost time if your minor pieces are still undeveloped.');
    }

    return { motifs, warnings, strengths, threatLevel };
  }

  getPhase(board) {
    const totalPieces = this.countPieces(board);
    if (board.moveNumber <= 8) {return 'opening';}
    if (totalPieces <= 10) {return 'endgame';}
    return 'middlegame';
  }

  countPieces(board) {
    let count = 0;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (board.getPiece(row, col)) {count++;}
      }
    }
    return count;
  }

  isCenterSquare(row, col) {
    return (row === 3 || row === 4) && (col === 3 || col === 4);
  }

  isDevelopingMove(move, pieceType, color, moveNumber) {
    if (moveNumber > 10) {return false;}
    if (![KNIGHT, BISHOP].includes(pieceType)) {return false;}
    const homeSquares = color === WHITE
      ? [{ row: 7, col: 1 }, { row: 7, col: 6 }, { row: 7, col: 2 }, { row: 7, col: 5 }]
      : [{ row: 0, col: 1 }, { row: 0, col: 6 }, { row: 0, col: 2 }, { row: 0, col: 5 }];
    return homeSquares.some(square => square.row === move.from.row && square.col === move.from.col);
  }

  isSquareDefended(board, row, col, color) {
    const savedTurn = board.currentTurn;
    board.currentTurn = color;
    const defended = this.squareHasFriendlyAccess(board, row, col);
    board.currentTurn = savedTurn;
    return defended;
  }

  squareHasFriendlyAccess(board, row, col) {
    for (let fromRow = 0; fromRow < 8; fromRow++) {
      for (let fromCol = 0; fromCol < 8; fromCol++) {
        const piece = board.getPiece(fromRow, fromCol);
        if (!piece || !board.isOwnPiece(piece)) {continue;}
        const pseudoMoves = board.generatePseudoLegalMoves(fromRow, fromCol);
        if (pseudoMoves.some(move => move.to.row === row && move.to.col === col)) {return true;}
      }
    }
    return false;
  }

  findLoosePieces(board, color) {
    const pieces = [];
    const attackerColor = color === WHITE ? BLACK : WHITE;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board.getPiece(row, col);
        if (!piece || board.getPieceColor(piece) !== color) {continue;}
        const pieceType = board.getPieceType(piece);
        if (pieceType === KING) {continue;}

        const attacked = board.isSquareAttacked(row, col, attackerColor);
        const defended = this.isSquareDefended(board, row, col, color);
        if (attacked && !defended) {
          pieces.push({
            piece: pieceType,
            square: this.toSquare(row, col)
          });
        }
      }
    }

    return pieces.slice(0, 2);
  }

  describePieceList(pieces) {
    return pieces
      .map(piece => `${this.getPieceName(piece.piece)} on ${piece.square}`)
      .join(' and ');
  }

  getSummary(engineAnalysis, postMove) {
    if (engineAnalysis.quality === 'blunder') {return 'Major tactical issue';}
    if (engineAnalysis.quality === 'mistake') {return 'Important improvement available';}
    if (postMove.threatLevel === 'critical') {return 'Active threat created';}
    if (postMove.strengths.length > 0) {return postMove.strengths[0];}
    return engineAnalysis.feedback || 'Solid practical move';
  }

  describeIdea(board, move) {
    const piece = board.getPiece(move.from.row, move.from.col);
    const pieceType = board.getPieceType(piece);

    if (move.isCastling) {return 'Consider castling to improve king safety.';}
    if (move.capture) {return `Consider ${this.getPieceName(pieceType)} takes on ${this.toSquare(move.to.row, move.to.col)}.`;}
    if (move.promotion) {return `Consider promoting on ${this.toSquare(move.to.row, move.to.col)}.`;}
    if (this.isCenterSquare(move.to.row, move.to.col)) {return `Consider improving central control with ${this.getPieceName(pieceType)} to ${this.toSquare(move.to.row, move.to.col)}.`;}
    return `Consider ${this.getPieceName(pieceType)} to ${this.toSquare(move.to.row, move.to.col)}.`;
  }

  getPieceName(pieceType) {
    return { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }[pieceType] || 'piece';
  }

  toSquare(row, col) {
    return 'abcdefgh'[col] + '87654321'[row];
  }
}

class CoachTeachingPolicy {
  decide(analysis, context = {}) {
    const mode = context.mode || 'guided';
    const skill = context.skillProfile || { bracket: 'club' };
    const severity = this.getSeverity(analysis);
    const importance = this.getImportance(analysis, mode);
    const shouldSpeak = this.shouldSpeak(analysis, severity, importance, mode, skill);

    return {
      shouldSpeak,
      severity,
      importance,
      mode,
      focus: this.getFocus(analysis, severity, skill),
      style: severity === 'critical' ? 'warning' : severity === 'positive' ? 'good' : 'encouraging'
    };
  }

  getSeverity(analysis) {
    if (analysis.quality === 'blunder' || analysis.threatLevel === 'critical') {return 'critical';}
    if (analysis.quality === 'mistake' || analysis.warnings.length > 0) {return 'warning';}
    if (analysis.quality === 'best' || analysis.strengths.length > 0) {return 'positive';}
    return 'quiet';
  }

  getImportance(analysis, mode) {
    const base = analysis.quality === 'blunder' ? 100
      : analysis.quality === 'mistake' ? 80
      : analysis.quality === 'inaccuracy' ? 55
      : analysis.quality === 'best' ? 40
      : 25;

    const modeBonus = mode === 'review' ? 25 : mode === 'guided' ? 10 : 0;
    const tacticBonus = analysis.motifs.includes('hanging-piece') || analysis.motifs.includes('check') ? 15 : 0;
    return base + modeBonus + tacticBonus;
  }

  shouldSpeak(analysis, severity, importance, mode, skill) {
    if (mode === 'review') {return true;}
    if (severity === 'critical') {return true;}
    if (mode === 'guided') {return importance >= (skill.bracket === 'beginner' ? 30 : 40);}
    return importance >= (skill.bracket === 'advanced' ? 85 : 70);
  }

  getFocus(analysis, severity, skill) {
    if (severity === 'critical') {return 'warning';}
    if (analysis.motifs.includes('development') && skill.bracket === 'beginner') {return 'principle';}
    if (analysis.motifs.includes('king-safety')) {return 'king-safety';}
    if (analysis.motifs.includes('center')) {return 'position';}
    if (analysis.alternatives.length > 0) {return 'candidate-moves';}
    return 'encouragement';
  }
}

class CoachPersonaRenderer {
  render(analysis, policy, context = {}) {
    if (!policy.shouldSpeak) {return { message: '', style: policy.style, speak: false };}

    const mode = context.mode || 'guided';
    const skill = context.skillProfile || { bracket: 'club' };
    const moveText = context.moveText || '';
    const concise = skill.bracket === 'advanced' && mode !== 'review';
    const lines = [];

    if (policy.focus === 'warning') {
      const warning = analysis.warnings[0] || analysis.feedback;
      lines.push(skill.bracket === 'beginner'
        ? `Careful with ${moveText || 'that move'}: ${warning}`
        : `${warning}`);
    } else if (policy.focus === 'principle') {
      lines.push(`Nice idea. ${analysis.strengths[0] || 'This helps your pieces get into the game.'}`);
    } else if (policy.focus === 'king-safety') {
      lines.push(analysis.strengths[0] || 'King safety improved here.');
    } else if (policy.focus === 'position') {
      lines.push(analysis.strengths[0] || 'This move improves the position.');
    } else {
      lines.push(analysis.feedback || analysis.summary);
    }

    if (!concise && analysis.alternatives.length > 0 && (mode === 'review' || analysis.quality === 'mistake' || analysis.quality === 'blunder' || analysis.quality === 'inaccuracy')) {
      lines.push(`Idea to consider: ${analysis.alternatives[0].label.replace(/^Consider /, '')}`);
    }

    if (!concise && analysis.phase === 'opening' && analysis.motifs.includes('development') && skill.bracket === 'beginner') {
      lines.push('In the opening, simple development and king safety usually matter more than hunting pawns.');
    }

    return {
      message: lines.join(' '),
      style: policy.style,
      speak: policy.severity !== 'quiet'
    };
  }

  renderWelcome(context = {}) {
    const mode = context.modeLabel || 'Guided';
    return `Coach ${context.name || 'Astra'} is ready in ${mode} Mode. I’ll focus on ideas, threats, and learning moments without playing the move for you.`;
  }

  renderHint(options, skillProfile = {}) {
    if (!options || options.length === 0) {return 'I do not see a clear teaching moment right now. Look for checks, captures, and loose pieces.';}
    const first = options[0];
    if (skillProfile.bracket === 'beginner') {
      return `${first.label} Start by checking which pieces are undefended before you commit.`;
    }
    return `${first.label} Compare it with your current plan and see which move improves activity more cleanly.`;
  }

  renderReviewEntry(entry, skillProfile = {}) {
    const prefix = entry.severity === 'critical' ? 'Critical moment:' : entry.severity === 'warning' ? 'Learning moment:' : 'Good moment:';
    const goalLine = skillProfile.bracket === 'beginner'
      ? `Focus goal: ${entry.goal}`
      : `Training theme: ${entry.goal}`;
    return `${prefix} ${entry.summary} ${goalLine}`;
  }

  renderPuzzleIntro(puzzle, skillProfile = {}) {
    const theme = puzzle.theme[0].replace(/-/g, ' ');
    if (skillProfile.bracket === 'beginner') {
      return `${puzzle.prompt} Start by checking forcing moves like checks, captures, and threats around the ${theme} idea.`;
    }
    return `${puzzle.prompt} The key theme is ${theme}. Compare forcing continuations before you commit.`;
  }

  renderPuzzleHint(puzzle, expectedMove, board) {
    const move = board.findMoveByUci(expectedMove);
    if (!move) {return 'Look for the most forcing move in the position.';}
    return `${this.describeIdea(board, move)} Try to understand why it works before you play it.`;
  }

  renderPuzzleMistake(puzzle, expectedMove, attemptedMove, skillProfile = {}) {
    const simple = skillProfile.bracket === 'beginner';
    const theme = puzzle.theme[0].replace(/-/g, ' ');
    return simple
      ? `Not quite. This puzzle is about ${theme}, so look for a move with a stronger threat than ${attemptedMove}.`
      : `That misses the main ${theme} idea. Compare it with the forcing move ${expectedMove} and look at what changes tactically.`;
  }

  renderPuzzleSuccess(puzzle, summary, skillProfile = {}) {
    const fastSolve = summary.durationMs < 15000;
    if (skillProfile.bracket === 'beginner') {
      return fastSolve
        ? `Nice solve. You spotted the key idea quickly.`
        : `Well done. You found the right idea and worked through the position.`;
    }
    return fastSolve
      ? `Clean solve. The tactical pattern was identified quickly.`
      : `Solved. Good patience through the critical line.`;
  }

  renderPuzzleStreak(streak) {
    if (streak >= 10) {return 'That streak is real momentum. Keep the calculation discipline going.';}
    if (streak >= 5) {return 'Strong run. Stay precise and keep trusting the pattern recognition.';}
    return 'Good rhythm. Keep building the streak one clean solve at a time.';
  }
}

class CoachSettingsFilter {
  apply(message, settings = {}) {
    if (!settings.enabled) {return { ...message, message: '', speak: false };}
    if (!settings.messageCards && !message.force) {return { ...message, message: '' };}
    if (!settings.voiceEnabled) {return { ...message, speak: false };}
    return message;
  }
}

class ChessCoach {
  constructor(board, engine) {
    this.board = board;
    this.engine = engine;
    this.evaluator = new CoachPositionEvaluator(engine);
    this.policy = new CoachTeachingPolicy();
    this.persona = new CoachPersonaRenderer();
    this.filter = new CoachSettingsFilter();

    this.enabled = true;
    this.moveHintsEnabled = true;
    this.mode = 'guided';
    this.voiceEnabled = false;
    this.messageCardsEnabled = true;
    this.motivationalEnabled = true;
    this.remindersEnabled = true;
    this.personaName = 'Astra';
    this.skillProfile = { rating: 1200, bracket: 'club', label: 'Club' };

    this.hintMove = null;
    this.legalMoveHighlights = [];
    this.currentGameLog = [];
    this.currentReview = null;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  setMoveHintsEnabled(enabled) {
    this.moveHintsEnabled = enabled;
    if (!enabled) {this.clearHighlights();}
  }

  setInteractionMode(mode) {
    this.mode = ['passive', 'guided', 'review'].includes(mode) ? mode : 'guided';
  }

  setVoiceEnabled(enabled) {
    this.voiceEnabled = enabled;
  }

  setMessageCardsEnabled(enabled) {
    this.messageCardsEnabled = enabled;
  }

  setMotivationalEnabled(enabled) {
    this.motivationalEnabled = enabled;
  }

  setRemindersEnabled(enabled) {
    this.remindersEnabled = enabled;
  }

  setSkillLevel(rating) {
    const numeric = Math.max(400, Math.min(3000, parseInt(rating || 1200)));
    let bracket = 'club';
    let label = 'Club';

    if (numeric < 900) { bracket = 'beginner'; label = 'Beginner'; }
    else if (numeric < 1500) { bracket = 'improving'; label = 'Improving'; }
    else if (numeric < 2100) { bracket = 'advanced'; label = 'Advanced'; }
    else { bracket = 'expert'; label = 'Expert'; }

    this.skillProfile = { rating: numeric, bracket, label };
  }

  getSettings() {
    return {
      enabled: this.enabled,
      moveHintsEnabled: this.moveHintsEnabled,
      mode: this.mode,
      voiceEnabled: this.voiceEnabled,
      messageCards: this.messageCardsEnabled,
      motivationalEnabled: this.motivationalEnabled,
      remindersEnabled: this.remindersEnabled,
      personaName: this.personaName
    };
  }

  isEnabled() { return this.enabled; }
  isMoveHintsEnabled() { return this.moveHintsEnabled; }

  getModeLabel() {
    return { passive: 'Passive', guided: 'Guided', review: 'Review' }[this.mode] || 'Guided';
  }

  getLegalMovesForSquare(row, col) {
    if (!this.moveHintsEnabled) {return [];}
    const piece = this.board.getPiece(row, col);
    if (!piece || !this.board.isOwnPiece(piece)) {return [];}
    this.legalMoveHighlights = this.board.generateLegalMovesForPiece(row, col);
    return this.legalMoveHighlights;
  }

  clearHighlights() {
    this.legalMoveHighlights = [];
    this.hintMove = null;
  }

  getHighlightSquares() {
    return this.legalMoveHighlights.map(move => ({
      row: move.to.row,
      col: move.to.col,
      isCapture: !!move.capture
    }));
  }

  getSuggestedMove() {
    if (!this.enabled || this.board.isGameOver()) {return null;}
    this.hintMove = this.engine.getTopMoves(this.board, 2, 1)[0]?.move || null;
    return this.hintMove;
  }

  getSuggestionHighlight() {
    if (!this.hintMove) {return null;}
    return {
      from: { row: this.hintMove.from.row, col: this.hintMove.from.col },
      to: { row: this.hintMove.to.row, col: this.hintMove.to.col }
    };
  }

  getHintMessage() {
    const ideas = this.engine.getTopMoves(this.board, 2, 2).map(item => ({
      ...item,
      label: this.evaluator.describeIdea(this.board, item.move)
    }));
    return this.persona.renderHint(ideas, this.skillProfile);
  }

  analyzeMove(move, context = {}) {
    const analysis = this.evaluator.analyze(this.board, move, {
      playerColor: context.playerColor
    });
    const moveText = this.evaluator.toSquare(move.to.row, move.to.col);
    const policy = this.policy.decide(analysis, {
      mode: this.mode,
      skillProfile: this.skillProfile
    });
    const rendered = this.persona.render(analysis, policy, {
      mode: this.mode,
      skillProfile: this.skillProfile,
      moveText
    });

    return {
      ...analysis,
      policy,
      rendered: this.filter.apply(rendered, this.getSettings())
    };
  }

  getMoveExplanation(analysis) {
    if (!analysis?.rendered?.message) {
      if (!this.motivationalEnabled || !this.enabled) {return { message: '', style: '', speak: false };}
      return {
        message: this.getEncouragingMessage(),
        style: 'encouraging',
        speak: false
      };
    }
    return analysis.rendered;
  }

  getEncouragingMessage() {
    return [
      'Solid effort. Keep comparing candidate moves before you commit.',
      'Nice pace. Stay alert to checks, captures, and loose pieces.',
      'You are building the position well. Keep your pieces coordinated.',
      'Good work. Try to make each move improve both safety and activity.'
    ][Math.floor(Math.random() * 4)];
  }

  getWelcomeMessage() {
    return this.persona.renderWelcome({
      name: this.personaName,
      modeLabel: this.getModeLabel()
    });
  }

  getGameStateFeedback() {
    if (this.board.isCheckmate()) {
      const winner = this.board.currentTurn === WHITE ? 'Black' : 'White';
      return { type: 'gameover', message: `Checkmate. ${winner} wins. Let’s use the review to see where the game turned.`, style: 'warning' };
    }
    if (this.board.isStalemate()) {
      return { type: 'gameover', message: 'Stalemate. The position is drawn, and there is usually a useful practical lesson in how the pressure faded.', style: 'encouraging' };
    }
    if (this.board.isColorInCheck(this.board.currentTurn)) {
      const name = this.board.currentTurn === WHITE ? 'White' : 'Black';
      return { type: 'check', message: `${name} is in check. Start with forcing moves and safe king squares.`, style: 'warning' };
    }
    if (this.board.isInsufficientMaterial()) {
      return { type: 'gameover', message: 'Draw by insufficient material. Clean conversion and practical endgame technique are good review themes here.', style: 'encouraging' };
    }
    return null;
  }

  startGame(context = {}) {
    this.currentGameLog = [];
    this.currentReview = null;
    if (context.skillRating) {this.setSkillLevel(context.skillRating);}
  }

  recordPlayerMove(analysis, move, boardState, context = {}) {
    if (!analysis) {return;}

    const severity = analysis.policy?.severity || 'quiet';
    const summary = analysis.rendered?.message || analysis.summary;
    const goal = this.getImprovementGoal(analysis);
    const moveNumber = context.moveNumber || this.board.moveNumber;

    this.currentGameLog.push({
      ply: this.currentGameLog.length + 1,
      moveNumber,
      notation: context.notation || '',
      fen: boardState?.fen || '',
      quality: analysis.quality,
      severity,
      summary,
      goal,
      warnings: [...analysis.warnings],
      motifs: [...analysis.motifs],
      alternatives: analysis.alternatives.map(item => item.label)
    });
  }

  getImprovementGoal(analysis) {
    if (analysis.quality === 'blunder' || analysis.quality === 'mistake') {
      if (analysis.motifs.includes('hanging-piece')) {return 'Check whether your moved piece can be captured for free.';}
      if (analysis.warnings.some(item => item.includes('queen'))) {return 'Finish development before repeating queen moves.';}
      return 'Pause for one more blunder-check before moving.';
    }
    if (analysis.motifs.includes('development')) {return 'Keep developing with tempo and connect your rooks.';}
    if (analysis.motifs.includes('king-safety')) {return 'Use king safety as a guide when plans feel unclear.';}
    return 'Compare two candidate moves before committing.';
  }

  buildPostGameReview(context = {}) {
    const criticalMoments = [...this.currentGameLog]
      .filter(entry => ['critical', 'warning'].includes(entry.severity))
      .slice(0, 6);

    const themes = this.extractThemes(this.currentGameLog);
    const goals = themes.length > 0
      ? themes.slice(0, 3).map(theme => theme.goal)
      : ['Keep scanning for checks, captures, and undefended pieces.'];

    this.currentReview = {
      id: `review-${Date.now()}`,
      createdAt: new Date().toISOString(),
      mode: this.mode,
      skillLabel: this.skillProfile.label,
      outcome: context.outcome || 'Game finished',
      opponent: context.opponent || 'AI',
      playerColor: context.playerColor || WHITE,
      moveCount: this.board.moveHistory.length,
      themes: themes.map(theme => theme.label),
      goals,
      entries: criticalMoments.map(entry => ({
        ...entry,
        coachText: this.persona.renderReviewEntry(entry, this.skillProfile)
      })),
      moveHistory: this.board.moveHistory.map(entry => ({
        notation: entry.notation,
        color: entry.color
      }))
    };

    return this.currentReview;
  }

  extractThemes(log) {
    const counts = new Map();
    const addTheme = (key, label, goal) => {
      if (!counts.has(key)) {counts.set(key, { key, label, goal, total: 0 });}
      counts.get(key).total += 1;
    };

    log.forEach(entry => {
      if (entry.motifs.includes('hanging-piece')) {addTheme('loose-pieces', 'Loose pieces', 'Reduce blunders by checking loose pieces before every move.');}
      if (entry.motifs.includes('development')) {addTheme('development', 'Development', 'Bring minor pieces out before launching queen adventures.');}
      if (entry.motifs.includes('king-safety')) {addTheme('king-safety', 'King safety', 'Castle earlier and keep your king protected before starting tactics.');}
      if (entry.motifs.includes('center')) {addTheme('center', 'Central control', 'Look for moves that improve central influence and piece activity.');}
      if (entry.quality === 'best') {addTheme('good-decisions', 'Strong decisions', 'Keep repeating the habits from your best moves.');}
    });

    return [...counts.values()].sort((a, b) => b.total - a.total);
  }

  exportState() {
    return {
      settings: this.getSettings(),
      skillProfile: this.skillProfile,
      currentGameLog: this.currentGameLog,
      currentReview: this.currentReview
    };
  }

  importState(state) {
    if (!state) {return;}
    if (state.settings) {
      this.setEnabled(state.settings.enabled !== false);
      this.setMoveHintsEnabled(state.settings.moveHintsEnabled !== false);
      this.setInteractionMode(state.settings.mode || 'guided');
      this.setVoiceEnabled(state.settings.voiceEnabled === true);
      this.setMessageCardsEnabled(state.settings.messageCards !== false);
      this.setMotivationalEnabled(state.settings.motivationalEnabled !== false);
      this.setRemindersEnabled(state.settings.remindersEnabled !== false);
    }
    if (state.skillProfile?.rating) {this.setSkillLevel(state.skillProfile.rating);}
    this.currentGameLog = Array.isArray(state.currentGameLog) ? state.currentGameLog : [];
    this.currentReview = state.currentReview || null;
  }
}

// Export for both Node.js modules and browser global scope
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ChessCoach,
    CoachPositionEvaluator,
    CoachTeachingPolicy,
    CoachPersonaRenderer,
    CoachSettingsFilter
  };
}
if (typeof window !== 'undefined') {
  window.ChessCoach = ChessCoach;
}
