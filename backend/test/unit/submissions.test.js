const test = require('node:test');
const assert = require('node:assert/strict');
const {
  actions,
  attacks,
  defences,
  createStartedGame,
  getHacker,
  getEngineer,
  putInHand,
} = require('../support/gameTestUtils');

test('Security Engineers may submit at most one card', () => {
  const game = createStartedGame();
  const engineer = getEngineer(game);
  const [rapid, mitigation] = putInHand(engineer, [
    new actions.RapidIncidentResponseAction(),
    new actions.ForensicAnalysis(),
  ]);

  const tooMany = game.submitCards(engineer.name, [rapid.id, mitigation.id]);
  assert.equal(tooMany.ok, false);
  assert.match(tooMany.error, /Security Engineers may submit 1 card/i);

  const one = game.submitCards(engineer.name, [rapid.id]);
  assert.equal(one.ok, true);
});

test('the Hacker may submit one Hacker card plus one Security card, but not two Hacker cards', () => {
  const game = createStartedGame();
  const hacker = getHacker(game);
  const [attack, recon, securityCard] = putInHand(hacker, [
    new attacks.CredentialTheft(),
    new actions.Reconnaissance(),
    new actions.ForensicAnalysis(),
  ]);

  const twoHackerCards = game.submitCards(hacker.name, [attack.id, recon.id]);
  assert.equal(twoHackerCards.ok, false);
  assert.match(twoHackerCards.error, /at most 1 Hacker card and 1 Security card/i);

  const validMix = game.submitCards(hacker.name, [attack.id, securityCard.id]);
  assert.equal(validMix.ok, true);
});

test('Security Engineers cannot submit Hacker-only cards', () => {
  const game = createStartedGame();
  const engineer = getEngineer(game);
  const [attack] = putInHand(engineer, [new attacks.Phishing()]);

  const result = game.submitCards(engineer.name, [attack.id]);
  assert.equal(result.ok, false);
  assert.match(result.error, /not a security card/i);
});

test('Check Server Log is not playable without Evidence and is playable with Evidence', () => {
  const game = createStartedGame();
  const engineer = getEngineer(game);
  const [logCard] = putInHand(engineer, [new actions.CheckServerLog()]);

  const withoutEvidence = game.submitCards(engineer.name, [logCard.id]);
  assert.equal(withoutEvidence.ok, false);
  assert.match(withoutEvidence.error, /cannot be played right now/i);

  game.system.evidence = 1;
  const withEvidence = game.submitCards(engineer.name, [logCard.id], {
    [logCard.id]: { targetPlayerName: getHacker(game).name },
  });
  assert.equal(withEvidence.ok, true);
});

test('a player cannot submit twice in the same turn', () => {
  const game = createStartedGame();
  const engineer = getEngineer(game);

  assert.equal(game.submitCards(engineer.name, []).ok, true);
  const again = game.submitCards(engineer.name, []);
  assert.equal(again.ok, false);
  assert.match(again.error, /Already submitted/i);
});

test('a player who must discard cannot submit until the discard requirement is cleared', () => {
  const game = createStartedGame();
  const engineer = getEngineer(game);
  putInHand(engineer, [
    new actions.ForensicAnalysis(),
    new actions.RapidIncidentResponseAction(),
    new defences.EmployeeAwareness(),
    new defences.InputSanitisation(),
    new defences.SecurityDetail(),
    new defences.TwoFactorAuthentication(),
  ]);
  engineer.markDiscardIfNeeded();

  const allowedDuringPlay = game.submitCards(engineer.name, []);
  assert.equal(allowedDuringPlay.ok, true);

  game.startDiscardPhase();
  const discard = game.discardCards(engineer.name, [engineer.cards[0].id]);
  assert.equal(discard.ok, true);
});

test('the Hacker must choose their start-of-turn draw before submitting', () => {
  const game = createStartedGame();
  const hacker = getHacker(game);
  hacker.awaitingDrawChoice = true;

  const result = game.submitCards(hacker.name, []);
  assert.equal(result.ok, false);
  assert.match(result.error, /Choose your deck draw first/i);
});
