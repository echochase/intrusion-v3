const express = require('express');
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.CLIENT_ORIGIN,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());

let healthPingCount = 0;
let lastHealthPingAt = null;

app.get('/health', (req, res) => {
  const timestamp = new Date().toISOString();

  healthPingCount += 1;
  lastHealthPingAt = timestamp;

  console.log(`[health] Ping received at ${timestamp} | count=${healthPingCount}`);

  res.status(200).json({
    ok: true,
    service: 'intrusion-backend',
    timestamp,
    healthPingCount,
    lastHealthPingAt,
  });
});

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  },
});

const socketHandler = require('./socket');
socketHandler(io);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});