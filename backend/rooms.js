/**
 * rooms.js
 *
 * Central in-memory store.
 *
 * rooms[roomCode] shape:
 * {
 *   id: string,
 *   leader: string,              // player name of room creator
 *   started: boolean,
 *   game: Game | null,           // null until 'start-game' fires
 *   players: LobbyPlayer[],      // { name, socketId, ready, connected }
 *   spectators: Spectator[],     // { name, socketId, connected }
 * }
 *
 * Player and spectator names remain reserved after disconnect so browser
 * refreshes can reconnect without losing the in-game handle.
 */

const rooms       = {};
const onlineState = { count: 0 };

module.exports = { rooms, onlineState };
