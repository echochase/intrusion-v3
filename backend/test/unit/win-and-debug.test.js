const test = require('node:test');
const assert = require('node:assert/strict');
const {
  actions,
  attacks,
  defences,
  tasks,
  createStartedGame,
  getHacker,
  getEngineer,
  putInHand,
  setTask,
  passAllExcept,
  submitAndAssert,
  addInstalledDefence,
  withQuietConsole,
} = require('../support/gameTestUtils');

test('the Hacker wins when integrity reaches zero', () => {
  const game = createStartedGame();
  const hacker = getHacker(game);
  const [attack] = putInHand(hacker, [new attacks.CredentialTheft()]);

  game.system.integrityPoints = 1;
  game.turnNumber = 2;
  submitAndAssert(game, hacker, [attack.id]);
  passAllExcept(game, hacker.name);

  const { result: summary } = withQuietConsole(() => game.resolveTurn());

  assert.deepEqual(summary.win, { winner: 'hacker', reason: 'System integrity reached zero' });
  assert.equal(game.phase, 'ended');
});

test('the engineers win when the final task progress is completed', () => {
  const game = createStartedGame();
  const engineer = getEngineer(game);
  const finalTask = setTask(engineer, new tasks.CompanyMeeting());

  game.system.numTasks = 1;
  game.system.totalTasks = 1;
  addInstalledDefence(game.system, new defences.EmployeeAwareness(engineer));

  submitAndAssert(game, engineer, [finalTask.id]);
  passAllExcept(game, engineer.name);

  const { result: summary } = withQuietConsole(() => game.resolveTurn());

  assert.deepEqual(summary.win, { winner: 'engineers', reason: 'Project completed' });
  assert.equal(game.phase, 'ended');
});

test('turn debug logs are concise but include submissions, order, outcomes, and final board state', () => {
  const game = createStartedGame();
  const hacker = getHacker(game);
  const engineer = getEngineer(game);
  const [attack] = putInHand(hacker, [new attacks.CredentialTheft()]);
  const [rapid] = putInHand(engineer, [new actions.RapidIncidentResponseAction()]);

  game.turnNumber = 2;
  submitAndAssert(game, hacker, [attack.id]);
  submitAndAssert(game, engineer, [rapid.id]);
  passAllExcept(game, [hacker.name, engineer.name]);

  const { lines } = withQuietConsole(() => game.resolveTurn());
  const output = lines.join('\n');

  assert.match(output, /= {0,}/);
  assert.match(output, /TURN 2 DEBUG/);
  assert.match(output, /SUBMISSIONS/);
  assert.match(output, /RESOLUTION ORDER/);
  assert.match(output, /RESOLUTION RESULTS/);
  assert.match(output, /Rapid Incident Response/);
  assert.match(output, /RIR nullified Credential Theft/);
  assert.match(output, /FINAL: integrity=/);
  assert.match(output, /DEFENCES:/);
});
