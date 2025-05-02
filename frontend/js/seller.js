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
    
    // Add event listener for edit book button
    row.querySelector('.edit-book').addEventListener('click', function() {
        const bookId = this.dataset.id;
        loadBookForEditing(bookId);
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
    const priceRecommendationCard = document.getElementById('price-recommendation-card');
    const priceSlider = document.getElementById('price-slider');
    const priceSliderContainer = document.getElementById('price-slider-container');
    const getPriceRecommendationBtn = document.getElementById('get-price-recommendation');
    
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
        
        // Only proceed if all required fields are filled
        if (!title || !author || !genre || !condition) {
            alert('Please fill in title, author, genre and condition to get a price recommendation.');
            return;
        }
        
        // Show price recommendation card
        if (priceRecommendationCard) priceRecommendationCard.style.display = 'block';
        
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
            const predictedPrice = data.predicted_price;
            const formattedPrice = new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0
            }).format(predictedPrice);
            
            // Update the price guidance element
            priceGuidance.innerHTML = `
                <div class="alert alert-info mb-0">
                    <div class="d-flex align-items-center">
                        <i data-feather="info" class="me-2"></i>
                        <div>
                            <strong>Recommended Price:</strong> ${formattedPrice}
                            <div class="small">Based on similar books in our marketplace</div>
                            <div class="mt-2">
                                <ul>
                                    <li>Books in "${condition}" condition typically sell for this price</li>
                                    <li>Pricing within 10% of recommendation increases sale chances by 3x</li>
                                    <li>Most similar books in this genre sell within this range</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Replace feather icons
            feather.replace();
            
            // Set min, max and recommended price for slider
            const minPrice = Math.max(0, Math.round(predictedPrice * 0.7));
            const maxPrice = Math.round(predictedPrice * 1.3);
            
            // Update price slider
            if (priceSlider && priceSliderContainer) {
                priceSliderContainer.style.display = 'block';
                priceSlider.min = minPrice;
                priceSlider.max = maxPrice;
                priceSlider.value = predictedPrice;
                
                document.getElementById('min-price').textContent = minPrice;
                document.getElementById('recommended-price').textContent = predictedPrice;
                document.getElementById('max-price').textContent = maxPrice;
                
                // Set default value in price input
                if (priceInput) {
                    priceInput.value = predictedPrice;
                }
            }
            
            // Store the predicted price for later validation
            if (priceGuidance) priceGuidance.dataset.predictedPrice = predictedPrice;
        })
        .catch(error => {
            console.error('Error getting price prediction:', error);
            if (priceGuidance) {
                priceGuidance.innerHTML = '<div class="alert alert-danger">Unable to calculate recommended price. Please set a fair price based on condition and market value.</div>';
            }
        });
    }
    
    // Add event listener for slider change
    if (priceSlider) {
        priceSlider.addEventListener('input', function() {
            const priceInput = document.getElementById('book-price');
            const priceWarning = document.getElementById('price-warning');
            const recommendedPrice = parseFloat(document.getElementById('recommended-price').textContent);
            
            if (priceInput) {
                priceInput.value = this.value;
            }
            
            // Show warning if price is significantly higher than recommendation
            if (parseFloat(this.value) > recommendedPrice * 1.1) {
                if (priceWarning) {
                    priceWarning.textContent = `Your price is significantly higher than the recommended price of ₹${recommendedPrice}. Consider lowering it to increase chances of selling.`;
                    priceWarning.style.display = 'block';
                }
            } else {
                if (priceWarning) priceWarning.style.display = 'none';
            }
        });
    }
    
    // Add event listener for price input change
    const priceInput = document.getElementById('book-price');
    if (priceInput && priceSlider) {
        priceInput.addEventListener('input', function() {
            const value = parseFloat(this.value);
            const min = parseFloat(priceSlider.min);
            const max = parseFloat(priceSlider.max);
            
            // Update slider if value is within range
            if (!isNaN(value) && value >= min && value <= max) {
                priceSlider.value = value;
            }
            
            // Show warning if price is significantly higher than recommendation
            const recommendedPrice = parseFloat(document.getElementById('recommended-price').textContent);
            if (!isNaN(value) && !isNaN(recommendedPrice) && value > recommendedPrice * 1.1) {
                if (priceWarning) {
                    priceWarning.textContent = `Your price is significantly higher than the recommended price of ₹${recommendedPrice}. Consider lowering it to increase chances of selling.`;
                    priceWarning.style.display = 'block';
                }
            } else {
                if (priceWarning) priceWarning.style.display = 'none';
            }
        });
    }
    
    // Add event listener for get price recommendation button
    if (getPriceRecommendationBtn) {
        getPriceRecommendationBtn.addEventListener('click', getPricePrediction);
    }
    
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
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
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
    
    // Initialize book donation functionality
    initializeBookDonation();
    
    // Reset add book form when modal is closed
    const addBookModal = document.getElementById('addBookModal');
    if (addBookModal) {
        addBookModal.addEventListener('hidden.bs.modal', function() {
            document.getElementById('add-book-form').reset();
            document.getElementById('add-book-error').style.display = 'none';
            document.getElementById('price-warning').style.display = 'none';
        });
    }
    
    // Reset donation form when modal is closed
    const donateBookModal = document.getElementById('donateBookModal');
    if (donateBookModal) {
        donateBookModal.addEventListener('hidden.bs.modal', function() {
            if (document.getElementById('donation-message')) {
                document.getElementById('donation-message').value = '';
            }
            if (document.getElementById('donate-book-error')) {
                document.getElementById('donate-book-error').style.display = 'none';
            }
        });
    }
    
    // Initialize edit book functionality
    const saveEditBookBtn = document.getElementById('save-edit-book');
    if (saveEditBookBtn) {
        saveEditBookBtn.addEventListener('click', saveEditedBook);
    }
    
    // Reset edit book form when modal is closed
    const editBookModal = document.getElementById('editBookModal');
    if (editBookModal) {
        editBookModal.addEventListener('hidden.bs.modal', function() {
            document.getElementById('edit-book-form').reset();
            document.getElementById('edit-book-error').style.display = 'none';
            document.getElementById('edit-book-current-image-container').style.display = 'none';
        });
    }
});

/**
 * Initialize book donation functionality
 */
function initializeBookDonation() {
    // Load seller's books for donation
    const donateBookModal = document.getElementById('donateBookModal');
    if (donateBookModal) {
        donateBookModal.addEventListener('shown.bs.modal', loadBooksForDonation);
    }
    
    // Handle donation confirmation
    const confirmDonationBtn = document.getElementById('confirm-donation-btn');
    if (confirmDonationBtn) {
        confirmDonationBtn.addEventListener('click', confirmDonation);
    }
}

/**
 * Load seller's books for donation selection
 */
function loadBooksForDonation() {
    const user = getUserData();
    if (!user || user.role !== 'seller') return;
    
    const tableBody = document.getElementById('donate-books-table');
    if (!tableBody) return;
    
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
        // Filter to only show books belonging to this seller and that are not already free
        const sellerBooks = books.filter(book => book.seller_id === user.id && book.price > 0);
        
        // Clear table
        tableBody.innerHTML = '';
        
        if (sellerBooks.length === 0) {
            // Show empty table message
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">
                        You don't have any paid books to donate. Add new books or select books that currently have a price greater than zero.
                    </td>
                </tr>
            `;
            return;
        }
        
        // Add each book to the table
        sellerBooks.forEach(book => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="form-check">
                        <input class="form-check-input donate-book-checkbox" type="checkbox" value="${book.id}" id="donate-book-${book.id}">
                    </div>
                </td>
                <td>
                    <img src="${book.cover_image || 'images/book-placeholder.jpg'}" alt="${book.title}" class="img-thumbnail" style="width: 50px;">
                </td>
                <td>${book.title}</td>
                <td>${book.author}</td>
                <td>₹${book.price.toFixed(2)}</td>
                <td>${book.condition}</td>
            `;
            tableBody.appendChild(row);
        });
    })
    .catch(error => {
        console.error('Error loading books for donation:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger">
                    Failed to load books. Please try again.
                </td>
            </tr>
        `;
    });
}

