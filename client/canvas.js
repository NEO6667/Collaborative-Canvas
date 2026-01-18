class DrawingCanvas {
    constructor() {
        this.canvas = document.getElementById('drawing-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.cursorsContainer = document.getElementById('cursors-container');
        
        // Drawing state
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.path = [];
        
        // Tool settings
        this.currentTool = 'brush';
        this.currentColor = '#000000';
        this.currentSize = 5;
        this.eraserSize = 10;
        
        // Performance
        this.lastDrawTime = 0;
        this.drawInterval = 1000 / 60; // 60 FPS
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        
        // User cursors
        this.remoteCursors = new Map();
        this.cursorElements = new Map();
        
        // Local operation tracking for undo/redo
        this.localHistory = [];
        this.localRedoStack = [];
        
        // Initialize canvas
        this.initCanvas();
        this.initEventListeners();
        this.setupDrawingTools();
        
        // Start FPS counter
        this.updateFPS();
    }

    initCanvas() {
        // Set canvas size to container size
        const updateSize = () => {
            const container = this.canvas.parentElement;
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
            
            // Redraw all operations if any
            this.redrawCanvas();
        };
        
        updateSize();
        window.addEventListener('resize', updateSize);
    }

    initEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.canvas.addEventListener('mousemove', this.draw.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });
        
        this.canvas.addEventListener('touchend', () => {
            const mouseEvent = new MouseEvent('mouseup');
            this.canvas.dispatchEvent(mouseEvent);
        });
        
        // Cursor movement tracking
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const cursor = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            
            // Emit cursor movement through WebSocket
            if (window.wsManager) {
                window.wsManager.emitCursorMove(cursor);
            }
        });
    }

    setupDrawingTools() {
        // Brush tool
        document.getElementById('brush-tool').addEventListener('click', () => {
            this.setTool('brush');
            document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
            document.getElementById('brush-tool').classList.add('active');
        });
        
        // Eraser tool
        document.getElementById('eraser-tool').addEventListener('click', () => {
            this.setTool('eraser');
            document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
            document.getElementById('eraser-tool').classList.add('active');
        });
        
        // Clear tool
        document.getElementById('clear-tool').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear the canvas? All users will see this change.')) {
                this.clearCanvas();
                if (window.wsManager) {
                    window.wsManager.emitClearCanvas();
                }
            }
        });
        
        // Color palette
        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', () => {
                this.setColor(option.dataset.color);
                document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
            });
        });
        
        // Custom color picker
        document.getElementById('custom-color-picker').addEventListener('input', (e) => {
            this.setColor(e.target.value);
        });
        
        // Brush size slider
        const brushSizeSlider = document.getElementById('brush-size');
        const brushSizeValue = document.getElementById('brush-size-value');
        
        brushSizeSlider.addEventListener('input', (e) => {
            const size = parseInt(e.target.value);
            this.setBrushSize(size);
            brushSizeValue.textContent = `${size}px`;
        });
        
        // Undo/Redo buttons
        document.getElementById('undo-btn').addEventListener('click', () => {
            this.undo();
        });
        
        document.getElementById('redo-btn').addEventListener('click', () => {
            this.redo();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                this.undo();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                this.redo();
            }
        });
    }

    setTool(tool) {
        this.currentTool = tool;
        if (tool === 'eraser') {
            this.canvas.style.cursor = `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="${this.eraserSize}" height="${this.eraserSize}" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="white" stroke="black" stroke-width="1"/></svg>') ${this.eraserSize/2} ${this.eraserSize/2}, crosshair`;
        } else {
            this.canvas.style.cursor = 'crosshair';
        }
    }

    setColor(color) {
        this.currentColor = color;
        document.getElementById('custom-color-picker').value = color;
    }

    setBrushSize(size) {
        this.currentSize = size;
    }

    getCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    startDrawing(e) {
        this.isDrawing = true;
        const { x, y } = this.getCoordinates(e);
        [this.lastX, this.lastY] = [x, y];
        
        // Start new path
        this.path = [{ x, y }];
        
        // Draw initial point
        this.drawPoint(x, y);
    }

    draw(e) {
        if (!this.isDrawing) return;
        
        const now = Date.now();
        if (now - this.lastDrawTime < this.drawInterval) return;
        this.lastDrawTime = now;
        
        const { x, y } = this.getCoordinates(e);
        
        // Add to path
        this.path.push({ x, y });
        
        // Draw line from last point to current point
        this.drawLine(this.lastX, this.lastY, x, y);
        
        [this.lastX, this.lastY] = [x, y];
    }

    stopDrawing() {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        
        // Complete the path
        if (this.path.length > 1) {
            this.createOperation();
        }
        
        this.path = [];
    }

    drawPoint(x, y) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.currentSize / 2, 0, Math.PI * 2);
        this.ctx.fillStyle = this.currentTool === 'eraser' ? '#FFFFFF' : this.currentColor;
        this.ctx.fill();
    }

    drawLine(x1, y1, x2, y2) {
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';
        this.ctx.lineWidth = this.currentSize;
        this.ctx.strokeStyle = this.currentTool === 'eraser' ? '#FFFFFF' : this.currentColor;
        
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
    }

    createOperation() {
        const operation = {
            type: this.currentTool,
            color: this.currentColor,
            size: this.currentSize,
            path: [...this.path],
            timestamp: Date.now()
        };
        
        // Add to local history for undo/redo
        this.localHistory.push(operation);
        this.localRedoStack = []; // Clear redo stack
        
        // Emit through WebSocket
        if (window.wsManager) {
            window.wsManager.emitDrawOperation(operation);
        }
        
        // Limit history size
        if (this.localHistory.length > 100) {
            this.localHistory.shift();
        }
    }

    drawRemoteOperation(operation) {
        const isEraser = operation.type === 'eraser';
        const color = isEraser ? '#FFFFFF' : operation.color;
        
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';
        this.ctx.lineWidth = operation.size;
        this.ctx.strokeStyle = color;
        
        // Draw the entire path for smoother lines
        if (operation.path && operation.path.length > 1) {
            this.ctx.beginPath();
            this.ctx.moveTo(operation.path[0].x, operation.path[0].y);
            
            for (let i = 1; i < operation.path.length; i++) {
                this.ctx.lineTo(operation.path[i].x, operation.path[i].y);
            }
            
            this.ctx.stroke();
        }
    }

    redrawCanvas() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Redraw all operations from server
        if (window.wsManager && window.wsManager.operations) {
            window.wsManager.operations.forEach(op => {
                this.drawRemoteOperation(op);
            });
        }
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.localHistory = [];
        this.localRedoStack = [];
    }

    undo() {
        if (this.localHistory.length > 0) {
            const lastOp = this.localHistory.pop();
            this.localRedoStack.push(lastOp);
            
            // Emit undo through WebSocket
            if (window.wsManager) {
                window.wsManager.emitUndo();
            }
            
            // Redraw canvas without the undone operation
            this.redrawCanvas();
        }
    }

    redo() {
        if (this.localRedoStack.length > 0) {
            const op = this.localRedoStack.pop();
            this.localHistory.push(op);
            
            // Redraw the operation
            this.drawRemoteOperation(op);
            
            // Emit redo through WebSocket
            if (window.wsManager) {
                window.wsManager.emitRedo();
            }
        }
    }

    updateFPS() {
        const now = performance.now();
        this.frameCount++;
        
        if (now >= this.lastFpsUpdate + 1000) {
            const fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
            document.getElementById('fps').textContent = `FPS: ${fps}`;
            
            this.frameCount = 0;
            this.lastFpsUpdate = now;
        }
        
        requestAnimationFrame(() => this.updateFPS());
    }

    updateRemoteCursor(userId, cursor, color, username) {
        let cursorElement = this.cursorElements.get(userId);
        
        if (!cursorElement) {
            cursorElement = document.createElement('div');
            cursorElement.className = 'remote-cursor';
            cursorElement.innerHTML = `
                <div class="cursor-dot" style="background-color: ${color}"></div>
                <div class="cursor-label" style="background-color: ${color}">${username}</div>
            `;
            this.cursorsContainer.appendChild(cursorElement);
            this.cursorElements.set(userId, cursorElement);
        }
        
        cursorElement.style.left = `${cursor.x}px`;
        cursorElement.style.top = `${cursor.y}px`;
        
        // Store cursor position
        this.remoteCursors.set(userId, { cursor, color, username });
        
        // Remove cursor after 2 seconds of inactivity
        clearTimeout(cursorElement.timeout);
        cursorElement.timeout = setTimeout(() => {
            this.removeRemoteCursor(userId);
        }, 2000);
    }

    removeRemoteCursor(userId) {
        const cursorElement = this.cursorElements.get(userId);
        if (cursorElement) {
            cursorElement.remove();
            this.cursorElements.delete(userId);
            this.remoteCursors.delete(userId);
        }
    }
}

// Initialize canvas when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.canvas = new DrawingCanvas();
});