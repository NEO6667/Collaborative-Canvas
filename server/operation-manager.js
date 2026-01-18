class OperationManager {
  constructor() {
    // roomId -> { history: [], undone: [] }
    this.roomOperations = new Map();
    this.MAX_HISTORY = 1000; // Prevent memory issues
  }

  getRoomData(roomId) {
    if (!this.roomOperations.has(roomId)) {
      this.roomOperations.set(roomId, {
        history: [],
        undone: [],
        operationMap: new Map() // For quick lookup
      });
    }
    return this.roomOperations.get(roomId);
  }

  addOperation(roomId, operation) {
    const roomData = this.getRoomData(roomId);
    
    // Add to history
    roomData.history.push(operation);
    roomData.operationMap.set(operation.operationId, operation);
    
    // Clear redo stack when new operation is added
    roomData.undone = [];
    
    // Trim history if too large
    if (roomData.history.length > this.MAX_HISTORY) {
      const removed = roomData.history.shift();
      roomData.operationMap.delete(removed.operationId);
    }
    
    return operation;
  }

  getOperations(roomId) {
    const roomData = this.roomOperations.get(roomId);
    return roomData ? roomData.history : [];
  }

  undo(roomId, userId) {
    const roomData = this.roomOperations.get(roomId);
    if (!roomData || roomData.history.length === 0) return null;
    
    // Find last operation by this user (for user-specific undo)
    // or just last operation (for global undo)
    let lastOperation = null;
    let lastIndex = -1;
    
    // Find the last operation in history
    for (let i = roomData.history.length - 1; i >= 0; i--) {
      lastOperation = roomData.history[i];
      lastIndex = i;
      break; // Take the last operation regardless of user
    }
    
    if (lastOperation && lastIndex !== -1) {
      // Remove from history and add to undone stack
      roomData.history.splice(lastIndex, 1);
      roomData.undone.push(lastOperation);
      roomData.operationMap.delete(lastOperation.operationId);
      
      return lastOperation;
    }
    
    return null;
  }

  redo(roomId, userId) {
    const roomData = this.roomOperations.get(roomId);
    if (!roomData || roomData.undone.length === 0) return null;
    
    // Get last undone operation
    const redoneOperation = roomData.undone.pop();
    
    // Add back to history
    roomData.history.push(redoneOperation);
    roomData.operationMap.set(redoneOperation.operationId, redoneOperation);
    
    return redoneOperation;
  }

  clearOperations(roomId) {
    const roomData = this.roomOperations.get(roomId);
    if (roomData) {
      roomData.history = [];
      roomData.undone = [];
      roomData.operationMap.clear();
    }
  }

  getOperation(roomId, operationId) {
    const roomData = this.roomOperations.get(roomId);
    return roomData ? roomData.operationMap.get(operationId) : null;
  }
}

module.exports = OperationManager;