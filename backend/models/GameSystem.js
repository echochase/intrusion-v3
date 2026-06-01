const { LogEntry } = require('./game_logs');
const { Lane, CoreDefenceByLane, laneLabel } = require('./defines');

const CORE_LANE_ORDER = [Lane.CREDENTIALS, Lane.SOCIAL, Lane.WEB, Lane.NETWORK, Lane.PHYSICAL];
const EVIDENCE_REVEAL_THRESHOLD = 5;

function displayCardName(card) {
  return card?.name || 'Unknown Operation';
}

function delta(after, before) {
  return (Number(after) || 0) - (Number(before) || 0);
}

class GameSystem {
  constructor(numPlayers) {
    this.integrityPoints = 4;
    this.numTasks = numPlayers === 5 ? 15 : 12;
    this.totalTasks = this.numTasks;
    this.numPlayers = numPlayers;
    this.maxProcesses = numPlayers + 1;
    this.currentMaxProcesses = this.maxProcesses;

    this.processes = [];
    this.newProcesses = [];
    this.defenceCards = [null, null, null];
    this.maxDefenceSlots = 3;
    this.replacedDefencesThisTurn = [];

    this.rapidIncidentResponses = 0;
    this.evidence = 0;
    this.ddosDisruptionActive = false;
    this.processCapacityReduction = 0;
    this.projectProgressGainedThisTurn = 0;
    this.taskProgressCancelled = false;
    this.hackerArrested = false;
    this.hackerRevealed = false;

    this.turnLog = [];
    this.incidentEvents = [];
    this.processedThisTurn = [];
    this.unprocessedThisTurn = [];
    this.completedTaskOwners = [];
    this.currentCard = null;
    this.currentCardEvents = [];
    this.serverLogResults = [];
    this.reconResult = null;
    this.submissionSnapshot = {};
    this.falseFlagFrames = [];
    this.turnDebug = null;
  }

