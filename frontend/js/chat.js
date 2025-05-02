/**
 * Chat functionality for BookResell
 */

// Global variables
let currentChatId = null;
let socket = null;
let activeChats = [];

/**
 * Initialize the chat system
 */
function initializeChat() {
    // Check if user is authenticated
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }
    
    // Load user's chat sessions
    loadChatSessions();
    
    // Check URL parameters for direct chat access
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('book_id');
    const sellerId = urlParams.get('seller_id');
    
    // If book_id and seller_id are provided, start a new chat
    if (bookId && sellerId) {
        startNewChat(bookId, sellerId);
    }
    
    // Set up message form
    const messageForm = document.getElementById('message-form');
    if (messageForm) {
        messageForm.addEventListener('submit', function(e) {
            e.preventDefault();
            sendMessage();
        });
    }
}

/**
 * Load user's chat sessions
 */
function loadChatSessions() {
    const chatList = document.getElementById('chat-list');
    const chatsLoading = document.getElementById('chats-loading');
    const noChatsMessage = document.getElementById('no-chats-message');
    
    // Show loading indicator
    if (chatsLoading) chatsLoading.style.display = 'block';
    if (noChatsMessage) noChatsMessage.style.display = 'none';
    
    fetch('/api/chats', {
        headers: getAuthHeaders()
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to load chats');
        }
        return response.json();
    })
    .then(chats => {
        // Store the chats
        activeChats = chats;
        
        // Hide loading indicator
        if (chatsLoading) chatsLoading.style.display = 'none';
        
        // Clear the chat list (except for the loading and no-chats elements)
        const existingItems = chatList.querySelectorAll('.chat-list-item');
        existingItems.forEach(item => item.remove());
        
        if (chats.length === 0) {
            // Show no chats message
            if (noChatsMessage) noChatsMessage.style.display = 'block';
            return;
        }
        
        // Add each chat to the list
        chats.forEach(chat => {
            const chatItem = createChatListItem(chat);
            chatList.appendChild(chatItem);
        });
    })
    .catch(error => {
        console.error('Error loading chats:', error);
        // Hide loading indicator
        if (chatsLoading) chatsLoading.style.display = 'none';
        
        // Show error message
        chatList.innerHTML += `
            <div class="list-group-item text-center text-danger">
                Failed to load conversations. Please try again.
            </div>
        `;
    });
}

/**
 * Create a chat list item element
 * @param {Object} chat - Chat session data
 * @returns {HTMLElement} Chat list item element
 */
