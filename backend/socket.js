/**
 * socket.js
 *
 * Socket.IO event handlers for lobby, spectators, reconnects, and gameplay.
 */

const crypto = require('crypto');
const { rooms, onlineState } = require('./rooms');
const Game = require('./models/Game');
const BotRuntime = require('./bots/botRuntime');
const { createBotLobbyPlayer } = require('./bots/botLogic');

const DISCUSSION_DURATION_MS = Game.DISCUSSION_DURATION_MS || 120000;
const PLAY_DURATION_MS = Game.PLAY_DURATION_MS || 30000;
const DISCARD_DURATION_MS = Game.DISCARD_DURATION_MS || 10000;

// ── Lobby helpers ────────────────────────────────────────────────────────────

function createParticipantToken() {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : crypto.randomBytes(16).toString('hex');
}

function createLobbyPlayer(name, socketId, sessionToken = createParticipantToken()) {
  return { name, socketId, ready: false, connected: true, sessionToken };
}

function createSpectator(name, socketId, sessionToken = createParticipantToken()) {
  return { name, socketId, connected: true, sessionToken };
}

function tokenMatches(entry, token) {
  return Boolean(entry?.sessionToken && token && entry.sessionToken === token);
}

function slimPlayer(p) {
  return { name: p.name, ready: p.ready, connected: p.connected !== false, isBot: Boolean(p.isBot) };
}

function slimSpectator(p) {
  return { name: p.name, connected: p.connected !== false };
}

function generateRoomCode() {
  let code;
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (rooms[code]);
  return code;
}

function socketIsLive(io, socketId) {
  return Boolean(socketId && io.sockets.sockets.get(socketId));
}

function emitLobbyUpdate(io, room) {
  const roomData = rooms[room];
  if (!roomData) return;
  io.to(room).emit(
    'players-update',
    roomData.players.map(slimPlayer),
    (roomData.spectators || []).map(slimSpectator)
  );
}

function findGameParticipant(game, name) {
  if (!game) return null;
  return game.players.find(p => p.name === name)
    || game.eliminated.find(p => p.name === name)
    || null;
}

function markGameParticipantOffline(roomData, name, socketId = null) {
  const player = findGameParticipant(roomData.game, name);
  if (player && (!socketId || player.socketId === socketId)) {
    player.socketId = null;
  }
}

function reconnectGameParticipant(io, roomData, name, socket, sessionToken = null) {
  const player = findGameParticipant(roomData.game, name);
  if (!player) return null;

  const lobbyEntry = roomData.players.find(p => p.name === name);
  if (lobbyEntry?.sessionToken && !tokenMatches(lobbyEntry, sessionToken)) return { error: 'duplicate' };
  if (player.socketId && player.socketId !== socket.id && socketIsLive(io, player.socketId)) return { error: 'duplicate' };

  player.socketId = socket.id;
  player.sessionToken = lobbyEntry?.sessionToken || sessionToken || player.sessionToken;
  if (lobbyEntry) {
    lobbyEntry.socketId = socket.id;
    lobbyEntry.connected = true;
  }
  return { player };
}

function upsertSpectator(io, roomData, name, socket, sessionToken = null) {
  roomData.spectators = roomData.spectators || [];
  const existing = roomData.spectators.find(s => s.name === name);

  if (existing) {
    if (!tokenMatches(existing, sessionToken)) return { error: 'duplicate' };
    if (existing.socketId && existing.socketId !== socket.id && socketIsLive(io, existing.socketId)) return { error: 'duplicate' };
    existing.socketId = socket.id;
    existing.connected = true;
    return { spectator: existing, reconnected: true };
  }

  const spectator = createSpectator(name, socket.id, sessionToken || createParticipantToken());
  roomData.spectators.push(spectator);
  return { spectator, reconnected: false };
}

// ── Main handler ─────────────────────────────────────────────────────────────

