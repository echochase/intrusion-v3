const GameSystem = require('./GameSystem');
const { HackerDeck, SecEngDeck, TaskDeck } = require('./decks');
const { Hacker, SecurityEngineer, MAX_HAND_SIZE } = require('./Player');
const { laneLabel } = require('./defines');

const SECURITY_MAX_CARDS_PER_TURN = 1;
const HACKER_MAX_CARDS_PER_TURN = 2;
const INITIAL_SECURITY_HAND_SIZE = 4;
const MIN_PLAYERS = 4;
const MAX_PLAYERS = 5;
const VOTE_UNLOCK_TURN = 3;

class Game {
  constructor(lobbyPlayers) {
    if (!Array.isArray(lobbyPlayers) || lobbyPlayers.length < MIN_PLAYERS || lobbyPlayers.length > MAX_PLAYERS) {
      throw new Error(`Intrusion requires ${MIN_PLAYERS}-${MAX_PLAYERS} players`);
    }

    const hackerIndex = Math.floor(Math.random() * lobbyPlayers.length);
    this.players = lobbyPlayers.map((lp, index) => index === hackerIndex
      ? new Hacker(lp.name, lp.socketId, lp.sessionToken)
      : new SecurityEngineer(lp.name, lp.socketId, lp.sessionToken));

    this.hackerDeck = new HackerDeck();
    this.secEngDeck = new SecEngDeck();
    this.taskDeck = new TaskDeck();
    this.system = new GameSystem(this.players.length);

    this.turnNumber = 0;
    this.phase = 'lobby';
    this.winner = null;
    this.endReason = null;
    this.turnSubmissions = {};
    this.lastTurnSubmissionDebug = [];
    this.currentVote = null;
    this.voteProposal = null;
    this.votingExpired = false;
    this.eliminated = [];

    this.taskCompletionCounts = Object.fromEntries(this.players.map(player => [player.name, 0]));
  }

  start() {
    for (const player of this.players) {
      if (player instanceof Hacker) {
        const openingDefence = this.secEngDeck.drawWhere(card => card.type === 'defence');
        player.receiveCards([
          openingDefence,
          ...this.secEngDeck.drawMany(2),
          ...this.hackerDeck.drawMany(2),
        ].filter(Boolean));
      } else {
        player.receiveCards(this.secEngDeck.drawMany(INITIAL_SECURITY_HAND_SIZE));
      }
      this._dealNewTask(player);
    }

    this.phase = 'playing';
    this.turnNumber = 1;
  }

  dealStartOfTurn() {
    this.turnSubmissions = {};
    this.lastTurnSubmissionDebug = [];

    for (const player of this.players) {
      player.hasPlayedCards = false;
      player.canPlayCards = true;
      player.canPlayAttacks = true;
      player.cardsPlayedThisTurn = [];
      player.needsDiscard = false;
      player.forcedDiscardCount = 0;
      player.replacedTaskThisTurn = false;
      player.awaitingDrawChoice = false;

      if (this.turnNumber <= 1) continue;

      if (player instanceof Hacker) {
        player.awaitingDrawChoice = true;
      } else {
        player.receiveCards(this.secEngDeck.drawMany(1));
      }
    }
  }

  chooseHackerDraw(playerName, { security = 0, hacker = 0 } = {}) {
    if (this.phase !== 'playing') return { ok: false, error: 'Game is not in the playing phase' };
    const player = this.getPlayer(playerName);
    if (!(player instanceof Hacker)) return { ok: false, error: 'Only the hacker chooses between decks' };
    if (!player.awaitingDrawChoice) return { ok: false, error: 'You have already chosen your draw this turn' };

    const securityDraws = Number(security) || 0;
    const hackerDraws = Number(hacker) || 0;
    if (securityDraws < 0 || hackerDraws < 0 || securityDraws + hackerDraws !== 2) {
      return { ok: false, error: 'Choose exactly 2 cards total' };
    }

    player.receiveCards([
      ...this.secEngDeck.drawMany(securityDraws),
      ...this.hackerDeck.drawMany(hackerDraws),
    ]);
    player.awaitingDrawChoice = false;

    return { ok: true, mustDiscard: player.mustDiscard(), discardCount: player.discardCount() };
  }

