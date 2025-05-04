/**
 * Chat functionality for BookBridge
 */

// Global variables
let currentChatId = null;
let socket = null;
let activeChats = [];
let deepChatInstance = null;
let chatbotInstance = null; // Separate instance for the chatbot assistant

/**
 * Initialize the chat system
 */
function initializeChat() {
    // Check if user is authenticated
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }
    
    // Initialize WebSocket connection
    initializeWebSocket();
    
    // Load user's chat sessions
    loadChatSessions();
    
    // Check URL parameters for direct chat access
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('book_id');
    const sellerId = urlParams.get('seller_id');
    const chatId = urlParams.get('chat_id');
    
    // If chat_id is provided, load the existing chat
    if (chatId) {
        loadChat(chatId);
    }
    // If book_id and seller_id are provided, start a new chat
    else if (bookId && sellerId) {
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
 * Initialize WebSocket connection
 */
function initializeWebSocket() {
    const user = getUserData();
    if (!user) return;
    
    // Close existing socket if any
    if (socket) {
        socket.close();
    }
    
    // Create new WebSocket connection with token and params in query string
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const token = localStorage.getItem('token');
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('book_id');
    const sellerId = urlParams.get('seller_id');
    const chatId = urlParams.get('chat_id');
    let wsUrl = `${protocol}//${window.location.host}/ws/chat?token=${encodeURIComponent(token)}`;
    if (bookId && sellerId) {
        wsUrl += `&book_id=${bookId}&seller_id=${sellerId}`;
    }
    if (chatId) {
        wsUrl += `&chat_id=${chatId}`;
    }
    socket = new WebSocket(wsUrl);
    // Set up WebSocket event handlers
    socket.onopen = function() {
        console.log('WebSocket connection established');
        // No need to send auth message, token is in query param
    };
    socket.onmessage = function(event) {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
    };
    socket.onerror = function(error) {
        console.error('WebSocket error:', error);
        displayError('Connection error. Please try again.');
    };
    socket.onclose = function() {
        console.log('WebSocket connection closed');
        // Attempt to reconnect after 5 seconds
        setTimeout(initializeWebSocket, 5000);
    };
}

/**
 * Handle incoming WebSocket messages
 * @param {Object} message - The received message
 */
function handleWebSocketMessage(message) {
    switch (message.type) {
        case 'message':
            appendMessage(message);
            break;
        case 'chat_created':
            currentChatId = message.chat_id;
            loadChat(message.chat_id);
            break;
        case 'error':
            displayError(message.content);
            break;
        default:
            console.log('Unknown message type:', message.type);
    }
}

/**
 * Load user's chat sessions
 */
function loadChatSessions() {
    const chatList = document.getElementById('chat-list');
    const chatsLoading = document.getElementById('chats-loading');
    const noChatsMessage = document.getElementById('no-chats-message');
    
    // Make sure elements exist
    if (!chatList) {
        console.error('Chat list element not found');
        return;
    }
    
    // Show loading indicator
    if (chatsLoading) chatsLoading.style.display = 'block';
    if (noChatsMessage) noChatsMessage.style.display = 'none';
    
    // Make sure we have a valid authentication token
    if (!isAuthenticated()) {
        console.error('User is not authenticated');
        if (chatsLoading) chatsLoading.style.display = 'none';
        
        const existingItems = chatList.querySelectorAll('.chat-list-item, .chat-error-message');
        existingItems.forEach(item => item.remove());
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'list-group-item text-center text-danger chat-error-message';
        errorDiv.textContent = 'Please log in to view your chats.';
        chatList.appendChild(errorDiv);
        return;
    }
    
    // Get user data to check if user is a buyer
    const userData = getUserData();
    if (!userData) {
        console.error('Cannot get user data');
        if (chatsLoading) chatsLoading.style.display = 'none';
        
        const existingItems = chatList.querySelectorAll('.chat-list-item, .chat-error-message');
        existingItems.forEach(item => item.remove());
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'list-group-item text-center text-danger chat-error-message';
        errorDiv.textContent = 'Cannot load user data. Please try logging in again.';
        chatList.appendChild(errorDiv);
        return;
    }
    
    // Log user role for debugging
    console.log('User role:', userData.role);
    
    // Add a timestamp to prevent caching
    const timestamp = new Date().getTime();
    const url = `/api/chats?_=${timestamp}`;
    
    fetch(url, {
        headers: getAuthHeaders(),
        credentials: 'same-origin' // Include cookies
    })
    .then(response => {
        if (!response.ok) {
            console.error('Failed to load chats with status:', response.status);
            return response.text().then(text => {
                console.error('Error response body:', text);
                throw new Error(`Failed to load chats: ${response.status} ${response.statusText}`);
            });
        }
        return response.json();
    })
    .then(chats => {
        // Log the successful response for debugging
        console.log('Chats response:', chats);
        
        // Handle case where response is not an array
        if (!Array.isArray(chats)) {
            console.error('Expected array of chats but got:', typeof chats);
            // Initialize as empty array to prevent errors
            chats = [];
        }
        
        // Store the chats
        activeChats = chats;
        
        // Hide loading indicator
        if (chatsLoading) chatsLoading.style.display = 'none';
        
        // Clear the chat list
        const existingItems = chatList.querySelectorAll('.chat-list-item, .chat-error-message');
        existingItems.forEach(item => item.remove());
        
        if (chats.length === 0) {
            // Show no chats message
            if (noChatsMessage) noChatsMessage.style.display = 'block';
            return;
        }
        
        // Add each chat to the list
        chats.forEach(chat => {
            try {
                const chatItem = createChatListItem(chat);
                chatList.appendChild(chatItem);
            } catch (err) {
                console.error('Error creating chat list item:', err, chat);
            }
        });
    })
    .catch(error => {
        console.error('Error loading chats:', error);
        // Hide loading indicator
        if (chatsLoading) chatsLoading.style.display = 'none';
        
        // Clear existing items
        const existingItems = chatList.querySelectorAll('.chat-list-item, .chat-error-message');
        existingItems.forEach(item => item.remove());
        
        // Show error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'list-group-item text-center text-danger chat-error-message';
        errorDiv.textContent = 'Failed to load conversations. Please try again.';
        chatList.appendChild(errorDiv);
        
        // Show no chats message as fallback
        if (noChatsMessage) noChatsMessage.style.display = 'block';
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
    const chatArea = document.getElementById('chat-area');
    
    if (selectChatMessage) selectChatMessage.style.display = 'none';
    if (chatLoading) chatLoading.style.display = 'block';
    if (chatArea) chatArea.style.display = 'none';
    
    // Hide old chat input (will use Deep Chat instead)
    const chatInputContainer = document.getElementById('chat-input-container');
    if (chatInputContainer) chatInputContainer.style.display = 'none';
    
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
        
        // Show chat area
        if (chatArea) {
            chatArea.style.display = 'block';
            
            // Clear any previous chat interface
            chatArea.innerHTML = '';
            
            try {
                // Reset previous deep chat instance if any
                if (deepChatInstance) {
                    try {
                        // Clean up previous instance
                        deepChatInstance.remove();
                    } catch (e) {
                        console.warn('Error cleaning up previous Deep Chat instance:', e);
                    }
                    deepChatInstance = null;
                }
                
                // Create and configure Deep Chat element with proper properties
                const deepChatElement = document.createElement('deep-chat');
                
                // Set styles directly
                deepChatElement.style.height = '350px';
                deepChatElement.style.width = '100%';
                deepChatElement.style.border = '1px solid #e9ecef';
                deepChatElement.style.borderRadius = '0.25rem';
                
                // Add identification class
                deepChatElement.classList.add('peer-chat');
                
                // Initial empty messages array
                deepChatElement.setAttribute('messages', '[]');
                
                // Add to DOM first
                chatArea.appendChild(deepChatElement);
                
                // First establish WebSocket connection
                connectToWebSocket(chatId);
                
                // Then set Deep Chat instance with a small delay to ensure proper initialization
                setTimeout(() => {
                    // Save the instance
                    deepChatInstance = deepChatElement;
                    
                    // Format the existing messages for Deep Chat
                    const formattedMessages = messages.map(message => {
                        const user = getUserData();
                        const isUser = message.sender_id === user.id;
                        
                        return {
                            role: isUser ? 'user' : 'assistant',
                            text: message.content,
                            name: isUser ? user.username : message.sender_name
                        };
                    });
                    
                    // Set messages if there are any
                    if (formattedMessages.length > 0) {
                        try {
                            deepChatInstance.messages = formattedMessages;
                        } catch (err) {
                            console.error('Error setting messages in Deep Chat:', err);
                        }
                    }
                    
                    // Configure Deep Chat for WebSocket communication
                    deepChatInstance.requestInterceptor = (request) => {
                        // Convert Deep Chat format to our WebSocket format
                        if (socket && socket.readyState === WebSocket.OPEN) {
                            const message = {
                                type: 'message',
                                content: request.text,
                                chat_id: currentChatId
                            };
                            socket.send(JSON.stringify(message));
                        } else {
                            console.error('WebSocket not connected!');
                            return { error: 'WebSocket not connected' };
                        }
                        
                        // Return false to prevent default HTTP request
                        return false;
                    };
                }, 100);
            } catch (e) {
                console.error('Error setting up Deep Chat:', e);
                chatArea.innerHTML = `
                    <div class="alert alert-danger">
                        Failed to initialize chat interface. Please try refreshing the page.
                    </div>
                `;
            }
        }
    })
    .catch(error => {
        console.error('Error loading messages:', error);
        
        // Hide loading indicator
        if (chatLoading) chatLoading.style.display = 'none';
        
        // Show error message
        if (chatArea) {
            chatArea.style.display = 'block';
            chatArea.innerHTML = `
                <div class="text-center py-4 text-danger">
                    <p>Failed to load messages. Please try again.</p>
                </div>
            `;
        }
    });
}

/**
 * Display a connection error message in the chat area
 * @param {String} message - Error message to display
 */
function displayConnectionError(message) {
    console.error('Connection error:', message);
    
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    // Remove any existing connection error message
    const existingError = chatMessages.querySelector('.connection-error');
    if (existingError) {
        existingError.remove();
    }
    
    // Add new error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger connection-error';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i> ${message}
        <button id="reconnect-button" class="btn btn-sm btn-outline-danger ml-3" onclick="reconnectWebSocket()">
            Reconnect
        </button>
    `;
    chatMessages.appendChild(errorDiv);
}

/**
 * Reconnect to the WebSocket
 */
function reconnectWebSocket() {
    // Get the current chat ID from the URL or the currentChatId variable
    const urlParams = new URLSearchParams(window.location.search);
    const chatId = urlParams.get('chat_id') || currentChatId || 0;
    
    console.log('Attempting to reconnect to WebSocket for chat ID:', chatId);
    connectToWebSocket(chatId);
}

/**
 * Connect to WebSocket for real-time messaging
 * @param {Number} chatId - Chat ID
 */
function connectToWebSocket(chatId) {
    console.log(`Connecting to WebSocket for chat ID: ${chatId}`);
    
    // Close existing connection if any
    if (socket && socket.readyState !== WebSocket.CLOSED) {
        console.log('Closing existing WebSocket connection');
        socket.close();
    }

    // Get authentication token
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No authentication token found');
        displayConnectionError('Authentication error. Please log in again.');
        return;
    }

    // Get book_id and seller_id from URL parameters if available (for new chats)
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('book_id');
    const sellerId = urlParams.get('seller_id');

    // Determine WebSocket URL based on whether we're creating a new chat or joining an existing one
    let wsUrl;
    
    // Determine WebSocket protocol (wss for HTTPS, ws for HTTP)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    if (chatId === 0 && bookId && sellerId) {
        // Creating a new chat
        console.log(`Creating new chat for book ${bookId} with seller ${sellerId}`);
        wsUrl = `${protocol}//${host}/api/ws/chat?book_id=${bookId}&seller_id=${sellerId}&token=${encodeURIComponent(token)}`;
        console.log("WebSocket URL for new chat:", wsUrl);
        
        // Set a flag to indicate this is a new chat
        sessionStorage.setItem('isNewChat', 'true');
    } else {
        // Joining an existing chat
        console.log(`Joining existing chat ${chatId}`);
        currentChatId = chatId;
        wsUrl = `${protocol}//${host}/api/ws/chat?chat_id=${chatId}&token=${encodeURIComponent(token)}`;
        console.log("WebSocket URL for existing chat:", wsUrl);
    }
    
    // Create WebSocket connection
    try {
        console.log(`Connecting to WebSocket at ${wsUrl}`);
        socket = new WebSocket(wsUrl);
        
        // Connection opened
        socket.addEventListener('open', (event) => {
            console.log('WebSocket connection established');
            
            // Show connected status
            const connectionStatus = document.getElementById('connection-status');
            if (connectionStatus) {
                connectionStatus.textContent = 'Connected';
                connectionStatus.className = 'text-success';
            }
            
            // Hide any previous connection errors
            const connectionError = document.getElementById('connection-error');
            if (connectionError) {
                connectionError.style.display = 'none';
            }
            
            // If this is a new chat, send an initial greeting message
            if (sessionStorage.getItem('isNewChat') === 'true') {
                console.log('Sending initial greeting for new chat');
                setTimeout(() => {
                    // Get the book title from the chat header if available
                    let bookTitle = 'this book';
                    const chatHeader = document.getElementById('chat-header');
                    if (chatHeader) {
                        const titleElement = chatHeader.querySelector('h5');
                        if (titleElement) {
                            bookTitle = titleElement.textContent;
                        }
                    }
                    
                    // Try two methods to send the initial message
                    // Method 1: Direct WebSocket message
                    const initialMessage = {
                        type: 'message',
                        content: `Hello! I'm interested in ${bookTitle}. Is it still available?`
                    };
                    
                    if (socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify(initialMessage));
                        console.log('Initial greeting sent via WebSocket');
                    } else {
                        console.error('Socket not open, trying alternative method');
                        
                        // Method 2: Use the sendMessage function
                        const messageInput = document.getElementById('message-input');
                        if (messageInput) {
                            messageInput.value = `Hello! I'm interested in ${bookTitle}. Is it still available?`;
                            sendMessage();
                            console.log('Initial greeting sent via sendMessage function');
                        }
                    }
                    
                    // Clear the new chat flag
                    sessionStorage.removeItem('isNewChat');
                }, 1000); // Slight delay to ensure everything is ready
            }
            
            // If this is a new chat, send an initial message
            if (chatId === 0 && bookId && sellerId) {
                setTimeout(() => {
                    sendMessage("Hi, I'm interested in this book. Is it still available?");
                }, 1000);
            }
        });

        // Listen for messages
        socket.addEventListener('message', (event) => {
            console.log('WebSocket message received:', event.data);
            
            try {
                const message = JSON.parse(event.data);
                
                // Handle different message types
                switch (message.type) {
                    case 'message':
                        // Regular chat message
                        console.log('Chat message received:', message);
                        addMessageToChat(message);
                        break;
                    
                    case 'chat_created':
                        // New chat created
                        console.log('New chat created:', message);
                        currentChatId = message.chat_id;
                        
                        // Update the URL to include the new chat ID
                        const currentUrl = new URL(window.location.href);
                        currentUrl.searchParams.delete('book_id');
                        currentUrl.searchParams.delete('seller_id');
                        currentUrl.searchParams.set('chat_id', currentChatId);
                        window.history.replaceState({}, '', currentUrl);
                        
                        // Refresh the chat list to include the new chat
                        setTimeout(loadChatSessions, 1000);
                        break;
                    
                    case 'connection_success':
                        console.log('Connection success:', message.content);
                        break;
                    
                    case 'error':
                        console.error('WebSocket error message:', message.content);
                        displayConnectionError(message.content);
                        break;
                    
                    case 'history':
                        console.log('Chat history received:', message.messages);
                        // Display chat history
                        if (message.messages && Array.isArray(message.messages)) {
                            message.messages.forEach(msg => {
                                addMessageToChat(msg);
                            });
                        }
                        break;
                        
                    default:
                        console.log('Unknown message type:', message.type);
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        });

        // Connection closed
        socket.addEventListener('close', (event) => {
            console.log('WebSocket connection closed:', event);
            
            // Show disconnected status
            const connectionStatus = document.getElementById('connection-status');
            if (connectionStatus) {
                connectionStatus.textContent = 'Disconnected';
                connectionStatus.className = 'text-danger';
            }
            
            // Show reconnect button
            const reconnectButton = document.getElementById('reconnect-button');
            if (reconnectButton) {
                reconnectButton.style.display = 'inline-block';
            }
            
            // Display connection error if it wasn't a normal closure
            if (event.code !== 1000) {
                displayConnectionError('Connection lost. Please try reconnecting.');
            }
        });

        // Connection error
        socket.addEventListener('error', (event) => {
            console.error('WebSocket error:', event);
            displayConnectionError('Connection error. Please try again later.');
        });
    } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        displayConnectionError(`Failed to create WebSocket connection: ${error.message}`);
    }
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
 * Send a message in the current chat
 */
function sendMessage() {
    if (!currentChatId) {
        displayError('No active chat selected');
        return;
    }
    
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();
    
    if (!message) {
        return;
    }
    
    // Clear input
    messageInput.value = '';
    
    // Send message through WebSocket
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'message',
            chat_id: currentChatId,
            content: message
        }));
    } else {
        displayError('Connection lost. Please try again.');
        // Attempt to reconnect
        initializeWebSocket();
    }
}

