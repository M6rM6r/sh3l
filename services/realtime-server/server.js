/**
 * Advanced WebSocket Real-Time Gaming Server
 * Node.js + Socket.io for multiplayer and real-time features
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Redis for pub/sub and session storage
const redis = new Redis(process.env.REDIS_URL);
const pubClient = new Redis(process.env.REDIS_URL);
const subClient = new Redis(process.env.REDIS_URL);

// PostgreSQL connection
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    socket.userId = decoded.sub;
    
    // Store user connection
    await redis.hset(`user:${decoded.sub}`, 'socketId', socket.id);
    await redis.expire(`user:${decoded.sub}`, 3600);
    
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

// Room management for multiplayer games
class GameRoom {
  constructor(roomId, gameType) {
    this.roomId = roomId;
    this.gameType = gameType;
    this.players = new Map();
    this.status = 'waiting'; // waiting, playing, ended
    this.startTime = null;
  }

  addPlayer(socket, userData) {
    this.players.set(socket.id, {
      socket,
      userId: userData.userId,
      username: userData.username,
      score: 0,
      ready: false
    });
    
    socket.join(this.roomId);
    this.broadcastPlayerList();
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    this.broadcastPlayerList();
    
    if (this.players.size === 0) {
      this.status = 'ended';
    }
  }

  setPlayerReady(socketId, ready) {
    const player = this.players.get(socketId);
    if (player) {
      player.ready = ready;
      this.checkAllReady();
    }
  }

  checkAllReady() {
    if (this.players.size >= 2 && 
        Array.from(this.players.values()).every(p => p.ready)) {
      this.startGame();
    }
  }

  startGame() {
    this.status = 'playing';
    this.startTime = Date.now();
    
    io.to(this.roomId).emit('game:start', {
      roomId: this.roomId,
      gameType: this.gameType,
      players: Array.from(this.players.values()).map(p => ({
        userId: p.userId,
        username: p.username
      }))
    });
    
    // Start game timer
    this.gameTimer = setTimeout(() => this.endGame(), 60000); // 60 seconds
  }

  updateScore(socketId, score) {
    const player = this.players.get(socketId);
    if (player && this.status === 'playing') {
      player.score = score;
      this.broadcastScores();
    }
  }

  broadcastScores() {
    const scores = Array.from(this.players.values()).map(p => ({
      userId: p.userId,
      username: p.username,
      score: p.score
    }));
    
    io.to(this.roomId).emit('game:scores', { scores });
  }

  broadcastPlayerList() {
    const players = Array.from(this.players.values()).map(p => ({
      userId: p.userId,
      username: p.username,
      ready: p.ready
    }));
    
    io.to(this.roomId).emit('room:players', { 
      players, 
      status: this.status,
      count: this.players.size 
    });
  }

  endGame() {
    this.status = 'ended';
    clearTimeout(this.gameTimer);
    
    const finalScores = Array.from(this.players.values())
      .sort((a, b) => b.score - a.score);
    
    io.to(this.roomId).emit('game:end', {
      winner: finalScores[0],
      finalScores
    });
    
    // Save results to database
    this.saveGameResults(finalScores);
  }

  async saveGameResults(scores) {
    const client = await pgPool.connect();
    try {
      for (const player of scores) {
        await client.query(
          `INSERT INTO multiplayer_sessions 
           (room_id, game_type, user_id, score, played_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [this.roomId, this.gameType, player.userId, player.score]
        );
      }
    } finally {
      client.release();
    }
  }
}

// Room registry
const gameRooms = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User ${socket.userId} connected: ${socket.id}`);

  // Join matchmaking queue
  socket.on('matchmaking:join', async (data) => {
    const { gameType } = data;
    const queueKey = `queue:${gameType}`;
    
    // Add to Redis queue
    await redis.lpush(queueKey, JSON.stringify({
      userId: socket.userId,
      socketId: socket.id,
      username: data.username,
      timestamp: Date.now()
    }));
    
    socket.emit('matchmaking:status', { status: 'searching' });
    
    // Check for match
    await tryMatchPlayers(gameType);
  });

  // Create private room
  socket.on('room:create', (data) => {
    const { gameType, roomId } = data;
    const room = new GameRoom(roomId || `room_${Date.now()}`, gameType);
    gameRooms.set(room.roomId, room);
    
    room.addPlayer(socket, { userId: socket.userId, username: data.username });
    socket.emit('room:created', { roomId: room.roomId });
  });

  // Join existing room
  socket.on('room:join', (data) => {
    const { roomId } = data;
    const room = gameRooms.get(roomId);
    
    if (room && room.status === 'waiting') {
      room.addPlayer(socket, { userId: socket.userId, username: data.username });
      socket.emit('room:joined', { roomId });
    } else {
      socket.emit('room:error', { message: 'Room not found or game already started' });
    }
  });

  // Player ready
  socket.on('player:ready', (data) => {
    const rooms = Array.from(gameRooms.values());
    const room = rooms.find(r => r.players.has(socket.id));
    if (room) {
      room.setPlayerReady(socket.id, data.ready);
    }
  });

  // Update score during game
  socket.on('game:score', (data) => {
    const rooms = Array.from(gameRooms.values());
    const room = rooms.find(r => r.players.has(socket.id));
    if (room) {
      room.updateScore(socket.id, data.score);
    }
  });

  // Leave queue or room
  socket.on('disconnect', async () => {
    // Remove from all queues
    const gameTypes = ['memory', 'speed', 'attention', 'flexibility'];
    for (const type of gameTypes) {
      const queue = await redis.lrange(`queue:${type}`, 0, -1);
      for (const item of queue) {
        const player = JSON.parse(item);
        if (player.socketId === socket.id) {
          await redis.lrem(`queue:${type}`, 0, item);
        }
      }
    }
    
    // Remove from rooms
    for (const room of gameRooms.values()) {
      if (room.players.has(socket.id)) {
        room.removePlayer(socket.id);
      }
    }
    
    await redis.hdel(`user:${socket.userId}`, 'socketId');
    console.log(`User ${socket.userId} disconnected`);
  });
});

// Matchmaking logic
async function tryMatchPlayers(gameType) {
  const queueKey = `queue:${gameType}`;
  const queueLength = await redis.llen(queueKey);
  
  if (queueLength >= 2) {
    // Get two players
    const player1Data = await redis.rpop(queueKey);
    const player2Data = await redis.rpop(queueKey);
    
    if (player1Data && player2Data) {
      const player1 = JSON.parse(player1Data);
      const player2 = JSON.parse(player2Data);
      
      // Create room
      const roomId = `match_${Date.now()}`;
      const room = new GameRoom(roomId, gameType);
      gameRooms.set(roomId, room);
      
      // Add players
      const socket1 = io.sockets.sockets.get(player1.socketId);
      const socket2 = io.sockets.sockets.get(player2.socketId);
      
      if (socket1 && socket2) {
        room.addPlayer(socket1, player1);
        room.addPlayer(socket2, player2);
        
        // Notify players
        socket1.emit('matchmaking:found', { roomId, opponent: player2.username });
        socket2.emit('matchmaking:found', { roomId, opponent: player1.username });
      }
    }
  }
}

// Real-time analytics broadcasting
setInterval(async () => {
  const metrics = await redis.hgetall('metrics:realtime');
  io.emit('analytics:realtime', metrics);
}, 5000);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    connections: io.engine.clientsCount,
    rooms: gameRooms.size
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
