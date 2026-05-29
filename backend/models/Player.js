const MAX_HAND_SIZE = 5;

class Player {
  constructor(name, socketId = null, sessionToken = null, isBot = false) {
    this.name = name;
    this.socketId = socketId;
    this.sessionToken = sessionToken;
    this.isBot = Boolean(isBot);
    this.cards = [];
    this.task = null;
    this.hasPlayedCards = false;
    this.canPlayCards = true;
    this.canPlayAttacks = true;
    this.cardsPlayedThisTurn = [];
    this.needsDiscard = false;
    this.forcedDiscardCount = 0;
    this.replacedTaskThisTurn = false;
    this.awaitingDrawChoice = false;

    // Kept for old UI/components and archived card files. Core mode does not use skills.
    this.timePoints = 0;
    this.commPoints = 0;
    this.progPoints = 0;
  }

  returnType() { return 'Player'; }
  get role() { return this.returnType(); }

  addSkillPoints() {}
  removeSkillPoints() {}

  addCard(card) {
    if (!card) return;
    card.owner = this;
    this.cards.push(card);
  }

  receiveCards(cards) { for (const card of cards || []) this.addCard(card); }

  removeCardFromHand(cardRef, { clearOwner = true } = {}) {
    const idx = this.cards.findIndex(card => card.id === cardRef || card.name === cardRef);
    if (idx === -1) return null;
    const [removed] = this.cards.splice(idx, 1);
    if (removed && clearOwner) removed.owner = null;
    return removed || null;
  }

  markDiscardIfNeeded() { this.needsDiscard = this.cards.length > MAX_HAND_SIZE; }
  clearDiscardRequirementIfSatisfied() {
    if (this.forcedDiscardCount <= 0 && this.cards.length <= MAX_HAND_SIZE) this.needsDiscard = false;
  }
  mustDiscard() { return this.forcedDiscardCount > 0 || (this.needsDiscard && this.cards.length > MAX_HAND_SIZE); }
  discardCount() {
    if (this.forcedDiscardCount > 0) return this.forcedDiscardCount;
    return this.needsDiscard ? Math.max(0, this.cards.length - MAX_HAND_SIZE) : 0;
  }

  toPublicJSON() {
    return {
      name: this.name,
      role: this.returnType(),
      handSize: this.cards.length,
      task: this.task ? this.task.toJSON() : null,
      timePoints: this.timePoints,
      commPoints: this.commPoints,
      progPoints: this.progPoints,
      hasPlayedCards: this.hasPlayedCards,
      canPlayCards: this.canPlayCards,
      canPlayAttacks: this.canPlayAttacks,
      mustDiscard: this.mustDiscard(),
      discardCount: this.discardCount(),
      forcedDiscardCount: this.forcedDiscardCount,
      awaitingDrawChoice: this.awaitingDrawChoice,
      replacedTaskThisTurn: this.replacedTaskThisTurn,
      isBot: this.isBot,
    };
  }

  toPrivateJSON() {
    return {
      ...this.toPublicJSON(),
      cards: this.cards.map(card => card.toJSON()),
      cardsPlayedThisTurn: this.cardsPlayedThisTurn.map(card => card.toJSON()),
    };
  }
}

class Hacker extends Player {
  returnType() { return 'Hacker'; }
}

class SecurityEngineer extends Player {
  returnType() { return 'SecEng'; }
}

module.exports = { Player, Hacker, SecurityEngineer, SecEng: SecurityEngineer, MAX_HAND_SIZE };