  submitCards(playerName, cardRefs = [], cardOptions = {}) {
    if (this.phase !== 'playing') return { ok: false, error: 'Game is not in the playing phase' };
    if (!Array.isArray(cardRefs)) return { ok: false, error: 'Card submission must be an array' };

    const player = this.getPlayer(playerName);
    if (!player) return { ok: false, error: 'Player not found or has been eliminated' };
    if (player.awaitingDrawChoice) return { ok: false, error: 'Choose your deck draw first' };
    if (player.mustDiscard()) return { ok: false, error: 'Discard before submitting' };
    if (this.turnSubmissions[playerName] !== undefined) return { ok: false, error: 'Already submitted this turn' };

    const maxCards = player instanceof Hacker ? HACKER_MAX_CARDS_PER_TURN : SECURITY_MAX_CARDS_PER_TURN;
    if (cardRefs.length > maxCards) {
      return { ok: false, error: player instanceof Hacker ? 'The Hacker may submit up to 2 cards per turn' : 'Security Engineers may submit 1 card per turn' };
    }

    const resolved = this._resolveSubmittedCards(player, cardRefs);
    if (!resolved.ok) return resolved;
    const toPlay = resolved.cards;

    const kindCheck = this._validateSubmissionKinds(player, toPlay);
    if (!kindCheck.ok) return kindCheck;

    if (player instanceof Hacker && this.turnNumber <= 1 && toPlay.some(card => card.type === 'attack')) {
      return { ok: false, error: 'The Hacker cannot submit attack cards on the first cycle' };
    }

    for (const card of toPlay) {
      if (card.hackerOnly && !(player instanceof Hacker)) return { ok: false, error: `${card.name} is not a security card` };
      if (!card.isPlayable(this.system)) return { ok: false, error: `${card.name} cannot be played right now` };
    }

    for (const card of toPlay) {
      card.owner = player;
      const options = cardOptions?.[card.id] || cardOptions?.[card.name] || {};
      if (card.name === 'Check Server Log' || card.name === 'False Flag') {
        card.targetPlayerName = options.targetPlayerName || options.target || null;
      }
      if (card.type === 'defence' || card.name === 'Insider Sabotage' || card.category === 'Sabotage') {
        const rawSlot = options.defenceSlotIndex ?? options.slotIndex ?? options.slot;
        const slotIndex = Number(rawSlot);
        card.defenceSlotIndex = Number.isInteger(slotIndex) && slotIndex >= 0 && slotIndex < 3 ? slotIndex : null;
      }

      if (player.task?.id === card.id) player.task = null;
      else player.removeCardFromHand(card.id, { clearOwner: false });

      player.hasPlayedCards = true;
      player.cardsPlayedThisTurn.push(card);
      card.onPlay(this.system);
      this.system.addProcess(card);
    }

    player.markDiscardIfNeeded();
    this.turnSubmissions[playerName] = toPlay;

    return { ok: true, mustDiscard: player.mustDiscard(), discardCount: player.discardCount() };
  }

  discardCards(playerName, cardRefs = []) {
    const player = this.getPlayer(playerName);
    if (!player) return { ok: false, error: 'Player not found or has been eliminated' };
    if (!player.mustDiscard()) return { ok: false, error: 'You do not need to discard right now' };
    if (!Array.isArray(cardRefs) || cardRefs.length !== player.discardCount()) {
      return { ok: false, error: `Select exactly ${player.discardCount()} card(s) to discard` };
    }

    const cards = [];
    const used = new Set();
    for (const ref of cardRefs) {
      const idx = player.cards.findIndex((card, index) => !used.has(index) && (card.id === ref || card.name === ref));
      if (idx === -1) return { ok: false, error: `Card "${ref}" not found in your hand` };
      used.add(idx);
      cards.push(player.cards[idx]);
    }

    for (const card of cards) {
      const removed = player.removeCardFromHand(card.id);
      if (removed) this._discardCard(removed);
    }

    if (player.forcedDiscardCount > 0) player.forcedDiscardCount = 0;
    player.clearDiscardRequirementIfSatisfied();
    return { ok: true, mustDiscard: player.mustDiscard(), discardCount: player.discardCount() };
  }