/**
 * Append a message to the chat window
 * @param {Object} message - The message to append
 */
function appendMessage(message) {
    const chatArea = document.getElementById('chat-area');
    if (!chatArea) return;
    
    const user = getUserData();
    const isSelf = message.sender_id === user.id;
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isSelf ? 'message-self' : 'message-other'}`;
    
    // Format timestamp
    const timestamp = new Date(message.timestamp);
    const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageElement.innerHTML = `
        <div class="message-content">
            <div class="message-text">${message.content}</div>
            <div class="message-time">${timeString}</div>
        </div>
    `;
    
    chatArea.appendChild(messageElement);
    chatArea.scrollTop = chatArea.scrollHeight;
}

/**
 * Load a chat session
 * @param {Number} chatId - The chat ID to load
 */
function loadChat(chatId) {
    if (!chatId) return;
    
    // Show loading indicator
    document.getElementById('chat-loading').style.display = 'block';
    document.getElementById('chat-area').style.display = 'none';
    document.getElementById('chat-input-container').style.display = 'none';
    
    // Fetch chat details and messages
    fetch(`/api/chats/${chatId}`, {
        headers: getAuthHeaders()
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to load chat');
        }
        return response.json();
    })
    .then(chat => {
        // Update chat header
        const user = getUserData();
        const otherUserName = user.role === 'buyer' ? chat.seller_name : chat.buyer_name;
        document.getElementById('chat-header').innerHTML = `
            <h5 class="mb-0">Chat with ${otherUserName}</h5>
            <a href="book-detail.html?id=${chat.book_id}" id="view-book-link">View Book</a>
        `;
        
        // Show chat area and input
        document.getElementById('chat-loading').style.display = 'none';
        document.getElementById('chat-area').style.display = 'block';
        document.getElementById('chat-input-container').style.display = 'block';
        
        // Clear existing messages
        const chatArea = document.getElementById('chat-area');
        chatArea.innerHTML = '';
        
        // Add messages to chat area
        if (chat.messages && chat.messages.length > 0) {
            chat.messages.forEach(message => {
                appendMessage(message);
            });
        }
        
        // Set current chat ID
        currentChatId = chatId;
        
        // Update URL
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('chat_id', chatId);
        window.history.replaceState({}, '', currentUrl);
    })
    .catch(error => {
        console.error('Error loading chat:', error);
        displayError('Failed to load chat. Please try again.');
        document.getElementById('chat-loading').style.display = 'none';
    });
}

/**
 * Display an error message to the user
 * @param {String} message - The error message to display
 */
function displayError(message) {
    // Create error alert
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger alert-dismissible fade show';
    alert.role = 'alert';
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Add to page
    const container = document.querySelector('.container');
    container.insertBefore(alert, container.firstChild);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

/**
 * Start a new chat with a seller
 * @param {Number} bookId - Book ID
 * @param {Number} sellerId - Seller ID
 */
function startNewChat(bookId, sellerId) {
    console.log(`Starting new chat for book ${bookId} with seller ${sellerId}`);
    
    // Validate parameters
    if (!bookId || !sellerId) {
        console.error('Missing required parameters for startNewChat');
        displayError('Missing book or seller information. Please try again.');
        return;
    }
    
    // Check if user is authenticated
    if (!isAuthenticated()) {
        window.location.href = `login.html?redirect=chat.html?book_id=${bookId}&seller_id=${sellerId}`;
        return;
    }
    
    // Get user data
    const user = getUserData();
    
    // Only buyers can initiate chats
    if (user.role !== 'buyer') {
        displayError('Only buyers can initiate chats with sellers.');
        return;
    }
    
    // Clear current chat
    clearChat();
    
    // Update URL with book_id and seller_id parameters
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.delete('chat_id');
    currentUrl.searchParams.set('book_id', bookId);
    currentUrl.searchParams.set('seller_id', sellerId);
    window.history.replaceState({}, '', currentUrl);
    
    // Set current chat ID to 0 (new chat)
    currentChatId = 0;
    
    // Get book details
    fetch(`api/books/${bookId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch book details: ${response.status}`);
            }
            return response.json();
        })
        .then(book => {
            console.log('Book details:', book);
            
            // Update chat header with book information
            const chatHeader = document.getElementById('chat-header');
            if (chatHeader) {
                chatHeader.innerHTML = `
                    <div class="d-flex align-items-center">
                        <img src="${book.image_url || 'images/default-book.jpg'}" alt="${book.title}" class="chat-book-image me-3">
                        <div>
                            <h5 class="mb-1">${book.title}</h5>
                            <p class="text-muted mb-0">Chat with seller about this book</p>
                        </div>
                    </div>
                `;
            }
            
            // Connect to WebSocket for the new chat
            connectToWebSocket(0);
            
            // Show the chat interface
            document.getElementById('chat-container').style.display = 'block';
            document.getElementById('empty-state').style.display = 'none';
            
            // Focus on the message input
            setTimeout(() => {
                const messageInput = document.getElementById('message-input');
                if (messageInput) {
                    messageInput.focus();
                }
            }, 500);
        })
        .catch(error => {
            console.error('Error fetching book details:', error);
            displayError(`Failed to load book details: ${error.message}`);
        });
}

/**
 * Initialize the book recommendation chatbot (separate from peer-to-peer chat)
 * This is used on the index page and other pages
 */
function initBookRecommendationChatbot() {
    console.log('Initializing book recommendation chatbot...');
    
    // Find all chatbot containers
    const containers = document.querySelectorAll('.book-assistant-container');
    if (containers.length === 0) {
        console.log('No chatbot containers found on this page');
        return;
    }
    
    // Define the initialization logic that will run after Deep Chat library is fully loaded
    const initializeDeepChat = function() {
        containers.forEach((container, index) => {
            try {
                console.log('Initializing book assistant in container', container.id || index);
                
                // Create a new Deep Chat element
                const chatbotElement = document.createElement('deep-chat');
                
                // Set styles
                chatbotElement.style.height = '100%';
                chatbotElement.style.width = '100%';
                
                // Configure the chatbot
                chatbotElement.directConnection = true;
                chatbotElement.requestUrl = '/api/chatbot';
                chatbotElement.requestBodyFormat = 'json';
                
                // Set up the request transformer to match the backend API format
                chatbotElement.requestTransformer = (request) => {
                    console.log("Sending request to chatbot:", request);
                    return {
                        query: request.text
                    };
                };
                
                // Set up the response transformer to handle the backend API response
                chatbotElement.responseTransformer = (response) => {
                    console.log("Chatbot response:", response);
                    if (response && response.response) {
                        let formattedResponse = response.response;
                        
                        // If there are book recommendations, add them to the response
                        if (response.books && response.books.length > 0) {
                            formattedResponse += "\n\n**Book Recommendations:**";
                            response.books.forEach((book, i) => {
                                formattedResponse += `\n- [${book.title} by ${book.author}](book-detail.html?id=${book.id})`;
                            });
                        }
                        
                        // Return the formatted response
                        return { text: formattedResponse };
                    } else {
                        return { text: "Sorry, I couldn't process your request. Please try again." };
                    }
                };
                
                // Welcome message
                chatbotElement.initialMessages = [
                    { role: 'assistant', text: 'Hello! I\'m BookBridge, your book assistant. How can I help you find books today? You can ask me to find books by title, author, or genre.' }
                ];
                
                // Add authentication if available
                if (isAuthenticated()) {
                    const token = localStorage.getItem('token');
                    chatbotElement.requestHeaders = {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    };
                } else {
                    chatbotElement.requestHeaders = {
                        'Content-Type': 'application/json'
                    };
                }
                
                // Add to the DOM
                container.innerHTML = ''; // Clear any loading indicators
                container.appendChild(chatbotElement);
                
                // Store the instance globally for debugging
                window.chatbotInstance = chatbotElement;
                
                console.log('Successfully initialized book assistant in container', container.id || index);
            } catch (error) {
                console.error('Error initializing book assistant in container', index, error);
                container.innerHTML = '<div class="alert alert-danger">Failed to load book assistant. Please refresh the page.</div>';
            }
        });
    };
    
    // Check if Deep Chat is loaded
    if (customElements.get('deep-chat')) {
        console.log('Deep Chat library detected, initializing...');
        initializeDeepChat();
    } else {
        console.log('Deep Chat library not yet loaded, waiting...');
        // Wait for the custom element to be defined
        window.addEventListener('DOMContentLoaded', () => {
            if (customElements.get('deep-chat')) {
                initializeDeepChat();
            } else {
                // Try again after a delay
                setTimeout(() => {
                    if (customElements.get('deep-chat')) {
                        initializeDeepChat();
                    } else {
                        console.error('Deep Chat library still not available');
                        containers.forEach(container => {
                            container.innerHTML = '<div class="alert alert-warning">Chat component could not be loaded. Please refresh the page.</div>';
                        });
                    }
                }, 2000);
            }
        });
    }
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
    
    // Initialize book recommendation chatbot on all pages
    // This uses a small delay to ensure the Deep Chat library is loaded
    setTimeout(initBookRecommendationChatbot, 500);
});
