/**
 * Seller dashboard functionality for BookResell
 */

/**
 * Load seller's book listings
 */
function loadSellerBooks() {
    const user = getUserData();
    if (!user || user.role !== 'seller') {
        window.location.href = 'index.html';
        return;
    }
    
    const tableBody = document.getElementById('my-books-table');
    const noBooksMessage = document.getElementById('no-books-message');
    
    // Show loading indicator
    tableBody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </td>
        </tr>
    `;
    
    // Get all books (the API will return only the seller's books based on authentication)
    fetch('/api/books', {
        headers: getAuthHeaders()
    })
    .then(response => response.json())
    .then(books => {
        // Filter to only show books belonging to this seller
        const sellerBooks = books.filter(book => book.seller_id === user.id);
        
        // Clear table
        tableBody.innerHTML = '';
        
        if (sellerBooks.length === 0) {
            // Show no books message
            if (noBooksMessage) noBooksMessage.style.display = 'block';
            
            // Show empty table message
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">
                        You haven't listed any books yet
                    </td>
                </tr>
            `;
        } else {
            // Hide no books message
            if (noBooksMessage) noBooksMessage.style.display = 'none';
            
            // Update statistics
            document.getElementById('active-listings-count').textContent = sellerBooks.length;
            
            // Calculate average price
            const totalPrice = sellerBooks.reduce((sum, book) => sum + book.price, 0);
            const averagePrice = totalPrice / sellerBooks.length;
            document.getElementById('average-price').textContent = `₹${averagePrice.toFixed(2)}`;
            
            // Add books to table
            sellerBooks.forEach(book => {
                const row = createBookRow(book);
                tableBody.appendChild(row);
            });
            
            // Initialize feather icons in newly created elements
            feather.replace();
        }
    })
    .catch(error => {
        console.error('Error loading books:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger">
                    Failed to load your book listings. Please try again.
                </td>
            </tr>
        `;
    });
}

/**
 * Create a table row for a book
 * @param {Object} book - Book data
 * @returns {HTMLElement} Table row element
 */
function createBookRow(book) {
    const row = document.createElement('tr');
    
    // Format date
    const createdDate = new Date(book.created_at);
    const dateStr = createdDate.toLocaleDateString();
    
    // Status badge color
    let statusBadgeClass = 'bg-success';
    if (book.status === 'sold') {
        statusBadgeClass = 'bg-danger';
    } else if (book.status === 'reserved') {
        statusBadgeClass = 'bg-warning';
    }
    
    // Create row content
    row.innerHTML = `
        <td>${book.title}</td>
        <td>${book.author}</td>
        <td>₹${book.price.toFixed(2)}</td>
        <td><span class="badge ${statusBadgeClass}">${book.status}</span></td>
        <td>${dateStr}</td>
        <td>
            <div class="btn-group">
                <a href="book-detail.html?id=${book.id}" class="btn btn-sm btn-outline-primary" title="View">
                    <i data-feather="eye"></i>
                </a>
                <button class="btn btn-sm btn-outline-danger delete-book" data-id="${book.id}" data-title="${book.title}" title="Delete">
                    <i data-feather="trash-2"></i>
                </button>
            </div>
        </td>
    `;
    
    // Add event listener for delete button
    row.querySelector('.delete-book').addEventListener('click', function() {
        const bookId = this.dataset.id;
        const bookTitle = this.dataset.title;
        showDeleteConfirmation(bookId, bookTitle);
    });
    
    return row;
}

/**
 * Show delete confirmation modal
 * @param {Number} bookId - Book ID
 * @param {String} bookTitle - Book title
 */
function showDeleteConfirmation(bookId, bookTitle) {
    const deleteBookTitle = document.getElementById('delete-book-title');
    const confirmDeleteBtn = document.getElementById('confirm-delete');
    
    // Set book title in modal
    deleteBookTitle.textContent = bookTitle;
    
    // Set confirm button action
    confirmDeleteBtn.onclick = function() {
        deleteBook(bookId);
    };
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
    modal.show();
}

/**
 * Delete a book listing
 * @param {Number} bookId - Book ID
 */
function deleteBook(bookId) {
    // Send delete request to API
    fetch(`/api/books/${bookId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to delete book');
        }
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'));
        modal.hide();
        
        // Show success message
        alert('Book deleted successfully');
        
        // Reload books
        loadSellerBooks();
    })
    .catch(error => {
        console.error('Error deleting book:', error);
        alert('Failed to delete book. Please try again.');
    });
}