  resolveTurn() {
    const resolvedTurnNumber = this.turnNumber;
    this.lastTurnSubmissionDebug = Object.entries(this.turnSubmissions).map(([owner, cards]) => ({
      owner,
      cards: (cards || []).map(card => ({ name: card.name, type: card.type, id: card.id, ownerRole: card.owner?.returnType?.() || 'unknown' })),
    }));

    const submissionSnapshot = Object.fromEntries(Object.entries(this.turnSubmissions).map(([owner, cards]) => [owner, (cards || []).map(card => ({
      id: card.id,
      name: card.name,
      type: card.type,
      lane: card.lane,
      lanes: Array.isArray(card.requiredLanes) ? [...card.requiredLanes] : (Array.isArray(card.lanes) ? [...card.lanes] : []),
      progressPoints: card.progressPoints || null,
      isHostile: Boolean(card.isHostile || card.type === 'attack'),
      submissionKind: this._submissionKind(card),
    }))]));

    const log = this.system.consumeProcesses(resolvedTurnNumber, submissionSnapshot);

    for (const ownerName of this.system.completedTaskOwners || []) {
      this.taskCompletionCounts[ownerName] = (this.taskCompletionCounts[ownerName] || 0) + 1;
    }

    this._discardResolvedCards();
    this._attachReconHandSnapshot();
    this._printTurnDebug();

    for (const player of this.players) {
      if (!player.task && this.phase !== 'ended' && this.system.numTasks > 0) this._dealNewTask(player);
    }

    const win = this._checkWinConditions();
    this.turnNumber += 1;
    return this._turnSummary(log, win, resolvedTurnNumber);
  }

  replaceTask(playerName) {
    if (this.phase !== 'playing') return { ok: false, error: 'Cannot replace a task right now' };
    const player = this.getPlayer(playerName);
    if (!player) return { ok: false, error: 'Player not found or has been eliminated' };
    if (player.awaitingDrawChoice) return { ok: false, error: 'Choose your deck draw first' };
    if (this.turnSubmissions[playerName] !== undefined) return { ok: false, error: 'You cannot replace a task after submitting this turn' };
    if (player.replacedTaskThisTurn) return { ok: false, error: 'You can only replace your task once per turn' };

    if (player.task) this.taskDeck.discard(player.task);
    player.task = null;
    this._dealNewTask(player);
    player.replacedTaskThisTurn = true;
    return { ok: true, task: player.task ? player.task.toJSON() : null };
  }

  proposeVote(callerName) {
    if (this.phase !== 'playing') return { ok: false, error: 'Cannot propose a vote right now' };
    if (this.turnNumber < VOTE_UNLOCK_TURN) return { ok: false, error: `Voting unlocks on cycle ${VOTE_UNLOCK_TURN}` };
    if (this.votingExpired) return { ok: false, error: 'Voting rights have already been used' };
    if (this.currentVote) return { ok: false, error: 'A vote is already in progress' };
    if (this.voteProposal) return { ok: false, error: 'A vote proposal is already open' };
    const caller = this.getPlayer(callerName);
    if (!(caller instanceof SecurityEngineer)) return { ok: false, error: 'Only active security engineers can call a vote' };

    const eligible = this.players.map(player => player.name);
    const threshold = this.players.length >= 5 ? 3 : 2;
    this.voteProposal = { callerName, approvals: { [callerName]: true }, responses: { [callerName]: 'proceed' }, eligible, threshold };

    if (Object.keys(this.voteProposal.approvals).length >= threshold) {
      return this._beginFormalVote();
    }

    return { ok: true, proposal: this._voteProposalJSON(callerName), waiting: true };
  }

