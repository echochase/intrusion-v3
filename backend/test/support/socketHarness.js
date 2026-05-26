const http = require('node:http');
const { Server } = require('socket.io');
const { io: Client } = require('socket.io-client');
const socketHandler = require('../../socket');
const { rooms, onlineState } = require('../../rooms');

function resetRooms() {
  for (const key of Object.keys(rooms)) delete rooms[key];
  onlineState.count = 0;
}

async function createSocketHarness() {
  resetRooms();

  const httpServer = http.createServer();
  const io = new Server(httpServer, {
    cors: { origin: '*', credentials: true },
  });
  socketHandler(io);

  await new Promise((resolve) => httpServer.listen(0, resolve));
  const port = httpServer.address().port;
  const url = `http://127.0.0.1:${port}`;
  const clients = [];

  const connectClient = async () => {
    const client = Client(url, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });
    clients.push(client);
    await waitForEvent(client, 'connect');
    return client;
  };

  const close = async () => {
    for (const client of clients) {
      if (client.connected) client.disconnect();
    }
    await new Promise((resolve) => io.close(resolve));
    await new Promise((resolve) => httpServer.close(resolve));
    resetRooms();
  };

  return { io, httpServer, url, rooms, connectClient, close };
}

function waitForEvent(client, event, timeoutMs = 1000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      client.off(event, onEvent);
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeoutMs);

    function onEvent(...args) {
      clearTimeout(timer);
      resolve(args);
    }

    client.once(event, onEvent);
  });
}

async function expectNoEvent(client, event, timeoutMs = 120) {
  let seen = false;
  const handler = () => { seen = true; };
  client.on(event, handler);
  await new Promise((resolve) => setTimeout(resolve, timeoutMs));
  client.off(event, handler);
  if (seen) throw new Error(`Expected no ${event} event`);
}

async function createStartedRoom(names = ['Alice', 'Bob', 'Cara', 'Dev']) {
  const harness = await createSocketHarness();
  const clients = [];
  for (let i = 0; i < names.length; i++) clients.push(await harness.connectClient());

  const roomCreated = waitForEvent(clients[0], 'room-created');
  clients[0].emit('create-room', names[0]);
  const [room, createMeta] = await roomCreated;

  const participantTokens = { [names[0]]: createMeta.participantToken };
  for (let i = 1; i < names.length; i++) {
    const joined = waitForEvent(clients[i], 'join-success');
    clients[i].emit('join-room', room, names[i]);
    const [, meta] = await joined;
    participantTokens[names[i]] = meta.participantToken;
  }

  const statePromises = clients.map((client) => waitForEvent(client, 'game-state'));
  const startConfirms = clients.map((client) => waitForEvent(client, 'start-confirm'));
  clients[0].emit('start-game', room, names[0]);
  const states = (await Promise.all(statePromises)).map(([state]) => state);
  await Promise.all(startConfirms);

  return { ...harness, clients, names, room, participantTokens, states };
}

module.exports = {
  createSocketHarness,
  createStartedRoom,
  waitForEvent,
  expectNoEvent,
  resetRooms,
};
