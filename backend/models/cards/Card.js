let NEXT_CARD_ID = 1;

class Card {
  constructor({
    name,
    type,
    description = '',
    effectDescription = '',
    deployTime = 0,
    owner = null,
    lane = null,
    lanes = null,
    progressPoints = null,
    category = null,
    hackerOnly = false,
    isHostile = false,
  }) {
    this.id = `card-${NEXT_CARD_ID++}`;
    this.name = name;
    this.type = type;
    this.description = description;
    this.effectDescription = effectDescription;
    this.deployTime = deployTime;
    this.baseDeployTime = deployTime;
    this.owner = owner;
    this.lane = lane;
    this.lanes = Array.isArray(lanes) ? lanes : (lane ? [lane] : []);
    this.requiredLanes = this.lanes;
    this.progressPoints = progressPoints;
    this.category = category;
    this.hackerOnly = Boolean(hackerOnly);
    this.isHostile = Boolean(isHostile || type === 'attack');
    this.sourceDeck = null;
    this.publiclyRevealed = true;
  }

  isPlayable(system) { return true; }
  onPlay(system) {}
  onProcess(system) {}
  getDefence() { return 0; }

  toJSON() {
    const { laneLabel } = require('../defines');
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      description: this.description,
      effectDescription: this.effectDescription,
      deployTime: this.deployTime,
      baseDeployTime: this.baseDeployTime,
      owner: this.owner ? this.owner.name : null,
      lane: this.lane,
      lanes: Array.isArray(this.lanes) ? [...this.lanes] : [],
      requiredLanes: Array.isArray(this.requiredLanes) ? [...this.requiredLanes] : [],
      laneLabel: this.lane ? laneLabel(this.lane) : null,
      laneLabels: Array.isArray(this.requiredLanes) ? this.requiredLanes.map(lane => laneLabel(lane)) : [],
      progressPoints: this.progressPoints,
      category: this.category,
      hackerOnly: this.hackerOnly,
      isHostile: this.isHostile,
      targetPlayerName: this.targetPlayerName || null,
      sourceDeck: this.sourceDeck || null,
      submissionKind: this.submissionKind || (this.hackerOnly || this.type === 'attack' ? 'hacker' : 'security'),
    };
  }
}

module.exports = Card;