/**
 * Confirm book donation and update book listings
 */
function confirmDonation() {
    const checkboxes = document.querySelectorAll('.donate-book-checkbox:checked');
    const donationMessage = document.getElementById('donation-message').value.trim();
    const errorDiv = document.getElementById('donate-book-error');
    
    // Validate at least one book is selected
    if (checkboxes.length === 0) {
        errorDiv.textContent = 'Please select at least one book to donate.';
        errorDiv.style.display = 'block';
        return;
    }
    
    // Get selected book IDs
    const bookIds = Array.from(checkboxes).map(cb => cb.value);
    
    // In a real application, we'd make API calls to update books to free status
    // For demo purposes, we'll just simulate success
    
    // Update donation stats
    const booksCount = parseInt(document.getElementById('books-donated').textContent) || 0;
    const readersCount = parseInt(document.getElementById('readers-helped').textContent) || 0;
    const impactScore = parseInt(document.getElementById('impact-score').textContent) || 0;
    
    document.getElementById('books-donated').textContent = booksCount + bookIds.length;
    document.getElementById('readers-helped').textContent = readersCount + (bookIds.length * 3); // Assuming each book helps ~3 readers
    document.getElementById('impact-score').textContent = impactScore + (bookIds.length * 15); // Impact points per book
    
    // Hide the donate modal and show success modal
    const donateModal = bootstrap.Modal.getInstance(document.getElementById('donateBookModal'));
    donateModal.hide();
    
    // Show success modal
    const successModal = new bootstrap.Modal(document.getElementById('donationSuccessModal'));
    successModal.show();
    
    // Reload book listings to reflect changes
    setTimeout(loadSellerBooks, 500);
}

/**
 * Load book data for editing
 * @param {Number} bookId - Book ID to edit
 */