  respondVoteProposal(playerName, proceed = false) {
    if (this.phase !== 'playing') return { ok: false, error: 'Cannot respond to a vote proposal right now' };
    if (!this.voteProposal) return { ok: false, error: 'No vote proposal is open' };
    if (!this.getPlayer(playerName)) return { ok: false, error: 'Only active players can respond to a vote proposal' };
    if (!this.voteProposal.eligible.includes(playerName)) return { ok: false, error: 'You are not eligible to respond to this vote proposal' };

    if (proceed) {
      this.voteProposal.approvals[playerName] = true;
      this.voteProposal.responses[playerName] = 'proceed';
    } else {
      delete this.voteProposal.approvals[playerName];
      this.voteProposal.responses[playerName] = 'delay';
    }

    if (Object.keys(this.voteProposal.approvals).length >= this.voteProposal.threshold) {
      return this._beginFormalVote();
    }

    const allResponded = this.voteProposal.eligible.every(name => this.voteProposal.responses[name]);
    if (allResponded) {
      const callerName = this.voteProposal.callerName;
      this.voteProposal = null;
      return { ok: true, outcome: 'deferred', callerName };
    }

    return { ok: true, proposal: this._voteProposalJSON(playerName), waiting: true };
  }

  _beginFormalVote() {
    const proposal = this.voteProposal;
    this.voteProposal = null;
    this.phase = 'voting';
    this.currentVote = { votes: {}, eligible: this.players.map(player => player.name), proposedBy: proposal?.callerName || null };
    return { ok: true, outcome: 'started' };
  }

  castVote(voterName, accusedName) {
    if (!this.currentVote) return { ok: false, error: 'No vote in progress' };
    if (!this.getPlayer(voterName)) return { ok: false, error: 'Eliminated players cannot vote' };
    if (!this.getPlayer(accusedName)) return { ok: false, error: 'You can only accuse an active player' };
    this.currentVote.votes[voterName] = accusedName;
    const allVoted = this.currentVote.eligible.every(name => name in this.currentVote.votes);
    if (!allVoted) return { ok: true, waiting: true };
    return this._resolveVote();
  }

  toClientJSON(forPlayerName, { roomSpectators = [] } = {}) {
    const visiblePlayers = [
      ...this.players.map(player => ({ player, eliminated: false })),
      ...this.eliminated.map(player => ({ player, eliminated: true })),
    ];
    const isRoomSpectator = roomSpectators.some(spectator => spectator.name === forPlayerName);

    const playerRows = visiblePlayers.map(({ player, eliminated }) => {
      const isMe = player.name === forPlayerName;
      const json = isMe ? player.toPrivateJSON() : player.toPublicJSON();
      json.isEliminated = eliminated;
      json.isSpectator = false;
      json.submittedThisTurn = this.turnSubmissions[player.name] !== undefined;
      json.submittedCardsThisTurn = isMe ? (this.turnSubmissions[player.name] || []).map(card => card.toJSON()) : [];
      json.tasksCompleted = this.taskCompletionCounts[player.name] || 0;

      if (eliminated) {
        json.role = isMe ? 'Spectator' : 'Eliminated';
        json.isSpectator = true;
        json.handSize = 0;
        if (!isMe) json.task = null;
      } else if (!isMe) {
        if (this.system.hackerRevealed && player instanceof Hacker) {
          json.role = 'Hacker';
          json.hackerRevealed = true;
        } else {
          json.role = 'hidden';
        }
      }

      if (this.system.hackerRevealed && player instanceof Hacker) {
        json.hackerRevealed = true;
      }

      if (!isMe) {
        delete json.cards;
        delete json.cardsPlayedThisTurn;
        json.mustDiscard = false;
        json.discardCount = 0;
        json.forcedDiscardCount = 0;
        json.awaitingDrawChoice = false;
      }
      return json;
    });

    const spectatorRows = roomSpectators.map(spectator => ({
      name: spectator.name,
      role: 'Spectator',
      isSpectator: true,
      isEliminated: false,
      connected: spectator.connected !== false,
      handSize: 0,
      task: null,
      timePoints: 0,
      commPoints: 0,
      progPoints: 0,
      hasPlayedCards: false,
      canPlayCards: false,
      canPlayAttacks: false,
      mustDiscard: false,
      discardCount: 0,
      forcedDiscardCount: 0,
      awaitingDrawChoice: false,
      replacedTaskThisTurn: false,
      submittedThisTurn: true,
      submittedCardsThisTurn: [],
      tasksCompleted: 0,
      cards: spectator.name === forPlayerName ? [] : undefined,
      cardsPlayedThisTurn: spectator.name === forPlayerName ? [] : undefined,
    }));

    return {
      turnNumber: this.turnNumber,
      phase: this.phase,
      winner: this.winner,
      endReason: this.endReason,
      system: this.system.toPublicJSON(),
      votingExpired: this.votingExpired,
      voteProposal: this._voteProposalJSON(forPlayerName),
      voteUnlockTurn: VOTE_UNLOCK_TURN,
      eliminated: this.eliminated.map(player => player.name),
      spectators: roomSpectators.map(spectator => ({ name: spectator.name, connected: spectator.connected !== false })),
      players: [...playerRows, ...spectatorRows],
      viewerIsSpectator: isRoomSpectator,
    };
  }

