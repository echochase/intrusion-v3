const Card = require('../Card');
const { Lane, laneLabel, CoreAttackByLane } = require('../../defines');

class LaneDefence extends Card {
  constructor({ name, lane, description, effectDescription, owner = null }) {
    super({
      name,
      type: 'defence',
      lane,
      category: `${laneLabel(lane)} Defence`,
      description,
      effectDescription: effectDescription || `Defends the ${laneLabel(lane)} Lane. Blocks ${CoreAttackByLane[lane] || 'matching attacks'} and lets matching tasks resolve for +1 Project Progress.`,
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
      description: 'Enforce 2-factor authentication. Nothing too fancy, just a temp code sent to your phone during login.',
      effectDescription: 'Defends the Credential Lane. Blocks Credential Theft and lets matching Credential tasks resolve for +1 Project Progress.',
    });
  }
}

class EmployeeAwareness extends LaneDefence {
  constructor(owner = null) {
    super({
      name: 'Employee Awareness',
      lane: Lane.SOCIAL,
      owner,
      description: 'Increase everyone’s cyber-awareness about what phishing attacks look like and how they operate!',
      effectDescription: 'Defends the Social Lane. Blocks Phishing and lets matching Social tasks resolve for +1 Project Progress.',
    });
  }
}

class InputSanitisation extends LaneDefence {
  constructor(owner = null) {
    super({
      name: 'Input Sanitisation',
      lane: Lane.WEB,
      owner,
      description: 'Are you crazy? Sanitise the user input first before allowing it into your code! Escape, whitelist, do whatever it takes!',
      effectDescription: 'Defends the Web Lane. Blocks XSS Attack and lets matching Web tasks resolve for +1 Project Progress.',
    });
  }
}

class AntiDDoSDefence extends LaneDefence {
  constructor(owner = null) {
    super({
      name: 'Anti-DDoS Defence',
      lane: Lane.NETWORK,
      owner,
      description: 'Hire a DDoS Mitigation Service at the ready. Comes with traffic monitoring, behavioural analysis, web application firewalls, all the good stuff.',
      effectDescription: 'Defends the Network Lane. Blocks DDoS Attack and lets matching Network tasks resolve for +1 Project Progress.',
    });
  }
}

class SecurityDetail extends LaneDefence {
  constructor(owner = null) {
    super({
      name: 'Security Detail',
      lane: Lane.PHYSICAL,
      owner,
      description: 'Hire a team of security guards to maintain physical security on campus and prevent theft.',
      effectDescription: 'Defends the Physical Lane. Blocks Physical Data Theft and lets matching Physical tasks resolve for +1 Project Progress.',
    });
  }
}

module.exports = {
  AntiDDoSDefence,
  EmployeeAwareness,
  InputSanitisation,
  SecurityDetail,
  TwoFactorAuthentication,
  LaneDefence,
};