function createChatListItem(chat) {
    const user = getUserData();
    
    // Determine the other user's name (buyer or seller)
    const otherUserName = user.role === 'buyer' ? chat.seller_name : chat.buyer_name;
    
    // Get the last message if available
    let lastMessagePreview = 'No messages yet';
    let lastMessageTime = '';
    
    if (chat.messages && chat.messages.length > 0) {
        const lastMessage = chat.messages[0];
        lastMessagePreview = lastMessage.content;
        
        // Format the timestamp
        const messageDate = new Date(lastMessage.created_at);
        lastMessageTime = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Create the list item
    const listItem = document.createElement('a');
    listItem.href = '#';
    listItem.className = 'list-group-item list-group-item-action chat-list-item';
    listItem.dataset.chatId = chat.chat_id;
    listItem.dataset.bookId = chat.book_id;
    listItem.dataset.bookTitle = chat.book_title;
    
    listItem.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <h6 class="mb-1">${otherUserName}</h6>
            <small class="text-muted">${lastMessageTime}</small>
        </div>
        <p class="mb-1 text-muted">Book: ${chat.book_title}</p>
        <small class="chat-preview">${lastMessagePreview}</small>
    `;
    
    // Add click event to load the chat
    listItem.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Remove active class from all items
        document.querySelectorAll('.chat-list-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to clicked item
        this.classList.add('active');
        
        // Load the chat
        loadChat(chat.chat_id, chat.book_id, chat.book_title);
    });
    
    return listItem;
}

/**
 * Load a specific chat
 * @param {Number} chatId - Chat ID
 * @param {Number} bookId - Book ID
 * @param {String} bookTitle - Book title
 */
function loadChat(chatId, bookId, bookTitle) {
    // Update current chat ID
    currentChatId = chatId;
    
    // Update chat header
    const chatHeader = document.getElementById('chat-header');
    chatHeader.innerHTML = `
        <h5 class="mb-0">Chat about "${bookTitle}"</h5>
        <a href="book-detail.html?id=${bookId}" id="view-book-link">View Book</a>
    `;
    
    // Show view book link
    document.getElementById('view-book-link').style.display = 'block';
    
    // Show chat loading indicator
    const chatMessages = document.getElementById('chat-messages');
    const chatLoading = document.getElementById('chat-loading');
    const selectChatMessage = document.getElementById('select-chat-message');
    
    chatMessages.innerHTML = '';
    if (selectChatMessage) selectChatMessage.style.display = 'none';
    if (chatLoading) chatLoading.style.display = 'block';
    
    // Show chat input
    const chatInputContainer = document.getElementById('chat-input-container');
    if (chatInputContainer) chatInputContainer.style.display = 'flex';
    
    // Load chat messages
    fetch(`/api/chats/${chatId}`, {
        headers: getAuthHeaders()
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to load messages');
        }
        return response.json();
    })
    .then(messages => {
        // Hide loading indicator
        if (chatLoading) chatLoading.style.display = 'none';
        
        // Clear chat messages
        chatMessages.innerHTML = '';
        
        if (messages.length === 0) {
            // No messages yet
            chatMessages.innerHTML = `
                <div class="text-center py-4">
                    <p class="text-muted">No messages yet. Start the conversation!</p>
                </div>
            `;
        } else {
            // Add messages to the chat
            messages.forEach(message => {
                addMessageToChat(message);
            });
            
            // Scroll to the bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        
        // Connect to WebSocket for real-time messages
        connectToWebSocket(chatId);
    })
    .catch(error => {
        console.error('Error loading messages:', error);
        
        // Hide loading indicator
        if (chatLoading) chatLoading.style.display = 'none';
        
        // Show error message
        chatMessages.innerHTML = `
            <div class="text-center py-4 text-danger">
                <p>Failed to load messages. Please try again.</p>
            </div>
        `;
    });
}

/**
 * Connect to WebSocket for real-time messaging
 * @param {Number} chatId - Chat ID
 */
function connectToWebSocket(chatId) {
    // Close existing socket if open
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
    }
    
    // Get the JWT token
    const token = localStorage.getItem('token');
    if (!token) return;
    
    // Determine WebSocket protocol (wss for HTTPS, ws for HTTP)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // If it's a new chat (chatId = 0), we need to include the book ID
    let wsUrl;
    const urlParams = new URLSearchParams(window.location.search);
    
    if (chatId === 0) {
        // Get the book ID from URL parameters
        const bookId = urlParams.get('book_id');
        const sellerId = urlParams.get('seller_id');
        
        if (!bookId) {
            console.error('No book ID available for new chat');
            return;
        }
        
        // For starting a new chat, we need both book ID and seller ID
        wsUrl = `${protocol}//${window.location.host}/ws/chat/${bookId}`;
        
        // Add seller ID as query parameter for buyer-initiated chats
        const user = getUserData();
        if (user.role === 'buyer' && sellerId) {
            wsUrl += `?seller_id=${sellerId}`;
        }
        
        console.log('Connecting to WebSocket URL for new chat:', wsUrl);
    } else {
        // For existing chats, identify the book from the chat list
        const chat = activeChats.find(c => c.chat_id === chatId);
        if (!chat || !chat.book_id) {
            console.error('Could not find book ID for chat:', chatId);
            return;
        }
        
        // Use the book ID for the WebSocket connection
        wsUrl = `${protocol}//${window.location.host}/ws/chat/${chat.book_id}`;
        
        // If we're seller, we need to specify the buyer
        const user = getUserData();
        if (user.role === 'seller' && chat.buyer_id) {
            wsUrl += `?buyer_id=${chat.buyer_id}`;
        }
        
        console.log('Connecting to WebSocket URL for existing chat:', wsUrl);
    }
    
    try {
        // Create new WebSocket connection
        socket = new WebSocket(wsUrl);
    
        // Add token to the request headers
        socket.onopen = function() {
            // Set the Authorization header for the WebSocket connection
            console.log('WebSocket opened, sending authentication');
            try {
                this.send(JSON.stringify({
                    type: 'auth',
                    token: token
                }));
                console.log('WebSocket authentication sent');
            } catch (sendError) {
                console.error('WebSocket authentication error:', sendError);
                alert('Chat connection failed. Please reload the page and try again.');
            }
        };
    } catch (connError) {
        console.error('Failed to create WebSocket connection:', connError);
        alert('Chat connection failed. Please reload the page and try again.');
        return;
    }
    
    // Handle incoming messages
    socket.onmessage = function(event) {
        const data = JSON.parse(event.data);
        
        if (data.type === 'message') {
            // Add message to the chat
            const message = {
                id: data.data.message_id,
                sender_id: data.sender_id,
                sender_name: data.data.sender_name,
                content: data.content,
                created_at: data.timestamp,
                is_self_sender: data.sender_id === getUserData().id
            };
            
            addMessageToChat(message);
            
            // Scroll to the bottom
            const chatMessages = document.getElementById('chat-messages');
            chatMessages.scrollTop = chatMessages.scrollHeight;
        } else if (data.type === 'history') {
            // History already loaded by the API
        } else if (data.type === 'error') {
            console.error('WebSocket error:', data.content);
        }
    };
    
    // Handle WebSocket errors
    socket.onerror = function(error) {
        console.error('WebSocket error:', error);
    };
    
    // Handle WebSocket close
    socket.onclose = function() {
        console.log('WebSocket connection closed');
    };
}

