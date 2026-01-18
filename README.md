# Collaborative Drawing Canvas

A real-time collaborative drawing application where multiple users can draw simultaneously on the same canvas with live synchronization.

## Features

### Core Features
- **Real-time Drawing**: Multiple users can draw simultaneously with immediate sync
- **Multiple Tools**: Brush, eraser, color palette, adjustable brush size
- **User Cursors**: See where other users are drawing in real-time
- **Global Undo/Redo**: Undo and redo actions across all users
- **User Management**: Visual indicators for online users with unique colors

### Technical Features
- WebSocket-based real-time communication
- Efficient canvas rendering with path optimization
- Conflict resolution for simultaneous drawing
- Responsive design for desktop and mobile
- Performance monitoring (FPS, latency)

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm (v7 or higher)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/collaborative-canvas.git
cd collaborative-canvas
```
2. **Install dependencies**
```bash
npm install
```
3. **Start the server**
```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```
4. **Open in browser**

    Open http://localhost:3000 in your browser.

### Testing with Multiple Users
1. **Open multiple browser tabs or windows**
    - Each tab/window represents a different user
    - Or share the URL with friends (if deployed)

2. **Join the room**
    - Enter a username in each browser
    - Click "Join Room"
    - All users will see each other's cursors and drawings

3. **Test real-time features**
    - Draw simultaneously on different devices
    - Use undo/redo and observe global effects
    - Watch cursor movements in real-time

## Project Structure

```
collaborative-canvas/
├── client/                    # Frontend files
│   ├── index.html            # Main HTML file
│   ├── style.css             # Styles
│   ├── canvas.js             # Canvas drawing logic
│   ├── websocket.js          # WebSocket client
│   ├── ui.js                 # UI enhancements
│   └── main.js               # App initialization
├── server/                   # Backend files
│   ├── server.js             # Express + Socket.io server
│   ├── room-manager.js       # Room and user management
│   └── operation-manager.js  # Drawing state and history
├── package.json              # Dependencies
├── README.md                 # This file
└── ARCHITECTURE.md          # Architecture documentation
```

## API Documentation

### WebSocket Events
**Client → Server**

- join-room: Join a drawing room
- draw-operation: Send drawing data
- cursor-move: Send cursor position
- undo: Request undo
- redo: Request redo
- clear-canvas: Clear the canvas
- ping: Measure latency

**Server → Client**
- room-state: Initial room state
- remote-draw: Remote drawing operation
- user-cursor-move: Remote cursor movement
- user-joined: New user joined
- user-left: User disconnected
- remote-undo: Undo operation broadcast
- remote-redo: Redo operation broadcast
- canvas-cleared: Canvas cleared
- pong: Latency response

**Live Link:- https://collaborative-canvas-q4xk.onrender.com/**

## Known Limitations
1. **Performance with Many Users**
    - More than 50 concurrent users may cause performance issues
    - Large canvas operations may lag on mobile devices

2. **Browser Compatibility**
    - Requires modern browsers with Canvas and WebSocket support
    - Mobile touch events may have slight latency

3. **Network Issues**
    - High latency connections may cause sync delays
    - No offline drawing capability

4. **Persistence**
    - Drawing sessions are not saved after server restart
    - No user authentication


## Time Spent
- Planning & Architecture: 2 hours
- Backend Development: 3 hours
- Frontend Development: 5 hours
- Testing & Debugging: 1 hours
- Documentation: 3 hours
- Total: ~ 14 hours