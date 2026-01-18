class WebSocketManager {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.roomId = 'default';
        this.userId = null;
        this.username = 'User';
        this.operations = [];
        this.pendingOperations = new Map();
        this.lastPingTime = 0;
        this.latency = 0;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.startPingLoop();
    }

    connect() {
        this.socket = io({
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        this.setupSocketListeners();
    }

    setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.connected = true;
            this.userId = this.socket.id;
            
            this.updateUIStatus('Connected', '#48bb78');
            this.showNotification('Connected to server', 'success');
            
            // Join room with current username
            this.joinRoom();
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.connected = false;
            this.updateUIStatus('Disconnected', '#e53e3e');
            this.showNotification('Disconnected from server', 'error');
        });

        this.socket.on('room-state', (data) => {
            console.log('Received room state:', data);
            this.handleRoomState(data);
        });

        this.socket.on('remote-draw', (operation) => {
            this.handleRemoteDraw(operation);
        });

        this.socket.on('user-cursor-move', (data) => {
            this.handleRemoteCursorMove(data);
        });

        this.socket.on('user-joined', (userData) => {
            this.handleUserJoined(userData);
        });

        this.socket.on('user-left', (userId) => {
            this.handleUserLeft(userId);
        });

        this.socket.on('remote-undo', (data) => {
            this.handleRemoteUndo(data);
        });

        this.socket.on('remote-redo', (operation) => {
            this.handleRemoteRedo(operation);
        });

        this.socket.on('canvas-cleared', () => {
            this.handleCanvasCleared();
        });

        this.socket.on('pong', (timestamp) => {
            this.latency = Date.now() - timestamp;
            document.getElementById('latency').textContent = `Latency: ${this.latency}ms`;
        });
    }

    setupEventListeners() {
        // Join room button
        document.getElementById('join-room-btn').addEventListener('click', () => {
            this.username = document.getElementById('username-input').value.trim() || 'User';
            if (!this.connected) {
                this.connect();
            } else {
                this.joinRoom();
            }
        });
        
        // Enter key on username input
        document.getElementById('username-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.username = document.getElementById('username-input').value.trim() || 'User';
                if (!this.connected) {
                    this.connect();
                } else {
                    this.joinRoom();
                }
            }
        });
    }

    joinRoom() {
        if (this.socket && this.socket.connected) {
            this.socket.emit('join-room', {
                roomId: this.roomId,
                username: this.username
            });
        }
    }

    handleRoomState(data) {
        // Store operations
        this.operations = data.operations || [];
        
        // Redraw canvas with all operations
        if (window.canvas) {
            window.canvas.redrawCanvas();
        }
        
        // Update user list
        this.updateUserList(data.users || []);
        
        // Update user count
        document.getElementById('user-count').textContent = 
            `${data.users ? data.users.length : 1} users online`;
    }

    handleRemoteDraw(operation) {
        // Add to operations list
        this.operations.push(operation);
        
        // Draw on canvas
        if (window.canvas) {
            window.canvas.drawRemoteOperation(operation);
        }
    }

    handleRemoteCursorMove(data) {
        // Update remote cursor
        if (window.canvas && data.userId !== this.userId) {
            window.canvas.updateRemoteCursor(
                data.userId,
                data.cursor,
                data.color,
                data.username
            );
        }
    }

    handleUserJoined(userData) {
        // Show notification
        this.showNotification(`${userData.username} joined the room`, 'info');
        
        // Update user count
        const userCount = parseInt(document.getElementById('user-count').textContent) + 1;
        document.getElementById('user-count').textContent = `${userCount} users online`;
        
        // Add to user list
        this.addUserToList(userData);
    }

    handleUserLeft(userId) {
        // Remove from user list
        this.removeUserFromList(userId);
        
        // Remove cursor
        if (window.canvas) {
            window.canvas.removeRemoteCursor(userId);
        }
        
        // Update user count
        const userCount = parseInt(document.getElementById('user-count').textContent) - 1;
        document.getElementById('user-count').textContent = `${userCount} users online`;
    }

    handleRemoteUndo(data) {
        // Remove the undone operation from operations list
        const opIndex = this.operations.findIndex(op => op.operationId === data.operationId);
        if (opIndex !== -1) {
            this.operations.splice(opIndex, 1);
        }
        
        // Redraw canvas
        if (window.canvas) {
            window.canvas.redrawCanvas();
        }
        
        // Show notification
        if (data.userId !== this.userId) {
            this.showNotification('Someone undid an action', 'info');
        }
    }

    handleRemoteRedo(operation) {
        // Add the redone operation
        this.operations.push(operation);
        
        // Draw on canvas
        if (window.canvas) {
            window.canvas.drawRemoteOperation(operation);
        }
    }

    handleCanvasCleared() {
        // Clear operations
        this.operations = [];
        
        // Clear canvas
        if (window.canvas) {
            window.canvas.clearCanvas();
        }
        
        this.showNotification('Canvas was cleared', 'info');
    }

    updateUserList(users) {
        const usersList = document.getElementById('users-list');
        usersList.innerHTML = '';
        
        // Add current user first
        const currentUserItem = document.createElement('div');
        currentUserItem.className = 'user-item';
        currentUserItem.innerHTML = `
            <div class="user-color" style="background-color: ${this.getUserColor(this.userId)}"></div>
            <span class="user-name">${this.username} (You)</span>
            <span class="user-status active">●</span>
        `;
        usersList.appendChild(currentUserItem);
        
        // Add other users
        users.forEach(user => {
            if (user.id !== this.userId) {
                this.addUserToList(user);
            }
        });
    }

    addUserToList(userData) {
        const usersList = document.getElementById('users-list');
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.id = `user-${userData.id}`;
        userItem.innerHTML = `
            <div class="user-color" style="background-color: ${userData.color}"></div>
            <span class="user-name">${userData.username}</span>
            <span class="user-status active">●</span>
        `;
        usersList.appendChild(userItem);
    }

    removeUserFromList(userId) {
        const userElement = document.getElementById(`user-${userId}`);
        if (userElement) {
            userElement.remove();
        }
    }

    getUserColor(userId) {
        // Simple hash function for consistent colors
        const colors = [
            '#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', 
            '#118AB2', '#EF476F', '#7209B7', '#F72585',
            '#3A86FF', '#FB5607'
        ];
        
        if (!userId) return colors[0];
        
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            hash = userId.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        return colors[Math.abs(hash) % colors.length];
    }

    // Event emission methods
    emitDrawOperation(operation) {
        if (this.socket && this.connected) {
            this.socket.emit('draw-operation', operation);
        }
    }

    emitCursorMove(cursor) {
        if (this.socket && this.connected) {
            this.socket.emit('cursor-move', cursor);
        }
    }

    emitUndo() {
        if (this.socket && this.connected) {
            this.socket.emit('undo');
        }
    }

    emitRedo() {
        if (this.socket && this.connected) {
            this.socket.emit('redo');
        }
    }

    emitClearCanvas() {
        if (this.socket && this.connected) {
            this.socket.emit('clear-canvas');
        }
    }

    startPingLoop() {
        setInterval(() => {
            if (this.socket && this.connected) {
                this.lastPingTime = Date.now();
                this.socket.emit('ping', this.lastPingTime);
            }
        }, 5000); // Ping every 5 seconds
    }

    updateUIStatus(status, color) {
        const statusElement = document.getElementById('room-status');
        statusElement.textContent = status;
        statusElement.style.color = color;
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}

// Initialize WebSocket manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.wsManager = new WebSocketManager();
    window.wsManager.connect();
});