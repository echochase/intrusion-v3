const { LogEntry } = require('./game_logs');
const { Lane, LaneLabels, CoreDefenceByLane, laneLabel } = require('./defines');

const CORE_LANE_ORDER = [Lane.CREDENTIALS, Lane.SOCIAL, Lane.WEB, Lane.NETWORK, Lane.PHYSICAL];

function displayCardName(card) {
  return card?.name || 'Unknown Operation';
}

class GameSystem {
  constructor(numPlayers) {
    this.integrityPoints = 4;
    this.numTasks = numPlayers === 5 ? 10 : 8;
    this.totalTasks = this.numTasks;

    this.maxProcesses = numPlayers;
    this.currentMaxProcesses = numPlayers;

    this.processes = [];
    this.newProcesses = [];
    this.pendingZone = [];
    this.defenceCards = [];
    this.replacedDefencesThisTurn = [];

    this.rapidIncidentResponses = 0;
    this.evidence = 0;
    this.taskProgressCancelled = false;
    this.taskProgressPenalty = 0;
    this.projectProgressGainedThisTurn = 0;
    this.hackerArrested = false;

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
    this.replacedDefencesThisTurn = [];
    this.rapidIncidentResponses = 0;
    this.taskProgressCancelled = false;
    this.taskProgressPenalty = 0;
    this.projectProgressGainedThisTurn = 0;

    this.processes = [...this.newProcesses];
    this.newProcesses = [];

    const orderedQueue = this._orderedQueue(this.processes);
    this.processes = orderedQueue;
    this.currentMaxProcesses = orderedQueue.length;

    for (const card of this.processes) {
      const beforeIntegrity = this.integrityPoints;
      const beforeDefenceCount = this.defenceCards.length;
      const beforeEvidence = this.evidence;
      const beforeTasks = this.numTasks;

      this.currentCard = card;
      this.currentCardEvents = [];
      card.onProcess(this);
      const cardEvents = [...this.currentCardEvents];
      this.currentCard = null;
      this.currentCardEvents = [];

      const event = this._makeIncidentEvent({
        turnNum,
        card,
        beforeIntegrity,
        afterIntegrity: this.integrityPoints,
        beforeDefenceCount,
        afterDefenceCount: this.defenceCards.length,
        beforeEvidence,
        afterEvidence: this.evidence,
        beforeTasks,
        afterTasks: this.numTasks,
        cardEvents,
      });
      this.incidentEvents.push(event);
      this._log(turnNum, card, 'resolved', event);
      this.processedThisTurn.push({ card, outcome: 'resolved' });
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
      orderedQueue: orderedQueue.map(card => this._debugCard(card)),
      processed: this.processedThisTurn.map(({ card, outcome }) => ({ ...this._debugCard(card), outcome })),
      unprocessed: [],
      capacity: this.currentMaxProcesses,
      defenceSlots: this._debugDefenceSlots(),
      lanes: this.laneStates(),
      integrityPoints: this.integrityPoints,
      evidence: this.evidence,
      projectProgressGainedThisTurn: this.projectProgressGainedThisTurn,
    };

    this.processes = [];
    this.rapidIncidentResponses = 0;
    return [...this.turnLog];
  }

  _orderedQueue(cards) {
    const rank = (card) => {
      if (card.name === 'Rapid Incident Response') return 0;
      if (card.type === 'attack') return 1;
      if (card.name === 'Insider Sabotage') return 1;
      if (card.type === 'defence') return 2;
      if (card.name === 'Check Server Log') return 3;
      if (card.type === 'task') return 4;
      return 5;
    };

    return [...cards].sort((a, b) => rank(a) - rank(b) || this._randomTie());
  }

  _randomTie() { return Math.random() < 0.5 ? -1 : 1; }

  addProcess(card) { this.newProcesses.push(card); }

  isLaneDefended(lane) {
    return this.defenceCards.some(card => card.lane === lane);
  }

  defenceForLane(lane) {
    return this.defenceCards.find(card => card.lane === lane) || null;
  }