  getPlayer(name) { return this.players.find(player => player.name === name) || null; }
  getHacker() { return this.players.find(player => player instanceof Hacker) || null; }
  getEngineers() { return this.players.filter(player => player instanceof SecurityEngineer); }
  getSpectators() { return [...this.eliminated]; }

  canResolveTurn() {
    if (this.phase !== 'playing') return false;
    return this.players.every(player =>
      !player.awaitingDrawChoice && !player.mustDiscard() && this.turnSubmissions[player.name] !== undefined
    );
  }

  _resolveSubmittedCards(player, cardRefs) {
    const cards = [];
    const usedHandIndexes = new Set();
    let usedTask = false;

    for (const ref of cardRefs) {
      const handIndex = player.cards.findIndex((card, index) => !usedHandIndexes.has(index) && (card.id === ref || card.name === ref));
      if (handIndex !== -1) {
        usedHandIndexes.add(handIndex);
        cards.push(player.cards[handIndex]);
        continue;
      }

      if (!usedTask && player.task && (player.task.id === ref || player.task.name === ref)) {
        usedTask = true;
        cards.push(player.task);
        continue;
      }

      return { ok: false, error: `Card "${ref}" not found in your hand or task slot` };
    }

    return { ok: true, cards };
  }

  _submissionKind(card) {
    if (!card) return 'security';
    if (card.hackerOnly || card.type === 'attack' || card.sourceDeck === 'hacker') return 'hacker';
    return 'security';
  }

  _validateSubmissionKinds(player, cards) {
    if (!(player instanceof Hacker)) {
      if (cards.length > SECURITY_MAX_CARDS_PER_TURN) return { ok: false, error: 'Security Engineers may submit 1 card per turn' };
      return { ok: true };
    }

    const counts = { hacker: 0, security: 0 };
    for (const card of cards) counts[this._submissionKind(card)] += 1;
    if (counts.hacker > 1 || counts.security > 1) {
      return { ok: false, error: 'The Hacker may submit at most 1 Hacker card and 1 Security card per turn' };
    }
    return { ok: true };
  }

  _voteProposalJSON(forPlayerName = null) {
    if (!this.voteProposal) return null;
    const responses = this.voteProposal.responses || {};
    return {
      callerName: this.voteProposal.callerName,
      threshold: this.voteProposal.threshold,
      approvalCount: Object.keys(this.voteProposal.approvals || {}).length,
      eligibleCount: this.voteProposal.eligible?.length || 0,
      hasResponded: Boolean(forPlayerName && responses[forPlayerName]),
      yourResponse: forPlayerName ? responses[forPlayerName] || null : null,
    };
  }

  _dealNewTask(player) {
    const taskCard = this.taskDeck.draw();
    if (taskCard) {
      taskCard.owner = player;
      player.task = taskCard;
    }
  }

  _checkWinConditions() {
    if (this.system.checkLoss()) return this._endGame('hacker', 'System integrity reached zero');
    if (this.system.checkWin()) return this._endGame('engineers', this.system.hackerArrested ? 'Hacker was caught' : 'Project completed');
    return null;
  }

  _endGame(winner, reason) {
    this.phase = 'ended';
    this.winner = winner;
    this.endReason = reason;
    return { winner, reason };
  }

  _attachReconHandSnapshot() {
    if (!this.system.reconResult) return;
    const ownerName = this.system.reconResult.ownerName || null;
    this.system.reconResult.players = this.players
      .filter(player => !ownerName || player.name !== ownerName)
      .map(player => ({
      name: player.name,
      role: player.returnType?.() || player.role || 'unknown',
      cards: (player.cards || []).map(card => ({
        id: card.id,
        name: card.name,
        type: card.type,
        lane: card.lane || null,
        laneLabel: card.lane ? laneLabel(card.lane) : null,
        category: card.category || null,
        description: card.description,
        effectDescription: card.effectDescription,
        sourceDeck: card.sourceDeck || null,
      })),
    }));

    if (this.system.turnDebug) this.system.turnDebug.reconResult = this.system.reconResult;
  }

