const Card = require('../Card');
const { Lane, laneLabel, CoreDefenceByLane } = require('../../defines');

class LaneAttack extends Card {
  constructor({ name, lane, category, description, effectDescription, owner = null }) {
    super({
      name,
      type: 'attack',
      lane,
      category,
      description,
      effectDescription: effectDescription || `Attack the ${laneLabel(lane)} lane. If the lane is open, the system suffers the listed breach effect. Blocked by ${CoreDefenceByLane[lane] || 'a matching defence'}.`,
      owner,
      hackerOnly: true,
      isHostile: true,
    });
  }

  onProcess(system) {
    system.resolveLaneAttack(this);
  }
}

class ShoulderSurfing extends LaneAttack {
  constructor(owner = null) {
    super({
      name: 'Shoulder Surfing',
      lane: Lane.CREDENTIALS,
      category: 'Credential Theft',
      owner,
      description: 'Watch an employee enter sensitive login details and use that access against the company.',
    });
  }
}

class BruteForce extends LaneAttack {
  constructor(owner = null) {
    super({
      name: 'Brute Force Attack',
      lane: Lane.CREDENTIALS,
      category: 'Credential Theft',
      owner,
      description: 'Try enough password guesses until one finally works.',
    });
  }
}

class AuthenticatorTheft extends LaneAttack {
  constructor(owner = null) {
    super({
      name: 'Authenticator Theft',
      lane: Lane.CREDENTIALS,
      category: 'Credential Theft',
      owner,
      description: "Steal an employee's authenticator access and try to turn it into a breach.",
    });
  }
}

class SIMSwapping extends LaneAttack {
  constructor(owner = null) {
    super({
      name: 'SIM Swapping',
      lane: Lane.CREDENTIALS,
      category: 'Credential Theft',
      owner,
      description: 'Hijack a phone number and use it to break into protected accounts.',
    });
  }
}

class Phishing extends LaneAttack {
  constructor(owner = null) {
    super({
      name: 'Phishing',
      lane: Lane.SOCIAL,
      category: 'Social Engineering',
      owner,
      description: 'Send a convincing fake message and trick an employee into helping the attacker.',
    });
  }
}

class StoredXSS extends LaneAttack {
  constructor(owner = null) {
    super({
      name: 'Stored XSS',
      lane: Lane.WEB,
      category: 'XSS Attack',
      owner,
      description: 'Plant hostile script in a place the application stores and later serves to users.',
    });
  }
}

class ReflectedXSS extends LaneAttack {
  constructor(owner = null) {
    super({
      name: 'Reflected XSS',
      lane: Lane.WEB,
      category: 'XSS Attack',
      owner,
      description: 'Inject hostile script through a request or link and bounce it back through the site.',
    });
  }
}

class DDoS extends LaneAttack {
  constructor(owner = null) {
    super({
      name: 'DDoS Attack',
      lane: Lane.NETWORK,
      category: 'Availability Attack',
      owner,
      description: 'Flood the system with traffic so legitimate project work cannot get through.',
      effectDescription: `Attack the ${laneLabel(Lane.NETWORK)} lane. If Network is open, project progress from this turn is cancelled. Blocked by ${CoreDefenceByLane[Lane.NETWORK]}.`,
    });
  }
}

class PhysicalDataTheft extends LaneAttack {
  constructor(owner = null) {
    super({
      name: 'Physical Data Theft',
      lane: Lane.PHYSICAL,
      category: 'Physical Attack',
      owner,
      description: 'Use real-world access to steal sensitive information from the workplace.',
    });
  }
}

class ZeroDay extends Card {
  constructor(owner = null) {
    super({
      name: 'Zero-Day Attack',
      type: 'attack',
      lane: Lane.SPECIAL,
      category: 'Zero-Day',
      description: 'Exploit a flaw nobody planned around. This attack is rare and cannot be blocked.',
      effectDescription: 'Late-game only: can be played when the engineers are within 2 progress of winning and the system has at least 2 integrity. Remove 1 integrity. Cannot be blocked.',
      owner,
      hackerOnly: true,
      isHostile: true,
    });
  }

  isPlayable(system) {
    return system.integrityPoints >= 2 && system.numTasks <= 2;
  }

  onProcess(system) {
    system.resolveZeroDay(this);
  }
}

// Kept as aliases/unused expansion hooks for existing imports and future rules.
class SQLInjection extends LaneAttack {
  constructor(owner = null) {
    super({
      name: 'SQL Injection',
      lane: Lane.WEB,
      category: 'Injection Attack',
      owner,
      description: 'Unused card hook: abuse unsafe database input.',
    });
  }
}

module.exports = {
  AuthenticatorTheft,
  BruteForce,
  DDoS,
  Phishing,
  PhysicalDataTheft,
  ReflectedXSS,
  ShoulderSurfing,
  SIMSwapping,
  SQLInjection,
  StoredXSS,
  ZeroDay,
  LaneAttack,
};
