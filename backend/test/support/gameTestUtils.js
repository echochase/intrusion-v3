const assert = require('node:assert/strict');
const Game = require('../../models/Game');
const GameSystem = require('../../models/GameSystem');
const { Hacker, SecurityEngineer } = require('../../models/Player');
const attacks = require('../../models/cards/attack');
const actions = require('../../models/cards/action');
const defences = require('../../models/cards/defence');
const tasks = require('../../models/cards/task');

const DEFAULT_NAMES = ['Alice', 'Bob', 'Cara', 'Dev'];

function withFixedRandom(value, fn) {
  const original = Math.random;
  Math.random = () => value;
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

function withQuietConsole(fn) {
  const originalLog = console.log;
  const lines = [];
  console.log = (...args) => { lines.push(args.join(' ')); };
  try {
    const result = fn(lines);
    return { result, lines };
  } finally {
    console.log = originalLog;
  }
}

async function withQuietConsoleAsync(fn) {
  const originalLog = console.log;
  const lines = [];
  console.log = (...args) => { lines.push(args.join(' ')); };
  try {
    const result = await fn(lines);
    return { result, lines };
  } finally {
    console.log = originalLog;
  }
}

function lobbyPlayers(names = DEFAULT_NAMES) {
  return names.map((name, index) => ({
    name,
    socketId: `socket-${index + 1}`,
    sessionToken: `token-${index + 1}`,
    connected: true,
    ready: true,
  }));
}

function createStartedGame(names = DEFAULT_NAMES) {
  return withFixedRandom(0, () => {
    const game = new Game(lobbyPlayers(names));
    game.start();
    game.dealStartOfTurn();
    return game;
  });
}

function getHacker(game) {
  const hacker = game.getHacker();
  assert.ok(hacker, 'expected the test game to have a hacker');
  return hacker;
}

function getEngineer(game, index = 0) {
  const engineers = game.getEngineers();
  assert.ok(engineers[index], `expected engineer at index ${index}`);
  return engineers[index];
}

function putInHand(player, cards) {
  player.cards = [];
  for (const card of cards) player.addCard(card);
  return cards;
}

function setTask(player, task) {
  task.owner = player;
  task.sourceDeck = 'task';
  player.task = task;
  return task;
}

function passAllExcept(game, names) {
  const keep = new Set(Array.isArray(names) ? names : [names]);
  for (const player of game.players) {
    if (!keep.has(player.name) && game.turnSubmissions[player.name] === undefined) {
      const result = game.submitCards(player.name, []);
      assert.equal(result.ok, true, `expected ${player.name} to be able to pass: ${result.error || ''}`);
    }
  }
}

function submitAndAssert(game, player, cardRefs, options = {}) {
  const result = game.submitCards(player.name, cardRefs, options);
  assert.equal(result.ok, true, `expected ${player.name} submission to succeed: ${result.error || ''}`);
  return result;
}

function addInstalledDefence(system, card) {
  const events = system.currentCardEvents;
  system.currentCardEvents = [];
  system.installDefenceCard(card);
  system.currentCardEvents = events;
  return card;
}

module.exports = {
  Game,
  GameSystem,
  Hacker,
  SecurityEngineer,
  attacks,
  actions,
  defences,
  tasks,
  withFixedRandom,
  withQuietConsole,
  withQuietConsoleAsync,
  lobbyPlayers,
  createStartedGame,
  getHacker,
  getEngineer,
  putInHand,
  setTask,
  passAllExcept,
  submitAndAssert,
  addInstalledDefence,
};
