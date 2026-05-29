const { Hacker } = require('../models/Player');

const MIN_PLAY_DELAY_MS = 2000;
const MAX_PLAY_DELAY_MS = 10000;
const MIN_VOTE_DELAY_MS = 5000;
const MAX_VOTE_DELAY_MS = 10000;

function randomDelayMs(min = MIN_PLAY_DELAY_MS, max = MAX_PLAY_DELAY_MS, rng = Math.random) {
  const low = Math.max(0, Number(min) || 0);
  const high = Math.max(low, Number(max) || low);
  return Math.floor(low + rng() * (high - low + 1));
}

function isBotLobbyPlayer(player) {
  return Boolean(player?.isBot);
}

function isBotGamePlayer(player) {
  return Boolean(player?.isBot);
}

function nextBotName(players = []) {
  const used = new Set(players.map(player => player.name));
  let index = 1;
  while (used.has(`Bot ${index}`)) index += 1;
  return `Bot ${index}`;
}

function createBotLobbyPlayer(players = []) {
  const name = nextBotName(players);
  return {
    name,
    socketId: null,
    ready: true,
    connected: true,
    sessionToken: `bot-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    isBot: true,
  };
}

function activeOpponents(game, player) {
  return (game?.players || []).filter(candidate => candidate.name !== player.name);
}

function randomOtherPlayerName(game, player, rng = Math.random) {
  const others = activeOpponents(game, player);
  if (others.length === 0) return null;
  return others[Math.floor(rng() * others.length)].name;
}

function firstPlayable(game, player, cards, predicate = () => true) {
  return (cards || []).find(card => {
    if (!card || !predicate(card)) return false;
    if (card.hackerOnly && !(player instanceof Hacker)) return false;
    return typeof card.isPlayable === 'function' ? card.isPlayable(game.system) : true;
  }) || null;
}

function taskLooksReady(game, task) {
  if (!task || task.type !== 'task') return false;
  const lanes = Array.isArray(task.requiredLanes) ? task.requiredLanes : [];
  if (lanes.length === 0) return false;
  return lanes.every(lane => game.system?.isLaneDefended?.(lane));
}

function chooseSecurityCard(game, player, rng = Math.random) {
  const hand = player.cards || [];
  if (taskLooksReady(game, player.task)) return player.task;

  const taskLanes = (player.task?.requiredLanes || []);
  const usefulDefence = firstPlayable(game, player, hand, card => card.type === 'defence' && taskLanes.includes(card.lane));
  if (usefulDefence) return usefulDefence;

  const rapid = firstPlayable(game, player, hand, card => card.name === 'Rapid Incident Response');
  if (rapid && rng() < 0.2) return rapid;

  const defence = firstPlayable(game, player, hand, card => card.type === 'defence');
  if (defence) return defence;

  const forensic = firstPlayable(game, player, hand, card => card.name === 'Forensic Analysis');
  if (forensic) return forensic;

  const log = firstPlayable(game, player, hand, card => card.name === 'Check Server Log');
  if (log) return log;

  return firstPlayable(game, player, hand, card => !card.hackerOnly && card.type !== 'attack');
}

function chooseHackerCards(game, player, rng = Math.random) {
  const hand = player.cards || [];
  const hackerCard = firstPlayable(game, player, hand, card => card.hackerOnly || card.type === 'attack');
  const securityCard = chooseSecurityCard(game, player, rng);
  const cards = [];
  if (hackerCard) cards.push(hackerCard);
  if (securityCard && securityCard.id !== hackerCard?.id) cards.push(securityCard);
  return cards.slice(0, 2);
}

function chooseSubmission(game, player, rng = Math.random) {
  if (!game || !player || player.awaitingDrawChoice) return { cardIds: [], cardOptions: {} };

  const cards = player instanceof Hacker
    ? chooseHackerCards(game, player, rng)
    : [chooseSecurityCard(game, player, rng)].filter(Boolean);

  const cardOptions = {};
  for (const card of cards) {
    if (card.name === 'Check Server Log' || card.name === 'False Flag') {
      cardOptions[card.id] = { targetPlayerName: randomOtherPlayerName(game, player, rng) };
    }
  }

  return { cardIds: cards.map(card => card.id), cardOptions };
}

function chooseDiscardIds(player) {
  if (!player?.mustDiscard?.()) return [];
  return (player.cards || []).slice(0, player.discardCount()).map(card => card.id);
}

function chooseVoteProposalResponse(rng = Math.random) {
  return rng() >= 0.5;
}

function chooseVoteTarget(game, botPlayer, rng = Math.random) {
  const eligible = (game?.currentVote?.eligible || [])
    .filter(name => name !== botPlayer.name && game.getPlayer(name));
  if (eligible.length === 0) return null;

  const counts = new Map();
  for (const accusedName of Object.values(game.currentVote?.votes || {})) {
    if (!eligible.includes(accusedName)) continue;
    counts.set(accusedName, (counts.get(accusedName) || 0) + 1);
  }

  let best = null;
  let bestCount = 0;
  for (const [name, count] of counts.entries()) {
    if (count > bestCount) {
      best = name;
      bestCount = count;
    }
  }

  if (best) return best;
  return eligible[Math.floor(rng() * eligible.length)];
}

function markBotsDiscussionReady(game) {
  const results = [];
  for (const player of game?.players || []) {
    if (isBotGamePlayer(player) && game.turnPhase === 'discussion' && !game.discussionReady[player.name]) {
      results.push({ playerName: player.name, ...game.markDiscussionReady(player.name) });
    }
  }
  return results;
}

function playBotNow(game, botPlayer, rng = Math.random) {
  if (!game || !botPlayer || !isBotGamePlayer(botPlayer)) return { ok: false, error: 'Not a bot player' };
  if (game.phase !== 'playing' || game.turnPhase !== 'play') return { ok: false, error: 'Bot cannot play outside play phase' };
  if (game.turnSubmissions[botPlayer.name] !== undefined) return { ok: true, skipped: true };

  if (botPlayer instanceof Hacker && botPlayer.awaitingDrawChoice) {
    game.chooseHackerDraw(botPlayer.name, { security: 1, hacker: 1 });
  }

  const { cardIds, cardOptions } = chooseSubmission(game, botPlayer, rng);
  return game.submitCards(botPlayer.name, cardIds, cardOptions);
}

function discardBotNow(game, botPlayer) {
  if (!game || !botPlayer || !isBotGamePlayer(botPlayer)) return { ok: false, error: 'Not a bot player' };
  if (!botPlayer.mustDiscard()) return { ok: true, skipped: true };
  const ids = chooseDiscardIds(botPlayer);
  return game.discardCards(botPlayer.name, ids, { force: true });
}

module.exports = {
  MIN_PLAY_DELAY_MS,
  MAX_PLAY_DELAY_MS,
  MIN_VOTE_DELAY_MS,
  MAX_VOTE_DELAY_MS,
  randomDelayMs,
  isBotLobbyPlayer,
  isBotGamePlayer,
  nextBotName,
  createBotLobbyPlayer,
  chooseSubmission,
  chooseDiscardIds,
  chooseVoteProposalResponse,
  chooseVoteTarget,
  markBotsDiscussionReady,
  playBotNow,
  discardBotNow,
};
