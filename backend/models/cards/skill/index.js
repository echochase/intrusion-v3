/**
 * skill/index.js
 *
 * Skill cards. Playing one face-up immediately increments the owner's
 * corresponding skill point counter. They never enter the system process queue.
 */

const Card = require('../Card');

class CommunicationSkill extends Card {
  constructor(owner = null) {
    super({
      name: 'Communication',
      type: 'skill',
      description: '',
      effectDescription: "Adds a 'Communication' skill point",
      deployTime: 0,
      owner,
    });
  }

  isPlayable(system) { return true; }

  onPlay(system) {
    this.owner.addSkillPoints('comm', 1);
  }

  onProcess(system) {} // Skill cards never reach the system
}

class ProgrammingSkill extends Card {
  constructor(owner = null) {
    super({
      name: 'Programming',
      type: 'skill',
      description: '',
      effectDescription: "Adds a 'Programming' skill point",
      deployTime: 0,
      owner,
    });
  }

  isPlayable(system) { return true; }

  onPlay(system) {
    this.owner.addSkillPoints('prog', 1);
  }

  onProcess(system) {}
}

class TimeManagementSkill extends Card {
  constructor(owner = null) {
    super({
      name: 'Time Management',
      type: 'skill',
      description: '',
      effectDescription: "Adds a 'Time Management' skill point",
      deployTime: 0,
      owner,
    });
  }

  isPlayable(system) { return true; }

  onPlay(system) {
    this.owner.addSkillPoints('time', 1);
  }

  onProcess(system) {}
}

module.exports = { CommunicationSkill, ProgrammingSkill, TimeManagementSkill };