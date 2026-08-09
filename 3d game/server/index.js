const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const { GameRoom } = require('./game');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static(path.join(__dirname, '..', 'public')));

const room = new GameRoom();

wss.on('connection', (ws) => {
  let playerId = null;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'join' && msg.name) {
        const player = room.addPlayer(ws, msg.name.substring(0, 16));
        playerId = player.id;
      } else if (playerId) {
        room.handleMessage(ws, msg);
      }
    } catch (e) { /* ignore bad messages */ }
  });

  ws.on('close', () => {
    room.removePlayer(ws);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n  🎯 3D Shooter server running`);
  console.log(`  Open http://localhost:${PORT} in your browser\n`);
});
