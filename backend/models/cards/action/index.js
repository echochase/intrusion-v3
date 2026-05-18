const Card = require('../Card');

class InsiderSabotage extends Card {
  constructor(owner = null) {
    super({
      name: 'Insider Sabotage',
      type: 'action',
      description: 'Quietly undermine the team from inside the company.',
      effectDescription: 'Hacker action: disables the oldest active defence. If no defence is active, cancels 1 project progress this turn instead.',
      owner,
      hackerOnly: true,
      isHostile: true,
    });
  }

  onProcess(system) {
    system.resolveInsiderSabotage(this);
  }
}

class Reconnaissance extends Card {
  constructor(owner = null) {
    super({
      name: 'Reconnaissance',
      type: 'action',
      description: 'Take time to observe how the team is working before striking.',
      effectDescription: 'Hacker action: privately reveals the current lane plan and grants a cleaner next draw by discarding one extra unwanted card if needed.',
      owner,
      hackerOnly: true,
      isHostile: true,
    });
  }

  onProcess(system) {
    system.resolveReconnaissance(this);
  }
}

class SocialiseWithTechTeam extends Card {
  constructor(owner = null) {
    super({
      name: 'Socialise with Tech Team',
      type: 'action',
      description: 'Unused card hook: build social leverage inside the team.',
      effectDescription: 'Not used in the live rules.',
      owner,
      hackerOnly: true,
      isHostile: true,
    });
  }
}

class CheckServerLog extends Card {
  constructor(owner = null) {
    super({
      name: 'Check Server Log',
      type: 'action',
      description: 'Review recent system activity and look for hostile behaviour.',
      effectDescription: 'Choose one player. Privately learn whether their submitted card this turn was hostile.',
      owner,
    });
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
      description: 'An emergency containment effort. It helps right now, but it is not a standing defence.',
      effectDescription: 'Blocks one attack this turn only, then is discarded. Does not linger.',
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
      description: 'Coordinate the team around the most urgent exposed lane.',
      effectDescription: 'Gain 1 Evidence. Evidence can help the team investigate suspicious submissions.',
      owner,
    });
  }

  onProcess(system) {
    system.gainEvidence(1, this);
  }
}

module.exports = {
  InsiderSabotage,
  Reconnaissance,
  SocialiseWithTechTeam,
  CheckServerLog,
  RapidIncidentResponseAction,
  ThreatMitigationProtocol,
};