module.exports = function(io) {
  const onlinePlayersInterval = setInterval(() => {
    io.emit('online-players', onlineState.count);
  }, 60000);
  if (typeof onlinePlayersInterval.unref === 'function') onlinePlayersInterval.unref();

  io.on('connection', (socket) => {
    onlineState.count++;
    console.log(`Connected: ${socket.id}  Online: ${onlineState.count}`);
    socket.emit('online-players', onlineState.count);

    // ── Lobby ──────────────────────────────────────────────────────────────

    socket.on('create-room', (playerName) => {
      const room = generateRoomCode();
      const creator = createLobbyPlayer(playerName, socket.id);
      rooms[room] = {
        id: room,
        players: [creator],
        spectators: [],
        leader: playerName,
        started: false,
        game: null,
        turnTimer: null,
        turnTimerKind: null,
        botTimers: new Set(),
      };
      socket.join(room);
      socket.emit('room-created', room, { participantToken: creator.sessionToken });
      socket.emit('set-leader', playerName);
      emitLobbyUpdate(io, room);
      console.log(`Room ${room} created by ${playerName}`);
    });

    socket.on('join-room', (room, playerName, options = {}) => {
      const roomData = rooms[room];
      if (!roomData) return socket.emit('non-existent-error');

      const wantsSpectator = Boolean(options?.spectator);
      const sessionToken = options?.participantToken || options?.sessionToken || null;
      roomData.spectators = roomData.spectators || [];

      // Existing active player names are reserved. They can only be reclaimed by
      // reconnecting after the old socket is gone.
      const existingLobbyPlayer = roomData.players.find(p => p.name === playerName);
      const existingLobbySpectator = roomData.spectators.find(p => p.name === playerName);

      if (roomData.started) {
        if (roomData.game?.phase === 'ended') {
          return socket.emit('game-ended-error', 'That simulation has already ended. Return to the room lobby instead of rejoining the finished game.');
        }

        const reconnect = reconnectGameParticipant(io, roomData, playerName, socket, sessionToken);
        if (reconnect?.error === 'duplicate') return socket.emit('duplicate-name-error');
        if (reconnect?.player) {
          socket.join(room);
          socket.emit('join-success', room, { started: true, spectator: false, reconnected: true, participantToken: reconnect.player.sessionToken });
          _emitPrivateStates(io, room, roomData);
          emitLobbyUpdate(io, room);
          console.log(`${playerName} reconnected to active game ${room}`);
          return;
        }

        if (existingLobbyPlayer && socketIsLive(io, existingLobbyPlayer.socketId)) {
          return socket.emit('duplicate-name-error');
        }

        const spec = upsertSpectator(io, roomData, playerName, socket, sessionToken);
        if (spec.error === 'duplicate') return socket.emit('duplicate-name-error');
        socket.join(room);
        socket.emit('join-success', room, { started: true, spectator: true, participantToken: spec.spectator.sessionToken });
        _emitPrivateStates(io, room, roomData);
        emitLobbyUpdate(io, room);
        console.log(`${playerName} joined active game ${room} as spectator`);
        return;
      }

      if (wantsSpectator) {
        if (existingLobbyPlayer) return socket.emit('duplicate-name-error');
        const spec = upsertSpectator(io, roomData, playerName, socket, sessionToken);
        if (spec.error === 'duplicate') return socket.emit('duplicate-name-error');
        socket.join(room);
        socket.emit('join-success', room, { started: false, spectator: true, participantToken: spec.spectator.sessionToken });
        emitLobbyUpdate(io, room);
        console.log(`${playerName} joined room ${room} as spectator`);
        return;
      }

      if (existingLobbySpectator && socketIsLive(io, existingLobbySpectator.socketId)) {
        return socket.emit('duplicate-name-error');
      }

      if (existingLobbyPlayer) {
        if (!tokenMatches(existingLobbyPlayer, sessionToken)) return socket.emit('duplicate-name-error');
        if (existingLobbyPlayer.socketId && existingLobbyPlayer.socketId !== socket.id && socketIsLive(io, existingLobbyPlayer.socketId)) return socket.emit('duplicate-name-error');
        existingLobbyPlayer.socketId = socket.id;
        existingLobbyPlayer.connected = true;
        socket.join(room);
        socket.emit('join-success', room, { started: false, spectator: false, reconnected: true, participantToken: existingLobbyPlayer.sessionToken });
        emitLobbyUpdate(io, room);
        console.log(`${playerName} reconnected to lobby ${room}`);
        return;
      }

      const connectedPlayerCount = roomData.players.filter(p => p.connected !== false).length;
      if (connectedPlayerCount >= 5) return socket.emit('full-error');

      const newPlayer = createLobbyPlayer(playerName, socket.id);
      roomData.players.push(newPlayer);
      socket.join(room);
      socket.emit('join-success', room, { started: false, spectator: false, participantToken: newPlayer.sessionToken });
      emitLobbyUpdate(io, room);
      console.log(`${playerName} joined room ${room}`);
    });

    socket.on('resume-session', ({ room, playerName, participantToken, sessionToken } = {}) => {
      const roomData = rooms[room];
      const resumeToken = participantToken || sessionToken || null;
      if (!roomData || !playerName || !resumeToken) return socket.emit('resume-failed');

      if (roomData.started) {
        if (roomData.game?.phase === 'ended') {
          return socket.emit('resume-failed', 'ended');
        }

        const reconnect = reconnectGameParticipant(io, roomData, playerName, socket, resumeToken);
        if (reconnect?.error === 'duplicate') return socket.emit('resume-failed', 'duplicate');
        if (reconnect?.player) {
          socket.join(room);
          socket.emit('resume-success', room, { started: true, spectator: false, reconnected: true, participantToken: reconnect.player.sessionToken });
          _emitPrivateStates(io, room, roomData);
          emitLobbyUpdate(io, room);
          console.log(`${playerName} resumed active game ${room}`);
          return;
        }

        const spectator = (roomData.spectators || []).find(s => s.name === playerName);
        if (spectator) {
          const spec = upsertSpectator(io, roomData, playerName, socket, resumeToken);
          if (spec.error === 'duplicate') return socket.emit('resume-failed', 'duplicate');
          socket.join(room);
          socket.emit('resume-success', room, { started: true, spectator: true, reconnected: true, participantToken: spec.spectator.sessionToken });
          _emitPrivateStates(io, room, roomData);
          emitLobbyUpdate(io, room);
          return;
        }

        return socket.emit('resume-failed');
      }

      const lobbyPlayer = roomData.players.find(p => p.name === playerName);
      if (lobbyPlayer) {
        if (!tokenMatches(lobbyPlayer, resumeToken)) return socket.emit('resume-failed', 'duplicate');
        if (lobbyPlayer.socketId && lobbyPlayer.socketId !== socket.id && socketIsLive(io, lobbyPlayer.socketId)) {
          return socket.emit('resume-failed', 'duplicate');
        }
        lobbyPlayer.socketId = socket.id;
        lobbyPlayer.connected = true;
        socket.join(room);
        socket.emit('resume-success', room, { started: false, spectator: false, reconnected: true, participantToken: lobbyPlayer.sessionToken });
        emitLobbyUpdate(io, room);
        return;
      }

      const spectator = (roomData.spectators || []).find(s => s.name === playerName);
      if (spectator) {
        const spec = upsertSpectator(io, roomData, playerName, socket, resumeToken);
        if (spec.error === 'duplicate') return socket.emit('resume-failed', 'duplicate');
        socket.join(room);
        socket.emit('resume-success', room, { started: false, spectator: true, reconnected: true, participantToken: spec.spectator.sessionToken });
        emitLobbyUpdate(io, room);
        return;
      }

      socket.emit('resume-failed');
    });

    socket.on('kick-player', (room, name, playerName) => {
      const roomData = rooms[room];
      if (!roomData || name !== roomData.leader || roomData.started) return socket.emit('non-existent-error');
      roomData.players = roomData.players.filter(p => p.name !== playerName);
      emitLobbyUpdate(io, room);
    });

    socket.on('add-bot', (room, name) => {
      const roomData = rooms[room];
      if (!roomData || name !== roomData.leader || roomData.started) return socket.emit('non-existent-error');
      if ((roomData.players || []).length >= 5) return socket.emit('game-error', 'Room is full. Remove a player before adding a bot.');
      const bot = createBotLobbyPlayer(roomData.players || []);
      roomData.players.push(bot);
      emitLobbyUpdate(io, room);
    });

    socket.on('player-ready', (room, name) => {
      const roomData = rooms[room];
      if (!roomData || roomData.started) return;
      const player = roomData.players.find(p => p.name === name && p.connected !== false);
      if (!player) return;
      player.ready = true;
      emitLobbyUpdate(io, room);
    });

    socket.on('player-unready', (room, name) => {
      const roomData = rooms[room];
      if (!roomData || roomData.started) return;
      const player = roomData.players.find(p => p.name === name && p.connected !== false);
      if (!player) return;
      player.ready = false;
      emitLobbyUpdate(io, room);
    });

    socket.on('check-room', (room) => {
      const roomData = rooms[room];
      roomData
        ? socket.emit('room-exists', roomData.players.map(slimPlayer), { started: roomData.started })
        : socket.emit('room-not-found');
    });

    socket.on('get-players', (room) => {
      const roomData = rooms[room];
      if (roomData) {
        socket.emit(
          'players-update',
          roomData.players.map(slimPlayer),
          (roomData.spectators || []).map(slimSpectator)
        );
      }
    });

    socket.on('leave-room', (room, playerName) => {
      const roomData = rooms[room];
      if (!roomData) return;

      const spectatorIdx = (roomData.spectators || []).findIndex(p => p.name === playerName);
      if (spectatorIdx !== -1) {
        if (roomData.started) {
          roomData.spectators[spectatorIdx].connected = false;
          roomData.spectators[spectatorIdx].socketId = null;
          console.log(`${playerName} paused spectating room ${room}`);
        } else {
          const [removed] = roomData.spectators.splice(spectatorIdx, 1);
          console.log(`${removed.name} stopped spectating room ${room}`);
        }
        socket.leave(room);
        emitLobbyUpdate(io, room);
        return;
      }

      const idx = roomData.players.findIndex(p => p.name === playerName);
      if (idx === -1) return;

      if (roomData.started) {
        roomData.players[idx].connected = false;
        roomData.players[idx].socketId = null;
        markGameParticipantOffline(roomData, playerName);
        console.log(`${playerName} disconnected from active room ${room}`);
      } else {
        const [removed] = roomData.players.splice(idx, 1);
        console.log(`${removed.name} left room ${room}`);
        if (roomData.leader === removed.name && roomData.players.length > 0) {
          roomData.leader = roomData.players[0].name;
        }
      }

      socket.leave(room);
      emitLobbyUpdate(io, room);
    });

    socket.on('return-to-lobby', ({ room, playerName } = {}) => {
      const roomData = rooms[room];
      if (!roomData) return socket.emit('non-existent-error');
      if (roomData.game?.phase !== 'ended') return;

      // The finished game is no longer resumable. Keep the room and roster,
      // but reset everyone to the waiting-room state for a future match.
      roomData.started = false;
      roomData.game = null;

      for (const player of roomData.players || []) {
        player.ready = false;
        if (player.name === playerName) {
          player.socketId = socket.id;
          player.connected = true;
        } else if (!socketIsLive(io, player.socketId)) {
          player.connected = false;
          player.socketId = null;
        }
      }

      for (const spectator of roomData.spectators || []) {
        if (!socketIsLive(io, spectator.socketId)) {
          spectator.connected = false;
          spectator.socketId = null;
        }
      }

      socket.join(room);
      io.to(room).emit('returned-to-lobby', room);
      emitLobbyUpdate(io, room);
      console.log(`${playerName || socket.id} returned ended room ${room} to lobby`);
    });

    // ── Start game ─────────────────────────────────────────────────────────

    socket.on('start-game', (room, name) => {
      const roomData = rooms[room];
      if (!roomData) return socket.emit('non-existent-error');
      if (name !== roomData.leader) return;

      const connectedPlayers = roomData.players.filter(p => p.connected !== false);
      if (connectedPlayers.length < 4) return socket.emit('game-error', 'Intrusion requires 4-5 connected players.');
      if (connectedPlayers.length > 5) return socket.emit('game-error', 'Intrusion supports a maximum of 5 players.');

      roomData.players = connectedPlayers;
      roomData.started = true;
      try {
        roomData.game = new Game(roomData.players);
      } catch (err) {
        roomData.started = false;
        return socket.emit('game-error', err.message);
      }
      roomData.game.start();
      roomData.game.dealStartOfTurn({ startDiscussion: true });
      BotRuntime.readyDiscussionBots(roomData.game);
      _scheduleDiscussionTimer(io, room, roomData);

      _emitPrivateStates(io, room, roomData);
      io.to(room).emit('start-confirm');
      console.log(`Room ${room} game started by ${name}`);
    });

    // ── Gameplay ───────────────────────────────────────────────────────────

    socket.on('turn-ready', ({ room, playerName } = {}) => {
      const roomData = rooms[room];
      const game = _game(socket, room);
      if (!game) return;

      const result = game.markDiscussionReady(playerName || _playerNameBySocket(room, socket.id));
      if (!result.ok) return socket.emit('game-error', result.error);

      socket.emit('turn-ready-ack', { allReady: result.allReady });
      _emitPrivateStates(io, room, roomData);
      if (result.allReady) _startPlayTimer(io, room, roomData);
    });


    socket.on('choose-hacker-draw', ({ room, playerName, security = 0, hacker = 0 }) => {
      const roomData = rooms[room];
      const game = _game(socket, room);
      if (!game) return;

      const result = game.chooseHackerDraw(playerName, { security, hacker });
      if (!result.ok) return socket.emit('game-error', result.error);

      socket.emit('hacker-draw-ack', {
        mustDiscard: result.mustDiscard,
        discardCount: result.discardCount,
      });
      _emitPrivateStates(io, room, roomData);
    });

    socket.on('submit-cards', ({ room, playerName, cardNames, cardIds, cardOptions }) => {
      const roomData = rooms[room];
      const game = _game(socket, room);
      if (!game) return;

      const result = game.submitCards(playerName, cardIds ?? cardNames ?? [], cardOptions ?? {});
      if (!result.ok) return socket.emit('game-error', result.error);

      socket.emit('submit-ack', {
        mustDiscard: result.mustDiscard,
        discardCount: result.discardCount,
      });

      _emitPrivateStates(io, room, roomData);
      _maybeAdvanceAfterSubmissions(io, room, roomData);
    });

    socket.on('discard-cards', ({ room, playerName, cardNames, cardIds }) => {
      const roomData = rooms[room];
      const game = _game(socket, room);
      if (!game) return;

      const result = game.discardCards(playerName, cardIds ?? cardNames ?? []);
      if (!result.ok) return socket.emit('game-error', result.error);

      socket.emit('discard-ack', {
        mustDiscard: result.mustDiscard,
        discardCount: result.discardCount,
      });
      _emitPrivateStates(io, room, roomData);
      _maybeResolveAfterDiscards(io, room, roomData);
    });

    socket.on('replace-task', ({ room, playerName }) => {
      const roomData = rooms[room];
      const game = _game(socket, room);
      if (!game) return;

      const result = game.replaceTask(playerName);
      socket.emit('task-replaced', result);
      _emitPrivateStates(io, room, roomData);
    });

    socket.on('set-mitigation-target', ({ room, cardName }) => {
      const game = _game(socket, room);
      if (!game) return;
      game.system.threatMitigationTarget = cardName;
      socket.emit('mitigation-target-set', { cardName });
    });

    socket.on('request-game-state', ({ room, playerName, participantToken, sessionToken } = {}) => {
      const roomData = rooms[room];
      const game = _game(socket, room);
      if (!game) return;

      const token = participantToken || sessionToken || null;
      const participant = findGameParticipant(game, playerName);
      const spectator = (roomData.spectators || []).find(s => s.name === playerName);

      if (participant && participant.socketId !== socket.id) {
        const reconnect = reconnectGameParticipant(io, roomData, playerName, socket, token);
        if (reconnect?.error === 'duplicate' || !reconnect?.player) {
          return socket.emit('game-error', 'Could not reconnect to that player slot. Use Join / Resume Room from the home page.');
        }
        socket.join(room);
        emitLobbyUpdate(io, room);
      } else if (spectator && spectator.socketId !== socket.id) {
        const spec = upsertSpectator(io, roomData, playerName, socket, token);
        if (spec.error === 'duplicate') {
          return socket.emit('game-error', 'Could not reconnect to that spectator slot. Use Join / Resume Room from the home page.');
        }
        socket.join(room);
        emitLobbyUpdate(io, room);
      }

      socket.emit('game-state', game.toClientJSON(playerName, {
        roomSpectators: roomData.spectators || [],
      }));
    });

    // ── Voting ─────────────────────────────────────────────────────────────

    socket.on('call-vote', ({ room }) => {
      const roomData = rooms[room];
      const game = _game(socket, room);
      if (!game) return;

      const caller = _playerNameBySocket(room, socket.id);
      const result = game.proposeVote(caller);
      if (!result.ok) return socket.emit('game-error', result.error);

      if (result.outcome === 'started') {
        io.to(room).emit('vote-started');
        _scheduleBotFormalVotes(io, room, roomData);
      } else {
        io.to(room).emit('vote-proposed', { callerName: caller });
        _scheduleBotVoteProposalResponses(io, room, roomData);
      }
      _emitPrivateStates(io, room, roomData);
    });

    socket.on('respond-vote-proposal', ({ room, playerName, proceed }) => {
      const roomData = rooms[room];
      const game = _game(socket, room);
      if (!game) return;

      const responder = playerName || _playerNameBySocket(room, socket.id);
      const result = game.respondVoteProposal(responder, Boolean(proceed));
      if (!result.ok) return socket.emit('game-error', result.error);

      if (result.outcome === 'started') {
        io.to(room).emit('vote-started');
        _scheduleBotFormalVotes(io, room, roomData);
      } else if (result.outcome === 'deferred') {
        io.to(room).emit('vote-proposal-deferred', { callerName: result.callerName });
      } else {
        io.to(room).emit('vote-proposal-updated', result.proposal || null);
      }
      _emitPrivateStates(io, room, roomData);
    });

    socket.on('cast-vote', ({ room, voterName, accusedName }) => {
      const roomData = rooms[room];
      const game = _game(socket, room);
      if (!game) return;

      const result = game.castVote(voterName, accusedName);
      if (!result.ok) return socket.emit('game-error', result.error);

      if (result.waiting) {
        io.to(room).emit('vote-cast', { voterName });
        return;
      }

      io.to(room).emit('vote-resolved', {
        outcome: result.outcome,
        eliminated: result.eliminated ?? null,
        votingExpired: result.votingExpired ?? false,
      });

      if (result.win) io.to(room).emit('game-over', result.win);
      _emitPrivateStates(io, room, roomData);
    });

    // ── Disconnect ─────────────────────────────────────────────────────────

    socket.on('disconnect', () => {
      onlineState.count--;

      for (const [roomId, roomData] of Object.entries(rooms)) {
        let touched = false;

        for (const player of roomData.players || []) {
          if (player.socketId === socket.id) {
            player.connected = false;
            player.socketId = null;
            markGameParticipantOffline(roomData, player.name, socket.id);
            touched = true;
            console.log(`${player.name} disconnected from ${roomId}. Online: ${onlineState.count}`);
          }
        }

        for (const spectator of roomData.spectators || []) {
          if (spectator.socketId === socket.id) {
            spectator.connected = false;
            spectator.socketId = null;
            touched = true;
            console.log(`${spectator.name} spectator disconnected from ${roomId}. Online: ${onlineState.count}`);
          }
        }

        if (touched) {
          emitLobbyUpdate(io, roomId);
          return;
        }
      }

      console.log(`Socket ${socket.id} not in any room. Online: ${onlineState.count}`);
    });
  });
};

