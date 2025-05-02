/**
 * Book-related functions for BookResell
 */

/**
 * Load all available books with optional filters
 * @param {Object} filters - Optional filters (genre, min_price, max_price, search)
 */
function loadBooks(filters = {}) {
    const booksContainer = document.getElementById('books-container');
    if (!booksContainer) return;
    
    // Show loading spinner
    booksContainer.innerHTML = `
        <div class="col-12 text-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
    
    // Build query string from filters
    const queryParams = new URLSearchParams();
    if (filters.genre) queryParams.append('genre', filters.genre);
    if (filters.min_price) queryParams.append('min_price', filters.min_price);
    if (filters.max_price) queryParams.append('max_price', filters.max_price);
    if (filters.search) queryParams.append('search', filters.search);
    
    // API URL with query parameters
    const apiUrl = `/api/books${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    // Fetch books from API
    fetch(apiUrl, {
        headers: getAuthHeaders()
    })
    .then(response => response.json())
    .then(books => {
        // Clear container
        booksContainer.innerHTML = '';
        
        if (books.length === 0) {
            // No books found
            booksContainer.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-info">
                        No books found. Try different search criteria or check back later.
                    </div>
                </div>
            `;
            return;
        }
        
        // Create book cards
        books.forEach(book => {
            const bookCard = createBookCard(book);
            booksContainer.appendChild(bookCard);
        });
        
        // Initialize feather icons in newly created elements
        feather.replace();
    })
    .catch(error => {
        console.error('Error fetching books:', error);
        booksContainer.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger">
                    Failed to load books. Please try again later.
                </div>
            </div>
        `;
    });
}

/**
 * Load recommended books for the current user
 */
function loadRecommendedBooks() {
    const container = document.getElementById('recommended-books');
    if (!container || !isAuthenticated()) return;
    
    // Show loading spinner
    container.innerHTML = `
        <div class="col-12 text-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
    
    // Fetch recommendations from API
    fetch('/api/books/recommendations', {
        headers: getAuthHeaders()
    })
    .then(response => response.json())
    .then(books => {
        // Clear container
        container.innerHTML = '';
        
        if (books.length === 0) {
            // No recommendations
            container.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-info">
                        No recommendations available yet. Browse more books to get personalized suggestions.
                    </div>
                </div>
            `;
            return;
        }
        
        // Create book cards
        books.forEach(book => {
            const bookCard = createBookCard(book);
            container.appendChild(bookCard);
        });
        
        // Initialize feather icons in newly created elements
        feather.replace();
    })
    .catch(error => {
        console.error('Error fetching recommendations:', error);
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-warning">
                    Unable to load recommendations. Please try again later.
                </div>
            </div>
        `;
    });
}

/**
 * Create a book card element
 * @param {Object} book - Book data
 * @returns {HTMLElement} Book card element
 */
function createBookCard(book) {
    const colDiv = document.createElement('div');
    colDiv.className = 'col-md-4 col-lg-3 mb-4';
    
    // Format date
    const createdDate = new Date(book.created_at);
    const dateStr = createdDate.toLocaleDateString();
    
    // Default image if not provided
    const imageUrl = book.image_url || 'https://via.placeholder.com/150x200?text=No+Image';
    
    colDiv.innerHTML = `
        <div class="card book-card h-100 shadow-sm">
            <div class="book-img-container">
                <img src="${imageUrl}" alt="${book.title}" class="img-fluid">
            </div>
            <div class="card-body">
                <h5 class="card-title">${book.title}</h5>
                <p class="card-text text-muted">${book.author}</p>
                <p class="book-price">₹${book.price.toFixed(2)}</p>
                <p class="book-seller">Seller: ${book.seller_username}</p>
                <p class="card-text">
                    <small class="text-muted">
                        <span class="badge bg-secondary">${book.genre || 'Uncategorized'}</span>
                        <span class="badge bg-secondary">${book.condition || 'Unspecified'}</span>
                    </small>
                </p>
            </div>
            <div class="card-footer">
                <div class="d-flex justify-content-between">
                    <a href="book-detail.html?id=${book.id}" class="btn btn-outline-primary">View Details</a>
                    <button class="btn btn-success add-to-cart-btn" data-book-id="${book.id}">
                        <i data-feather="shopping-cart"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return colDiv;
}

// Set up event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Load books when on index page
    if (document.getElementById('books-container')) {
        loadBooks();
        
        // Load recommendations if authenticated
        if (isAuthenticated()) {
            loadRecommendedBooks();
        }
        
        // Set up search form
        const searchForm = document.getElementById('search-form');
        if (searchForm) {
            searchForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const searchQuery = document.getElementById('search-input').value.trim();
                loadBooks({ search: searchQuery });
            });
        }
        
        // Set up filter form
        const filterForm = document.getElementById('filter-form');
        if (filterForm) {
            filterForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const filters = {
                    genre: document.getElementById('genre-filter').value,
                    min_price: document.getElementById('min-price').value,
                    max_price: document.getElementById('max-price').value
                };
                
                // Get search query if exists
                const searchInput = document.getElementById('search-input');
                if (searchInput && searchInput.value.trim()) {
                    filters.search = searchInput.value.trim();
                }
                
                loadBooks(filters);
            });
        }
        
        // Set up event delegation for add-to-cart buttons
        document.addEventListener('click', function(e) {
            if (e.target.closest('.add-to-cart-btn')) {
                const button = e.target.closest('.add-to-cart-btn');
                const bookId = button.getAttribute('data-book-id');
                
                // Find the book data
                fetch(`/api/books/${bookId}`, {
                    headers: getAuthHeaders()
                })
                .then(response => response.json())
                .then(book => {
                    // Add the book to the cart
                    addToCart({
                        id: book.id,
                        title: book.title,
                        author: book.author,
                        price: book.price,
                        seller_id: book.seller_id,
                        seller_username: book.seller_username,
                        image_url: book.image_url || 'https://via.placeholder.com/150x200?text=No+Image',
                        quantity: 1
                    });
                })
                .catch(error => {
                    console.error('Error fetching book details for cart:', error);
                });
            }
        });
    }
    
    // Initialize feather icons
    feather.replace();
});