/**
 * Add a message to the chat display
 * @param {Object} message - Message data
 */
function addMessageToChat(message) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.is_self_sender ? 'self-message' : 'other-message'}`;
    
    // Format the timestamp
    const messageDate = new Date(message.created_at);
    const timeStr = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Add content
    messageDiv.innerHTML = `
        ${!message.is_self_sender ? `<div class="message-sender">${message.sender_name}</div>` : ''}
        <div class="message-content">${message.content}</div>
        <div class="message-time">${timeStr}</div>
    `;
    
    // Add to chat
    chatMessages.appendChild(messageDiv);
}

/**
 * Send a message via WebSocket
 */
function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const content = messageInput.value.trim();
    
    if (!content || !socket || socket.readyState !== WebSocket.OPEN || !currentChatId) {
        return;
    }
    
    // Send message
    socket.send(JSON.stringify({
        type: 'message',
        content: content,
        chat_id: currentChatId
    }));
    
    // Clear input
    messageInput.value = '';
}

/**
 * Start a new chat with a seller about a book
 * @param {Number} bookId - Book ID
 * @param {Number} sellerId - Seller ID
 */
function startNewChat(bookId, sellerId) {
    const user = getUserData();
    
    // Only buyers can initiate chats
    if (user.role !== 'buyer') {
        alert('Only buyers can initiate chats with sellers.');
        window.location.href = 'index.html';
        return;
    }
    
    // First, load all chats to check if a chat already exists
    fetch('/api/chats', {
        headers: getAuthHeaders()
    })
    .then(response => response.json())
    .then(chats => {
        // Check if a chat already exists for this book
        const existingChat = chats.find(chat => 
            chat.book_id.toString() === bookId.toString() && 
            chat.seller_id.toString() === sellerId.toString()
        );
        
        if (existingChat) {
            // Chat already exists, just open it
            // Find the corresponding chat item and click it
            setTimeout(() => {
                const chatItem = document.querySelector(`.chat-list-item[data-chat-id="${existingChat.chat_id}"]`);
                if (chatItem) {
                    chatItem.click();
                } else {
                    // Fallback: load the chat directly
                    loadChat(existingChat.chat_id, existingChat.book_id, existingChat.book_title);
                }
            }, 500); // Small delay to ensure the chat list is loaded
        } else {
            // No existing chat, we need to create one
            // For a real chat, the chat will be created when connecting to the WebSocket
            // Let's connect to the WebSocket and let the server create the chat
            fetch(`/api/books/${bookId}`, {
                headers: getAuthHeaders()
            })
            .then(response => response.json())
            .then(book => {
                // Store book ID and seller ID for WebSocket connection
                // Set them in URL parameters so that the connectToWebSocket function can use them
                const currentUrl = new URL(window.location.href);
                currentUrl.searchParams.set('book_id', bookId);
                currentUrl.searchParams.set('seller_id', sellerId);
                window.history.replaceState({}, '', currentUrl);
                
                // Connect to WebSocket which will create the chat
                connectToWebSocket(0); // A temporary chatId, the server will create the real one
                
                // Update UI to show we're in a chat about this book
                const chatHeader = document.getElementById('chat-header');
                chatHeader.innerHTML = `
                    <h5 class="mb-0">Chat about "${book.title}"</h5>
                    <a href="book-detail.html?id=${book.id}" id="view-book-link">View Book</a>
                `;
                
                // Show the chat input
                const chatInputContainer = document.getElementById('chat-input-container');
                if (chatInputContainer) chatInputContainer.style.display = 'flex';
                
                // Hide the "select chat" message
                const selectChatMessage = document.getElementById('select-chat-message');
                if (selectChatMessage) selectChatMessage.style.display = 'none';
                
                // Show the chat messages area with a welcome message
                const chatMessages = document.getElementById('chat-messages');
                chatMessages.innerHTML = `
                    <div class="text-center py-4">
                        <p class="text-muted">Start a conversation with the seller about "${book.title}"!</p>
                    </div>
                `;
                
                // Refresh chat list after a short delay to include the new chat
                setTimeout(loadChatSessions, 1000);
            })
            .catch(error => {
                console.error('Error loading book details:', error);
                alert('Failed to load book details. Please try again.');
            });
        }
    })
    .catch(error => {
        console.error('Error loading chats:', error);
        alert('Failed to load chats. Please try again.');
    });
}

// Initialize chat when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Feather icons
    feather.replace();
    
    // Initialize authentication UI
    updateAuthUI();
    
    // Initialize chat if on chat page
    if (document.getElementById('chat-container')) {
        initializeChat();
    }
});