// ── Private helpers ───────────────────────────────────────────────────────────

function _game(socket, room) {
  const roomData = rooms[room];
  if (!roomData?.game) {
    socket.emit('game-error', 'No game in progress');
    return null;
  }
  return roomData.game;
}

function _emitPrivateStates(io, room, roomData) {
  const game = roomData?.game;
  if (!game) return;

  for (const player of [...game.players, ...game.getSpectators()]) {
    const sock = io.sockets.sockets.get(player.socketId);
    if (sock) {
      sock.emit('game-state', game.toClientJSON(player.name, {
        roomSpectators: roomData.spectators || [],
      }));
    }
  }

  for (const spectator of roomData.spectators || []) {
    const sock = io.sockets.sockets.get(spectator.socketId);
    if (sock) {
      sock.emit('game-state', game.toClientJSON(spectator.name, {
        roomSpectators: roomData.spectators || [],
      }));
    }
  }
}

function _clearTurnTimer(roomData) {
  if (roomData?.turnTimer) clearTimeout(roomData.turnTimer);
  if (roomData) {
    roomData.turnTimer = null;
    roomData.turnTimerKind = null;
  }
}

function _clearBotTimers(roomData) {
  BotRuntime.clear(roomData);
}

function _scheduleDiscussionTimer(io, room, roomData) {
  _clearTurnTimer(roomData);
  _clearBotTimers(roomData);
  BotRuntime.readyDiscussionBots(roomData.game);
  roomData.turnTimerKind = 'discussion';
  roomData.turnTimer = setTimeout(() => _startPlayTimer(io, room, roomData), DISCUSSION_DURATION_MS);
  if (typeof roomData.turnTimer.unref === 'function') roomData.turnTimer.unref();
}

