const botLogic = require('./botLogic');

function ensureBotTimers(roomData) {
  if (!roomData.botTimers) roomData.botTimers = new Set();
  return roomData.botTimers;
}

function schedule(roomData, delayMs, fn) {
  const timers = ensureBotTimers(roomData);
  const timer = setTimeout(() => {
    timers.delete(timer);
    fn();
  }, delayMs);
  if (typeof timer.unref === 'function') timer.unref();
  timers.add(timer);
  return timer;
}

function clear(roomData) {
  for (const timer of roomData?.botTimers || []) clearTimeout(timer);
  if (roomData) roomData.botTimers = new Set();
}

function readyDiscussionBots(game) {
  return botLogic.markBotsDiscussionReady(game);
}

function schedulePlayBots({ io, room, roomData, onAfterBotAction, rng = Math.random }) {
  const game = roomData?.game;
  if (!game) return [];
  const timers = [];
  for (const player of game.players || []) {
    if (!botLogic.isBotGamePlayer(player)) continue;
    const delay = botLogic.randomDelayMs(botLogic.MIN_PLAY_DELAY_MS, botLogic.MAX_PLAY_DELAY_MS, rng);
    timers.push(schedule(roomData, delay, () => {
      if (game.phase !== 'playing' || game.turnPhase !== 'play') return;
      botLogic.playBotNow(game, player, rng);
      onAfterBotAction?.(io, room, roomData);
    }));
  }
  return timers;
}

function discardBotsNow(game) {
  const results = [];
  for (const player of game?.players || []) {
    if (!botLogic.isBotGamePlayer(player)) continue;
    if (player.mustDiscard()) results.push({ playerName: player.name, ...botLogic.discardBotNow(game, player) });
  }
  return results;
}

function scheduleVoteProposalBots({ io, room, roomData, onAfterBotResponse, rng = Math.random }) {
  const game = roomData?.game;
  if (!game?.voteProposal) return [];
  return (game.players || [])
    .filter(player => botLogic.isBotGamePlayer(player) && game.voteProposal.eligible.includes(player.name) && !game.voteProposal.responses[player.name])
    .map(player => schedule(roomData, botLogic.randomDelayMs(1000, 4000, rng), () => {
      if (!game.voteProposal) return;
      const result = game.respondVoteProposal(player.name, botLogic.chooseVoteProposalResponse(rng));
      onAfterBotResponse?.(io, room, roomData, result, player.name);
    }));
}

function scheduleFormalVoteBots({ io, room, roomData, onAfterBotVote, rng = Math.random }) {
  const game = roomData?.game;
  if (!game?.currentVote) return [];
  return (game.players || [])
    .filter(player => botLogic.isBotGamePlayer(player) && game.currentVote.eligible.includes(player.name) && !(player.name in game.currentVote.votes))
    .map(player => schedule(roomData, botLogic.randomDelayMs(botLogic.MIN_VOTE_DELAY_MS, botLogic.MAX_VOTE_DELAY_MS, rng), () => {
      if (!game.currentVote || player.name in game.currentVote.votes) return;
      const target = botLogic.chooseVoteTarget(game, player, rng);
      const result = target ? game.castVote(player.name, target) : { ok: false, error: 'No target' };
      onAfterBotVote?.(io, room, roomData, result, player.name);
    }));
}

module.exports = {
  clear,
  readyDiscussionBots,
  schedulePlayBots,
  discardBotsNow,
  scheduleVoteProposalBots,
  scheduleFormalVoteBots,
};
