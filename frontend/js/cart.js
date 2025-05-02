/**
 * Shopping cart functionality for BookResell
 */

// Initialize cart if not already in local storage
function initializeCart() {
    if (!localStorage.getItem('cart')) {
        localStorage.setItem('cart', JSON.stringify([])); 
    }
}

/**
 * Add a book to the shopping cart
 * @param {Object} book - Book to add to cart
 */
function addToCart(book) {
    initializeCart();
    
    // Get current cart
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Check if book is already in cart
    const existingIndex = cart.findIndex(item => item.id === book.id);
    
    if (existingIndex >= 0) {
        // Book already in cart, increase quantity
        cart[existingIndex].quantity += 1;
    } else {
        // Add book to cart with quantity 1
        cart.push({
            id: book.id,
            title: book.title,
            author: book.author,
            price: book.price,
            seller_id: book.seller_id,
            seller_username: book.seller_username,
            image_url: book.image_url,
            quantity: 1
        });
    }
    
    // Update cart in local storage
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Update cart count in UI
    updateCartCount();
    
    // Show success message
    showToast('Book added to cart successfully!');
}

/**
 * Remove a book from the shopping cart
 * @param {Number} bookId - ID of book to remove
 */
function removeFromCart(bookId) {
    // Get current cart
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Filter out the book to remove
    const updatedCart = cart.filter(item => item.id !== bookId);
    
    // Update cart in local storage
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    
    // Update cart count
    updateCartCount();
    
    // Reload cart page if we're on it
    if (window.location.pathname.includes('cart.html')) {
        loadCartItems();
    }
}

/**
 * Update the quantity of a book in the cart
 * @param {Number} bookId - ID of the book
 * @param {Number} newQuantity - New quantity
 */
function updateCartItemQuantity(bookId, newQuantity) {
    // Get current cart
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Find the book
    const itemIndex = cart.findIndex(item => item.id === bookId);
    
    if (itemIndex >= 0) {
        if (newQuantity <= 0) {
            // Remove item if quantity is 0 or less
            removeFromCart(bookId);
        } else {
            // Update quantity
            cart[itemIndex].quantity = newQuantity;
            
            // Update cart in local storage
            localStorage.setItem('cart', JSON.stringify(cart));
            
            // Reload cart page if we're on it
            if (window.location.pathname.includes('cart.html')) {
                loadCartItems();
            }
        }
    }
    
    // Update cart count
    updateCartCount();
}

/**
 * Update the cart count indicator in the UI
 */
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
    
    // Update the cart count in the navbar
    const cartCountElement = document.getElementById('cart-count');
    if (cartCountElement) {
        cartCountElement.textContent = cartCount;
        
        // Show/hide the count badge
        if (cartCount > 0) {
            cartCountElement.style.display = 'inline-block';
        } else {
            cartCountElement.style.display = 'none';
        }
    }
}

/**
 * Load and display cart items
 */
function loadCartItems() {
    const cartContainer = document.getElementById('cart-items');
    if (!cartContainer) return;
    
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    if (cart.length === 0) {
        // Cart is empty
        cartContainer.innerHTML = `
            <div class="text-center py-5">
                <i data-feather="shopping-cart" style="width: 48px; height: 48px;" class="text-muted mb-3"></i>
                <h5>Your cart is empty</h5>
                <p class="text-muted">Browse our collection and add books to your cart.</p>
                <a href="index.html" class="btn btn-primary">Browse Books</a>
            </div>
        `;
        
        // Hide checkout button and total
        document.getElementById('checkout-container').style.display = 'none';
    } else {
        // Render cart items
        let cartHTML = '';
        let totalAmount = 0;
        
        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            totalAmount += itemTotal;
            
            cartHTML += `
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="row align-items-center">
                            <div class="col-md-2">
                                <img src="${item.image_url || 'images/book-placeholder.jpg'}" class="img-fluid rounded" alt="${item.title}">
                            </div>
                            <div class="col-md-4">
                                <h5 class="card-title">${item.title}</h5>
                                <p class="card-text text-muted">by ${item.author}</p>
                                <small class="text-muted">Seller: ${item.seller_username}</small>
                            </div>
                            <div class="col-md-2 text-center">
                                <div class="input-group">
                                    <button class="btn btn-outline-secondary btn-sm" type="button" onclick="updateCartItemQuantity(${item.id}, ${item.quantity-1})">
                                        <i data-feather="minus"></i>
                                    </button>
                                    <input type="text" class="form-control form-control-sm text-center" value="${item.quantity}" readonly>
                                    <button class="btn btn-outline-secondary btn-sm" type="button" onclick="updateCartItemQuantity(${item.id}, ${item.quantity+1})">
                                        <i data-feather="plus"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="col-md-2 text-center">
                                <h6>₹${item.price.toFixed(2)}</h6>
                            </div>
                            <div class="col-md-1 text-center">
                                <h6>₹${itemTotal.toFixed(2)}</h6>
                            </div>
                            <div class="col-md-1 text-end">
                                <button class="btn btn-link text-danger" onclick="removeFromCart(${item.id})">
                                    <i data-feather="trash-2"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        cartContainer.innerHTML = cartHTML;
        
        // Update total amount
        document.getElementById('cart-total').textContent = `₹${totalAmount.toFixed(2)}`;
        
        // Show checkout container
        document.getElementById('checkout-container').style.display = 'block';
    }
    
    // Initialize Feather icons
    feather.replace();
}

/**
 * Show a toast notification
 * @param {String} message - Message to display
 */
function showToast(message) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        // Create toast container if it doesn't exist
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'position-fixed bottom-0 end-0 p-3';
        container.style.zIndex = '1050';
        document.body.appendChild(container);
    }
    
    // Create unique ID for this toast
    const toastId = 'toast-' + Date.now();
    
    // Create toast HTML
    const toastHTML = `
        <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
                <strong class="me-auto">BookResell</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    // Add toast to container
    document.getElementById('toast-container').innerHTML += toastHTML;
    
    // Initialize and show the toast
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
    toast.show();
    
    // Remove toast from DOM after it's hidden
    toastElement.addEventListener('hidden.bs.toast', function() {
        toastElement.remove();
    });
}

/**
 * Proceed to checkout
 */
function proceedToCheckout() {
    // Check if user is authenticated
    if (!isAuthenticated()) {
        // Save cart URL to redirect back after login
        localStorage.setItem('redirectAfterLogin', 'cart.html');
        window.location.href = 'login.html';
        return;
    }
    
    // Redirect to checkout page
    window.location.href = 'checkout.html';
}

// Initialize cart and update count when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeCart();
    updateCartCount();
    
    // If we're on the cart page, load cart items
    if (window.location.pathname.includes('cart.html')) {
        loadCartItems();
        
        // Add event listener to checkout button
        const checkoutButton = document.getElementById('checkout-button');
        if (checkoutButton) {
            checkoutButton.addEventListener('click', proceedToCheckout);
        }
    }
});