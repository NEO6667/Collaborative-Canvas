const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const RoomManager = require('./room-manager');
const OperationManager = require('./operation-manager');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true
  }
});

// Serve static files from client directory
app.use(express.static('client'));

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/client/index.html');
});

const roomManager = new RoomManager();
const operationManager = new OperationManager();

// Helper to generate unique user color
function generateUserColor(userId) {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', 
    '#118AB2', '#EF476F', '#7209B7', '#F72585',
    '#3A86FF', '#FB5607'
  ];
  const hash = userId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  return colors[Math.abs(hash) % colors.length];
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  let currentRoom = null;
  let userData = null;

  // Handle room joining
  socket.on('join-room', ({ roomId = 'default', username }) => {
    currentRoom = roomId;
    socket.join(roomId);
    
    userData = {
      id: socket.id,
      username: username || `User-${socket.id.slice(0, 4)}`,
      color: generateUserColor(socket.id),
      cursor: { x: 0, y: 0 }
    };
    
    roomManager.addUser(roomId, userData);
    
    // Send current room state to new user
    const roomState = roomManager.getRoomState(roomId);
    const operations = operationManager.getOperations(roomId);
    
    socket.emit('room-state', {
      users: roomState.users,
      operations: operations,
      canvasSize: roomState.canvasSize || { width: 1200, height: 800 }
    });
    
    // Notify others in the room
    socket.to(roomId).emit('user-joined', userData);
    
    console.log(`${userData.username} joined room ${roomId}`);
  });

  // Handle drawing operations
  socket.on('draw-operation', (operation) => {
    if (!currentRoom || !userData) return;
    
    // Add user and timestamp to operation
    const fullOperation = {
      ...operation,
      userId: userData.id,
      userColor: userData.color,
      timestamp: Date.now(),
      operationId: `${socket.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    // Add to operation history
    operationManager.addOperation(currentRoom, fullOperation);
    
    // Broadcast to other users in the room
    socket.to(currentRoom).emit('remote-draw', fullOperation);
  });

  // Handle cursor movement
  socket.on('cursor-move', (cursor) => {
    if (!currentRoom || !userData) return;
    
    userData.cursor = cursor;
    roomManager.updateUser(currentRoom, userData.id, { cursor });
    
    // Broadcast cursor position
    socket.to(currentRoom).emit('user-cursor-move', {
      userId: userData.id,
      cursor,
      color: userData.color,
      username: userData.username
    });
  });

  // Handle undo operation
  socket.on('undo', () => {
    if (!currentRoom) return;
    
    const lastOperation = operationManager.undo(currentRoom, userData.id);
    
    if (lastOperation) {
      // Broadcast undo to all users in the room
      io.to(currentRoom).emit('remote-undo', {
        operationId: lastOperation.operationId,
        userId: userData.id
      });
    }
  });

  // Handle redo operation
  socket.on('redo', () => {
    if (!currentRoom) return;
    
    const redoneOperation = operationManager.redo(currentRoom, userData.id);
    
    if (redoneOperation) {
      // Broadcast redo to all users
      io.to(currentRoom).emit('remote-redo', redoneOperation);
    }
  });

  // Handle clear canvas
  socket.on('clear-canvas', () => {
    if (!currentRoom) return;
    
    operationManager.clearOperations(currentRoom);
    io.to(currentRoom).emit('canvas-cleared', { userId: userData.id });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (currentRoom && userData) {
      roomManager.removeUser(currentRoom, userData.id);
      socket.to(currentRoom).emit('user-left', userData.id);
      console.log(`${userData.username} left room ${currentRoom}`);
    }
  });

  // Handle ping for latency measurement
  socket.on('ping', (timestamp) => {
    socket.emit('pong', timestamp);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});