function loadBookForEditing(bookId) {
    // Show loading indicator
    document.getElementById('edit-book-error').style.display = 'none';
    document.getElementById('edit-book-id').value = bookId;

    // Get book details from API
    fetch(`/api/books/${bookId}`, {
        headers: getAuthHeaders()
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to load book details');
        }
        return response.json();
    })
    .then(book => {
        // Fill form with book details
        document.getElementById('edit-book-title').value = book.title;
        document.getElementById('edit-book-author').value = book.author;
        document.getElementById('edit-book-description').value = book.description;
        document.getElementById('edit-book-genre').value = book.genre;
        document.getElementById('edit-book-condition').value = book.condition;
        document.getElementById('edit-book-price').value = book.price;
        
        // Set current image if available
        const currentImageContainer = document.getElementById('edit-book-current-image-container');
        const currentImage = document.getElementById('edit-book-current-image');
        
        if (book.image_url) {
            currentImageContainer.style.display = 'block';
            currentImage.src = book.image_url;
            currentImage.alt = `${book.title} by ${book.author}`;
        } else {
            currentImageContainer.style.display = 'none';
        }
        
        // Show the modal
        const editBookModal = new bootstrap.Modal(document.getElementById('editBookModal'));
        editBookModal.show();
    })
    .catch(error => {
        console.error('Error loading book details:', error);
        document.getElementById('edit-book-error').textContent = 'Failed to load book details. Please try again.';
        document.getElementById('edit-book-error').style.display = 'block';
    });
}

/**
 * Save edited book
 */
function saveEditedBook() {
    // Get form values
    const bookId = document.getElementById('edit-book-id').value;
    const title = document.getElementById('edit-book-title').value.trim();
    const author = document.getElementById('edit-book-author').value.trim();
    const description = document.getElementById('edit-book-description').value.trim();
    const genre = document.getElementById('edit-book-genre').value;
    const condition = document.getElementById('edit-book-condition').value;
    const price = parseFloat(document.getElementById('edit-book-price').value);
    const imageURL = document.getElementById('edit-book-image').value.trim();

    // Validate form
    if (!title || !author || !description || !genre || !condition || isNaN(price) || price <= 0) {
        document.getElementById('edit-book-error').textContent = 'Please fill in all required fields with valid values.';
        document.getElementById('edit-book-error').style.display = 'block';
        return;
    }

    // Prepare data for API
    const bookData = {
        title: title,
        author: author,
        description: description,
        genre: genre,
        condition: condition,
        price: price
    };

    // Add image URL if provided
    if (imageURL) {
        bookData.image_url = imageURL;
    }

    // Show loading state
    const saveButton = document.getElementById('save-edit-book');
    const originalText = saveButton.textContent;
    saveButton.disabled = true;
    saveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';

    // Send update request to API
    fetch(`/api/books/${bookId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
        },
        body: JSON.stringify(bookData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to update book');
        }
        return response.json();
    })
    .then(data => {
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editBookModal'));
        modal.hide();

        // Show success message as a toast notification
        showToast('Book updated successfully', 'success');

        // Reload books list
        loadSellerBooks();
    })
    .catch(error => {
        console.error('Error updating book:', error);
        document.getElementById('edit-book-error').textContent = 'Failed to update book. Please try again.';
        document.getElementById('edit-book-error').style.display = 'block';
    })
    .finally(() => {
        // Reset button state
        saveButton.disabled = false;
        saveButton.textContent = originalText;
    });
}

/**
 * Show a toast notification
 * @param {String} message - Message to display
 * @param {String} type - Type of toast (success, warning, error, info)
 */
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    
    // Create toast container if it doesn't exist
    if (!toastContainer) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'position-fixed bottom-0 end-0 p-3';
        container.style.zIndex = '5';
        document.body.appendChild(container);
    }
    
    // Set toast class based on type
    let bgClass = 'bg-success';
    let iconHTML = '<i data-feather="check-circle"></i>';
    
    switch (type) {
        case 'warning':
            bgClass = 'bg-warning text-dark';
            iconHTML = '<i data-feather="alert-triangle"></i>';
            break;
        case 'error':
            bgClass = 'bg-danger';
            iconHTML = '<i data-feather="alert-circle"></i>';
            break;
        case 'info':
            bgClass = 'bg-info text-dark';
            iconHTML = '<i data-feather="info"></i>';
            break;
    }
    
    // Create toast element
    const toastEl = document.createElement('div');
    toastEl.className = `toast ${bgClass} text-white`;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');
    
    toastEl.innerHTML = `
        <div class="toast-header ${bgClass} text-white">
            <div class="me-2">${iconHTML}</div>
            <strong class="me-auto">BookResell</strong>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;
    
    // Add toast to container
    document.getElementById('toast-container').appendChild(toastEl);
    
    // Initialize Feather icons
    feather.replace();
    
    // Initialize and show toast
    const toast = new bootstrap.Toast(toastEl, { delay: 5000 });
    toast.show();
    
    // Remove toast after it's hidden
    toastEl.addEventListener('hidden.bs.toast', function() {
        toastEl.remove();
    });
}