  _turnSummary(log, win, resolvedTurnNumber = this.turnNumber) {
    return {
      turnNumber: resolvedTurnNumber,
      log: log
        .filter(entry => !entry.incidentEvent?.publicHidden)
        .map(entry => entry.toJSON()),
      incidentReport: this._publicIncidentReport(resolvedTurnNumber),
      privateIncidentReports: this._privateIncidentReports(resolvedTurnNumber),
      system: this.system.toPublicJSON(),
      win,
      reconResult: this.system.reconResult,
      serverLogResults: [...(this.system.serverLogResults || [])],
    };
  }

  _deckForCard(card) {
    if (!card) return null;
    if (card.type === 'task' || card.sourceDeck === 'task') return this.taskDeck;
    if (card.sourceDeck === 'hacker') return this.hackerDeck;
    if (card.sourceDeck === 'security') return this.secEngDeck;
    if (card.owner instanceof Hacker || card.owner?.returnType?.() === 'Hacker') return this.hackerDeck;
    return this.secEngDeck;
  }

  _discardCard(card) {
    const deck = this._deckForCard(card);
    if (deck) deck.discard(card);
  }

  _discardResolvedCards() {
    const discardIds = new Set();
    const discardOnce = (card) => {
      if (!card) return;
      const key = card.id || `${card.name}-${card.type}`;
      if (discardIds.has(key)) return;
      discardIds.add(key);
      this._discardCard(card);
    };

    for (const { card } of this.system.processedThisTurn || []) {
      if (this.system.defenceCards.includes(card)) continue;
      discardOnce(card);
    }
    for (const { card } of this.system.unprocessedThisTurn || []) discardOnce(card);
    for (const card of this.system.replacedDefencesThisTurn || []) discardOnce(card);
  }

  _publicIncidentReport(resolvedTurnNumber = this.turnNumber) {
    const events = [...(this.system.incidentEvents || [])].filter(event => !event.publicHidden);
    if (events.length > 0) return events;
    return [{
      id: `turn-${resolvedTurnNumber}-none`,
      turnNum: resolvedTurnNumber,
      type: 'system',
      title: 'No operations',
      message: 'No card effects resolved this cycle.',
      coinFlips: [],
      integrityBefore: this.system.integrityPoints,
      integrityAfter: this.system.integrityPoints,
      integrityDelta: 0,
    }];
  }

  _privateIncidentReports(resolvedTurnNumber = this.turnNumber) {
    const reports = {};
    for (const result of this.system.serverLogResults || []) {
      if (!result.ownerName) continue;
      reports[result.ownerName] = reports[result.ownerName] || [];
      reports[result.ownerName].push({
        id: `turn-${resolvedTurnNumber}-private-log-${reports[result.ownerName].length}`,
        turnNum: resolvedTurnNumber,
        type: 'private',
        title: 'Private server log result',
        message: result.checked
          ? `You checked ${result.targetName}. ${result.hostile ? 'They have played a hostile card this cycle, which means they are the Hacker.' : 'They have not played a hostile card this cycle.'}`
          : (result.insufficientEvidence ? 'Not enough Evidence was available to check the server log.' : 'No valid log target was available.'),
        ownerName: result.ownerName,
        targetName: result.targetName,
        hostile: result.hostile,
        coinFlips: [],
        integrityBefore: this.system.integrityPoints,
        integrityAfter: this.system.integrityPoints,
        integrityDelta: 0,
      });
    }
    return reports;
  }

