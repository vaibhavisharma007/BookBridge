/**
 * Book Detail Page JavaScript
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize feather icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
    
    // Check if user is authenticated
    if (!isAuthenticated()) {
        document.querySelectorAll('.authenticated').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.auth-not-required').forEach(el => el.style.display = 'inline-block');
    } else {
        document.querySelectorAll('.authenticated').forEach(el => el.style.display = 'inline-block');
        document.querySelectorAll('.auth-not-required').forEach(el => el.style.display = 'none');
        
        // Check user role
        const user = getUserData();
        if (user.role === 'seller') {
            document.querySelectorAll('.seller-only').forEach(el => el.style.display = 'inline-block');
            document.querySelectorAll('.buyer-only').forEach(el => el.style.display = 'none');
        } else if (user.role === 'buyer') {
            document.querySelectorAll('.seller-only').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.buyer-only').forEach(el => el.style.display = 'inline-block');
        }
    }
    
    // Get book ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('id');
    
    if (!bookId) {
        document.getElementById('loading-indicator').style.display = 'none';
        document.getElementById('book-not-found').style.display = 'block';
        return;
    }
    
    // Fetch book details
    fetch(`api/books/${bookId}`, {
        headers: getAuthHeaders()
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Book not found');
        }
        return response.json();
    })
    .then(book => {
        // Hide loading, show content
        document.getElementById('loading-indicator').style.display = 'none';
        document.getElementById('book-detail-container').style.display = 'block';
        
        // Populate book details
        document.getElementById('book-title').textContent = book.title;
        document.getElementById('book-author').textContent = `by ${book.author}`;
        document.getElementById('book-price').textContent = `₹${book.price.toFixed(2)}`;
        document.getElementById('book-genre').textContent = book.genre || 'Not specified';
        document.getElementById('book-condition').textContent = book.condition || 'Not specified';
        document.getElementById('book-seller').textContent = book.seller_username;
        document.getElementById('book-description').textContent = book.description;
        
        // Format date
        const createdDate = new Date(book.created_at);
        document.getElementById('book-date').textContent = createdDate.toLocaleDateString();
        
        // Set status badge
        const statusBadge = document.getElementById('book-status');
        statusBadge.textContent = book.status.charAt(0).toUpperCase() + book.status.slice(1);
        if (book.status === 'sold') {
            statusBadge.className = 'badge bg-danger';
        } else if (book.status === 'reserved') {
            statusBadge.className = 'badge bg-warning';
        }
        
        // Set book image
        const bookImage = document.getElementById('book-image');
        if (book.image_url) {
            bookImage.src = book.image_url;
        } else {
            // Default book cover if no image provided
            bookImage.src = 'https://via.placeholder.com/300x450?text=No+Image+Available';
        }
        
        // Check if the current user is the seller
        const user = getUserData();
        if (user && user.id === book.seller_id) {
            document.getElementById('owner-message').style.display = 'block';
            document.getElementById('contact-seller').style.display = 'none';
        } else if (user && user.role === 'buyer') {
            document.getElementById('contact-seller').style.display = 'block';
        } else if (!user) {
            document.getElementById('not-authenticated-message').style.display = 'block';
        }
        
        // Set up seller profile link
        const viewSellerProfileBtn = document.getElementById('view-seller-profile');
        if (viewSellerProfileBtn) {
            viewSellerProfileBtn.addEventListener('click', function(event) {
                event.preventDefault();
                // Open seller profile page or modal
                window.location.href = `seller-profile.html?id=${book.seller_id}`;
            });
        }
        
        // Set up chat button event
        const chatWithSellerBtn = document.getElementById('chat-with-seller');
        if (chatWithSellerBtn) {
            chatWithSellerBtn.addEventListener('click', function() {
                if (!isAuthenticated()) {
                    window.location.href = 'login.html?redirect=book-detail.html?id=' + bookId;
                    return;
                }
                
                const user = getUserData();
                if (user.role !== 'buyer') {
                    showMessage('Only buyers can chat with sellers', 'error');
                    return;
                }
                
                console.log(`Initiating chat with seller ${book.seller_id} about book ${book.id}`);
                
                // Redirect to chat page with book and seller info
                window.location.href = `chat.html?book_id=${book.id}&seller_id=${book.seller_id}`;
            });
        }
        
        // Set up add to cart button event
        const addToCartButton = document.getElementById('add-to-cart');
        if (addToCartButton) {
            addToCartButton.addEventListener('click', function() {
                addToCart({
                    id: book.id,
                    title: book.title,
                    author: book.author,
                    price: book.price,
                    seller_id: book.seller_id,
                    seller_username: book.seller_username,
                    image_url: book.image_url || 'https://via.placeholder.com/300x450?text=No+Image+Available'
                });
            });
        }
        
        // Fetch recommended books
        loadRecommendedBooks();
    })
    .catch(error => {
        console.error('Error fetching book details:', error);
        document.getElementById('loading-indicator').style.display = 'none';
        document.getElementById('book-not-found').style.display = 'block';
    });
});

/**
 * Show a message to the user
 * @param {String} message - Message to display
 * @param {String} type - Message type (success, error, info)
 */
