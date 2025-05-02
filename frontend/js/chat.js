/**
 * Chat functionality for BookResell
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
    
    fetch('/api/chats', {
        headers: getAuthHeaders()
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
 * Connect to WebSocket for real-time messaging
 * @param {Number} chatId - Chat ID
 */
/**
 * Display a connection error message in the chat window
 * @param {String} message - Error message to display
 */
function displayConnectionError(message) {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        // Remove any existing connection error message
        const existingError = chatMessages.querySelector('.connection-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Add new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'text-center py-3 text-danger connection-error';
        errorDiv.innerHTML = `
            <div class="alert alert-danger">
                <i data-feather="alert-triangle"></i> ${message}
            </div>
        `;
        chatMessages.appendChild(errorDiv);
        
        // Re-initialize feather icons if they're used
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    } else {
        // Fallback to alert if chat messages container not found
        console.error('Chat messages container not found, showing alert instead');
        alert(`Connection Error: ${message}`);
    }
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
    
    // Get the JWT token from the authentication utility
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No authentication token found');
        alert('You need to be logged in to use the chat feature.');
        window.location.href = 'login.html';
        return;
    }
    
    // Determine WebSocket protocol (wss for HTTPS, ws for HTTP)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // If it's a new chat (chatId = 0), we need to include the book ID
    let wsUrl;
    const urlParams = new URLSearchParams(window.location.search);
    
    // Get user data
    const user = getUserData();
    if (!user) {
        console.error('No user data available');
        displayConnectionError('Authentication error. Please try logging in again.');
        return;
    }
    
    console.log('User role in connectToWebSocket:', user.role);
    
    if (chatId === 0) {
        // Get the book ID from URL parameters
        const bookId = urlParams.get('book_id');
        const sellerId = urlParams.get('seller_id');
        
        if (!bookId) {
            console.error('No book ID available for new chat');
            displayConnectionError('Could not start chat: missing book information.');
            return;
        }
        
        if (!sellerId) {
            console.error('No seller ID available for new chat');
            displayConnectionError('Could not start chat: missing seller information.');
            return;
        }
        
        // For starting a new chat, we need both book ID and seller ID
        wsUrl = `${protocol}//${window.location.host}/ws/chat/${bookId}`;
        
        // Add seller ID as query parameter for buyer-initiated chats
        if (user.role === 'buyer') {
            wsUrl += `?seller_id=${sellerId}`;
            console.log('Adding seller_id parameter for buyer-initiated chat:', sellerId);
        } else if (user.role === 'seller') {
            // For sellers, we would need a buyer_id to initiate a chat
            // This is typically not how it works (buyers initiate chats)
            // But if we have a buyer_id from the URL, we can use it
            const buyerId = urlParams.get('buyer_id');
            if (buyerId) {
                wsUrl += `?buyer_id=${buyerId}`;
                console.log('Adding buyer_id parameter for seller-initiated chat:', buyerId);
            } else {
                console.warn('Sellers need a buyer_id to initiate chats.');
                displayConnectionError('Sellers need a buyer ID to initiate chats.');
                return;
            }
        } else {
            console.warn('Unknown user role:', user.role);
            displayConnectionError('Unknown user role. Please try logging in again.');
            return;
        }
        
        console.log('Connecting to WebSocket URL for new chat:', wsUrl);
    } else {
        // For existing chats, identify the book from the chat list
        const chat = activeChats.find(c => c.chat_id === chatId);
        if (!chat || !chat.book_id) {
            console.error('Could not find book ID for chat:', chatId);
            displayConnectionError('Could not find details for this chat.');
            return;
        }
        
        // Use the book ID for the WebSocket connection
        wsUrl = `${protocol}//${window.location.host}/ws/chat/${chat.book_id}`;
        
        // Always add the correct parameter based on role
        if (user.role === 'seller') {
            // Make sure we have a buyer_id
            if (!chat.buyer_id) {
                console.error('Missing buyer_id for seller chat:', chatId);
                displayConnectionError('Missing buyer information for this chat.');
                return;
            }
            wsUrl += `?buyer_id=${chat.buyer_id}`;
            console.log('Adding buyer_id parameter for seller chat:', chat.buyer_id);
        } else if (user.role === 'buyer') {
            // Make sure we have a seller_id
            if (!chat.seller_id) {
                console.error('Missing seller_id for buyer chat:', chatId);
                displayConnectionError('Missing seller information for this chat.');
                return;
            }
            wsUrl += `?seller_id=${chat.seller_id}`;
            console.log('Adding seller_id parameter for buyer chat:', chat.seller_id);
        } else {
            console.warn('Unknown user role:', user.role);
            displayConnectionError('Unknown user role. Please try logging in again.');
            return;
        }
        
        console.log('Connecting to WebSocket URL for existing chat:', wsUrl);
    }
    
    // Initially set a connection error handler that shows detailed information
    let connectionAttempted = false;
    const connectionTimeout = setTimeout(() => {
        if (!connectionAttempted) {
            console.error('WebSocket connection timeout');
            alert('Chat connection timed out. Please check your internet connection and try again.');
        }
    }, 5000); // 5 second timeout
    
    try {
        console.log('Creating new WebSocket connection to:', wsUrl);
        
        // Get the token for authentication
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found for WebSocket authentication');
            displayConnectionError('Authentication error. Please try logging in again.');
            return;
        }
        
        // Add the token as a request header when establishing connection if supported
        const wsHeaders = {
            'Authorization': `Bearer ${token}`
        };
        
        // For browsers that don't support custom headers in WebSocket constructor,
        // we'll authenticate with the first message after connection
        
        // Create new WebSocket connection with better error handling
        socket = new WebSocket(wsUrl);
        connectionAttempted = true;
        
        socket.onopen = function() {
            clearTimeout(connectionTimeout);
            console.log('WebSocket opened successfully, sending authentication token');
            
            try {
                // Send authentication token as first message (backup authentication method)
                this.send(JSON.stringify({
                    type: 'auth',
                    token: token
                }));
                console.log('WebSocket authentication token sent successfully');
                
                // Let the user know connection is successful
                const chatMessages = document.getElementById('chat-messages');
                if (chatMessages && chatMessages.querySelector('.connection-error')) {
                    chatMessages.querySelector('.connection-error').remove();
                }
            } catch (sendError) {
                console.error('Error sending WebSocket authentication:', sendError);
                displayConnectionError('Failed to authenticate chat connection. Please try again.');
            }
        };
        
        socket.onmessage = function(event) {
            console.log('WebSocket message received:', event.data);
            let data;
            try {
                data = JSON.parse(event.data);
            } catch (e) {
                console.error('Error parsing WebSocket message:', e);
                return;
            }
            
            if (data.type === 'message') {
                console.log('Message received:', data);
                // Create message object
                const message = {
                    id: data.data?.message_id || Date.now(), // Fallback if no message_id
                    sender_id: data.sender_id,
                    sender_name: data.data?.sender_name || 'Unknown',
                    content: data.content,
                    created_at: data.timestamp || new Date().toISOString(),
                    is_self_sender: data.sender_id === getUserData().id
                };
                
                // Check if we're using Deep Chat
                if (deepChatInstance) {
                    // Add message to Deep Chat
                    const user = getUserData();
                    const isFromCurrentUser = message.sender_id === user.id;
                    
                    deepChatInstance.addMessage({
                        role: isFromCurrentUser ? 'user' : 'assistant',
                        text: message.content,
                        name: isFromCurrentUser ? user.username : message.sender_name
                    });
                } else {
                    // Fall back to the old message display method
                    addMessageToChat(message);
                    
                    // Scroll to the bottom
                    const chatMessages = document.getElementById('chat-messages');
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
                
                // Show notification if needed
                if (!message.is_self_sender) {
                    // Could add browser notification here
                    // Note: No audio notification for now as we don't have the sound file
                    // Just log the message reception
                    console.log('New message received from', message.sender_name);
                    
                    // Flash the title to notify the user if the tab is not active
                    if (document.hidden) {
                        let originalTitle = document.title;
                        document.title = '📩 New Message - BookResell';
                        
                        // Restore the original title when the tab becomes active again
                        window.addEventListener('focus', function onFocus() {
                            document.title = originalTitle;
                            window.removeEventListener('focus', onFocus);
                        });
                    }
                }
            } else if (data.type === 'chat_created') {
                console.log('New chat created:', data);
                // Save the new chat id
                currentChatId = data.chat_id;
                // Update URL to include chat ID
                const currentUrl = new URL(window.location.href);
                currentUrl.searchParams.set('chat_id', currentChatId);
                window.history.replaceState({}, '', currentUrl);
                // Refresh chat list
                loadChatSessions();
            } else if (data.type === 'history') {
                // History already loaded by the API
                console.log('Chat history received');
            } else if (data.type === 'error') {
                console.error('WebSocket error:', data.content);
                alert(`Chat error: ${data.content}`); 
            } else if (data.type === 'connection_success') {
                console.log('WebSocket connection successful:', data.content);
            } else {
                console.log('Unknown message type:', data.type);
            }
        };
        
        socket.onerror = function(error) {
            clearTimeout(connectionTimeout);
            console.error('WebSocket error occurred:', error);
            displayConnectionError('Chat connection error. Please try refreshing the page.');
        };
        
        socket.onclose = function(event) {
            clearTimeout(connectionTimeout);
            console.log('WebSocket connection closed with code:', event.code);
            if (!event.wasClean) {
                displayConnectionError('Chat connection was interrupted. Please refresh the page to reconnect.');
            }
        };
    } catch (connError) {
        clearTimeout(connectionTimeout);
        console.error('Failed to create WebSocket connection:', connError);
        displayConnectionError('Failed to establish chat connection. Please try again later.');
        return;
    }

    // Helper function to display connection errors in the UI
    function displayConnectionError(message) {
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            // Remove any existing connection error message
            const existingError = chatMessages.querySelector('.connection-error');
            if (existingError) {
                existingError.remove();
            }
            
            // Add new error message
            const errorDiv = document.createElement('div');
            errorDiv.className = 'text-center py-3 text-danger connection-error';
            errorDiv.innerHTML = `
                <div class="alert alert-danger">
                    <i data-feather="alert-triangle"></i> ${message}
                </div>
            `;
            chatMessages.appendChild(errorDiv);
            
            // Re-initialize feather icons if they're used
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }
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
 * Send a message via WebSocket
 * Note: This function is kept for backward compatibility, but messages are
 * now primarily sent via Deep Chat's requestInterceptor
 */
