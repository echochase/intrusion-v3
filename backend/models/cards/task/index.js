const Card = require('../Card');
const { Lane, laneLabel } = require('../../defines');

const TaskDomainLabels = {
  [Lane.CREDENTIALS]: 'Credential',
  [Lane.SOCIAL]: 'Social',
  [Lane.WEB]: 'Web',
  [Lane.NETWORK]: 'Network',
  [Lane.PHYSICAL]: 'Physical',
};

function taskDomainLabel(lane) {
  return TaskDomainLabels[lane] || laneLabel(lane);
}

class CoreTask extends Card {
  constructor({ name, lane, description, owner = null }) {
    super({
      name,
      type: 'task',
      lane,
      category: `${laneLabel(lane)} Task`,
      description,
      effectDescription: `Can only be completed when ${taskDomainLabel(lane)} is defended. Grants +1 Project Progress.`,
      owner,
    });
  }

  isPlayable(system) {
    return Boolean(system?.isLaneDefended?.(this.lane));
  }

  onProcess(system) {
    system.completeTask(this);
  }
}

class ServerMaintenance extends CoreTask {
  constructor(owner = null) {
    super({ name: 'Server Maintenance', lane: Lane.NETWORK, owner, description: 'Keep the infrastructure stable so the team can keep building.' });
  }
}

class CompanyMeeting extends CoreTask {
  constructor(owner = null) {
    super({ name: 'Company Meeting', lane: Lane.SOCIAL, owner, description: 'Align the team and reduce confusion around the project.' });
  }
}

class ModelTraining extends CoreTask {
  constructor(owner = null) {
    super({ name: 'Model Training', lane: Lane.WEB, owner, description: 'Improve the software model and the services around it.' });
  }
}

class ResponsibleEngineer extends CoreTask {
  constructor(owner = null) {
    super({ name: 'Responsible Engineer', lane: Lane.CREDENTIALS, owner, description: 'Assign clear ownership for sensitive accounts and access.' });
  }
}

class HazardReport extends CoreTask {
  constructor(owner = null) {
    super({ name: 'Hazard Report', lane: Lane.PHYSICAL, owner, description: 'Document physical risks before they become security incidents.' });
  }
}

class CorporateAnnouncement extends CoreTask {
  constructor(owner = null) {
    super({ name: 'Corporate Announcement', lane: Lane.SOCIAL, owner, description: 'Share a clear update so staff know what is expected.' });
  }
}

class CompanyMixerEvent extends CoreTask {
  constructor(owner = null) {
    super({ name: 'Company Mixer Event', lane: Lane.SOCIAL, owner, description: 'A social event that can help trust, coordination, and internal awareness.' });
  }
}

// Extra task assets kept in the codebase for future rule sets; not used by the live core task deck.
module.exports = {
  ServerMaintenance,
  CompanyMeeting,
  ModelTraining,
  ResponsibleEngineer,
  HazardReport,
  CorporateAnnouncement,
  CompanyMixerEvent,
  CoreTask,
};
