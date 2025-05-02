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
 * Add a book to the shopping cart with enhanced animation
 * @param {Object} book - Book to add to cart
 */
function addToCart(book) {
    if (!book || !book.id || !book.title || !book.price) {
        console.error('Invalid book data for cart');
        showToast('Error adding book to cart', 'error');
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
    let message = '';
    
    if (existingItemIndex >= 0) {
        // Increment quantity if the book is already in the cart
        cart[existingItemIndex].quantity += 1;
        message = `Increased quantity of "${book.title}" in your cart`;
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
        message = `"${book.title}" added to your cart!`;
    }
    
    // Save the updated cart
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Find the clicked button (if it exists in the DOM) to animate
    const button = document.querySelector(`.add-to-cart-btn[data-book-id="${book.id}"]`);
    
    if (button) {
        // Add animation class
        button.classList.add('btn-success-pulse');
        
        // Change icon temporarily
        const icon = button.querySelector('svg.feather');
        if (icon) {
            // Save original icon
            const originalIcon = icon.outerHTML;
            
            // Replace with check icon temporarily
            icon.outerHTML = feather.icons['check'].toSvg();
            
            // Restore original icon after animation
            setTimeout(() => {
                icon.outerHTML = originalIcon;
                button.classList.remove('btn-success-pulse');
            }, 1500);
        }
    }
    
    // Update UI
    updateCartCount();
    showToast(message, 'success');
}

/**
 * Remove a book from the shopping cart with enhanced animation
 * @param {Number} bookId - ID of book to remove
 */
function removeFromCart(bookId) {
    // Get the current cart
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    // Find the item to be removed to get its title for the message
    const itemToRemove = cart.find(item => item.id === bookId);
    let message = 'Item removed from cart';
    
    if (itemToRemove) {
        message = `"${itemToRemove.title}" removed from cart`;
    }
    
    // Find the cart item element for animation
    const cartItemElement = document.querySelector(`.cart-item[data-book-id="${bookId}"]`);
    
    if (cartItemElement) {
        // Add fade-out animation
        cartItemElement.style.transition = 'opacity 0.5s, transform 0.5s';
        cartItemElement.style.opacity = '0';
        cartItemElement.style.transform = 'translateX(20px)';
        
        // Wait for animation to complete before removing from DOM
        setTimeout(() => {
            // Filter out the book to remove from storage
            const updatedCart = cart.filter(item => item.id !== bookId);
            localStorage.setItem('cart', JSON.stringify(updatedCart));
            
            // Update UI
            updateCartCount();
            loadCartItems();
        }, 500);
    } else {
        // If element not found in DOM, just remove from storage immediately
        const updatedCart = cart.filter(item => item.id !== bookId);
        localStorage.setItem('cart', JSON.stringify(updatedCart));
        
        // Update UI
        updateCartCount();
        loadCartItems();
    }
    
    showToast(message, 'info');
}

/**
 * Update the quantity of a book in the cart with animation
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
        const oldQuantity = cart[itemIndex].quantity;
        
        // Only proceed if quantity has changed
        if (oldQuantity !== newQuantity) {
            // Update the quantity
            cart[itemIndex].quantity = newQuantity;
            
            // Save the updated cart
            localStorage.setItem('cart', JSON.stringify(cart));
            
            // Find quantity display elements for animation
            const quantityInput = document.querySelector(`.cart-item[data-book-id="${bookId}"] .quantity-input`);
            const itemTotalElement = document.querySelector(`.cart-item[data-book-id="${bookId}"] .item-total`);
            
            if (quantityInput && itemTotalElement) {
                // Flash effect on quantity change
                const direction = newQuantity > oldQuantity ? 'increase' : 'decrease';
                const flashClass = direction === 'increase' ? 'quantity-increased' : 'quantity-decreased';
                
                quantityInput.classList.add(flashClass);
                setTimeout(() => {
                    quantityInput.classList.remove(flashClass);
                }, 500);
                
                // Calculate new total
                const item = cart[itemIndex];
                const newTotal = item.price * newQuantity;
                
                // Animate total change
                itemTotalElement.classList.add('total-updating');
                setTimeout(() => {
                    itemTotalElement.textContent = `₹${newTotal.toFixed(2)}`;
                    itemTotalElement.classList.remove('total-updating');
                }, 200);
                
                // Show toast notification
                const message = direction === 'increase' ? 
                    `Increased quantity of "${item.title}" to ${newQuantity}` : 
                    `Decreased quantity of "${item.title}" to ${newQuantity}`;
                
                showToast(message, 'info');
            } else {
                // If element not found in DOM, just update the cart
                updateCartCount();
                loadCartItems();
            }
        }
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
        cartItemElement.setAttribute('data-book-id', item.id);
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
 * Show a toast notification with improved styling and animation
 * @param {String} message - Message to display
 * @param {String} type - Type of toast (success, warning, error, info)
 */
function showToast(message, type = 'success') {
    // Check if there's a toast container
    let toastContainer = document.getElementById('toast-container');
    
    // Create one if it doesn't exist
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toastId = `toast-${Date.now()}`;
    const toastEl = document.createElement('div');
    toastEl.className = 'toast show';
    toastEl.id = toastId;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');
    
    // Set appropriate styling based on type
    let bgColor = 'bg-success text-white';
    let icon = 'check-circle';
    
    if (type === 'error') {
        bgColor = 'bg-danger text-white';
        icon = 'alert-circle';
    } else if (type === 'warning') {
        bgColor = 'bg-warning';
        icon = 'alert-triangle';
    } else if (type === 'info') {
        bgColor = 'bg-info text-white';
        icon = 'info';
    }
    
    toastEl.innerHTML = `
        <div class="toast-header ${bgColor}">
            <i data-feather="${icon}" class="me-2"></i>
            <strong class="me-auto">BookResell</strong>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;
    
    // Add to container with animation
    toastEl.style.opacity = '0';
    toastEl.style.transform = 'translateY(20px)';
    toastEl.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toastContainer.appendChild(toastEl);
    
    // Trigger animation
    setTimeout(() => {
        toastEl.style.opacity = '1';
        toastEl.style.transform = 'translateY(0)';
    }, 10);
    
    // Initialize feather icons in the toast
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        toastEl.style.opacity = '0';
        toastEl.style.transform = 'translateY(20px)';
        setTimeout(() => {
            toastEl.remove();
        }, 300);
    }, 3000);
    
    // Add click listener to close button
    const closeBtn = toastEl.querySelector('.btn-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            toastEl.style.opacity = '0';
            toastEl.style.transform = 'translateY(20px)';
            setTimeout(() => {
                toastEl.remove();
            }, 300);
        });
    }
}

/**
 * Proceed to checkout with improved feedback
 */
function proceedToCheckout() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const checkoutBtn = document.getElementById('checkout-btn');
    
    if (cart.length === 0) {
        showToast('Your cart is empty', 'warning');
        return;
    }
    
    // Show loading state on button if it exists
    if (checkoutBtn) {
        const originalText = checkoutBtn.innerHTML;
        checkoutBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...`;
        checkoutBtn.disabled = true;
    }
    
    // Calculate cart total
    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Check if user is authenticated
    const isAuthenticated = localStorage.getItem('authToken') !== null;
    
    if (!isAuthenticated) {
        // Show toast before redirect
        showToast('Please login to continue with checkout', 'info');
        
        // Short delay before redirect to show the toast
        setTimeout(() => {
            // Redirect to login page, with a redirect back to checkout
            window.location.href = '/login.html?redirect=checkout.html';
        }, 1000);
        return;
    }
    
    // Show success toast before redirecting
    showToast(`Proceeding to checkout with ₹${cartTotal.toFixed(2)}`, 'success');
    
    // Short delay before redirect to show the toast
    setTimeout(() => {
        // Redirect to checkout page
        window.location.href = '/checkout.html';
    }, 800);
}