  installDefenceCard(card) {
    if (!card?.lane || card.lane === Lane.SPECIAL) return null;

    let replaced = null;
    const existingSameLane = this.defenceCards.findIndex(defence => defence.lane === card.lane);
    if (existingSameLane !== -1) {
      [replaced] = this.defenceCards.splice(existingSameLane, 1, card);
    } else {
      if (this.defenceCards.length >= 3) {
        replaced = this.defenceCards.shift();
      }
      this.defenceCards.push(card);
    }

    if (replaced) this.replacedDefencesThisTurn.push(replaced);
    this.currentCardEvents.push({
      kind: 'defence-installed',
      lane: card.lane,
      defenceName: card.name,
      replacedName: replaced?.name || null,
      ownerName: card.owner?.name || null,
    });
    return replaced;
  }

  removeOldestDefence() {
    if (this.defenceCards.length === 0) return null;
    const removed = this.defenceCards.shift();
    this.replacedDefencesThisTurn.push(removed);
    return removed;
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
      this.taskProgressCancelled = true;
      this.currentCardEvents.push({ kind: 'task-progress-cancelled', lane: card.lane });
      return;
    }

    this.takeDamage(1);
  }

  resolveZeroDay(card) {
    this.takeDamage(1);
    this.currentCardEvents.push({ kind: 'zero-day', lane: Lane.SPECIAL });
  }

  resolveInsiderSabotage(card) {
    const removed = this.removeOldestDefence();
    if (removed) {
      this.currentCardEvents.push({
        kind: 'defence-sabotaged',
        removedName: removed.name,
        lane: removed.lane,
      });
      return;
    }

    this.taskProgressPenalty += 1;
    this.currentCardEvents.push({ kind: 'task-progress-penalty', amount: 1 });
  }

  resolveReconnaissance(card) {
    const lanes = this.laneStates();
    this.reconResult = { name: 'Lane posture reviewed', lanes };
    this.currentCardEvents.push({ kind: 'reconnaissance', lanes });
  }

  resolveCheckServerLog(card) {
    const ownerName = card.owner?.name || null;
    let targetName = card.targetPlayerName || null;
    const names = Object.keys(this.submissionSnapshot || {}).filter(name => name !== ownerName);
    if (!targetName || !this.submissionSnapshot[targetName]) {
      targetName = names[0] || null;
    }

    const submitted = targetName ? (this.submissionSnapshot[targetName] || []) : [];
    const hostile = submitted.some(entry => entry.isHostile || entry.type === 'attack');
    const result = { ownerName, targetName, hostile, checked: Boolean(targetName) };
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

    const lane = card?.lane;
    const defended = this.isLaneDefended(lane);
    let progress = defended ? 2 : 1;

    if (this.taskProgressCancelled) progress = 0;
    if (progress > 0 && this.taskProgressPenalty > 0) {
      const absorbed = Math.min(progress, this.taskProgressPenalty);
      progress -= absorbed;
      this.taskProgressPenalty -= absorbed;
    }

    const before = this.numTasks;
    this.numTasks = Math.max(0, this.numTasks - progress);
    this.projectProgressGainedThisTurn += progress;

    const ownerName = card?.owner?.name;
    if (ownerName && progress > 0 && !this.completedTaskOwners.includes(ownerName)) {
      this.completedTaskOwners.push(ownerName);
    }

    this.currentCardEvents.push({
      kind: 'task-completed',
      lane,
      defended,
      progress,
      before,
      after: this.numTasks,
    });
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
      maxProcesses: this.maxProcesses,
      maxComputingCapacity: this.maxProcesses,
      computingCapacity: this.currentMaxProcesses,
      defenceCount: this.defenceCards.length,
      defenceSlots: this._defenceSlots(),
      lanes: this.laneStates(),
      evidence: this.evidence,
      pendingZoneSize: 0,
      pendingZoneCounts: { condition: 0, oneTurn: 0, twoTurn: 0 },
      completedTaskOwners: [...this.completedTaskOwners],
    };
  }

  toDebugJSON() {
    return {
      ...this.toPublicJSON(),
      defenceCards: this.defenceCards.map(card => card.toJSON()),
      processes: this.processes.map(card => card.toJSON()),
    };
  }

  _defenceSlots() {
    const slots = [];
    for (let i = 0; i < 3; i++) {
      const card = this.defenceCards[i];
      slots.push(card
        ? { state: 'revealed', index: i, card: card.toJSON() }
        : { state: 'empty', index: i, card: null });
    }
    return slots;
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
    const sabotaged = cardEvents.find(event => event.kind === 'defence-sabotaged');
    const cancelled = cardEvents.find(event => event.kind === 'task-progress-cancelled');
    const logCheck = cardEvents.find(event => event.kind === 'server-log-check');
    const evidenceGained = afterEvidence - beforeEvidence;

    let title = `${displayCardName(card)} resolved`;
    let message = `${displayCardName(card)} resolved.`;
    let outcome = 'resolved';
    let revealOwner = !(card.type === 'attack' || card.isHostile);

    if (nullified) {
      title = 'Attack contained';
      message = `${nullified.attackName} was contained by Rapid Incident Response before it could affect the ${laneLabel(nullified.lane)} lane.`;
      outcome = 'nullified';
    } else if (blocked) {
      title = 'Attack blocked';
      message = `${blocked.attackName} targeted the ${laneLabel(blocked.lane)} lane, but ${blocked.defenceName} blocked it. The team gained 1 Evidence.`;
      outcome = 'blocked';
    } else if (card.type === 'attack') {
      title = 'Attack succeeded';
      if (card.name === 'DDoS Attack' && cancelled) {
        message = `DDoS Attack hit the open Network lane. Project progress from this turn is cancelled.`;
      } else if (card.name === 'Zero-Day Attack') {
        message = `Zero-Day Attack exploited an unknown flaw and removed 1 integrity. It could not be blocked.`;
      } else {
        message = `${displayCardName(card)} hit the open ${laneLabel(card.lane)} lane and removed 1 integrity.`;
      }
      outcome = 'breach';
    } else if (installed) {
      title = 'Defence installed';
      message = `${ownerName || 'A player'} installed ${installed.defenceName}. The ${laneLabel(installed.lane)} lane is now defended.${installed.replacedName ? ` ${installed.replacedName} was replaced.` : ''}`;
      outcome = 'defence-installed';
    } else if (task) {
      title = 'Task completed';
      if (task.progress > 0) {
        message = `${ownerName || 'A player'} completed ${displayCardName(card)} on the ${laneLabel(task.lane)} lane: +${task.progress} project progress${task.defended ? ' because that lane was defended' : ''}.`;
      } else {
        message = `${ownerName || 'A player'} attempted ${displayCardName(card)}, but project progress was cancelled this turn.`;
      }
      outcome = 'task';
    } else if (sabotaged) {
      title = 'Defence sabotaged';
      message = `An insider disabled ${sabotaged.removedName}. The ${laneLabel(sabotaged.lane)} lane is now open.`;
      outcome = 'sabotage';
    } else if (logCheck) {
      title = 'Server logs checked';
      message = `${ownerName || 'A player'} checked the server logs.`;
      outcome = 'investigation';
    } else if (card.name === 'Rapid Incident Response') {
      title = 'Rapid response ready';
      message = `${ownerName || 'A player'} prepared Rapid Incident Response. It will block one attack this turn only.`;
      outcome = 'response-ready';
    } else if (card.name === 'Threat Mitigation Protocol') {
      title = 'Evidence gained';
      message = `${ownerName || 'A player'} coordinated threat mitigation. The team gained ${evidenceGained || 1} Evidence.`;
      outcome = 'evidence';
    } else if (card.name === 'Reconnaissance') {
      title = 'Suspicious observation';
      message = `Someone spent the cycle observing the security posture instead of making visible progress.`;
      outcome = 'reconnaissance';
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
      ownerName: revealOwner ? ownerName : null,
      hiddenOwnerName: ownerName,
      lane: card.lane || null,
      laneLabel: card.lane ? laneLabel(card.lane) : null,
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
      laneLabel: card.lane ? laneLabel(card.lane) : null,
      category: card.category || null,
      description: card.description,
      effectDescription: card.effectDescription,
    };
  }

  _debugCard(card) {
    return {
      id: card.id,
      name: card.name,
      type: card.type,
      lane: card.lane || null,
      owner: card.owner?.name || null,
      ownerRole: card.owner?.returnType?.() || 'unknown',
      hostile: card.isHostile,
    };
  }

  _debugDefenceSlots() {
    return this.defenceCards.map((card, index) => ({
      index,
      name: card.name,
      type: card.type,
      lane: card.lane,
      owner: card.owner?.name || null,
    }));
  }
}

module.exports = GameSystem;