function _startPlayTimer(io, room, roomData) {
  const game = roomData?.game;
  if (!game || game.phase !== 'playing') return;
  _clearTurnTimer(roomData);
  _clearBotTimers(roomData);
  game.autoChooseOutstandingDraws();
  game.startPlayPhase(PLAY_DURATION_MS);
  _emitPrivateStates(io, room, roomData);
  BotRuntime.schedulePlayBots({ io, room, roomData, onAfterBotAction: _afterBotPlayAction });

  roomData.turnTimerKind = 'play';
  roomData.turnTimer = setTimeout(() => {
    game.autoPassMissingPlayers();
    _emitPrivateStates(io, room, roomData);
    _startDiscardOrResolve(io, room, roomData);
  }, PLAY_DURATION_MS);
  if (typeof roomData.turnTimer.unref === 'function') roomData.turnTimer.unref();
}

function _startDiscardOrResolve(io, room, roomData) {
  const game = roomData?.game;
  if (!game || game.phase !== 'playing') return;
  if (!game.allPlayersSubmitted()) return;

  if (game.hasPendingDiscards()) {
    _clearTurnTimer(roomData);
    game.startDiscardPhase(DISCARD_DURATION_MS);
    _emitPrivateStates(io, room, roomData);
    BotRuntime.discardBotsNow(game);
    _emitPrivateStates(io, room, roomData);
    if (game.canResolveTurn()) {
      _resolveTurn(io, room, roomData);
      return;
    }
    roomData.turnTimerKind = 'discard';
    roomData.turnTimer = setTimeout(() => {
      game.autoDiscardOutstanding();
      _emitPrivateStates(io, room, roomData);
      _maybeResolveAfterDiscards(io, room, roomData);
    }, DISCARD_DURATION_MS);
    if (typeof roomData.turnTimer.unref === 'function') roomData.turnTimer.unref();
    return;
  }

  _resolveTurn(io, room, roomData);
}