  _printTurnDebug() {
    const debug = this.system.turnDebug;
    if (!debug) return;

    const line = '='.repeat(96);
    const subline = '-'.repeat(96);
    const fmtCard = (card) => {
      if (!card) return 'Unknown';
      const lane = card.laneLabel || card.lane || 'no lane';
      return `${card.name} (${card.type}, ${lane})`;
    };
    const fmtSubmission = (entry) => `${entry.name} [${entry.type}${entry.lane ? `/${entry.lane}` : ''}${entry.isHostile ? ', hostile' : ''}]`;
    const deltaParts = (deltas = {}) => {
      const parts = [];
      if (deltas.integrity) parts.push(`integrity ${deltas.integrity}`);
      if (deltas.evidence) parts.push(`evidence ${deltas.evidence > 0 ? '+' : ''}${deltas.evidence}`);
      if (deltas.tasksRemaining) parts.push(`tasks ${deltas.tasksRemaining}`);
      if (deltas.defences) parts.push(`defences ${deltas.defences > 0 ? '+' : ''}${deltas.defences}`);
      return parts.join(', ') || 'no board delta';
    };
    const eventText = (event) => {
      switch (event.kind) {
        case 'rapid-response-active':
          return 'Rapid Incident Response armed: next attack in resolved order will be nullified.';
        case 'attack-nullified-by-action':
          return `RIR nullified ${event.attackName} on ${event.laneLabel || event.lane}.`;
        case 'attack-blocked':
          return `BLOCKED by ${event.defenceName} on ${event.laneLabel || event.lane}; evidence +${event.evidenceGained || 0}.`;
        case 'processing-capacity-reduced':
          return `DDoS overload reduced processing capacity ${event.beforeLimit} -> ${event.afterLimit}.`;
        case 'integrity-loss':
          return `Integrity ${event.before} -> ${event.after}.`;
        case 'defence-installed':
          return `${event.defenceName} installed in slot ${event.slotIndex}${event.replacedName ? `, replacing ${event.replacedName}` : ''}.`;
        case 'sabotage-installed':
          return `${event.sabotageName || 'Insider Sabotage'} occupied defence slot ${event.slotIndex}${event.replacedName ? `, replacing ${event.replacedName}` : ''}. No Lane is protected by it.`;
        case 'task-completed': {
          const laneText = (event.laneLabels || [event.laneLabel || event.lane]).filter(Boolean).join(' + ') || 'matching lane';
          return `Task on ${laneText}: ${event.defended ? 'defended' : 'undefended'}, progress +${event.progress}.`;
        }
        case 'false-flag-frame':
          return event.framed ? `${event.ownerName || 'Unknown'} framed ${event.targetName} as hostile for server-log checks.` : `${event.ownerName || 'Unknown'} tried to plant a false flag, but no valid target was available.`;
        case 'server-log-check':
          if (event.insufficientEvidence) return `${event.ownerName} could not check logs: insufficient Evidence.`;
          return `${event.ownerName} checked ${event.targetName || 'nobody'}: ${event.checked ? (event.hostile ? 'hostile card found' : 'no hostile card') : 'not checked'}.`;
        case 'evidence-gained':
          return `Evidence +${event.amount}.`;
        case 'hacker-revealed-by-evidence':
          return `Evidence reached ${event.evidence}; Hacker revealed.`;
        case 'reconnaissance':
          return 'Recon queued a private hand report of other players for the Hacker.';
        default:
          return event.kind;
      }
    };

    console.log(`\n${line}`);
    console.log(`TURN ${debug.turnNum} DEBUG`);
    console.log(line);

    console.log('SUBMISSIONS');
    const submitted = Object.entries(debug.submittedCardsByPlayer || {});
    if (submitted.length === 0) console.log('  none');
    for (const [owner, cards] of submitted) {
      const role = this.getPlayer(owner)?.returnType?.() || 'unknown';
      console.log(`  ${owner} [${role}]: ${cards.length ? cards.map(fmtSubmission).join('; ') : 'PASS'}`);
    }

    console.log(subline);
    console.log('RESOLUTION ORDER');
    if (!debug.orderedQueue?.length) console.log('  none');
    for (const entry of debug.orderedQueue || []) {
      console.log(`  ${entry.sequence}. ${entry.owner || 'Unknown'} [${entry.ownerRole || 'unknown'}] -> ${fmtCard(entry)}`);
    }

    console.log(subline);
    console.log('RESOLUTION RESULTS');
    if (!debug.resolutionDetails?.length) console.log('  no cards resolved');
    for (const details of debug.resolutionDetails || []) {
      const card = details.card || {};
      console.log(`  ${details.sequence}. ${card.owner || 'Unknown'} -> ${fmtCard(card)} => ${details.outcome}; ${deltaParts(details.deltas)}`);
      for (const event of details.events || []) console.log(`     - ${eventText(event)}`);
    }

    if (debug.unprocessed?.length) {
      console.log('UNPROCESSED');
      for (const entry of debug.unprocessed) {
        console.log(`  ${entry.sequence}. ${entry.owner || 'Unknown'} -> ${fmtCard(entry)} => ${entry.outcome}`);
      }
      console.log(subline);
    }
    if (debug.reconResult?.players?.length) {
      console.log('PRIVATE RECON HAND SNAPSHOT (OTHER PLAYERS ONLY)');
      for (const player of debug.reconResult.players) {
        const cards = (player.cards || []).map(card => card.name).join(', ') || 'empty hand';
        console.log(`  ${player.name}: ${cards}`);
      }
    }
    if (debug.falseFlagResults?.length) {
      console.log('FALSE FLAG FRAMES');
      for (const result of debug.falseFlagResults) {
        console.log(`  ${result.ownerName || 'unknown'} -> ${result.targetName || 'none'}: ${result.framed ? 'framed as hostile' : 'no valid target'}`);
      }
    }
    if (debug.serverLogResults?.length) {
      console.log('PRIVATE SERVER LOGS');
      for (const result of debug.serverLogResults) {
        console.log(`  ${result.ownerName} -> ${result.targetName || 'none'}: ${result.checked ? (result.hostile ? 'HOSTILE' : 'clean') : (result.insufficientEvidence ? 'insufficient Evidence' : 'not checked')}`);
      }
    }
    if (debug.replacedDefences?.length) {
      console.log(`REPLACED DEFENCES: ${debug.replacedDefences.map(fmtCard).join('; ')}`);
    }

    const slots = (debug.defenceSlots || []).map(slot => slot.empty ? `[${slot.index}: empty]` : `[${slot.index}: ${slot.name}/${slot.isSabotage ? 'sabotage' : slot.lane}]`).join(' ');
    console.log(`FINAL: integrity=${debug.integrityPoints}, evidence=${debug.evidence}, tasks=${debug.tasksRemaining}/${debug.totalTasks}, progressThisTurn=${debug.projectProgressGainedThisTurn}, capacity=${debug.capacity}, ddos=${debug.ddosDisruptionActive}, hackerRevealed=${debug.hackerRevealed}`);
    console.log(`DEFENCES: ${slots}`);
    console.log(`${line}\n`);
  }

