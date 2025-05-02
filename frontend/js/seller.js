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
    
    // Random number of views for demo - in a real app this would come from analytics
    const viewCount = Math.floor(Math.random() * 100) + 1;
    
    // Create row content
    row.innerHTML = `
        <td>${book.title}</td>
        <td>${book.author}</td>
        <td>₹${book.price.toFixed(2)}</td>
        <td><span class="badge ${statusBadgeClass}">${book.status}</span></td>
        <td>${dateStr}</td>
        <td>${viewCount}</td>
        <td>
            <div class="btn-group">
                <a href="book-detail.html?id=${book.id}" class="btn btn-sm btn-outline-primary btn-action" title="View">
                    <i data-feather="eye"></i>
                </a>
                <button class="btn btn-sm btn-outline-secondary btn-action edit-book" data-id="${book.id}" data-title="${book.title}" title="Edit">
                    <i data-feather="edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger btn-action delete-book" data-id="${book.id}" data-title="${book.title}" title="Delete">
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
    
    // Add event listener for edit button (placeholder for future functionality)
    row.querySelector('.edit-book').addEventListener('click', function() {
        const bookId = this.dataset.id;
        alert(`Edit functionality for book ID ${bookId} will be implemented soon.`);
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
        const priceInput = document.getElementById('book-price');
        const priceWarning = document.getElementById('price-warning');
        const priceGuidance = document.getElementById('price-guidance');
        
        // Only proceed if all required fields are filled
        if (!title || !author || !genre || !condition) {
            priceGuidance.style.display = 'none';
            return;
        }
        
        // Show loading indicator in the price guidance element
        priceGuidance.innerHTML = '<div class="d-flex align-items-center"><div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div><span>Calculating recommended price...</span></div>';
        priceGuidance.style.display = 'block';
        
        // Prepare request data
        const requestData = {
            title: title,
            author: author,
            genre: genre,
            condition: condition
        };
        
        // Call the API to get price prediction
        fetch('/api/books/predict-price', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify(requestData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to get price prediction');
            }
            return response.json();
        })
        .then(data => {
            // Format the predicted price with Indian Rupee symbol
            const formattedPrice = new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0
            }).format(data.predicted_price);
            
            // Update the price guidance element
            priceGuidance.innerHTML = `
                <div class="alert alert-info mb-0">
                    <div class="d-flex align-items-center">
                        <i data-feather="info" class="me-2"></i>
                        <div>
                            <strong>Recommended Price:</strong> ${formattedPrice}
                            <div class="small">Based on similar books in our marketplace</div>
                        </div>
                    </div>
                </div>
            `;
            
            // Replace feather icons
            feather.replace();
            
            // Store the predicted price for later validation
            priceGuidance.dataset.predictedPrice = data.predicted_price;
            
            // Check if user entered a price and compare with prediction
            const currentPrice = parseFloat(priceInput.value);
            if (!isNaN(currentPrice) && currentPrice > data.predicted_price * 1.1) {
                priceWarning.textContent = `Your price is significantly higher than the recommended price of ${formattedPrice}. Consider lowering it to increase chances of selling.`;
                priceWarning.style.display = 'block';
            } else {
                priceWarning.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error getting price prediction:', error);
            priceGuidance.innerHTML = '<div class="text-danger">Unable to calculate recommended price. Please set a fair price based on condition and market value.</div>';
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

/**
 * Initialize dashboard analytics charts
 */
function initializeAnalyticsCharts() {
    // Sales Chart
    const salesChartCtx = document.getElementById('sales-chart');
    if (salesChartCtx) {
        new Chart(salesChartCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Sales (₹)',
                    data: [1200, 1900, 3000, 5000, 2000, 3500],
                    backgroundColor: 'rgba(74, 109, 167, 0.2)',
                    borderColor: 'rgba(74, 109, 167, 1)',
                    borderWidth: 2,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₹' + value;
                            }
                        }
                    }
                }
            }
        });
    }

    // Top Books Chart
    const topBooksChartCtx = document.getElementById('top-books-chart');
    if (topBooksChartCtx) {
        new Chart(topBooksChartCtx, {
            type: 'bar',
            data: {
                labels: ['To Kill a Mockingbird', '1984', 'Pride and Prejudice', 'The Great Gatsby', 'The Hobbit'],
                datasets: [{
                    label: 'Sales',
                    data: [12, 8, 6, 5, 4],
                    backgroundColor: [
                        'rgba(74, 109, 167, 0.7)',
                        'rgba(74, 109, 167, 0.6)',
                        'rgba(74, 109, 167, 0.5)',
                        'rgba(74, 109, 167, 0.4)',
                        'rgba(74, 109, 167, 0.3)'
                    ],
                    borderColor: [
                        'rgba(74, 109, 167, 1)',
                        'rgba(74, 109, 167, 1)',
                        'rgba(74, 109, 167, 1)',
                        'rgba(74, 109, 167, 1)',
                        'rgba(74, 109, 167, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
    }

    // Views Chart
    const viewsChartCtx = document.getElementById('views-chart');
    if (viewsChartCtx) {
        new Chart(viewsChartCtx, {
            type: 'line',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [{
                    label: 'Profile Views',
                    data: [65, 120, 80, 130],
                    borderColor: 'rgba(23, 162, 184, 1)',
                    backgroundColor: 'rgba(23, 162, 184, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'Book Views',
                    data: [30, 60, 90, 150],
                    borderColor: 'rgba(40, 167, 69, 1)',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Messages Chart
    const messagesChartCtx = document.getElementById('messages-chart');
    if (messagesChartCtx) {
        new Chart(messagesChartCtx, {
            type: 'doughnut',
            data: {
                labels: ['Responded', 'Pending', 'Closed'],
                datasets: [{
                    data: [15, 5, 8],
                    backgroundColor: [
                        'rgba(40, 167, 69, 0.7)',
                        'rgba(255, 193, 7, 0.7)',
                        'rgba(220, 53, 69, 0.7)'
                    ],
                    borderColor: [
                        'rgba(40, 167, 69, 1)',
                        'rgba(255, 193, 7, 1)',
                        'rgba(220, 53, 69, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%'
            }
        });
    }
}

/**
 * Load seller's dashboard data
 */
function loadDashboardData() {
    // Set example data for dashboard panels
    document.getElementById('total-sales').textContent = '15,750.00';
    document.getElementById('unread-messages').textContent = '3';
    
    // Initialize charts
    initializeAnalyticsCharts();
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
    
    // Load dashboard data
    loadDashboardData();
    
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
