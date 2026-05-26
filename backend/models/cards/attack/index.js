const Card = require('../Card');
const { Lane, CoreDefenceByLane } = require('../../defines');

class LaneAttack extends Card {
  constructor({ name, lane, category, description, effectDescription, owner = null }) {
    super({
      name,
      type: 'attack',
      lane,
      category,
      description,
      effectDescription: effectDescription || `Attacks the ${category || 'matching'} Lane. Blocked by ${CoreDefenceByLane[lane] || 'a matching defence'}.`,
      owner,
      hackerOnly: true,
      isHostile: true,
    });
  }

  onProcess(system) {
    system.resolveLaneAttack(this);
  }
}

class CredentialTheft extends LaneAttack {
  constructor(owner = null) {
    super({
      name: 'Credential Theft',
      lane: Lane.CREDENTIALS,
      category: 'Credential',
      owner,
      description: "Look over a tech’s shoulder as they log in to the system. It’s easier if you’re friends.",
      effectDescription: 'Attacks the Credential Lane. Blocked by Two-Factor Authentication.',
    });
  }
}

class Phishing extends LaneAttack {
  constructor(owner = null) {
    super({
      name: 'Phishing',
      lane: Lane.SOCIAL,
      category: 'Social',
      owner,
      description: 'Send spam from a fake address. The more specific that you can make the spam, the more believable it is!',
      effectDescription: 'Attacks the Social Lane. Blocked by Employee Awareness.',
    });
  }
}

class XSSAttack extends LaneAttack {
  constructor(owner = null) {
    super({
      name: 'XSS Attack',
      lane: Lane.WEB,
      category: 'Web',
      owner,
      description: "Inject a malicious XSS payload into a vulnerable web application. The payload will be stored within the application to steal future visitors' session cookies.",
      effectDescription: 'Attacks the Web Lane. Blocked by Input Sanitisation.',
    });
  }
}

class DDoS extends LaneAttack {
  constructor(owner = null) {
    super({
      name: 'DDoS Attack',
      lane: Lane.NETWORK,
      category: 'Network',
      owner,
      description: 'Purchase a botnet of compromised computers and overwhelm the system with requests, limiting processing power until an Anti-DDoS countermeasure is deployed.',
      effectDescription: 'Attacks the Network Lane. Blocked by Anti-DDoS Defence. If the Network Lane is open, processing power is limited by 2 cards while the DDoS is ongoing; deploy Anti-DDoS Defence as the countermeasure.',
    });
  }
}

class PhysicalDataTheft extends LaneAttack {
  constructor(owner = null) {
    super({
      name: 'Physical Data Theft',
      lane: Lane.PHYSICAL,
      category: 'Physical',
      owner,
      description: 'Sneak into the tech department and steal sensitive information. Don’t get caught!',
      effectDescription: 'Attacks the Physical Lane. Blocked by Security Detail.',
    });
  }
}


class InsiderSabotage extends Card {
  constructor(owner = null) {
    super({
      name: 'Insider Sabotage',
      type: 'action',
      lane: Lane.SPECIAL,
      category: 'Sabotage',
      description: 'Plant an insider in the security workflow to quietly occupy one defence slot without protecting any Lane.',
      effectDescription: 'Hacker action: takes up a defence slot but does not block attacks or protect tasks. This is hostile.',
      owner,
      hackerOnly: true,
      isHostile: true,
    });
  }

  onProcess(system) {
    system.installSabotageCard(this);
  }
}

class ZeroDay extends Card {
  constructor(owner = null) {
    super({
      name: 'Zero-Day Attack',
      type: 'attack',
      lane: Lane.SPECIAL,
      category: 'Zero-Day',
      description: 'No system is perfect. Took a while to find, but the techs overlooked this obscure vulnerability here… let’s see how far it goes.',
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

module.exports = {
  CredentialTheft,
  DDoS,
  Phishing,
  PhysicalDataTheft,
  XSSAttack,
  ZeroDay,
  InsiderSabotage,
  LaneAttack,
};
