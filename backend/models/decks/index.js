const attacks  = require('../cards/attack');
const defences = require('../cards/defence');
const actions  = require('../cards/action');
const tasks    = require('../cards/task');

class Deck {
  constructor(sourceDeck = 'deck') {
    this.sourceDeck = sourceDeck;
    this.playPile = [];
    this.discardPile = [];
    this._buildPlayPile();
    this._shuffle(this.playPile);
  }

  _buildPlayPile() {}

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  draw() {
    if (this.playPile.length === 0) {
      if (this.discardPile.length === 0) return null;
      this.playPile = [...this.discardPile];
      this.discardPile = [];
      this._shuffle(this.playPile);
    }
    const card = this.playPile.pop();
    if (card) card.sourceDeck = this.sourceDeck;
    return card;
  }

  drawMany(n) {
    const drawn = [];
    for (let i = 0; i < n; i++) {
      const card = this.draw();
      if (card) drawn.push(card);
    }
    return drawn;
  }

  drawWhere(predicate) {
    let idx = this.playPile.findIndex(predicate);
    if (idx === -1 && this.discardPile.length > 0) {
      this.playPile = [...this.playPile, ...this.discardPile];
      this.discardPile = [];
      this._shuffle(this.playPile);
      idx = this.playPile.findIndex(predicate);
    }
    if (idx === -1) return null;
    const [card] = this.playPile.splice(idx, 1);
    if (card) card.sourceDeck = this.sourceDeck;
    return card || null;
  }

  discard(card) {
    if (!card) return;
    card.owner = null;
    card.targetPlayerName = null;
    card.publiclyRevealed = true;
    card.deployTime = card.baseDeployTime || 0;
    this.discardPile.push(card);
  }

  toJSON() {
    return { playPileSize: this.playPile.length, discardPileSize: this.discardPile.length };
  }
}

class HackerDeck extends Deck {
  constructor() { super('hacker'); }

  _buildPlayPile() {
    for (let i = 0; i < 3; i++) {
      this.playPile.push(
        new attacks.CredentialTheft(),
        new attacks.Phishing(),
        new attacks.XSSAttack(),
        new attacks.DDoS(),
        new attacks.PhysicalDataTheft(),
      );
    }

    this.playPile.push(new attacks.ZeroDay());

    for (let i = 0; i < 3; i++) {
      this.playPile.push(
        new actions.Reconnaissance(),
        new attacks.InsiderSabotage(),
      );
    }
  }
}

class SecEngDeck extends Deck {
  constructor() { super('security'); }

  _buildPlayPile() {
    for (let i = 0; i < 3; i++) {
      this.playPile.push(
        new defences.TwoFactorAuthentication(),
        new defences.EmployeeAwareness(),
        new defences.InputSanitisation(),
        new defences.AntiDDoSDefence(),
        new defences.SecurityDetail(),
      );
    }

    for (let i = 0; i < 3; i++) {
      this.playPile.push(
        new actions.RapidIncidentResponseAction(),
        new actions.CheckServerLog(),
        new actions.ThreatMitigationProtocol(),
      );
    }
  }
}

class TaskDeck extends Deck {
  constructor() { super('task'); }

  _buildPlayPile() {
    for (let i = 0; i < 2; i++) {
      this.playPile.push(
        new tasks.ServerMaintenance(),
        new tasks.CompanyMeeting(),
        new tasks.ModelTraining(),
        new tasks.ResponsibleEngineer(),
        new tasks.HazardReport(),
        new tasks.CorporateAnnouncement(),
        new tasks.CompanyMixerEvent(),
        new tasks.AccessReview(),
        new tasks.SecureBuildReview(),
        new tasks.OfficeLockupAudit(),
      );
    }
  }
}

module.exports = { HackerDeck, SecEngDeck, TaskDeck };
