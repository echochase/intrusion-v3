const test = require('node:test');
const assert = require('node:assert/strict');
const {
  GameSystem,
  SecurityEngineer,
  defences,
  createStartedGame,
  getEngineer,
  putInHand,
  actions,
} = require('../support/gameTestUtils');

function names(system) {
  return system.defenceCards.map(card => card?.name || null);
}

test('defence slots behave as a priority queue and phase out the oldest defence', () => {
  const system = new GameSystem(4);
  const engineer = new SecurityEngineer('Engineer');

  system.installDefenceCard(new defences.TwoFactorAuthentication(engineer));
  system.installDefenceCard(new defences.EmployeeAwareness(engineer));
  system.installDefenceCard(new defences.InputSanitisation(engineer));
  assert.deepEqual(names(system), [
    'Two-Factor Authentication',
    'Employee Awareness',
    'Input Sanitisation',
  ]);

  const replaced = system.installDefenceCard(new defences.SecurityDetail(engineer));
  assert.equal(replaced.name, 'Two-Factor Authentication');
  assert.deepEqual(names(system), [
    'Employee Awareness',
    'Input Sanitisation',
    'Security Detail',
  ]);
});

test('discussion phase can end when every player privately marks ready', () => {
  const game = createStartedGame();
  game.startDiscussionPhase(120000);

  for (const player of game.players.slice(0, -1)) {
    const result = game.markDiscussionReady(player.name);
    assert.equal(result.ok, true);
    assert.equal(result.allReady, false);
  }

  const final = game.markDiscussionReady(game.players.at(-1).name);
  assert.equal(final.ok, true);
  assert.equal(final.allReady, true);
});

test('play timeout auto-passes idle players, then discard phase clears outstanding hands before resolution', () => {
  const game = createStartedGame();
  const engineer = getEngineer(game);
  putInHand(engineer, [
    new actions.RapidIncidentResponseAction(),
    new actions.ForensicAnalysis(),
    new defences.EmployeeAwareness(),
    new defences.InputSanitisation(),
    new defences.SecurityDetail(),
    new defences.TwoFactorAuthentication(),
  ]);
  engineer.markDiscardIfNeeded();

  game.startPlayPhase(30000);
  const passes = game.autoPassMissingPlayers();
  assert.equal(passes.length, game.players.length);
  assert.equal(game.allPlayersSubmitted(), true);
  assert.equal(game.hasPendingDiscards(), true);

  game.startDiscardPhase(10000);
  game.autoDiscardOutstanding();
  assert.equal(game.allDiscardsCleared(), true);
  assert.equal(game.canResolveTurn(), true);
  assert.equal(engineer.cards.length, 5);
});

test('public player state does not reveal which other players have submitted', () => {
  const game = createStartedGame();
  const engineer = getEngineer(game, 0);
  const other = getEngineer(game, 1);

  game.submitCards(engineer.name, []);
  const forOther = game.toClientJSON(other.name);
  const engineerRow = forOther.players.find(player => player.name === engineer.name);
  const otherRow = forOther.players.find(player => player.name === other.name);

  assert.equal(engineerRow.submittedThisTurn, false);
  assert.equal(otherRow.submittedThisTurn, false);
});