function _maybeAdvanceAfterSubmissions(io, room, roomData) {
  const game = roomData?.game;
  if (!game?.allPlayersSubmitted()) return;
  _startDiscardOrResolve(io, room, roomData);
}

function _maybeResolveAfterDiscards(io, room, roomData) {
  const game = roomData?.game;
  if (!game?.canResolveTurn()) return;
  _resolveTurn(io, room, roomData);
}

function _resolveTurn(io, room, roomData) {
  _clearTurnTimer(roomData);
  _clearBotTimers(roomData);
  const game = roomData.game;
  const summary = game.resolveTurn();

  const recipients = [
    ...game.players.map(player => ({ name: player.name, socketId: player.socketId })),
    ...game.getSpectators().map(player => ({ name: player.name, socketId: player.socketId })),
    ...(roomData.spectators || []).map(spectator => ({ name: spectator.name, socketId: spectator.socketId })),
  ];

  for (const recipient of recipients) {
    const sock = io.sockets.sockets.get(recipient.socketId);
    if (!sock) continue;

    sock.emit('turn-resolved', {
      turnNumber: summary.turnNumber,
      log: summary.log,
      system: summary.system,
      win: summary.win || null,
      turnDebug: summary.turnDebug || null,
      incidentReport: [
        ...(summary.incidentReport || []),
        ...((summary.privateIncidentReports || {})[recipient.name] || []),
      ],
    });
  }

  if (summary.reconResult) {
    const hacker = game.getHacker();
    if (hacker) {
      const hackerSock = io.sockets.sockets.get(hacker.socketId);
      if (hackerSock) hackerSock.emit('recon-result', summary.reconResult);
    }
  }

  for (const result of summary.serverLogResults || []) {
    const player = game.getPlayer(result.ownerName)
      || game.getSpectators().find(p => p.name === result.ownerName)
      || (roomData.spectators || []).find(p => p.name === result.ownerName);
    const playerSock = player ? io.sockets.sockets.get(player.socketId) : null;
    if (playerSock) playerSock.emit('server-log-result', result);
  }

  if (summary.win) {
    io.to(room).emit('game-over', summary.win);
    return;
  }

  game.dealStartOfTurn({ startDiscussion: true });
  _scheduleDiscussionTimer(io, room, roomData);
  _emitPrivateStates(io, room, roomData);
}

