const test = require('node:test');
const assert = require('node:assert/strict');
const {
  GameSystem,
  Hacker,
  SecurityEngineer,
  attacks,
  actions,
  defences,
  tasks,
  addInstalledDefence,
} = require('../support/gameTestUtils');

test('turn resolution uses the documented priority buckets', () => {
  const system = new GameSystem(4);
  system.evidence = 1;

  const hacker = new Hacker('Hacker');
  const engineer = new SecurityEngineer('Engineer');
  const rapid = new actions.RapidIncidentResponseAction(engineer);
  const attack = new attacks.CredentialTheft(hacker);
  const defence = new defences.TwoFactorAuthentication(engineer);
  const logCheck = new actions.CheckServerLog(engineer);
  const task = new tasks.ResponsibleEngineer(engineer);
  const evidence = new actions.ForensicAnalysis(engineer);

  for (const card of [evidence, task, logCheck, defence, attack, rapid]) {
    card.owner = card.owner || engineer;
    system.addProcess(card);
  }

  system.consumeProcesses(7, {
    Hacker: [attack.toJSON()],
    Engineer: [rapid.toJSON(), defence.toJSON(), logCheck.toJSON(), task.toJSON(), evidence.toJSON()],
  });

  assert.deepEqual(
    system.turnDebug.orderedQueue.map((entry) => entry.name),
    [
      'Rapid Incident Response',
      'Credential Theft',
      'Two-Factor Authentication',
      'Check Server Log',
      'Responsible Engineer',
      'Forensic Analysis',
    ],
  );
});


test('Rapid Incident Response and Forensic Analysis resolve anonymously in public reports', () => {
  const system = new GameSystem(4);
  const engineer = new SecurityEngineer('Engineer');

  const rapid = new actions.RapidIncidentResponseAction(engineer);
  const forensic = new actions.ForensicAnalysis(engineer);
  system.addProcess(rapid);
  system.addProcess(forensic);

  const logs = system.consumeProcesses(2, {
    Engineer: [rapid.toJSON(), forensic.toJSON()],
  }).map((entry) => entry.toJSON());

  const rapidEvent = system.incidentEvents.find((event) => event.cardName === 'Rapid Incident Response');
  const forensicEvent = system.incidentEvents.find((event) => event.cardName === 'Forensic Analysis');

  assert.equal(rapidEvent.ownerName, null);
  assert.equal(forensicEvent.ownerName, null);
  assert.match(rapidEvent.message, /^Someone prepared Rapid Incident Response/);
  assert.match(forensicEvent.message, /^Someone completed Forensic Analysis/);

  assert.equal(logs.some((entry) => entry.publicMessage?.includes('Engineer')), false);
});

test('Rapid Incident Response nullifies one attack before it can affect integrity', () => {
  const system = new GameSystem(4);
  const hacker = new Hacker('Hacker');
  const engineer = new SecurityEngineer('Engineer');

  const rapid = new actions.RapidIncidentResponseAction(engineer);
  const attack = new attacks.CredentialTheft(hacker);
  system.addProcess(rapid);
  system.addProcess(attack);

  system.consumeProcesses(1, {});

  assert.equal(system.integrityPoints, 4);
  assert.equal(system.turnDebug.resolutionDetails.find((entry) => entry.card.name === 'Credential Theft').outcome, 'nullified');
  assert.ok(
    system.turnDebug.resolutionDetails.some((entry) =>
      entry.events.some((event) => event.kind === 'attack-nullified-by-action' && event.actionName === 'Rapid Incident Response'),
    ),
  );
});

test('a matching installed defence blocks the attack, prevents damage, and grants Evidence', () => {
  const system = new GameSystem(4);
  const hacker = new Hacker('Hacker');
  const engineer = new SecurityEngineer('Engineer');

  addInstalledDefence(system, new defences.TwoFactorAuthentication(engineer));
  system.addProcess(new attacks.CredentialTheft(hacker));

  system.consumeProcesses(1, {});

  assert.equal(system.integrityPoints, 4);
  assert.equal(system.evidence, 1);
  const detail = system.turnDebug.resolutionDetails[0];
  assert.equal(detail.outcome, 'blocked');
  assert.equal(detail.events[0].kind, 'attack-blocked');
  assert.equal(detail.events[0].defenceName, 'Two-Factor Authentication');
});

test('an open-lane attack removes integrity', () => {
  const system = new GameSystem(4);
  system.addProcess(new attacks.Phishing(new Hacker('Hacker')));

  system.consumeProcesses(1, {});

  assert.equal(system.integrityPoints, 3);
  assert.equal(system.turnDebug.resolutionDetails[0].outcome, 'breach');
});

test('DDoS on an open Network lane reduces processing capacity without cancelling already processed task progress', () => {
  const system = new GameSystem(4);
  const hacker = new Hacker('Hacker');
  const engineer = new SecurityEngineer('Engineer');

  addInstalledDefence(system, new defences.EmployeeAwareness(engineer));
  const beforeTasks = system.numTasks;
  system.addProcess(new attacks.DDoS(hacker));
  system.addProcess(new tasks.CompanyMeeting(engineer));

  system.consumeProcesses(1, {});

  assert.equal(system.taskProgressCancelled, false);
  assert.equal(system.turnDebug.capacity, 3);
  assert.equal(system.numTasks, beforeTasks - 1);
  const taskDetail = system.turnDebug.resolutionDetails.find((entry) => entry.card.name === 'Company Meeting');
  assert.equal(taskDetail.events.find((event) => event.kind === 'task-completed').progress, 1);
});

test('task cards only advance Project Progress when their lane is defended', () => {
  const system = new GameSystem(4);
  const beforeTasks = system.numTasks;
  system.addProcess(new tasks.HazardReport(new SecurityEngineer('Engineer')));

  system.consumeProcesses(1, {});

  assert.equal(system.numTasks, beforeTasks);
  assert.equal(system.projectProgressGainedThisTurn, 0);
  assert.equal(system.turnDebug.resolutionDetails[0].events.find((event) => event.kind === 'task-completed').progress, 0);
});
