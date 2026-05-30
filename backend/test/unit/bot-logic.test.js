const test = require('node:test');
const assert = require('node:assert/strict');
const botLogic = require('../../bots/botLogic');
const {
  createStartedGame,
  getEngineer,
  getHacker,
  putInHand,
  actions,
  attacks,
  defences,
} = require('../support/gameTestUtils');

test('bot play delays stay inside the 2-10 second action window', () => {
  assert.equal(botLogic.randomDelayMs(2000, 10000, () => 0), 2000);
  assert.equal(botLogic.randomDelayMs(2000, 10000, () => 0.9999) <= 10000, true);
});

test('bot vote delays stay inside the 5-10 second voting window', () => {
  assert.equal(botLogic.randomDelayMs(botLogic.MIN_VOTE_DELAY_MS, botLogic.MAX_VOTE_DELAY_MS, () => 0), 5000);
  assert.equal(botLogic.randomDelayMs(botLogic.MIN_VOTE_DELAY_MS, botLogic.MAX_VOTE_DELAY_MS, () => 0.9999) <= 10000, true);
});

test('bots mark discussion ready immediately and do not hold the table open', () => {
  const lobbyPlayers = [
    { name: 'Human 1', socketId: 's1', sessionToken: 't1', connected: true, ready: true },
    { name: 'Human 2', socketId: 's2', sessionToken: 't2', connected: true, ready: true },
    { name: 'Bot 1', socketId: null, sessionToken: 'b1', connected: true, ready: true, isBot: true },
    { name: 'Bot 2', socketId: null, sessionToken: 'b2', connected: true, ready: true, isBot: true },
  ];
  const Game = require('../../models/Game');
  const game = new Game(lobbyPlayers);
  game.start();
  game.dealStartOfTurn({ startDiscussion: true });

  const results = botLogic.markBotsDiscussionReady(game);
  assert.equal(results.length, 2);
  assert.equal(game.discussionReady['Bot 1'], true);
  assert.equal(game.discussionReady['Bot 2'], true);
});

test('a bot can submit during play and immediately discard if necessary', () => {
  const game = createStartedGame(['Bot 1', 'Alice', 'Bob', 'Cara']);
  const bot = game.players.find(player => player.name === 'Bot 1');
  bot.isBot = true;
  const [card] = putInHand(bot, [
    new defences.EmployeeAwareness(),
    new defences.InputSanitisation(),
    new defences.SecurityDetail(),
    new defences.TwoFactorAuthentication(),
    new actions.ForensicAnalysis(),
    new actions.RapidIncidentResponseAction(),
  ]);
  bot.markDiscardIfNeeded();

  game.startPlayPhase(30000);
  const play = botLogic.playBotNow(game, bot, () => 0);
  assert.equal(play.ok, true);
  assert.equal(game.turnSubmissions[bot.name].length, 1);

  game.startDiscardPhase(10000);
  const discard = botLogic.discardBotNow(game, bot);
  assert.equal(discard.ok, true);
  assert.equal(bot.mustDiscard(), false);
  assert.equal(bot.cards.length, 5);
  assert.notEqual(card.id, undefined);
});

test('bot vote targets follow the current plurality when votes exist', () => {
  const game = createStartedGame(['Bot 1', 'Alice', 'Bob', 'Cara']);
  const bot = game.players.find(player => player.name === 'Bot 1');
  bot.isBot = true;
  game.currentVote = {
    eligible: game.players.map(player => player.name),
    votes: { Alice: 'Bob', Cara: 'Bob' },
  };
  assert.equal(botLogic.chooseVoteTarget(game, bot, () => 0), 'Bob');
});

test('hacker bots do not play attack cards on the first turn', () => {
  const game = createStartedGame(['Bot 1', 'Alice', 'Bob', 'Cara']);
  const bot = getHacker(game);
  bot.isBot = true;
  putInHand(bot, [
    new attacks.DDoS(),
    new attacks.CredentialTheft(),
    new defences.EmployeeAwareness(),
  ]);

  const choice = botLogic.chooseSubmission(game, bot, () => 0);
  assert.equal(choice.cardIds.includes(bot.cards.find(card => card.name === 'DDoS Attack').id), false);
  assert.equal(choice.cardIds.includes(bot.cards.find(card => card.name === 'Credential Theft').id), false);

  const play = botLogic.playBotNow(game, bot, () => 0);
  assert.equal(play.ok, true);
  assert.equal((game.turnSubmissions[bot.name] || []).some(card => card.type === 'attack'), false);
});