function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const sendButton = document.querySelector('#message-form button[type="submit"]');
    const content = messageInput.value.trim();
    
    if (!content) {
        // Nothing to send
        return;
    }
    
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        alert('Chat connection lost. Please refresh the page and try again.');
        return;
    }
    
    if (!currentChatId) {
        console.error('No active chat ID');
        alert('No active chat. Please select a chat or start a new one.');
        return;
    }
    
    // Disable input and button while sending
    messageInput.disabled = true;
    if (sendButton) sendButton.disabled = true;
    
    try {
        // Send message
        socket.send(JSON.stringify({
            type: 'message',
            content: content,
            chat_id: currentChatId
        }));
        
        // Clear input
        messageInput.value = '';
        
        // Add message to UI immediately for better UX (optimistic UI)
        const user = getUserData();
        const message = {
            id: Date.now(),
            sender_id: user.id,
            sender_name: user.username,
            content: content,
            created_at: new Date().toISOString(),
            is_self_sender: true
        };
        
        // If using Deep Chat, add to Deep Chat instead
        if (deepChatInstance) {
            deepChatInstance.addMessage({
                role: 'user',
                text: content,
                name: user.username
            });
        } else {
            // Fall back to old UI
            addMessageToChat(message);
            
            // Scroll to the bottom
            const chatMessages = document.getElementById('chat-messages');
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message. Please try again.');
    } finally {
        // Re-enable input and button
        messageInput.disabled = false;
        if (sendButton) sendButton.disabled = false;
        messageInput.focus();
    }
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
                
                // Initialize and show Deep Chat for the new conversation
                const chatMessages = document.getElementById('chat-messages');
                const chatArea = document.getElementById('chat-area');
                const chatLoading = document.getElementById('chat-loading');
                
                // Hide the old UI elements
                if (chatLoading) chatLoading.style.display = 'none';
                
                // Show the chat area with Deep Chat
                if (chatArea) {
                    chatArea.style.display = 'block';
                    chatArea.innerHTML = '';
                    
                    // Create and configure Deep Chat
                    const deepChatElement = document.createElement('deep-chat');
                    deepChatElement.style.height = '400px';
                    deepChatElement.style.width = '100%';
                    chatArea.appendChild(deepChatElement);
                    
                    // Initialize Deep Chat instance
                    deepChatInstance = deepChatElement;
                    
                    // Add a welcome message
                    deepChatInstance.addMessage({
                        role: 'assistant',
                        text: `Start a conversation with the seller about "${book.title}"!`,
                        name: 'System'
                    });
                    
                    // Configure Deep Chat for WebSocket communication
                    deepChatInstance.requestInterceptor = (request) => {
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
                        return false; // Prevent default HTTP request
                    };
                } else {
                    // Fallback to the old UI
                    chatMessages.innerHTML = `
                        <div class="text-center py-4">
                            <p class="text-muted">Start a conversation with the seller about "${book.title}"!</p>
                        </div>
                    `;
                }
                
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

/**
 * Initialize the book recommendation chatbot (separate from peer-to-peer chat)
 * This is used on the index page and other pages
 */
function initBookRecommendationChatbot() {
    // Find all book assistant containers in the page
    const containers = document.querySelectorAll('.book-assistant-container');
    if (containers.length === 0) {
        console.log('No book assistant containers found');
        return; // No containers found, nothing to do
    }
    
    console.log('Found', containers.length, 'book assistant containers');
    
    // Define the initialization logic that will run after Deep Chat library is fully loaded
    const initializeDeepChat = () => {
        containers.forEach((container, index) => {
            try {
                console.log(`Initializing Deep Chat in container #${index}: ${container.id}`);
                
                // Check if this container already has a Deep Chat element
                const existingChat = container.querySelector('deep-chat');
                if (existingChat) {
                    console.log('Deep Chat already exists in this container, skipping');
                    return;
                }
                
                // Clear previous content
                container.innerHTML = '';
                
                // Create a new Deep Chat element for this container
                const chatbotElement = document.createElement('deep-chat');
                
                // Configure the chatbot
                chatbotElement.style.height = '400px';
                chatbotElement.style.width = '100%';
                chatbotElement.style.border = '1px solid #e9ecef';
                chatbotElement.style.borderRadius = '0.25rem';
                chatbotElement.classList.add('book-assistant');
                chatbotElement.id = `book-assistant-${container.id || index}`;
                
                // Set up the connection to the API
                chatbotElement.setAttribute('directConnection', 'true');
                chatbotElement.setAttribute('requestUrl', '/api/chatbot');
                
                // Welcome message
                const welcomeMessage = [
                    { role: 'assistant', text: 'Hello! I\'m the BookResell Assistant. How can I help you find books today?' }
                ];
                chatbotElement.initialMessages = welcomeMessage;
                
                // Add authentication if available
                if (isAuthenticated()) {
                    const token = localStorage.getItem('token');
                    chatbotElement.requestHeaders = {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    };
                }
                
                // Add to the DOM
                container.appendChild(chatbotElement);
                
                console.log('Successfully initialized book assistant in container', container.id || index);
            } catch (error) {
                console.error('Error initializing book assistant in container', index, error);
                container.innerHTML = '<div class="alert alert-danger">Failed to load book assistant. Please refresh the page.</div>';
            }
        });
    };
    
    // Make sure the global Deep Chat component is loaded before initializing
    if (typeof DeepChat !== 'undefined' || typeof window.DeepChat !== 'undefined' || customElements.get('deep-chat')) {
        console.log('Deep Chat library detected, initializing...');
        initializeDeepChat();
    } else {
        console.log('Deep Chat library not yet loaded, waiting...');
        // If not loaded, retry after a short delay
        setTimeout(() => {
            console.log('Retrying Deep Chat initialization...');
            if (typeof DeepChat !== 'undefined' || typeof window.DeepChat !== 'undefined' || customElements.get('deep-chat')) {
                initializeDeepChat();
            } else {
                console.error('Deep Chat library still not available after delay');
                containers.forEach(container => {
                    container.innerHTML = '<div class="alert alert-warning">Chat component is loading. If it doesn\'t appear, please refresh the page.</div>';
                });
            }
        }, 1000);
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
