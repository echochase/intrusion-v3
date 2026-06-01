const test = require('node:test');
const assert = require('node:assert/strict');
const {
  Game,
  GameSystem,
  actions,
  attacks,
  defences,
  tasks,
  withFixedRandom,
  withQuietConsole,
  lobbyPlayers,
  createStartedGame,
  getHacker,
  getEngineer,
  putInHand,
  setTask,
  passAllExcept,
  submitAndAssert,
  addInstalledDefence,
} = require('../support/gameTestUtils');

test('game setup enforces player bounds and deals role-appropriate private state', () => {
  assert.throws(() => new Game(lobbyPlayers(['A', 'B', 'C'])), /4-5 players/);
  assert.throws(() => new Game(lobbyPlayers(['A', 'B', 'C', 'D', 'E', 'F'])), /4-5 players/);

  const game = withFixedRandom(0, () => {
    const started = new Game(lobbyPlayers(['A', 'B', 'C', 'D', 'E']));
    started.start();
    return started;
  });

  assert.equal(game.players.length, 5);
  assert.equal(game.system.totalTasks, 15);
  assert.equal(game.getHacker().name, 'A');
  assert.equal(game.getEngineers().length, 4);
  assert.equal(game.getHacker().cards.length, 5);
  assert.ok(game.getHacker().cards.some((card) => card.type === 'defence'));

  for (const engineer of game.getEngineers()) {
    assert.equal(engineer.cards.length, 4);
    assert.ok(engineer.task, `${engineer.name} should receive a starting task`);
  }

  const viewerState = game.toClientJSON('B');
  const self = viewerState.players.find((player) => player.name === 'B');
  const hiddenHacker = viewerState.players.find((player) => player.name === 'A');
  const otherEngineer = viewerState.players.find((player) => player.name === 'C');

  assert.ok(Array.isArray(self.cards));
  assert.equal(hiddenHacker.cards, undefined);
  assert.equal(otherEngineer.cards, undefined);
  assert.equal(hiddenHacker.role, 'hidden');
});

test('turn start draw choice gates Hacker submissions and validates exact deck counts', () => {
  const game = createStartedGame();
  const hacker = getHacker(game);
  const engineer = getEngineer(game);
  const engineerHandBefore = engineer.cards.length;
  const hackerHandBefore = hacker.cards.length;

  game.turnNumber = 2;
  game.dealStartOfTurn();

  assert.equal(hacker.awaitingDrawChoice, true);
  assert.equal(engineer.cards.length, engineerHandBefore + 1);
  assert.match(game.submitCards(hacker.name, []).error, /Choose your deck draw first/i);
  assert.match(game.chooseHackerDraw(engineer.name, { security: 1, hacker: 1 }).error, /Only the hacker/i);
  assert.match(game.chooseHackerDraw(hacker.name, { security: 2, hacker: 2 }).error, /exactly 2 cards/i);
  assert.match(game.chooseHackerDraw(hacker.name, { security: -1, hacker: 3 }).error, /exactly 2 cards/i);

  const chosen = game.chooseHackerDraw(hacker.name, { security: 1, hacker: 1 });
  assert.equal(chosen.ok, true);
  assert.equal(hacker.awaitingDrawChoice, false);
  assert.equal(hacker.cards.length, hackerHandBefore + 2);
  assert.equal(chosen.mustDiscard, hacker.cards.length > 5);
  assert.equal(chosen.discardCount, Math.max(0, hacker.cards.length - 5));

  assert.match(game.chooseHackerDraw(hacker.name, { security: 1, hacker: 1 }).error, /already chosen/i);
});

test('task replacement is one-per-turn and is blocked after submission', () => {
  const game = createStartedGame();
  const engineer = getEngineer(game, 0);
  const oldTask = engineer.task;

  const replaced = game.replaceTask(engineer.name);
  assert.equal(replaced.ok, true);
  assert.ok(engineer.task);
  assert.notEqual(engineer.task.id, oldTask.id);
  assert.ok(game.taskDeck.discardPile.some((card) => card.id === oldTask.id));
  assert.match(game.replaceTask(engineer.name).error, /only replace your task once/i);

  const submitter = getEngineer(game, 1);
  assert.equal(game.submitCards(submitter.name, []).ok, true);
  assert.match(game.replaceTask(submitter.name).error, /after submitting/i);
});

