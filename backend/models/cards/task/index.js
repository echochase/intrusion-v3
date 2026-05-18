const Card = require('../Card');
const { Lane, laneLabel } = require('../../defines');

class CoreTask extends Card {
  constructor({ name, lane, description, owner = null }) {
    super({
      name,
      type: 'task',
      lane,
      category: `${laneLabel(lane)} Task`,
      description,
      effectDescription: `Complete this ${laneLabel(lane)} task for +1 project progress. If the ${laneLabel(lane)} lane is defended, it is worth +2 progress instead.`,
      owner,
    });
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
class CollaborativeDebuggingSession extends CoreTask { constructor(owner = null) { super({ name: 'Collaborative Debugging Session', lane: Lane.WEB, owner, description: 'Unused task asset kept for future rules.' }); } }
class InvestorPitchPresentation extends CoreTask { constructor(owner = null) { super({ name: 'Investor Pitch Presentation', lane: Lane.SOCIAL, owner, description: 'Unused task asset kept for future rules.' }); } }
class LateNightDeadlineSprint extends CoreTask { constructor(owner = null) { super({ name: 'Late-Night Deadline Sprint', lane: Lane.NETWORK, owner, description: 'Unused task asset kept for future rules.' }); } }
class ProductDevelopment extends CoreTask { constructor(owner = null) { super({ name: 'Product Development', lane: Lane.WEB, owner, description: 'Unused task asset kept for future rules.' }); } }
class ProjectPlanning extends CoreTask { constructor(owner = null) { super({ name: 'Project Planning', lane: Lane.SOCIAL, owner, description: 'Unused task asset kept for future rules.' }); } }
class TeamLeadership extends CoreTask { constructor(owner = null) { super({ name: 'Team Leadership', lane: Lane.SOCIAL, owner, description: 'Unused task asset kept for future rules.' }); } }

module.exports = {
  CoreTask,
  ServerMaintenance,
  CompanyMeeting,
  ModelTraining,
  ResponsibleEngineer,
  HazardReport,
  CorporateAnnouncement,
  CompanyMixerEvent,
  CollaborativeDebuggingSession,
  InvestorPitchPresentation,
  LateNightDeadlineSprint,
  ProductDevelopment,
  ProjectPlanning,
  TeamLeadership,
};
