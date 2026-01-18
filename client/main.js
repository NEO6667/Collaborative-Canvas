// Main application initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('Collaborative Canvas application initialized');
    
    // Set default username to something unique
    const defaultUsername = `User-${Math.floor(Math.random() * 1000)}`;
    document.getElementById('username-input').value = defaultUsername;
    
    // Auto-join room after 1 second
    setTimeout(() => {
        document.getElementById('join-room-btn').click();
    }, 1000);
    
    // Add CSS for remote cursors
    const style = document.createElement('style');
    style.textContent = `
        .remote-cursor {
            position: absolute;
            pointer-events: none;
            z-index: 1000;
            transform: translate(-50%, -50%);
            transition: transform 0.1s ease-out;
        }
        
        .cursor-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            position: absolute;
            top: 0;
            left: 0;
            transform: translate(-50%, -50%);
        }
        
        .cursor-label {
            position: absolute;
            top: 10px;
            left: 10px;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 11px;
            color: white;
            white-space: nowrap;
            opacity: 0.9;
            font-weight: bold;
        }
    `;
    document.head.appendChild(style);
});