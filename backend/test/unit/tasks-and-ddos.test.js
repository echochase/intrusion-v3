const test = require('node:test');
const assert = require('node:assert/strict');
const {
  GameSystem,
  Hacker,
  SecurityEngineer,
  attacks,
  defences,
  tasks,
  addInstalledDefence,
} = require('../support/gameTestUtils');

function progressFor(system, card) {
  const detail = system.turnDebug.resolutionDetails.find((entry) => entry.card.name === card.name);
  assert.ok(detail, `expected ${card.name} to resolve`);
  const event = detail.events.find((item) => item.kind === 'task-completed');
  assert.ok(event, `expected ${card.name} to emit task-completed`);
  return event.progress;
}

function installLanes(system, owner, lanes) {
  const byLane = {
    credentials: () => new defences.TwoFactorAuthentication(owner),
    social: () => new defences.EmployeeAwareness(owner),
    web: () => new defences.InputSanitisation(owner),
    network: () => new defences.AntiDDoSDefence(owner),
    physical: () => new defences.SecurityDetail(owner),
  };
  for (const lane of lanes) addInstalledDefence(system, byLane[lane]());
}

function resolveSingleTask(taskCard, defendedLanes = []) {
  const system = new GameSystem(4);
  const engineer = new SecurityEngineer('Engineer');
  installLanes(system, engineer, defendedLanes);
  const before = system.numTasks;
  taskCard.owner = engineer;
  system.addProcess(taskCard);
  system.consumeProcesses(1, {});
  return { system, before, progress: progressFor(system, taskCard) };
}

test('single-lane task cards complete for +1 only when their required lane is protected', () => {
  const cases = [
    [new tasks.ServerMaintenance(), ['network']],
    [new tasks.CompanyMeeting(), ['social']],
    [new tasks.ModelTraining(), ['web']],
    [new tasks.ResponsibleEngineer(), ['credentials']],
    [new tasks.HazardReport(), ['physical']],
    [new tasks.CorporateAnnouncement(), ['social']],
    [new tasks.OfficeLockupAudit(), ['physical']],
  ];

  for (const [taskCard, lanes] of cases) {
    const defended = resolveSingleTask(taskCard, lanes);
    assert.equal(defended.progress, 1, `${taskCard.name} should grant 1 Progress Point when protected`);
    assert.equal(defended.system.numTasks, defended.before - 1);

    const undefended = resolveSingleTask(new taskCard.constructor(), []);
    assert.equal(undefended.progress, 0, `${taskCard.name} should not progress without its lane`);
    assert.equal(undefended.system.numTasks, undefended.before);
  }
});

test('multi-lane task cards require every listed lane and grant 2 Progress Points', () => {
  const cases = [
    [new tasks.CompanyMixerEvent(), ['social', 'physical'], ['social']],
    [new tasks.AccessReview(), ['credentials', 'web'], ['credentials']],
    [new tasks.SecureBuildReview(), ['web', 'network'], ['web']],
  ];

  for (const [taskCard, allLanes, partialLanes] of cases) {
    const defended = resolveSingleTask(taskCard, allLanes);
    assert.equal(defended.progress, 2, `${taskCard.name} should grant 2 Progress Points when all lanes are protected`);
    assert.equal(defended.system.numTasks, defended.before - 2);

    const partial = resolveSingleTask(new taskCard.constructor(), partialLanes);
    assert.equal(partial.progress, 0, `${taskCard.name} should not progress when only some lanes are protected`);
    assert.equal(partial.system.numTasks, partial.before);
  }
});

test('open DDoS reduces total cards processed from 5 to 3 in a 4-player game', () => {
  const system = new GameSystem(4);
  const hacker = new Hacker('Hacker');
  const engineer = new SecurityEngineer('Engineer');
  installLanes(system, engineer, ['social', 'web', 'physical']);

  for (const card of [
    new attacks.DDoS(hacker),
    new tasks.CompanyMeeting(engineer),
    new tasks.ModelTraining(engineer),
    new tasks.HazardReport(engineer),
    new tasks.CorporateAnnouncement(engineer),
  ]) {
    system.addProcess(card);
  }

  system.consumeProcesses(1, {});

  assert.equal(system.maxProcesses, 5);
  assert.equal(system.turnDebug.capacity, 3);
  assert.equal(system.processedThisTurn.length, 3);
  assert.equal(system.unprocessedThisTurn.length, 2);
  assert.equal(system.unprocessedThisTurn.every((entry) => entry.outcome === 'deferred-by-ddos'), true);
  assert.equal(system.projectProgressGainedThisTurn, 2);
  assert.equal(system.laneStates().find((lane) => lane.lane === 'network').ddosActive, true);
});

test('open DDoS reduces total cards processed from 6 to 4 in a 5-player game', () => {
  const system = new GameSystem(5);
  const hacker = new Hacker('Hacker');
  const engineer = new SecurityEngineer('Engineer');
  installLanes(system, engineer, ['social', 'web', 'physical']);

  for (const card of [
    new attacks.DDoS(hacker),
    new tasks.CompanyMeeting(engineer),
    new tasks.ModelTraining(engineer),
    new tasks.HazardReport(engineer),
    new tasks.CorporateAnnouncement(engineer),
    new tasks.OfficeLockupAudit(engineer),
  ]) {
    system.addProcess(card);
  }

  system.consumeProcesses(1, {});

  assert.equal(system.maxProcesses, 6);
  assert.equal(system.turnDebug.capacity, 4);
  assert.equal(system.processedThisTurn.length, 4);
  assert.equal(system.unprocessedThisTurn.length, 2);
});

test('open DDoS adds public stuck messages for cards that cannot process', () => {
  const system = new GameSystem(4);
  const hacker = new Hacker('Hacker');
  const engineer = new SecurityEngineer('Engineer');
  installLanes(system, engineer, ['social', 'web', 'physical']);

  for (const card of [
    new attacks.DDoS(hacker),
    new tasks.CompanyMeeting(engineer),
    new tasks.ModelTraining(engineer),
    new tasks.HazardReport(engineer),
    new tasks.CorporateAnnouncement(engineer),
  ]) {
    system.addProcess(card);
  }

  const log = system.consumeProcesses(1, {});
  const messages = log.map((entry) => entry.toJSON().publicMessage);
  const stuckMessages = messages.filter((message) => message.includes('the process was stuck due to the ongoing DDoS attack'));

  assert.equal(stuckMessages.length, 2);
  assert.ok(stuckMessages.every((message) => message.includes('attempted to process')));
  assert.equal(system.incidentEvents.filter((event) => event.outcome === 'deferred-by-ddos').length, 2);
});

test('project progress quota scales by player count', () => {
  const fourPlayerSystem = new GameSystem(4);
  assert.equal(fourPlayerSystem.numTasks, 12);
  assert.equal(fourPlayerSystem.totalTasks, 12);

  const fivePlayerSystem = new GameSystem(5);
  assert.equal(fivePlayerSystem.numTasks, 15);
  assert.equal(fivePlayerSystem.totalTasks, 15);
});
