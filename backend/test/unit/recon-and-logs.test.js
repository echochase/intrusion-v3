const test = require('node:test');
const assert = require('node:assert/strict');
const {
  actions,
  attacks,
  createStartedGame,
  getHacker,
  getEngineer,
  putInHand,
  passAllExcept,
  submitAndAssert,
  withQuietConsole,
} = require('../support/gameTestUtils');

test('Reconnaissance is not hostile and does not make Check Server Log flag the Hacker', () => {
  const game = createStartedGame();
  const hacker = getHacker(game);
  const engineer = getEngineer(game);
  const [recon] = putInHand(hacker, [new actions.Reconnaissance()]);
  const [logCard] = putInHand(engineer, [new actions.CheckServerLog()]);

  game.system.evidence = 1;
  submitAndAssert(game, hacker, [recon.id]);
  submitAndAssert(game, engineer, [logCard.id], {
    [logCard.id]: { targetPlayerName: hacker.name },
  });
  passAllExcept(game, [hacker.name, engineer.name]);

  const { result: summary } = withQuietConsole(() => game.resolveTurn());

  assert.equal(summary.serverLogResults[0].targetName, hacker.name);
  assert.equal(summary.serverLogResults[0].hostile, false);
  assert.equal(summary.reconResult.ownerName, hacker.name);
  assert.equal(summary.reconResult.players.length, 3);
  assert.equal(summary.reconResult.players.some((player) => player.name === hacker.name), false);
  assert.equal(summary.reconResult.players.some((player) => player.name === engineer.name), true);
});

test('Check Server Log detects hostile attack submissions even if the attack has already resolved', () => {
  const game = createStartedGame();
  const hacker = getHacker(game);
  const engineer = getEngineer(game);
  const [attack] = putInHand(hacker, [new attacks.CredentialTheft()]);
  const [logCard] = putInHand(engineer, [new actions.CheckServerLog()]);

  game.system.evidence = 1;
  game.turnNumber = 2;
  submitAndAssert(game, hacker, [attack.id]);
  submitAndAssert(game, engineer, [logCard.id], {
    [logCard.id]: { targetPlayerName: hacker.name },
  });
  passAllExcept(game, [hacker.name, engineer.name]);

  const { result: summary } = withQuietConsole(() => game.resolveTurn());

  assert.equal(summary.serverLogResults[0].hostile, true);
  assert.match(summary.privateIncidentReports[engineer.name][0].message, /hostile card/i);
});

test('private server-log reports are only assigned to the checking player', () => {
  const game = createStartedGame();
  const hacker = getHacker(game);
  const checker = getEngineer(game, 0);
  const bystander = getEngineer(game, 1);
  const [attack] = putInHand(hacker, [new attacks.Phishing()]);
  const [logCard] = putInHand(checker, [new actions.CheckServerLog()]);

  game.system.evidence = 1;
  game.turnNumber = 2;
  submitAndAssert(game, hacker, [attack.id]);
  submitAndAssert(game, checker, [logCard.id], {
    [logCard.id]: { targetPlayerName: hacker.name },
  });
  passAllExcept(game, [hacker.name, checker.name]);

  const { result: summary } = withQuietConsole(() => game.resolveTurn());

  assert.ok(summary.privateIncidentReports[checker.name]);
  assert.equal(summary.privateIncidentReports[bystander.name], undefined);
});
