# Collaborative Canvas Architecture

## System Overview

This document describes the architecture of the Real-time Collaborative Drawing Canvas application. The system enables multiple users to draw simultaneously on a shared canvas with immediate synchronization.

## Data Flow Diagram
```project
┌─────────┐ Draw Events ┌─────────┐ Broadcast ┌─────────┐
│ Client A│ ──────────────────► │ Server │ ────────────────► │ Clients │
│ │ ◄─ Sync Operations │ │ ◄─ Join/Leave │ B, C, D│
└─────────┘ └─────────┘ └─────────┘
│ │ │
│ │ │
Canvas Rendering Room Management Canvas Rendering
Local History Operation History Local History
Conflict Resolution State Synchronization Conflict Resolution
```


## WebSocket Protocol

### Message Types

#### 1. Connection & Room Management
```javascript
// Client → Server: Join a room
{
  event: 'join-room',
  data: {
    roomId: 'default',
    username: 'User1'
  }
}

// Server → Client: Initial room state
{
  event: 'room-state',
  data: {
    users: [...],
    operations: [...],
    canvasSize: { width, height }
  }
}

// Server → Client: User joined
{
  event: 'user-joined',
  data: {
    id: 'socket-id',
    username: 'User2',
    color: '#FF6B6B'
  }
}
```

#### 2. Drawing Operations
```javascript
// Client → Server: Drawing path
{
  event: 'draw-operation',
  data: {
    type: 'brush', // or 'eraser'
    color: '#FF6B6B',
    size: 5,
    path: [{x, y}, {x, y}, ...],
    timestamp: 1234567890,
    operationId: 'unique-id'
  }
}

// Server → Client: Broadcast drawing
// Same structure, with added userId and userColor
```

#### 3. Cursor Synchronization
```javascript
// Client → Server: Cursor position
{
  event: 'cursor-move',
  data: {
    x: 100,
    y: 150
  }
}

// Server → Client: Remote cursor
{
  event: 'user-cursor-move',
  data: {
    userId: 'socket-id',
    cursor: { x, y },
    color: '#FF6B6B',
    username: 'User1'
  }
}
```

#### 4. Undo/Redo Operations
```javascript
// Client → Server: Request undo
{
  event: 'undo',
  data: {} // No data needed
}

// Server → Client: Broadcast undo
{
  event: 'remote-undo',
  data: {
    operationId: 'op-id-to-remove',
    userId: 'who-requested-undo'
  }
}
```
### Undo/Redo Strategy
#### Approach: Operation-based History with Global State
Key Decisions:
- Centralized History Management: Server maintains the single source of truth

- Operation-based Model: Each drawing stroke is stored as a complete operation

- Global Undo/Redo: All users share the same undo/redo history

Implementation Details:
```javascript
// Server-side operation management
class OperationManager {
  constructor() {
    this.roomOperations = new Map(); // roomId -> { history: [], undone: [] }
  }
  
  addOperation(roomId, operation) {
    // Add to history, clear redo stack
    const roomData = this.getRoomData(roomId);
    roomData.history.push(operation);
    roomData.undone = []; // Clear redo on new operation
  }
  
  undo(roomId, userId) {
    // Remove last operation from history
    const roomData = this.roomOperations.get(roomId);
    const lastOp = roomData.history.pop();
    if (lastOp) {
      roomData.undone.push(lastOp);
      return lastOp;
    }
    return null;
  }
  
  redo(roomId, userId) {
    // Restore last undone operation
    const roomData = this.roomOperations.get(roomId);
    const redoneOp = roomData.undone.pop();
    if (redoneOp) {
      roomData.history.push(redoneOp);
      return redoneOp;
    }
    return null;
  }
}
```

## Conflict Resolution:
- Operation Ordering: Operations are timestamped and ordered

- Client-side Buffering: Local operations are drawn immediately, then synced

- Server-side Queue: Operations are processed in order of arrival

- State Reconciliation: On conflict, server state wins, clients redraw

## Performance Decisions

### 1. Canvas Rendering Optimization
```javascript
// Instead of redrawing entire canvas on every change:
class OptimizedCanvas {
  drawPath(path, color, size) {
    // Use path-based rendering for smooth lines
    this.ctx.beginPath();
    this.ctx.moveTo(path[0].x, path[0].y);
    for (let point of path.slice(1)) {
      this.ctx.lineTo(point.x, point.y);
    }
    this.ctx.stroke();
  }
  
  // Batch multiple operations
  redrawOperations(operations) {
    // Group by user/color for reduced state changes
    this.groupOperations(operations).forEach(group => {
      this.ctx.strokeStyle = group.color;
      this.ctx.lineWidth = group.size;
      this.drawPath(group.points);
    });
  }
}
```
### 2. Network Optimization
```javascript
// Compress drawing data
function compressPath(path) {
  // Remove redundant points (within threshold)
  return path.filter((point, i) => {
    if (i === 0) return true;
    const prev = path[i-1];
    const distance = Math.sqrt(
      Math.pow(point.x - prev.x, 2) + 
      Math.pow(point.y - prev.y, 2)
    );
    return distance > 1; // Minimum distance threshold
  });
}

// Batch small operations
class OperationBatcher {
  constructor() {
    this.batch = [];
    this.batchTimeout = null;
  }
  
  addOperation(op) {
    this.batch.push(op);
    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.sendBatch();
      }, 16); // ~60fps
    }
  }
}
```
### 3. Memory Management
```javascript
// Limit history size
const MAX_HISTORY = 1000; // Prevent memory leaks
const MAX_UNDONE = 100;   // Limit redo stack

// Clean up old operations
function trimHistory(history) {
  if (history.length > MAX_HISTORY) {
    // Remove oldest operations
    return history.slice(-MAX_HISTORY);
  }
  return history;
}
```