test('completed task counts, replaces the task slot, and keeps other players private', () => {
  const game = createStartedGame();
  const engineer = getEngineer(game, 0);
  const viewer = getEngineer(game, 1);
  const task = setTask(engineer, new tasks.CompanyMeeting());
  addInstalledDefence(game.system, new defences.EmployeeAwareness(engineer));

  submitAndAssert(game, engineer, [task.id]);
  passAllExcept(game, engineer.name);

  withQuietConsole(() => game.resolveTurn());

  assert.equal(game.taskCompletionCounts[engineer.name], 1);
  assert.ok(engineer.task);
  assert.notEqual(engineer.task.id, task.id);

  const state = game.toClientJSON(viewer.name);
  const completedEngineer = state.players.find((player) => player.name === engineer.name);
  assert.equal(completedEngineer.tasksCompleted, 1);
  assert.equal(completedEngineer.cards, undefined);
});

test('vote flow requires proposal approval, eliminates a wrong target, and expires voting rights', () => {
  const game = createStartedGame();
  game.turnNumber = 3;
  const [firstEngineer, secondEngineer, thirdEngineer] = game.getEngineers();
  const hacker = getHacker(game);

  const proposal = game.proposeVote(firstEngineer.name);
  assert.equal(proposal.ok, true);
  assert.equal(proposal.waiting, true);
  assert.equal(proposal.proposal.threshold, 2);

  const started = game.respondVoteProposal(secondEngineer.name, true);
  assert.deepEqual(started, { ok: true, outcome: 'started' });
  assert.equal(game.phase, 'voting');

  assert.equal(game.castVote(hacker.name, firstEngineer.name).waiting, true);
  assert.equal(game.castVote(firstEngineer.name, secondEngineer.name).waiting, true);
  assert.equal(game.castVote(secondEngineer.name, firstEngineer.name).waiting, true);
  const result = game.castVote(thirdEngineer.name, firstEngineer.name);

  assert.equal(result.ok, true);
  assert.equal(result.outcome, 'wrong-player');
  assert.equal(result.eliminated, firstEngineer.name);
  assert.equal(result.votingExpired, true);
  assert.equal(game.phase, 'playing');
  assert.equal(game.getPlayer(firstEngineer.name), null);
  assert.ok(game.getSpectators().some((player) => player.name === firstEngineer.name));
  assert.match(game.proposeVote(secondEngineer.name).error, /already been used/i);
});

test('unanimous engineer vote against the Hacker ends the game immediately', () => {
  const game = createStartedGame();
  game.turnNumber = 3;
  const [firstEngineer, secondEngineer, thirdEngineer] = game.getEngineers();
  const hacker = getHacker(game);

  assert.equal(game.proposeVote(firstEngineer.name).waiting, true);
  assert.deepEqual(game.respondVoteProposal(secondEngineer.name, true), { ok: true, outcome: 'started' });

  assert.equal(game.castVote(hacker.name, firstEngineer.name).waiting, true);
  assert.equal(game.castVote(firstEngineer.name, hacker.name).waiting, true);
  assert.equal(game.castVote(secondEngineer.name, hacker.name).waiting, true);
  const result = game.castVote(thirdEngineer.name, hacker.name);

  assert.equal(result.ok, true);
  assert.equal(result.outcome, 'hacker-caught');
  assert.equal(result.eliminated, hacker.name);
  assert.deepEqual(result.win, { winner: 'engineers', reason: 'Hacker voted out' });
  assert.equal(game.phase, 'ended');
  assert.equal(game.winner, 'engineers');
});

test('integrity damage clamps at zero and ignores non-positive values', () => {
  const system = new GameSystem(4);

  system.takeDamage(0);
  system.takeDamage(-2);
  assert.equal(system.integrityPoints, 4);
  assert.equal(system.currentCardEvents.length, 0);

  system.takeDamage(99);
  assert.equal(system.integrityPoints, 0);
  assert.equal(system.checkLoss(), true);
  assert.deepEqual(system.currentCardEvents.at(-1), {
    kind: 'integrity-loss',
    amount: 99,
    before: 4,
    after: 0,
  });
});

test('card references cannot be duplicated across hand and task submissions', () => {
  const game = createStartedGame();
  const hacker = getHacker(game);
  const attack = new attacks.Phishing();
  const forensic = new actions.ForensicAnalysis();
  putInHand(hacker, [attack, forensic]);

  game.turnNumber = 2;
  const duplicateHandCard = game.submitCards(hacker.name, [attack.id, attack.id]);
  assert.equal(duplicateHandCard.ok, false);
  assert.match(duplicateHandCard.error, /not found in your hand or task slot/i);

  const task = setTask(hacker, new tasks.CompanyMeeting());
  const duplicateTask = game.submitCards(hacker.name, [task.id, task.id]);
  assert.equal(duplicateTask.ok, false);
  assert.match(duplicateTask.error, /not found in your hand or task slot/i);
});
