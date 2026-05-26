const Card = require('../Card');
const { Lane, laneLabel } = require('../../defines');

const TaskDomainLabels = {
  [Lane.CREDENTIALS]: 'Credentials',
  [Lane.SOCIAL]: 'Social',
  [Lane.WEB]: 'Web',
  [Lane.NETWORK]: 'Network',
  [Lane.PHYSICAL]: 'Physical',
};

function taskDomainLabel(lane) {
  return TaskDomainLabels[lane] || laneLabel(lane);
}

function joinLaneNames(lanes) {
  const names = (lanes || []).map((lane) => `${taskDomainLabel(lane)} Lane`);
  if (names.length <= 1) return names[0] || 'matching Lane';
  return `${names.slice(0, -1).join(', ')} AND ${names[names.length - 1]}`;
}

function taskDescription(actionText, lanes, progressPoints) {
  const points = Number(progressPoints) || 1;
  const pointText = points === 1 ? '1 Progress Point' : `${points} Progress Points`;
  return `${actionText}. Grants ${pointText}.\nCondition: To complete this card, the ${joinLaneNames(lanes)} must be protected.`;
}

class CoreTask extends Card {
  constructor({ name, lane, lanes, progressPoints = 1, actionText, owner = null }) {
    const requiredLanes = Array.isArray(lanes) && lanes.length ? [...lanes] : [lane];
    const primaryLane = requiredLanes[0] || lane;
    const description = taskDescription(actionText, requiredLanes, progressPoints);
    super({
      name,
      type: 'task',
      lane: primaryLane,
      lanes: requiredLanes,
      progressPoints,
      category: `${joinLaneNames(requiredLanes)} Task`,
      description,
      effectDescription: description,
      owner,
    });
    this.requiredLanes = requiredLanes;
    this.lanes = requiredLanes;
    this.progressPoints = progressPoints;
  }

  isPlayable(system) {
    return this.requiredLanes.every((lane) => Boolean(system?.isLaneDefended?.(lane)));
  }

  onProcess(system) {
    system.completeTask(this);
  }
}

class ServerMaintenance extends CoreTask {
  constructor(owner = null) {
    super({
      name: 'Server Maintenance',
      lanes: [Lane.NETWORK],
      owner,
      progressPoints: 1,
      actionText: 'Shut down the server for maintenance',
    });
  }
}

class CompanyMeeting extends CoreTask {
  constructor(owner = null) {
    super({
      name: 'Company Meeting',
      lanes: [Lane.SOCIAL],
      owner,
      progressPoints: 1,
      actionText: 'Hold a company meeting to align the team on security priorities',
    });
  }
}

class ModelTraining extends CoreTask {
  constructor(owner = null) {
    super({
      name: 'Model Training',
      lanes: [Lane.WEB],
      owner,
      progressPoints: 1,
      actionText: 'Train and validate the web-facing model before deployment',
    });
  }
}

class ResponsibleEngineer extends CoreTask {
  constructor(owner = null) {
    super({
      name: 'Responsible Engineer',
      lanes: [Lane.CREDENTIALS],
      owner,
      progressPoints: 1,
      actionText: 'Assign a responsible engineer to audit privileged account access',
    });
  }
}

class HazardReport extends CoreTask {
  constructor(owner = null) {
    super({
      name: 'Hazard Report',
      lanes: [Lane.PHYSICAL],
      owner,
      progressPoints: 1,
      actionText: 'File a hazard report for physical risks around the workspace',
    });
  }
}

class CorporateAnnouncement extends CoreTask {
  constructor(owner = null) {
    super({
      name: 'Corporate Announcement',
      lanes: [Lane.SOCIAL],
      owner,
      progressPoints: 1,
      actionText: 'Publish a corporate announcement so staff know the current security expectations',
    });
  }
}

class CompanyMixerEvent extends CoreTask {
  constructor(owner = null) {
    super({
      name: 'Company Mixer Event',
      lanes: [Lane.SOCIAL, Lane.PHYSICAL],
      owner,
      progressPoints: 2,
      actionText: 'Run a company mixer event to build trust and improve internal coordination',
    });
  }
}

class AccessReview extends CoreTask {
  constructor(owner = null) {
    super({
      name: 'Access Review',
      lanes: [Lane.CREDENTIALS, Lane.WEB],
      owner,
      progressPoints: 2,
      actionText: 'Review user access lists and remove unnecessary credentials',
    });
  }
}

class SecureBuildReview extends CoreTask {
  constructor(owner = null) {
    super({
      name: 'Secure Build Review',
      lanes: [Lane.WEB, Lane.NETWORK],
      owner,
      progressPoints: 2,
      actionText: 'Review the latest web build for unsafe inputs and risky deployment changes',
    });
  }
}

class OfficeLockupAudit extends CoreTask {
  constructor(owner = null) {
    super({
      name: 'Office Lockup Audit',
      lanes: [Lane.PHYSICAL],
      owner,
      progressPoints: 1,
      actionText: 'Audit office lockup procedures and secure exposed workstations',
    });
  }
}

module.exports = {
  ServerMaintenance,
  CompanyMeeting,
  ModelTraining,
  ResponsibleEngineer,
  HazardReport,
  CorporateAnnouncement,
  CompanyMixerEvent,
  AccessReview,
  SecureBuildReview,
  OfficeLockupAudit,
  CoreTask,
};
