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
      laneLabel: this.lane ? laneLabel(this.lane) : null,
      category: this.category,
      hackerOnly: this.hackerOnly,
      isHostile: this.isHostile,
      targetPlayerName: this.targetPlayerName || null,
    };
  }
}

module.exports = Card;
