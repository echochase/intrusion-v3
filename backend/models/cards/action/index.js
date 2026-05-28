const Card = require('../Card');
const { Lane } = require('../../defines');

class Reconnaissance extends Card {
  constructor(owner = null) {
    super({
      name: 'Reconnaissance',
      type: 'action',
      description: 'Some passive recon never hurts.',
      effectDescription: 'At the end of the turn, privately view each player’s hand. Stealth: this is not hostile and will not show up as a hostile action.',
      owner,
      hackerOnly: true,
      isHostile: false,
    });
  }

  onProcess(system) {
    system.resolveReconnaissance(this);
  }
}

class FalseFlag extends Card {
  constructor(owner = null) {
    super({
      name: 'False Flag',
      type: 'action',
      lane: Lane.SPECIAL,
      category: 'Deception',
      description: 'Leave forged evidence in the logs.',
      effectDescription: 'Choose a player. The card they play this turn appears hostile. This card is not hostile.',
      owner,
      hackerOnly: true,
      isHostile: false,
    });
  }

  onProcess(system) {
    system.resolveFalseFlag(this);
  }
}


class CheckServerLog extends Card {
  constructor(owner = null) {
    super({
      name: 'Check Server Log',
      type: 'action',
      description: 'Best to check the server log for any suspicious activities.',
      effectDescription: 'Choose a player. Check whether the card played by the target this turn is hostile.',
      owner,
    });
  }

  isPlayable(system) {
    return (system?.evidence || 0) >= 1;
  }

  onProcess(system) {
    system.resolveCheckServerLog(this);
  }
}

class RapidIncidentResponseAction extends Card {
  constructor(owner = null) {
    super({
      name: 'Rapid Incident Response',
      type: 'action',
      description: 'Prevention is better, but sometimes we need a quick cure to stop further damage!',
      effectDescription: 'Nullify an attack that is occurring in the same turn. DDoS attacks take priority. Priority: compute this card first amongst all other cards.',
      owner,
    });
  }

  onProcess(system) {
    system.activateRapidIncidentResponse(this);
  }
}

class ForensicAnalysis extends Card {
  constructor(owner = null) {
    super({
      name: 'Forensic Analysis',
      type: 'action',
      description: 'Review access logs, packet trails, and system anomalies.',
      effectDescription: 'Gain 1 Evidence.',
      owner,
    });
  }

  onProcess(system) {
    system.gainEvidence(1, this);
  }
}

module.exports = {
  Reconnaissance,
  FalseFlag,
  CheckServerLog,
  RapidIncidentResponseAction,
  ForensicAnalysis,
};
