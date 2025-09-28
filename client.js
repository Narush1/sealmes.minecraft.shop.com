// --- Поддержка roundRect для Canvas ---
CanvasRenderingContext2D.prototype.roundRect = function (x, y, width, height, radius) {
  this.beginPath();
  this.moveTo(x + radius, y);
  this.lineTo(x + width - radius, y);
  this.quadraticCurveTo(x + width, y, x + width, y + radius);
  this.lineTo(x + width, y + height - radius);
  this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  this.lineTo(x + radius, y + height);
  this.quadraticCurveTo(x, y + height, x, y + height - radius);
  this.lineTo(x, y + radius);
  this.quadraticCurveTo(x, y, x + radius, y);
  this.closePath();
};

const socket = io();
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const joinScreen = document.getElementById('join-screen');
const nicknameInput = document.getElementById('nickname');
const colorInput = document.getElementById('color');
const startBtn = document.getElementById('startBtn');

const chatDiv = document.getElementById('chat');
const messagesDiv = document.getElementById('messages');
const chatInput = document.getElementById('chatInput');

let players = {};
let me = { x: 100, y: 100, direction: 'down', color: '#a84bd8', nickname: '' };

const keys = {};

const tracks = [
  "/good-night-lofi-cozy-chill-music-160166.mp3",
  "/cutie-japan-lofi-402355.mp3",
  "/lofi-study-calm-peaceful-chill-hop-112191.mp3"
];

let currentTrack = 0;
let audio = new Audio(tracks[currentTrack]);
audio.volume = 0.5;
audio.play();

audio.addEventListener("ended", () => {
  currentTrack = (currentTrack + 1) % tracks.length;
  audio.src = tracks[currentTrack];
  audio.play();
});

// Управление клавишами
window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

function movePlayer() {
  const speed = 3;
  let moved = false;

  if (keys['arrowup'] || keys['w']) {
    me.y = Math.max(0, me.y - speed);
    me.direction = 'up';
    moved = true;
  }
  if (keys['arrowdown'] || keys['s']) {
    me.y = Math.min(canvas.height - 30, me.y + speed);
    me.direction = 'down';
    moved = true;
  }
  if (keys['arrowleft'] || keys['a']) {
    me.x = Math.max(0, me.x - speed);
    me.direction = 'left';
    moved = true;
  }
  if (keys['arrowright'] || keys['d']) {
    me.x = Math.min(canvas.width - 30, me.x + speed);
    me.direction = 'right';
    moved = true;
  }

  if (moved) {
    socket.emit('move', { x: me.x, y: me.y, direction: me.direction });
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const id in players) {
    const p = players[id];

    ctx.save();
    ctx.translate(p.x + 15, p.y + 15);

    // Поворот в сторону движения
    let angle = 0;
    switch (p.direction) {
      case 'up': angle = -Math.PI / 2; break;
      case 'down': angle = Math.PI / 2; break;
      case 'left': angle = Math.PI; break;
      case 'right': angle = 0; break;
    }
    ctx.rotate(angle);

    // Сужение куба, если это ты и игрок двигается
    let scaleX = 1, scaleY = 1;
    if (id === socket.id && (keys['w'] || keys['a'] || keys['s'] || keys['d'] || keys['arrowup'] || keys['arrowdown'] || keys['arrowleft'] || keys['arrowright'])) {
      scaleX = 0.8;
      scaleY = 1.2;
    }
    ctx.scale(scaleX, scaleY);

    // Рисуем куб с закруглёнными углами
    ctx.fillStyle = p.color;
    ctx.roundRect(-15, -15, 30, 30, 6);
    ctx.fill();

    ctx.restore();

    // Если есть чат-сообщение, показываем его над кубом 1 сек
    if (p.chat) {
      ctx.font = 'bold 16px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'black';
      ctx.shadowBlur = 4;
      ctx.fillText(p.chat, p.x + 15, p.y - 10);
      ctx.shadowBlur = 0;
    }

    // Никнейм под кубом
    ctx.font = '14px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.textAlign = 'center';
    ctx.fillText(p.nickname, p.x + 15, p.y + 45);
  }
}

function gameLoop() {
  movePlayer();
  draw();
  requestAnimationFrame(gameLoop);
}

startBtn.onclick = () => {
  const nick = nicknameInput.value.trim();
  const col = colorInput.value;
  if (!nick) {
    alert('Введите ник!');
    return;
  }

  me.nickname = nick;
  me.color = col;

  socket.emit('join', { nickname: nick, color: col });

  joinScreen.style.display = 'none';
  canvas.style.display = 'block';
  chatDiv.style.display = 'flex';

  gameLoop();
};

socket.on('players', data => {
  players = data;
});

socket.on('chat', data => {
  if (players[data.id]) {
    players[data.id].chat = data.message;

    setTimeout(() => {
      if (players[data.id]) {
        players[data.id].chat = null;
      }
    }, 1000);
  }

  // Показ чата снизу
  const div = document.createElement('div');
  div.textContent = data.message;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && chatInput.value.trim()) {
    // Цензура: запрещённые слова пропускаем (только пример, маты разрешены)
    const forbidden = ['admin', 'moderator', 'server']; // пример запрещённых слов
    let msg = chatInput.value.trim();
    for (const word of forbidden) {
      const re = new RegExp(word, 'gi');
      if (re.test(msg)) {
        alert('Использование запрещённых слов запрещено!');
        chatInput.value = '';
        return;
      }
    }
    socket.emit('chat', msg);
    chatInput.value = '';
  }
});
