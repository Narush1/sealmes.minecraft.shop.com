const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const players = {};

io.on('connection', (socket) => {
  console.log('🟢 Player connected:', socket.id);

  socket.on('join', (data) => {
    players[socket.id] = {
      id: socket.id,
      nickname: data.nickname,
      color: data.color,
      x: 100,
      y: 100,
      direction: 'down',
    };
    io.emit('players', players);
  });

  socket.on('move', (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      players[socket.id].direction = data.direction;
      io.emit('players', players);
    }
  });

  socket.on('chat', (msg) => {
    if (players[socket.id]) {
      const filtered = msg.trim().slice(0, 100);
      io.emit('chat', {
        id: socket.id,
        message: filtered
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('🔴 Player disconnected:', socket.id);
    delete players[socket.id];
    io.emit('players', players);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
