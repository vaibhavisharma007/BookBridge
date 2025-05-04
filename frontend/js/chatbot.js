/**
 * Simple BookBridge Chatbot
 * A very basic implementation using Kommunicate.io
 */

document.addEventListener('DOMContentLoaded', function() {
    // Create a simple chat button
    createChatButton();
});

function createChatButton() {
    // Create a simple chat button in the bottom right
    const chatButton = document.createElement('div');
    chatButton.className = 'chatbot-widget';
    chatButton.innerHTML = `
        <button id="chat-button" class="btn btn-primary rounded-circle shadow" style="width: 60px; height: 60px;">
            <i class="fas fa-comment"></i>
        </button>
    `;
    document.body.appendChild(chatButton);
    
    // Add click event to open chat modal
    document.getElementById('chat-button').addEventListener('click', function() {
        openChatModal();
    });
}

function openChatModal() {
    // Create modal if it doesn't exist
    if (!document.getElementById('chatModal')) {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'chatModal';
        modal.setAttribute('tabindex', '-1');
        modal.setAttribute('aria-labelledby', 'chatModalLabel');
        modal.setAttribute('aria-hidden', 'true');
        
        modal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title" id="chatModalLabel">BookBridge Assistant</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body" style="height: 300px; overflow-y: auto;" id="chat-messages">
                        <div class="d-flex flex-column gap-3">
                            <div class="p-3 bg-light rounded-3 align-self-start">
                                Hi! I'm the BookBridge Assistant. How can I help you find books today?
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <div class="input-group">
                            <input type="text" class="form-control" id="chat-input" placeholder="Type your message...">
                            <button class="btn btn-primary" type="button" id="send-button">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Initialize event listeners
        document.getElementById('send-button').addEventListener('click', sendMessage);
        document.getElementById('chat-input').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
    
    // Open the modal using Bootstrap
    const chatModal = new bootstrap.Modal(document.getElementById('chatModal'));
    chatModal.show();
}

function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addMessage(message, 'user');
    
    // Clear input
    input.value = '';
    
    // Show typing indicator
    const typingIndicator = addTypingIndicator();
    
    // Prepare headers
    const headers = {
        'Content-Type': 'application/json'
    };
    
    // Add authentication if available
    if (typeof isAuthenticated === 'function' && isAuthenticated()) {
        const token = localStorage.getItem('token');
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Send request to backend
    fetch('/api/chatbot', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ query: message })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // Remove typing indicator
        typingIndicator.remove();
        
        // Add bot response
        const response = data.response || "Sorry, I couldn't process your request.";
        addMessage(response, 'bot');
        
        // Add book recommendations if available
        if (data.books && data.books.length > 0) {
            addBookRecommendations(data.books);
        }
    })
    .catch(error => {
        // Remove typing indicator
        typingIndicator.remove();
        
        // Add error message
        addMessage('Sorry, there was an error processing your request. Please try again.', 'bot');
        console.error('Error sending message to chatbot:', error);
    });
}

function addMessage(text, sender) {
    const messagesContainer = document.getElementById('chat-messages').querySelector('.d-flex');
    const messageDiv = document.createElement('div');
    
    if (sender === 'user') {
        messageDiv.className = 'p-3 bg-primary text-white rounded-3 align-self-end';
    } else {
        messageDiv.className = 'p-3 bg-light rounded-3 align-self-start';
    }
    
    // Convert markdown links to HTML
    text = text.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="text-decoration-none">$1</a>');
    
    // Replace line breaks with <br> tags
    text = text.replace(/\n/g, '<br>');
    
    messageDiv.innerHTML = text;
    messagesContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    const chatBody = document.getElementById('chat-messages');
    chatBody.scrollTop = chatBody.scrollHeight;
}

function addTypingIndicator() {
    const messagesContainer = document.getElementById('chat-messages').querySelector('.d-flex');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'p-3 bg-light rounded-3 align-self-start';
    typingDiv.innerHTML = '<div class="spinner-grow spinner-grow-sm text-secondary" role="status"><span class="visually-hidden">Loading...</span></div>';
    messagesContainer.appendChild(typingDiv);
    
    // Scroll to bottom
    const chatBody = document.getElementById('chat-messages');
    chatBody.scrollTop = chatBody.scrollHeight;
    
    return typingDiv;
}

function addBookRecommendations(books) {
    const messagesContainer = document.getElementById('chat-messages').querySelector('.d-flex');
    const booksDiv = document.createElement('div');
    booksDiv.className = 'p-3 bg-light rounded-3 align-self-start';
    
    let html = '<div class="fw-bold mb-2">Book Recommendations:</div>';
    
    books.forEach(book => {
        html += `
            <div class="card mb-2">
                <div class="card-body p-2">
                    <h6 class="card-title mb-1">
                        <a href="book-detail.html?id=${book.id}" class="text-decoration-none">${book.title}</a>
                    </h6>
                    <p class="card-text small mb-1">by ${book.author}</p>
                    ${book.price ? `<p class="card-text small text-success fw-bold">₹${book.price}</p>` : ''}
                </div>
            </div>
        `;
    });
    
    booksDiv.innerHTML = html;
    messagesContainer.appendChild(booksDiv);
    
    // Scroll to bottom
    const chatBody = document.getElementById('chat-messages');
    chatBody.scrollTop = chatBody.scrollHeight;
}