/**
 * Load recent messages for seller
 */
function loadRecentMessages() {
    const messagesContainer = document.getElementById('recent-messages');
    if (!messagesContainer) return;
    
    // Show loading spinner
    messagesContainer.innerHTML = `
        <div class="list-group-item text-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
    
    // Fetch chats from API
    fetch('/api/chats', {
        headers: getAuthHeaders()
    })
    .then(response => response.json())
    .then(chats => {
        // Clear container
        messagesContainer.innerHTML = '';
        
        if (chats.length === 0) {
            // No messages
            messagesContainer.innerHTML = `
                <div class="list-group-item text-center">
                    <p class="mb-0 text-muted">No messages yet</p>
                </div>
            `;
            
            // Update stats
            document.getElementById('total-messages').textContent = '0';
            return;
        }
        
        // Update stats
        document.getElementById('total-messages').textContent = chats.length;
        
        // Sort chats by most recent message
        chats.sort((a, b) => {
            if (!a.messages || a.messages.length === 0) return 1;
            if (!b.messages || b.messages.length === 0) return -1;
            
            const aDate = new Date(a.messages[0].created_at);
            const bDate = new Date(b.messages[0].created_at);
            return bDate - aDate;
        });
        
        // Display the most recent 3 chats
        const recentChats = chats.slice(0, 3);
        
        recentChats.forEach(chat => {
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
            
            // Create the message preview
            const messageItem = document.createElement('a');
            messageItem.href = `chat.html?chatId=${chat.chat_id}`;
            messageItem.className = 'list-group-item list-group-item-action';
            
            messageItem.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <h6 class="mb-1">${otherUserName}</h6>
                    <small class="text-muted">${lastMessageTime}</small>
                </div>
                <p class="mb-1 text-muted">Book: ${chat.book_title}</p>
                <small class="chat-preview">${lastMessagePreview}</small>
            `;
            
            messagesContainer.appendChild(messageItem);
        });
    })
    .catch(error => {
        console.error('Error loading messages:', error);
        messagesContainer.innerHTML = `
            <div class="list-group-item text-center text-danger">
                <p class="mb-0">Failed to load messages</p>
            </div>
        `;
    });
}

/**
 * Initialize add book form
 */