function showMessage(message, type = 'info') {
    // Create message container if it doesn't exist
    let messageContainer = document.getElementById('message-container');
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.id = 'message-container';
        messageContainer.className = 'message-container';
        document.querySelector('.container').prepend(messageContainer);
    }
    
    const messageElement = document.createElement('div');
    messageElement.className = `alert alert-${type === 'error' ? 'danger' : type}`;
    messageElement.innerHTML = message;
    
    // Clear existing messages
    messageContainer.innerHTML = '';
    messageContainer.appendChild(messageElement);
    
    // Scroll to message
    messageContainer.scrollIntoView({ behavior: 'smooth' });
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        messageElement.style.opacity = '0';
        setTimeout(() => {
            if (messageContainer.contains(messageElement)) {
                messageContainer.removeChild(messageElement);
            }
        }, 500);
    }, 5000);
}

/**
 * Load recommended books based on the current book
 */
function loadRecommendedBooks() {
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('id');
    
    fetch(`api/books/${bookId}/recommendations`, {
        headers: getAuthHeaders()
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to load recommendations');
        }
        return response.json();
    })
    .then(books => {
        const recommendationsContainer = document.getElementById('recommended-books');
        if (!recommendationsContainer) return;
        
        if (!books || books.length === 0) {
            recommendationsContainer.innerHTML = '<p class="text-muted">No recommendations available.</p>';
            return;
        }
        
        // Clear existing recommendations
        recommendationsContainer.innerHTML = '';
        
        // Add recommended books
        books.forEach(book => {
            const bookCard = document.createElement('div');
            bookCard.className = 'col-md-4 mb-4';
            bookCard.innerHTML = `
                <div class="card h-100 book-card">
                    <img src="${book.image_url || 'https://via.placeholder.com/300x450?text=No+Image+Available'}" 
                         class="card-img-top" alt="${book.title}">
                    <div class="card-body">
                        <h5 class="card-title">${book.title}</h5>
                        <p class="card-text">${book.author}</p>
                        <p class="card-text text-primary">₹${book.price.toFixed(2)}</p>
                        <a href="book-detail.html?id=${book.id}" class="btn btn-outline-primary">View Details</a>
                    </div>
                </div>
            `;
            recommendationsContainer.appendChild(bookCard);
        });
    })
    .catch(error => {
        console.error('Error loading recommendations:', error);
        const recommendationsContainer = document.getElementById('recommended-books');
        if (recommendationsContainer) {
            recommendationsContainer.innerHTML = '<p class="text-danger">Failed to load recommendations.</p>';
        }
    });
}
