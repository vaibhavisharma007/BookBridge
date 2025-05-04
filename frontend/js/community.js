// BookBridge Community Chat Frontend

let communitySocket = null;

function initializeCommunityChat() {
    // Check if user is authenticated
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }
    
    // Set username in navbar
    const user = getUserData();
    const usernameDisplay = document.getElementById('username-display');
    if (usernameDisplay) {
        usernameDisplay.textContent = user.username;
    }

    // Connect to WebSocket
    connectCommunityWebSocket();

    // Handle message form
    const form = document.getElementById('community-message-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            sendCommunityMessage();
        });
    }
}

function connectCommunityWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const token = localStorage.getItem('token');
    const wsUrl = `${protocol}//${window.location.host}/ws/community?token=${encodeURIComponent(token)}`;
    communitySocket = new WebSocket(wsUrl);

    communitySocket.onopen = function() {
        console.log('Connected to community chat');
    };
    communitySocket.onmessage = function(event) {
        const message = JSON.parse(event.data);
        appendCommunityMessage(message);
    };
    communitySocket.onerror = function(error) {
        console.error('Community WebSocket error:', error);
        showCommunityError('Connection error. Please try again.');
    };
    communitySocket.onclose = function() {
        console.log('Community WebSocket closed. Reconnecting in 5s...');
        setTimeout(connectCommunityWebSocket, 5000);
    };
}

function sendCommunityMessage() {
    const input = document.getElementById('community-message-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    if (communitySocket && communitySocket.readyState === WebSocket.OPEN) {
        communitySocket.send(JSON.stringify({
            type: 'message',
            content: text
        }));
    } else {
        showCommunityError('Not connected. Please wait and try again.');
    }
}

function appendCommunityMessage(message) {
    const container = document.getElementById('community-messages');
    if (!container) return;
    const user = getUserData();
    const isSelf = message.sender_id === user.id;
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message ' + (isSelf ? 'message-self' : 'message-other');
    const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    msgDiv.innerHTML = `
        <div class="message-content">
            <div class="message-text"><strong>${message.sender_name || 'User'}:</strong> ${message.content}</div>
            <div class="message-time">${time}</div>
        </div>
    `;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

function showCommunityError(msg) {
    const container = document.querySelector('.container');
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger alert-dismissible fade show';
    alert.role = 'alert';
    alert.innerHTML = `
        ${msg}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    container.insertBefore(alert, container.firstChild);
    setTimeout(() => alert.remove(), 5000);
}

document.addEventListener('DOMContentLoaded', initializeCommunityChat); 