function _maybeResolveTurn(io, room, roomData) {
  _maybeResolveAfterDiscards(io, room, roomData);
}


function _afterBotPlayAction(io, room, roomData) {
  _emitPrivateStates(io, room, roomData);
  _maybeAdvanceAfterSubmissions(io, room, roomData);
}

function _scheduleBotVoteProposalResponses(io, room, roomData) {
  BotRuntime.scheduleVoteProposalBots({
    io,
    room,
    roomData,
    onAfterBotResponse: _afterBotVoteProposalResponse,
  });
}

function _afterBotVoteProposalResponse(io, room, roomData, result) {
  if (!result?.ok) return;
  if (result.outcome === 'started') {
    io.to(room).emit('vote-started');
    _scheduleBotFormalVotes(io, room, roomData);
  } else if (result.outcome === 'deferred') {
    io.to(room).emit('vote-proposal-deferred', { callerName: result.callerName });
  } else {
    io.to(room).emit('vote-proposal-updated', result.proposal || null);
  }
  _emitPrivateStates(io, room, roomData);
}

function _scheduleBotFormalVotes(io, room, roomData) {
  BotRuntime.scheduleFormalVoteBots({
    io,
    room,
    roomData,
    onAfterBotVote: _afterBotFormalVote,
  });
}

function _afterBotFormalVote(io, room, roomData, result, voterName) {
  if (!result?.ok) return;
  if (result.waiting) {
    io.to(room).emit('vote-cast', { voterName });
    _emitPrivateStates(io, room, roomData);
    return;
  }

  io.to(room).emit('vote-resolved', {
    outcome: result.outcome,
    eliminated: result.eliminated ?? null,
    votingExpired: result.votingExpired ?? false,
  });

  if (result.win) io.to(room).emit('game-over', result.win);
  _emitPrivateStates(io, room, roomData);
}

function _playerNameBySocket(room, socketId) {
  const roomData = rooms[room];
  return roomData?.players?.find(p => p.socketId === socketId)?.name ?? null;
}