  consumeProcesses(turnNum = 0, submissionSnapshot = {}) {
    this.turnLog = [];
    this.incidentEvents = [];
    this.processedThisTurn = [];
    this.unprocessedThisTurn = [];
    this.completedTaskOwners = [];
    this.currentCard = null;
    this.currentCardEvents = [];
    this.serverLogResults = [];
    this.reconResult = null;
    this.submissionSnapshot = submissionSnapshot || {};
    this.falseFlagFrames = [];
    this.replacedDefencesThisTurn = [];
    this.rapidIncidentResponses = 0;
    this.ddosDisruptionActive = false;
    this.processCapacityReduction = 0;
    this.projectProgressGainedThisTurn = 0;
    this.taskProgressCancelled = false;

    const ddosPriorityActive = Boolean(this.ddosDisruptionActive) || this.newProcesses.some(card => card?.name === 'DDoS Attack');

    this.processes = [...this.newProcesses];
    this.newProcesses = [];

    const orderedQueue = this._orderedQueue(this.processes, { ddosPriorityActive });
    this.processes = orderedQueue;

    let activeProcessLimit = this.maxProcesses;
    this.currentMaxProcesses = activeProcessLimit;
    const resolutionDetails = [];
    let processedCount = 0;

    for (let index = 0; index < this.processes.length && index < activeProcessLimit; index += 1) {
      const card = this.processes[index];
      const beforeIntegrity = this.integrityPoints;
      const beforeDefenceCount = this.defenceCards.filter(Boolean).length;
      const beforeEvidence = this.evidence;
      const beforeTasks = this.numTasks;
      const beforeRapidResponses = this.rapidIncidentResponses;
      const beforeDefenceSlots = this._debugDefenceSlots();
      const beforeLanes = this.laneStates();

      this.currentCard = card;
      this.currentCardEvents = [];
      card.onProcess(this);
      const cardEvents = [...this.currentCardEvents];
      this.currentCard = null;
      this.currentCardEvents = [];

      const afterDefenceCount = this.defenceCards.filter(Boolean).length;
      const event = this._makeIncidentEvent({
        turnNum,
        card,
        beforeIntegrity,
        afterIntegrity: this.integrityPoints,
        beforeDefenceCount,
        afterDefenceCount,
        beforeEvidence,
        afterEvidence: this.evidence,
        beforeTasks,
        afterTasks: this.numTasks,
        cardEvents,
      });
      this.incidentEvents.push(event);
      this._log(turnNum, card, 'resolved', event);

      const outcome = event?.outcome || 'resolved';
      this.processedThisTurn.push({ card, outcome });
      resolutionDetails.push({
        sequence: index + 1,
        card: this._debugCard(card),
        outcome,
        title: event?.title || null,
        message: event?.message || null,
        eventKinds: cardEvents.map(item => item.kind),
        events: cardEvents.map(item => this._debugEvent(item)),
        stateBefore: {
          integrity: beforeIntegrity,
          evidence: beforeEvidence,
          tasksRemaining: beforeTasks,
          defenceCount: beforeDefenceCount,
          rapidIncidentResponses: beforeRapidResponses,
          defenceSlots: beforeDefenceSlots,
          lanes: beforeLanes,
        },
        stateAfter: {
          integrity: this.integrityPoints,
          evidence: this.evidence,
          tasksRemaining: this.numTasks,
          defenceCount: afterDefenceCount,
          rapidIncidentResponses: this.rapidIncidentResponses,
          defenceSlots: this._debugDefenceSlots(),
          lanes: this.laneStates(),
        },
        deltas: {
          integrity: delta(this.integrityPoints, beforeIntegrity),
          evidence: delta(this.evidence, beforeEvidence),
          tasksRemaining: delta(this.numTasks, beforeTasks),
          defences: delta(afterDefenceCount, beforeDefenceCount),
          rapidIncidentResponses: delta(this.rapidIncidentResponses, beforeRapidResponses),
        },
      });

      processedCount = index + 1;
      const reducedCapacityEvent = cardEvents.find(event => event.kind === 'processing-capacity-reduced');
      if (reducedCapacityEvent) {
        activeProcessLimit = Math.min(activeProcessLimit, reducedCapacityEvent.afterLimit);
        this.currentMaxProcesses = activeProcessLimit;
      }
    }

    this.unprocessedThisTurn = orderedQueue.slice(processedCount).map(card => ({
      card,
      outcome: this.ddosDisruptionActive ? 'deferred-by-ddos' : 'deferred-by-capacity',
    }));

    for (const { card, outcome } of this.unprocessedThisTurn) {
      const event = this._makeUnprocessedEvent({ turnNum, card, outcome });
      this.incidentEvents.push(event);
      this._logUnprocessed(turnNum, card, outcome, event);
    }

    if (this.processedThisTurn.length === 0) {
      this.incidentEvents.push({
        id: `turn-${turnNum}-idle`,
        turnNum,
        type: 'system',
        title: 'No operations submitted',
        message: 'Everyone passed. No card effects resolved this cycle.',
        cardName: null,
        cardType: 'system',
        outcome: 'idle',
        ownerName: null,
        coinFlips: [],
        integrityBefore: this.integrityPoints,
        integrityAfter: this.integrityPoints,
        integrityDelta: 0,
      });
    }

    this.turnDebug = {
      turnNum,
      submittedCardsByPlayer: this.submissionSnapshot,
      orderedQueue: orderedQueue.map((card, index) => ({ sequence: index + 1, ...this._debugCard(card) })),
      resolutionDetails,
      processed: this.processedThisTurn.map(({ card, outcome }, index) => ({ sequence: index + 1, ...this._debugCard(card), outcome })),
      unprocessed: this.unprocessedThisTurn.map(({ card, outcome }, index) => ({ sequence: processedCount + index + 1, ...this._debugCard(card), outcome })),
      capacity: this.currentMaxProcesses,
      defenceSlots: this._debugDefenceSlots(),
      lanes: this.laneStates(),
      integrityPoints: this.integrityPoints,
      tasksRemaining: this.numTasks,
      totalTasks: this.totalTasks,
      evidence: this.evidence,
      evidenceRevealThreshold: EVIDENCE_REVEAL_THRESHOLD,
      hackerRevealed: this.hackerRevealed,
      projectProgressGainedThisTurn: this.projectProgressGainedThisTurn,
      ddosDisruptionActive: this.ddosDisruptionActive,
      processCapacityReduction: this.processCapacityReduction,
      replacedDefences: (this.replacedDefencesThisTurn || []).map(card => this._debugCard(card)),
      serverLogResults: [...(this.serverLogResults || [])],
      falseFlagFrames: [...(this.falseFlagFrames || [])],
      reconResult: this.reconResult,
    };

    this.processes = [];
    this.rapidIncidentResponses = 0;
    return [...this.turnLog];
  }

