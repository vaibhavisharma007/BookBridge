/**
 * Cart functionality for BookResell
 */

// Initialize cart when the page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeCart();
    loadCartItems();
    updateCartCount();
});

/**
 * Initialize the cart in local storage if it doesn't exist
 */
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
    if (!book || !book.id || !book.title || !book.price) {
        console.error('Invalid book data for cart');
        return;
    }
    
    // Add a default image if none provided
    if (!book.image) {
        book.image = '/images/book-placeholder.jpg';
    }
    
    // Get the current cart
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    // Check if the book is already in the cart
    const existingItemIndex = cart.findIndex(item => item.id === book.id);
    
    if (existingItemIndex >= 0) {
        // Increment quantity if the book is already in the cart
        cart[existingItemIndex].quantity += 1;
    } else {
        // Add the book to the cart with quantity 1
        cart.push({
            id: book.id,
            title: book.title,
            author: book.author || 'Unknown',
            price: book.price,
            image: book.image,
            quantity: 1
        });
    }
    
    // Save the updated cart
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Update UI
    updateCartCount();
    showToast('Book added to cart!');
}

/**
 * Remove a book from the shopping cart
 * @param {Number} bookId - ID of book to remove
 */
function removeFromCart(bookId) {
    // Get the current cart
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    // Filter out the book to remove
    const updatedCart = cart.filter(item => item.id !== bookId);
    
    // Save the updated cart
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    
    // Update UI
    updateCartCount();
    loadCartItems();
    showToast('Book removed from cart');
}

/**
 * Update the quantity of a book in the cart
 * @param {Number} bookId - ID of the book
 * @param {Number} newQuantity - New quantity
 */
function updateCartItemQuantity(bookId, newQuantity) {
    // Validate the new quantity
    newQuantity = parseInt(newQuantity);
    if (isNaN(newQuantity) || newQuantity < 1) {
        newQuantity = 1;
    }
    
    // Get the current cart
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    // Find the book to update
    const itemIndex = cart.findIndex(item => item.id === bookId);
    
    if (itemIndex >= 0) {
        // Update the quantity
        cart[itemIndex].quantity = newQuantity;
        
        // Save the updated cart
        localStorage.setItem('cart', JSON.stringify(cart));
        
        // Update UI
        updateCartCount();
        loadCartItems();
    }
}

/**
 * Update the cart count indicator in the UI
 */
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartCountElements = document.querySelectorAll('#cart-count');
    
    // Calculate total items (sum of quantities)
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    // Update all cart count indicators
    cartCountElements.forEach(element => {
        element.textContent = totalItems;
        
        // Show/hide based on count
        if (totalItems > 0) {
            element.style.display = 'inline-block';
        } else {
            element.style.display = 'none';
        }
    });
}

/**
 * Load and display cart items
 */
function loadCartItems() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartItemsContainer = document.getElementById('cart-items');
    const emptycartMessage = document.getElementById('empty-cart-message');
    const cartSummary = document.getElementById('cart-summary');
    
    // Check if we're on the cart page
    if (!cartItemsContainer) return;
    
    // Clear the cart items container
    cartItemsContainer.innerHTML = '';
    
    if (cart.length === 0) {
        // Show empty cart message
        emptycartMessage.style.display = 'block';
        cartSummary.style.display = 'none';
        return;
    }
    
    // Hide empty cart message
    emptycartMessage.style.display = 'none';
    cartSummary.style.display = 'block';
    
    // Calculate the total
    let totalAmount = 0;
    
    // Display each cart item
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        totalAmount += itemTotal;
        
        const cartItemElement = document.createElement('div');
        cartItemElement.className = 'cart-item';
        cartItemElement.innerHTML = `
            <div class="cart-item-details">
                <img src="${item.image}" alt="${item.title}" class="cart-item-image">
                <div class="cart-item-info">
                    <h3>${item.title}</h3>
                    <p>Author: ${item.author}</p>
                    <p class="cart-item-price">₹${item.price.toFixed(2)}</p>
                </div>
            </div>
            <div class="cart-item-actions">
                <div class="quantity-control">
                    <button class="quantity-btn" onclick="updateCartItemQuantity(${item.id}, ${item.quantity - 1})">-</button>
                    <input type="number" value="${item.quantity}" min="1" class="quantity-input" 
                           onchange="updateCartItemQuantity(${item.id}, this.value)">
                    <button class="quantity-btn" onclick="updateCartItemQuantity(${item.id}, ${item.quantity + 1})">+</button>
                </div>
                <span class="item-total">₹${itemTotal.toFixed(2)}</span>
                <button class="remove-item-btn" onclick="removeFromCart(${item.id})">Remove</button>
            </div>
        `;
        
        cartItemsContainer.appendChild(cartItemElement);
    });
    
    // Update the total amount
    const cartTotalElement = document.getElementById('cart-total-amount');
    if (cartTotalElement) {
        cartTotalElement.textContent = `₹${totalAmount.toFixed(2)}`;
    }
}

/**
 * Show a toast notification
 * @param {String} message - Message to display
 */
function showToast(message) {
    const toastContainer = document.getElementById('toast-container');
    
    // Create toast if container exists
    if (toastContainer) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        // Remove toast after animation completes
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

/**
 * Proceed to checkout
 */
function proceedToCheckout() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    if (cart.length === 0) {
        showToast('Your cart is empty');
        return;
    }
    
    // Check if user is authenticated
    const isAuthenticated = localStorage.getItem('authToken') !== null;
    
    if (!isAuthenticated) {
        // Redirect to login page, with a redirect back to checkout
        window.location.href = '/login.html?redirect=checkout.html';
        return;
    }
    
    // Redirect to checkout page
    window.location.href = '/checkout.html';
}