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
      effectDescription: 'Removes 1 integrity point. Attacks the Credential Lane. Blocked by Two-Factor Authentication.',
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
      effectDescription: 'Removes 1 integrity point. Attacks the Social Lane. Blocked by Employee Awareness.',
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
      description: 'Inject a malicious XSS payload into a vulnerable web application. Steal a couple session cookies.',
      effectDescription: 'Removes 1 integrity point. Attacks the Web Lane. Blocked by Input Sanitisation.',
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
      description: 'Purchase a botnet and overwhelm the system with requests.',
      effectDescription: 'Until stopped, reduces the maximum processed actions per turn by 2. Attacks the Network Lane. Blocked by Anti-DDoS Defence.',
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
      effectDescription: 'Removes 1 integrity point. Attacks the Physical Lane. Blocked by Security Detail.',
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
      description: 'Pay an intern to do a lousy job at defending the system. And to not ask questions.',
      effectDescription: 'Put this card in a defence slot. This card will occupy that slot until it is replaced.',
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
      description: 'Exploit a previously unknown vulnerability before the defenders have a patch, signature, or reliable way to recognise the threat.',
      effectDescription: 'Condition: can only be played when the SecEng team is within 2 progress of completing the project. Removes 1 integrity point. This attack cannot be blocked by lane defences.',
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