  _orderedQueue(cards, { ddosPriorityActive = false } = {}) {
    const rapid = [];
    const ddosPriorityAttacks = [];
    const rest = [];

    for (const card of cards || []) {
      if (card?.name === 'Rapid Incident Response') {
        rapid.push(card);
      } else if (ddosPriorityActive && this._isHackerRedCard(card)) {
        ddosPriorityAttacks.push(card);
      } else {
        rest.push(card);
      }
    }

    return [
      ...this._shuffleQueueGroup(rapid),
      ...this._shuffleQueueGroup(ddosPriorityAttacks),
      ...this._shuffleQueueGroup(rest),
    ];
  }

  _isHackerRedCard(card) {
    const ownerRole = card?.owner?.returnType?.() || card?.owner?.role || null;
    return ownerRole === 'Hacker' && (card?.type === 'attack' || card?.isHostile === true);
  }

  _shuffleQueueGroup(cards) {
    const shuffled = [...(cards || [])];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  _safePublicCardName(card) {
    if (!card || card.type === 'attack' || card.isHostile) return 'A hidden operation';
    return displayCardName(card);
  }

  _makeUnprocessedEvent({ turnNum, card, outcome }) {
    const publicName = this._safePublicCardName(card);
    const isDdos = outcome === 'deferred-by-ddos';
    const message = isDdos
      ? `${publicName} attempted to process, but the process was stuck due to the ongoing DDoS attack.`
      : `${publicName} attempted to process, but the system had no processing capacity left.`;

    return {
      id: `turn-${turnNum}-stuck-${this.incidentEvents.length}`,
      turnNum,
      type: 'system',
      title: 'Process stuck',
      message,
      cardName: card && publicName !== 'A hidden operation' ? displayCardName(card) : null,
      cardType: card && publicName !== 'A hidden operation' ? card.type : 'system',
      outcome,
      publicHidden: false,
      ownerName: null,
      lane: card?.lane || null,
      lanes: Array.isArray(card?.requiredLanes) ? [...card.requiredLanes] : (Array.isArray(card?.lanes) ? [...card.lanes] : []),
      requiredLanes: Array.isArray(card?.requiredLanes) ? [...card.requiredLanes] : (Array.isArray(card?.lanes) ? [...card.lanes] : []),
      laneLabel: card?.lane ? laneLabel(card.lane) : null,
      laneLabels: Array.isArray(card?.requiredLanes) ? card.requiredLanes.map(lane => laneLabel(lane)) : [],
      progressPoints: card?.progressPoints || null,
      integrityBefore: this.integrityPoints,
      integrityAfter: this.integrityPoints,
      integrityDelta: 0,
      tasksBefore: this.numTasks,
      tasksAfter: this.numTasks,
      taskProgressDelta: 0,
      evidenceBefore: this.evidence,
      evidenceAfter: this.evidence,
      evidenceDelta: 0,
      defenceCountBefore: this.defenceCards.filter(Boolean).length,
      defenceCountAfter: this.defenceCards.filter(Boolean).length,
      coinFlips: [],
      cardEvents: [{ kind: outcome, cardName: publicName }],
      card: card && publicName !== 'A hidden operation' ? this._safeCardSummary(card) : null,
    };
  }

  _randomTie() { return Math.random() < 0.5 ? -1 : 1; }

  addProcess(card) { this.newProcesses.push(card); }

  isLaneDefended(lane) {
    return this.defenceCards.some(card => card?.lane === lane);
  }

  defenceForLane(lane) {
    return this.defenceCards.find(card => card?.lane === lane) || null;
  }

  _enqueueDefenceCard(card) {
    const next = this.defenceCards.filter(Boolean);
    next.push(card);

    let replaced = null;
    if (next.length > this.maxDefenceSlots) {
      replaced = next.shift() || null;
    }

    while (next.length < this.maxDefenceSlots) next.push(null);
    this.defenceCards = next.slice(0, this.maxDefenceSlots);

    if (replaced) this.replacedDefencesThisTurn.push(replaced);
    return {
      replaced,
      slotIndex: this.defenceCards.findIndex(defence => defence?.id === card.id),
    };
  }

  installDefenceCard(card) {
    if (!card?.lane || card.lane === Lane.SPECIAL) return null;

    const { replaced, slotIndex } = this._enqueueDefenceCard(card);
    this.currentCardEvents.push({
      kind: 'defence-installed',
      lane: card.lane,
      defenceName: card.name,
      replacedName: replaced?.name || null,
      ownerName: card.owner?.name || null,
      slotIndex,
      queuePosition: slotIndex,
    });
    return replaced;
  }

  installSabotageCard(card) {
    const { replaced, slotIndex } = this._enqueueDefenceCard(card);
    this.currentCardEvents.push({
      kind: 'sabotage-installed',
      sabotageName: card.name,
      replacedName: replaced?.name || null,
      ownerName: card.owner?.name || null,
      slotIndex,
      queuePosition: slotIndex,
    });
    return replaced;
  }


  resolveLaneAttack(card) {
    if (this.rapidIncidentResponses > 0) {
      this.rapidIncidentResponses -= 1;
      this.currentCardEvents.push({
        kind: 'attack-nullified-by-action',
        actionName: 'Rapid Incident Response',
        attackName: displayCardName(card),
        lane: card.lane,
      });
      return;
    }

    const defence = this.defenceForLane(card.lane);
    if (defence) {
      this.evidence += 1;
      this._checkEvidenceThreshold();
      this.currentCardEvents.push({
        kind: 'attack-blocked',
        attackName: displayCardName(card),
        defenceName: displayCardName(defence),
        defenceCard: this._safeCardSummary(defence),
        lane: card.lane,
        evidenceGained: 1,
      });
      return;
    }

    if (card.name === 'DDoS Attack') {
      this.ddosDisruptionActive = true;
      this.processCapacityReduction = Math.max(this.processCapacityReduction, 2);
      const afterLimit = Math.max(0, this.maxProcesses - this.processCapacityReduction);
      this.currentCardEvents.push({
        kind: 'processing-capacity-reduced',
        lane: card.lane,
        beforeLimit: this.maxProcesses,
        afterLimit,
        reduction: this.processCapacityReduction,
      });
      return;
    }

    this.takeDamage(1);
  }

  resolveZeroDay(card) {
    this.takeDamage(1);
    this.currentCardEvents.push({ kind: 'zero-day', lane: Lane.SPECIAL });
  }

  resolveReconnaissance(card) {
    this.reconResult = {
      name: 'Reconnaissance report',
      ownerName: card.owner?.name || null,
      players: [],
    };
    this.currentCardEvents.push({ kind: 'reconnaissance' });
  }

  resolveFalseFlag(card) {
    const targetName = card.targetPlayerName || card.target || null;
    const ownerName = card.owner?.name || null;

    if (targetName) {
      this.falseFlagFrames.push({
        ownerName,
        targetName,
        cardName: displayCardName(card),
      });
    }

    this.currentCardEvents.push({
      kind: 'false-flag-planted',
      ownerName,
      targetName,
      framed: Boolean(targetName),
    });
  }

  resolveCheckServerLog(card) {
    const ownerName = card.owner?.name || null;

    if (this.evidence < 1) {
      const result = { ownerName, targetName: null, hostile: false, checked: false, insufficientEvidence: true };
      this.serverLogResults.push(result);
      this.currentCardEvents.push({ kind: 'server-log-check', ...result });
      return;
    }

    this.evidence = Math.max(0, this.evidence - 1);

    let targetName = card.targetPlayerName || null;
    const names = Object.keys(this.submissionSnapshot || {}).filter(name => name !== ownerName);

    if (!targetName || targetName === '__random__' || targetName === 'random') {
      targetName = names.length ? names[Math.floor(Math.random() * names.length)] : null;
    }

    const submitted = targetName ? (this.submissionSnapshot[targetName] || []) : [];
    const processedFrame = Boolean(targetName && (this.falseFlagFrames || []).some(frame => frame.targetName === targetName));
    const queuedFrame = Boolean(targetName && (this.processes || []).some(process =>
      process?.name === 'False Flag' && (process.targetPlayerName || process.target || null) === targetName));
    const framed = processedFrame || queuedFrame;
    const hostile = submitted.some(entry => entry.isHostile || entry.type === 'attack') || framed;
    const result = { ownerName, targetName, hostile, checked: Boolean(targetName), insufficientEvidence: false, framed };
    this.serverLogResults.push(result);
    this.currentCardEvents.push({ kind: 'server-log-check', ...result });
  }

  activateRapidIncidentResponse(card) {
    this.rapidIncidentResponses += 1;
    this.currentCardEvents.push({ kind: 'rapid-response-active' });
  }

  gainEvidence(amount = 1, card = this.currentCard) {
    const gained = Math.max(0, Number(amount) || 0);
    this.evidence += gained;
    this._checkEvidenceThreshold();
    this.currentCardEvents.push({ kind: 'evidence-gained', amount: gained, sourceName: card?.name || null });
  }

  takeDamage(damage) {
    const amount = Math.max(0, Number(damage) || 0);
    if (amount <= 0) return;
    const before = this.integrityPoints;
    this.integrityPoints = Math.max(0, this.integrityPoints - amount);
    this.currentCardEvents.push({ kind: 'integrity-loss', amount, before, after: this.integrityPoints });
  }

  completeTask(card = this.currentCard) {
    if (this.numTasks <= 0) return;

    const requiredLanes = Array.isArray(card?.requiredLanes) && card.requiredLanes.length
      ? card.requiredLanes
      : (Array.isArray(card?.lanes) && card.lanes.length ? card.lanes : [card?.lane].filter(Boolean));
    const defendedLanes = requiredLanes.filter(lane => this.isLaneDefended(lane));
    const allDefended = requiredLanes.length > 0 && defendedLanes.length === requiredLanes.length;
    const baseProgress = Math.max(1, Number(card?.progressPoints) || 1);
    let progress = allDefended ? baseProgress : 0;


    const before = this.numTasks;
    this.numTasks = Math.max(0, this.numTasks - progress);
    this.projectProgressGainedThisTurn += progress;

    const ownerName = card?.owner?.name;
    if (ownerName && progress > 0 && !this.completedTaskOwners.includes(ownerName)) {
      this.completedTaskOwners.push(ownerName);
    }

    this.currentCardEvents.push({
      kind: 'task-completed',
      lane: requiredLanes[0] || card?.lane || null,
      lanes: requiredLanes,
      laneLabels: requiredLanes.map(lane => laneLabel(lane)),
      defended: allDefended,
      defendedLanes,
      missingLanes: requiredLanes.filter(lane => !this.isLaneDefended(lane)),
      progress,
      progressRequired: baseProgress,
      progressThisTurn: this.projectProgressGainedThisTurn,
      before,
      after: this.numTasks,
    });
  }


  _checkEvidenceThreshold() {
    if (!this.hackerRevealed && this.evidence >= EVIDENCE_REVEAL_THRESHOLD) {
      this.hackerRevealed = true;
      this.currentCardEvents.push({ kind: 'hacker-revealed-by-evidence', evidence: this.evidence });
    }
  }

  setHackerArrested() { this.hackerArrested = true; }
  checkLoss() { return this.integrityPoints <= 0; }
  checkWin() { return (this.numTasks <= 0 || this.hackerArrested) && !this.checkLoss(); }

  laneStates() {
    return CORE_LANE_ORDER.map((lane) => {
      const defence = this.defenceForLane(lane);
      return {
        lane,
        label: laneLabel(lane),
        status: defence ? 'defended' : 'open',
        ddosActive: lane === Lane.NETWORK && !defence && this.ddosDisruptionActive,
        defence: defence ? this._safeCardSummary(defence) : null,
        expectedDefence: CoreDefenceByLane[lane],
      };
    });
  }

  toPublicJSON() {
    return {
      integrityPoints: this.integrityPoints,
      numTasksRemaining: this.numTasks,
      numTasksRequired: this.totalTasks,
      numTasksCompleted: Math.max(0, this.totalTasks - this.numTasks),
      projectProgressGainedThisTurn: this.projectProgressGainedThisTurn,
      maxProcesses: this.maxProcesses,
      maxComputingCapacity: this.maxProcesses,
      computingCapacity: this.currentMaxProcesses,
      ddosDisruptionActive: this.ddosDisruptionActive,
      processCapacityReduction: this.processCapacityReduction,
      defenceCount: this.defenceCards.filter(Boolean).length,
      defenceSlots: this._defenceSlots(),
      lanes: this.laneStates(),
      evidence: this.evidence,
      evidenceRevealThreshold: EVIDENCE_REVEAL_THRESHOLD,
      hackerRevealed: this.hackerRevealed,
    };
  }


  _defenceSlots() {
    return this.defenceCards.map((card, index) => (card
      ? { state: 'revealed', index, card: card.toJSON() }
      : { state: 'empty', index, card: null }));
  }

  _log(turnNum, card, outcome, incidentEvent = null) {
    this.turnLog.push(new LogEntry({
      turnNum,
      type: card.type,
      name: card.name,
      description: outcome,
      isHidden: card.type === 'attack' || card.isHostile,
      publicMessage: incidentEvent?.message || `${card.name} resolved.`,
      incidentEvent,
    }));
  }

  _logUnprocessed(turnNum, card, outcome, incidentEvent = null) {
    const hidden = card?.type === 'attack' || card?.isHostile;
    this.turnLog.push(new LogEntry({
      turnNum,
      type: hidden ? 'system' : (card?.type || 'system'),
      name: hidden ? 'Hidden operation' : displayCardName(card),
      description: outcome,
      isHidden: false,
      publicMessage: incidentEvent?.message || `${this._safePublicCardName(card)} failed to process.`,
      incidentEvent,
    }));
  }

  _makeIncidentEvent({
    turnNum,
    card,
    beforeIntegrity,
    afterIntegrity,
    beforeDefenceCount,
    afterDefenceCount,
    beforeEvidence,
    afterEvidence,
    beforeTasks,
    afterTasks,
    cardEvents = [],
  }) {
    const ownerName = card.owner?.name || null;
    const blocked = cardEvents.find(event => event.kind === 'attack-blocked');
    const nullified = cardEvents.find(event => event.kind === 'attack-nullified-by-action');
    const task = cardEvents.find(event => event.kind === 'task-completed');
    const installed = cardEvents.find(event => event.kind === 'defence-installed');
    const sabotage = cardEvents.find(event => event.kind === 'sabotage-installed');
    const capacityReduced = cardEvents.find(event => event.kind === 'processing-capacity-reduced');
    const logCheck = cardEvents.find(event => event.kind === 'server-log-check');
    const hackerRevealed = cardEvents.find(event => event.kind === 'hacker-revealed-by-evidence');
    const evidenceGained = afterEvidence - beforeEvidence;

    let title = `${displayCardName(card)} resolved`;
    let message = `${displayCardName(card)} resolved.`;
    let outcome = 'resolved';
    let revealOwner = !(card.type === 'attack' || card.type === 'task' || card.isHostile);

    if (nullified) {
      title = 'Attack contained';
      message = `${nullified.attackName} was contained by Rapid Incident Response before it could affect the ${laneLabel(nullified.lane)} Lane.`;
      outcome = 'nullified';
    } else if (blocked) {
      title = 'Attack blocked';
      message = `${blocked.attackName} targeted the ${laneLabel(blocked.lane)} Lane, but ${blocked.defenceName} blocked it. The team gained 1 Evidence.${hackerRevealed ? ' Evidence reached 5, so the Hacker is now publicly exposed.' : ''}`;
      outcome = 'blocked';
    } else if (card.type === 'attack') {
      title = 'Attack succeeded';
      if (card.name === 'DDoS Attack' && capacityReduced) {
        message = `DDoS Attack hit the open Network Lane and overloaded the cycle. Processing capacity dropped from ${capacityReduced.beforeLimit} to ${capacityReduced.afterLimit} cards this turn.`;
      } else if (card.name === 'Zero-Day Attack') {
        message = `Zero-Day Attack exploited an unknown flaw and removed 1 integrity. It could not be blocked.`;
      } else {
        message = `${displayCardName(card)} hit the open ${laneLabel(card.lane)} Lane and removed 1 integrity.`;
      }
      outcome = 'breach';
    } else if (sabotage) {
      title = 'Defence slot sabotaged';
      message = `A defence slot was occupied by Insider Sabotage. It does not protect any Lane.${sabotage.replacedName ? ` ${sabotage.replacedName} was replaced.` : ''}`;
      outcome = 'sabotage-installed';
      revealOwner = false;
    } else if (installed) {
      title = 'Defence installed';
      message = `${installed.defenceName} was installed. The ${laneLabel(installed.lane)} Lane is now defended.${installed.replacedName ? ` ${installed.replacedName} was replaced.` : ''}`;
      outcome = 'defence-installed';
      revealOwner = false;
    } else if (task) {
      title = 'Task completed';
      const laneText = (task.laneLabels || [laneLabel(task.lane)]).join(' + ');
      if (task.progress > 0) {
        message = `Someone completed ${displayCardName(card)} with protected ${laneText} Lane${(task.laneLabels || []).length === 1 ? '' : 's'}: +${task.progress} Project Progress.`;
      } else if (!task.defended) {
        message = `Someone attempted to complete ${displayCardName(card)}, but the required Lane${(task.laneLabels || []).length === 1 ? '' : 's'} (${laneText}) were not fully protected.`;
      } else {
        message = `Someone attempted to complete ${displayCardName(card)}, but it did not advance the project.`;
      }
      outcome = 'task';
    } else if (logCheck) {
      title = 'Private investigation';
      message = 'A private investigation resolved.';
      outcome = 'investigation';
      revealOwner = false;
    } else if (card.name === 'Rapid Incident Response') {
      title = 'Rapid response ready';
      message = 'Someone prepared Rapid Incident Response. It will block one attack this turn only.';
      outcome = 'response-ready';
      revealOwner = false;
    } else if (card.name === 'Forensic Analysis' || card.name === 'Threat Mitigation Protocol') {
      title = 'Evidence gained';
      message = `Someone completed Forensic Analysis. The team gained ${Math.max(0, evidenceGained) || 1} Evidence.${hackerRevealed ? ' Evidence reached 5, so the Hacker is now publicly exposed.' : ''}`;
      outcome = 'evidence';
      revealOwner = false;
    } else if (card.name === 'False Flag') {
      const planted = cardEvents.find(event => event.kind === 'false-flag-planted');
      title = 'False trail planted';
      message = planted?.targetName
        ? 'Forged evidence was planted in the logs. A future investigation this cycle may read one player’s action as hostile.'
        : 'False Flag resolved, but no target was selected.';
      outcome = 'false-flag';
      revealOwner = false;
    } else if (card.name === 'Reconnaissance') {
      title = 'Reconnaissance complete';
      message = 'A private reconnaissance report will be shown to the Hacker.';
      outcome = 'reconnaissance';
      revealOwner = false;
    }

    return {
      id: `turn-${turnNum}-${this.incidentEvents.length}`,
      turnNum,
      type: card.type,
      title,
      message,
      cardName: displayCardName(card),
      cardType: card.type,
      outcome,
      publicHidden: outcome === 'investigation' || outcome === 'false-flag',
      ownerName: revealOwner ? ownerName : null,
      lane: card.lane || null,
      lanes: Array.isArray(card.requiredLanes) ? [...card.requiredLanes] : (Array.isArray(card.lanes) ? [...card.lanes] : []),
      requiredLanes: Array.isArray(card.requiredLanes) ? [...card.requiredLanes] : (Array.isArray(card.lanes) ? [...card.lanes] : []),
      laneLabel: card.lane ? laneLabel(card.lane) : null,
      laneLabels: Array.isArray(card.requiredLanes) ? card.requiredLanes.map(lane => laneLabel(lane)) : [],
      progressPoints: card.progressPoints || null,
      integrityBefore: beforeIntegrity,
      integrityAfter: afterIntegrity,
      integrityDelta: Math.max(0, beforeIntegrity - afterIntegrity),
      tasksBefore: beforeTasks,
      tasksAfter: afterTasks,
      taskProgressDelta: Math.max(0, beforeTasks - afterTasks),
      evidenceBefore: beforeEvidence,
      evidenceAfter: afterEvidence,
      evidenceDelta: evidenceGained,
      defenceCountBefore: beforeDefenceCount,
      defenceCountAfter: afterDefenceCount,
      coinFlips: [],
      cardEvents,
      card: this._safeCardSummary(card),
    };
  }

  _safeCardSummary(card) {
    if (!card) return null;
    return {
      id: card.id,
      name: card.name,
      type: card.type,
      lane: card.lane || null,
      lanes: Array.isArray(card.requiredLanes) ? [...card.requiredLanes] : (Array.isArray(card.lanes) ? [...card.lanes] : []),
      requiredLanes: Array.isArray(card.requiredLanes) ? [...card.requiredLanes] : (Array.isArray(card.lanes) ? [...card.lanes] : []),
      laneLabel: card.lane ? laneLabel(card.lane) : null,
      laneLabels: Array.isArray(card.requiredLanes) ? card.requiredLanes.map(lane => laneLabel(lane)) : [],
      progressPoints: card.progressPoints || null,
      category: card.category || null,
      description: card.description,
      effectDescription: card.effectDescription,
    };
  }

  _debugEvent(event) {
    if (!event || typeof event !== 'object') return event;
    const copy = { ...event };
    if (copy.defenceCard) copy.defenceCard = this._safeCardSummary(copy.defenceCard);
    if (copy.lane && !copy.laneLabel) copy.laneLabel = laneLabel(copy.lane);
    return copy;
  }

  _debugCard(card) {
    if (!card) return null;
    return {
      id: card.id,
      name: card.name,
      type: card.type,
      lane: card.lane || null,
      lanes: Array.isArray(card.requiredLanes) ? [...card.requiredLanes] : (Array.isArray(card.lanes) ? [...card.lanes] : []),
      requiredLanes: Array.isArray(card.requiredLanes) ? [...card.requiredLanes] : (Array.isArray(card.lanes) ? [...card.lanes] : []),
      laneLabel: card.lane ? laneLabel(card.lane) : null,
      laneLabels: Array.isArray(card.requiredLanes) ? card.requiredLanes.map(lane => laneLabel(lane)) : [],
      progressPoints: card.progressPoints || null,
      category: card.category || null,
      owner: card.owner?.name || null,
      ownerRole: card.owner?.returnType?.() || 'unknown',
      hostile: Boolean(card.isHostile),
      hackerOnly: Boolean(card.hackerOnly),
      sourceDeck: card.sourceDeck || null,
    };
  }

  _debugDefenceSlots() {
    return this.defenceCards.map((card, index) => card ? ({
      index,
      name: card.name,
      type: card.type,
      lane: card.lane,
      owner: card.owner?.name || null,
    }) : ({ index, empty: true }));
  }
}

module.exports = GameSystem;
