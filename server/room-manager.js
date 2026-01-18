class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  addUser(roomId, userData) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        users: new Map(),
        canvasSize: { width: 1200, height: 800 }
      });
    }
    
    const room = this.rooms.get(roomId);
    room.users.set(userData.id, userData);
    
    return userData;
  }

  removeUser(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.users.delete(userId);
      
      // Clean up empty rooms
      if (room.users.size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  updateUser(roomId, userId, updates) {
    const room = this.rooms.get(roomId);
    if (room && room.users.has(userId)) {
      const user = room.users.get(userId);
      room.users.set(userId, { ...user, ...updates });
    }
  }

  getRoomState(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    
    return {
      users: Array.from(room.users.values()).map(user => ({
        id: user.id,
        username: user.username,
        color: user.color,
        cursor: user.cursor
      })),
      canvasSize: room.canvasSize
    };
  }

  getAllUsers(roomId) {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.users.values()) : [];
  }

  getUserCount(roomId) {
    const room = this.rooms.get(roomId);
    return room ? room.users.size : 0;
  }
}

module.exports = RoomManager;