const test = require('node:test');
const assert = require('node:assert/strict');
const { createStartedRoom, waitForEvent, expectNoEvent } = require('../support/socketHarness');
const actions = require('../../models/cards/action');
const attacks = require('../../models/cards/attack');

test('socket start-game emits private state where only the viewer sees their own hand', async (t) => {
  const harness = await createStartedRoom();
  t.after(() => harness.close());

  const selfRoles = harness.states.map((state, index) => {
    const self = state.players.find((player) => player.name === harness.names[index]);
    assert.ok(Array.isArray(self.cards), `${self.name} should receive their private hand`);

    for (const other of state.players.filter((player) => player.name !== self.name && !player.isSpectator)) {
      assert.equal(other.cards, undefined, `${self.name} should not see ${other.name}'s cards`);
    }

    return self.role;
  });

  assert.equal(selfRoles.filter((role) => role === 'Hacker').length, 1);
  assert.equal(selfRoles.filter((role) => role === 'SecEng').length, 3);
});

test('socket turn simulation sends Reconnaissance only to the Hacker', async (t) => {
  const harness = await createStartedRoom();
  t.after(() => harness.close());

  const roomData = harness.rooms[harness.room];
  const game = roomData.game;
  const hacker = game.getHacker();
  game.startPlayPhase(30000);
  const hackerIndex = harness.names.indexOf(hacker.name);

  hacker.cards = [];
  hacker.addCard(new actions.Reconnaissance());
  for (const engineer of game.getEngineers()) engineer.cards = [];

  const reconPromise = waitForEvent(harness.clients[hackerIndex], 'recon-result');
  const turnPromises = harness.clients.map((client) => waitForEvent(client, 'turn-resolved'));

  for (let i = 0; i < harness.clients.length; i++) {
    const name = harness.names[i];
    const player = game.getPlayer(name);
    const cards = name === hacker.name ? [player.cards[0].id] : [];
    harness.clients[i].emit('submit-cards', {
      room: harness.room,
      playerName: name,
      cardIds: cards,
    });
  }

  const [recon] = await reconPromise;
  const turnSummaries = (await Promise.all(turnPromises)).map(([summary]) => summary);

  assert.equal(recon.ownerName, hacker.name);
  assert.equal(recon.players.length, 3);
  assert.equal(recon.players.some((player) => player.name === hacker.name), false);
  assert.equal(recon.players.every((player) => Array.isArray(player.cards)), true);
  assert.equal(turnSummaries.every((summary) => summary.turnNumber === 1), true);

  for (let i = 0; i < harness.clients.length; i++) {
    if (i === hackerIndex) continue;
    await expectNoEvent(harness.clients[i], 'recon-result');
  }
});

test('socket turn simulation sends server-log result only to the checking player', async (t) => {
  const harness = await createStartedRoom();
  t.after(() => harness.close());

  const roomData = harness.rooms[harness.room];
  const game = roomData.game;
  const hacker = game.getHacker();
  game.turnNumber = 2;
  game.startPlayPhase(30000);
  const checker = game.getEngineers()[0];
  const hackerIndex = harness.names.indexOf(hacker.name);
  const checkerIndex = harness.names.indexOf(checker.name);

  game.system.evidence = 1;
  hacker.cards = [];
  hacker.addCard(new attacks.Phishing());
  checker.cards = [];
  checker.addCard(new actions.CheckServerLog());
  for (const engineer of game.getEngineers().slice(1)) engineer.cards = [];

  const logPromise = waitForEvent(harness.clients[checkerIndex], 'server-log-result');
  const turnPromises = harness.clients.map((client) => waitForEvent(client, 'turn-resolved'));

  for (let i = 0; i < harness.clients.length; i++) {
    const name = harness.names[i];
    const player = game.getPlayer(name);
    let cardIds = [];
    let cardOptions = {};
    if (i === hackerIndex) cardIds = [hacker.cards[0].id];
    if (i === checkerIndex) {
      cardIds = [checker.cards[0].id];
      cardOptions = { [checker.cards[0].id]: { targetPlayerName: hacker.name } };
    }
    harness.clients[i].emit('submit-cards', {
      room: harness.room,
      playerName: name,
      cardIds,
      cardOptions,
    });
  }

  const [result] = await logPromise;
  await Promise.all(turnPromises);

  assert.equal(result.ownerName, checker.name);
  assert.equal(result.targetName, hacker.name);
  assert.equal(result.hostile, true);

  for (let i = 0; i < harness.clients.length; i++) {
    if (i === checkerIndex) continue;
    await expectNoEvent(harness.clients[i], 'server-log-result');
  }
});

test('socket join-room blocks rejoining a finished game', async (t) => {
  const harness = await createStartedRoom();
  t.after(() => harness.close());

  harness.rooms[harness.room].game.phase = 'ended';
  const lateClient = await harness.connectClient();
  const ended = waitForEvent(lateClient, 'game-ended-error');

  lateClient.emit('join-room', harness.room, 'Latecomer');
  const [message] = await ended;

  assert.match(message, /already ended/i);
});