  _resolveVote() {
    const vote = this.currentVote;
    this.currentVote = null;
    this.voteProposal = null;

    const tally = {};
    for (const [voter, accused] of Object.entries(vote.votes)) {
      const voterPlayer = this.getPlayer(voter);
      if (voterPlayer instanceof Hacker) continue;
      tally[accused] = (tally[accused] || 0) + 1;
    }

    if (Object.keys(tally).length === 0) {
      this.phase = 'playing';
      return { ok: true, outcome: 'no-engineer-votes' };
    }

    const maxVotes = Math.max(...Object.values(tally));
    const topNames = Object.keys(tally).filter(name => tally[name] === maxVotes);
    if (topNames.length !== 1) {
      this.phase = 'playing';
      return { ok: true, outcome: 'tie', eliminated: null };
    }

    const eliminatedName = topNames[0];
    const eliminatedPlayer = this.getPlayer(eliminatedName);
    if (!eliminatedPlayer) {
      this.phase = 'playing';
      return { ok: false, error: 'Vote target was not found' };
    }

    this.players = this.players.filter(player => player.name !== eliminatedName);
    this.eliminated.push(eliminatedPlayer);

    if (eliminatedPlayer instanceof Hacker) {
      this.system.setHackerArrested();
      const win = this._endGame('engineers', 'Hacker voted out');
      return { ok: true, outcome: 'hacker-caught', eliminated: eliminatedName, win };
    }

    this.votingExpired = true;
    this.phase = 'playing';
    return { ok: true, outcome: 'wrong-player', eliminated: eliminatedName, votingExpired: true };
  }
}

module.exports = Game;