function initializeAddBookForm() {
    const submitBookBtn = document.getElementById('submit-book');
    const addBookForm = document.getElementById('add-book-form');
    const errorMessage = document.getElementById('add-book-error');
    const priceWarning = document.getElementById('price-warning');
    const priceGuidance = document.getElementById('price-guidance');
    
    if (!submitBookBtn || !addBookForm) return;
    
    // Function to get price prediction
    function getPricePrediction() {
        // Get current form values
        const title = document.getElementById('book-title').value.trim();
        const author = document.getElementById('book-author').value.trim();
        const genre = document.getElementById('book-genre').value;
        const condition = document.getElementById('book-condition').value;
        
        // Only proceed if all required fields are filled
        if (!title || !author || !genre || !condition) {
            return;
        }
        
        // Show loading in price guidance
        priceGuidance.innerHTML = '<span class="text-info"><i data-feather="loader" class="loader-icon"></i> Calculating suggested price...</span>';
        priceGuidance.style.display = 'block';
        
        // Replace feather icons
        feather.replace();
        
        // Add a spinning animation to the loader icon
        document.querySelector('.loader-icon').classList.add('spin-animation');
        
        // Create prediction request object
        const predictionRequest = {
            title,
            author,
            genre,
            condition
        };
        
        // Call the prediction API endpoint
        fetch('/api/books/predict-price', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify(predictionRequest)
        })
        .then(response => response.json())
        .then(data => {
            if (data.predicted_price) {
                // Show the predicted price guidance
                priceGuidance.innerHTML = `
                    <div class="mt-2">
                        <span class="fw-bold">Suggested price: ₹${data.predicted_price.toFixed(2)}</span><br>
                        <small class="text-muted">Based on ML analysis of similar books</small>
                    </div>
                `;
                
                // Update the price input
                const priceInput = document.getElementById('book-price');
                if (!priceInput.value) {
                    priceInput.value = data.predicted_price.toFixed(2);
                }
            } else {
                priceGuidance.innerHTML = '<span class="text-warning">Could not calculate suggested price</span>';
            }
        })
        .catch(error => {
            console.error('Error predicting price:', error);
            priceGuidance.innerHTML = '<span class="text-danger">Error calculating price</span>';
        });
    }
    
    // Add event listeners to form fields for real-time price prediction
    ['book-title', 'book-author', 'book-genre', 'book-condition'].forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('change', getPricePrediction);
        }
    });
    
    // Handle form submission
    submitBookBtn.addEventListener('click', function() {
        // Hide messages
        errorMessage.style.display = 'none';
        priceWarning.style.display = 'none';
        
        // Validate form
        if (!addBookForm.checkValidity()) {
            addBookForm.reportValidity();
            return;
        }
        
        // Get form values
        const title = document.getElementById('book-title').value.trim();
        const author = document.getElementById('book-author').value.trim();
        const description = document.getElementById('book-description').value.trim();
        const price = parseFloat(document.getElementById('book-price').value);
        const genre = document.getElementById('book-genre').value;
        const condition = document.getElementById('book-condition').value;
        const imageUrl = document.getElementById('book-image').value.trim() || null;
        
        // Create book object
        const book = {
            title,
            author,
            description,
            price,
            genre,
            condition,
            image_url: imageUrl
        };
        
        // Submit book to API
        fetch('/api/books', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(book)
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                // Check if error is related to price cap
                if (data.predicted_price) {
                    priceWarning.innerHTML = `
                        Your price (₹${price.toFixed(2)}) exceeds the fair market value (₹${data.predicted_price.toFixed(2)}).
                        Please reduce your price to at most ₹${data.predicted_price.toFixed(2)}.
                    `;
                    priceWarning.style.display = 'block';
                } else {
                    errorMessage.textContent = data.error;
                    errorMessage.style.display = 'block';
                }
                return;
            }
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('addBookModal'));
            modal.hide();
            
            // Reset form
            addBookForm.reset();
            
            // Hide guidance message
            priceGuidance.style.display = 'none';
            
            // Show success message
            alert('Book added successfully!');
            
            // Reload books
            loadSellerBooks();
        })
        .catch(error => {
            console.error('Error adding book:', error);
            errorMessage.textContent = 'Failed to add book. Please try again.';
            errorMessage.style.display = 'block';
        });
    });
}

// Add event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Feather icons
    feather.replace();
    
    // Check if user is authorized seller
    const user = getUserData();
    if (!user || user.role !== 'seller') {
        window.location.href = 'index.html';
        return;
    }
    
    // Initialize authentication UI
    updateAuthUI();
    
    // Load seller's books
    loadSellerBooks();
    
    // Load recent messages
    loadRecentMessages();
    
    // Initialize add book form
    initializeAddBookForm();
    
    // Reset add book form when modal is closed
    const addBookModal = document.getElementById('addBookModal');
    if (addBookModal) {
        addBookModal.addEventListener('hidden.bs.modal', function() {
            document.getElementById('add-book-form').reset();
            document.getElementById('add-book-error').style.display = 'none';
            document.getElementById('price-warning').style.display = 'none';
        });
    }
});
