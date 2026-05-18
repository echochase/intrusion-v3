const Card = require('../Card');
const { Lane, laneLabel, CoreAttackByLane } = require('../../defines');

class LaneDefence extends Card {
  constructor({ name, lane, description, owner = null }) {
    super({
      name,
      type: 'defence',
      lane,
      category: `${laneLabel(lane)} Defence`,
      description,
      effectDescription: `Defends the ${laneLabel(lane)} lane. Blocks ${CoreAttackByLane[lane] || 'matching attacks'} and makes matching tasks worth +2 progress instead of +1.`,
      owner,
    });
  }

  onProcess(system) {
    system.installDefenceCard(this);
  }
}

class TwoFactorAuthentication extends LaneDefence {
  constructor(owner = null) {
    super({
      name: 'Two-Factor Authentication',
      lane: Lane.CREDENTIALS,
      owner,
      description: 'Require a second proof of identity so stolen or guessed passwords are less useful.',
    });
  }
}

class EmployeeAwareness extends LaneDefence {
  constructor(owner = null) {
    super({
      name: 'Employee Awareness',
      lane: Lane.SOCIAL,
      owner,
      description: 'Train employees to recognise suspicious messages, requests, and manipulation.',
    });
  }
}

class InputSanitisation extends LaneDefence {
  constructor(owner = null) {
    super({
      name: 'Input Sanitisation',
      lane: Lane.WEB,
      owner,
      description: 'Treat user input as data rather than code to reduce injection and script attacks.',
    });
  }
}

class AntiDDoSDefence extends LaneDefence {
  constructor(owner = null) {
    super({
      name: 'Anti-DDoS Defence',
      lane: Lane.NETWORK,
      owner,
      description: 'Filter and absorb traffic floods so legitimate work can keep moving.',
    });
  }
}

class SecurityDetail extends LaneDefence {
  constructor(owner = null) {
    super({
      name: 'Security Detail',
      lane: Lane.PHYSICAL,
      owner,
      description: 'Protect the workplace and reduce the risk of physical access turning into a breach.',
    });
  }
}

// Kept in the files for future expansion, but not used by the live core decks.
class SecureHashingAndSalting extends LaneDefence {
  constructor(owner = null) {
    super({
      name: 'Secure Hashing & Salting',
      lane: Lane.CREDENTIALS,
      owner,
      description: 'Unused card hook: make stolen password databases much harder to exploit.',
    });
  }
}

module.exports = {
  AntiDDoSDefence,
  EmployeeAwareness,
  InputSanitisation,
  SecureHashingAndSalting,
  SecurityDetail,
  TwoFactorAuthentication,
  LaneDefence,
};
