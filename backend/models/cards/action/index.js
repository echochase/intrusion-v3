const Card = require('../Card');

class Reconnaissance extends Card {
  constructor(owner = null) {
    super({
      name: 'Reconnaissance',
      type: 'action',
      description: 'Quietly review the other players’ hands at the end of the cycle without raising suspicion.',
      effectDescription: 'Hacker action: at the end of the turn, privately view each other player’s hand in a 2x2 grid. This is not hostile.',
      owner,
      hackerOnly: true,
      isHostile: false,
    });
  }

  onProcess(system) {
    system.resolveReconnaissance(this);
  }
}

class CheckServerLog extends Card {
  constructor(owner = null) {
    super({
      name: 'Check Server Log',
      type: 'action',
      description: 'Best to check the server log for any suspicious activities.',
      effectDescription: 'Costs 1 Evidence. Choose one player, or Random. Privately learn whether that player has played a hostile card this cycle.',
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
      description: 'Prevention is better than a cure, but sometimes we need a quick cure to stop further damage!',
      effectDescription: 'Nullify an attack that is occurring in the same turn. DDoS attacks take priority. Otherwise, if there are multiple attacks during this turn, neutralise the first one. Priority: compute this card first amongst all other cards.',
      owner,
    });
  }

  onProcess(system) {
    system.activateRapidIncidentResponse(this);
  }
}

class ThreatMitigationProtocol extends Card {
  constructor(owner = null) {
    super({
      name: 'Threat Mitigation Protocol',
      type: 'action',
      description: 'Hey, that doesn’t look right! Stop that request from going through!',
      effectDescription: 'Gain 1 Evidence. Evidence can help the team investigate suspicious submissions.',
      owner,
    });
  }

  onProcess(system) {
    system.gainEvidence(1, this);
  }
}

module.exports = {
  Reconnaissance,
  CheckServerLog,
  RapidIncidentResponseAction,
  ThreatMitigationProtocol,
};
