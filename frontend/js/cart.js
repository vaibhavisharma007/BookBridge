/**
 * Cart functionality for BookBridge
 */

// Initialize cart when the page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeCart();
    loadCartItems();
    updateCartCount();
    setupEventListeners();
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
 * Setup event listeners for the cart page
 */
function setupEventListeners() {
    // Apply discount button
    const applyDiscountBtn = document.getElementById('apply-discount');
    if (applyDiscountBtn) {
        applyDiscountBtn.addEventListener('click', applyDiscount);
    }
}

/**
 * Apply a discount code to the cart
 */
function applyDiscount() {
    const discountInput = document.getElementById('discount-code');
    if (!discountInput || !discountInput.value.trim()) {
        showToast('Please enter a discount code', 'info');
        return;
    }

    const discountCode = discountInput.value.trim().toUpperCase();
    
    // Simulate discount codes
    const validDiscounts = {
        'WELCOME10': 10,
        'BOOKS20': 20,
        'SUMMER30': 30
    };

    if (validDiscounts[discountCode]) {
        const discountPercent = validDiscounts[discountCode];
        showToast(`Discount code applied: ${discountPercent}% off!`, 'success');
        
        // Update the cart summary with the discount
        updateCartSummary(discountPercent);
        
        // Add a visual indicator that the discount was applied
        const discountRow = document.querySelector('.discount-row');
        if (discountRow) {
            discountRow.classList.add('discount-applied');
            discountRow.innerHTML = `
                <div class="discount-applied-info">
                    <span>Discount (${discountCode})</span>
                    <span class="discount-amount">-${discountPercent}%</span>
                    <button class="remove-discount-btn" onclick="removeDiscount()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }
    } else {
        showToast('Invalid discount code', 'error');
        discountInput.classList.add('shake');
        setTimeout(() => {
            discountInput.classList.remove('shake');
        }, 500);
    }
}

/**
 * Remove an applied discount
 */
function removeDiscount() {
    const discountRow = document.querySelector('.discount-row');
    if (discountRow) {
        discountRow.classList.remove('discount-applied');
        discountRow.innerHTML = `
            <div class="discount-input">
                <input type="text" id="discount-code" placeholder="Discount code">
                <button id="apply-discount" class="secondary-button">Apply</button>
            </div>
        `;
        
        // Re-attach the event listener
        const applyDiscountBtn = document.getElementById('apply-discount');
        if (applyDiscountBtn) {
            applyDiscountBtn.addEventListener('click', applyDiscount);
        }
    }
    
    // Update the cart summary without a discount
    updateCartSummary(0);
    showToast('Discount removed', 'info');
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
        const icon = button.querySelector('i.fas, i.far, svg.feather');
        if (icon) {
            // Save original icon
            const originalIcon = icon.outerHTML;
            
            // Replace with check icon temporarily
            if (icon.tagName.toLowerCase() === 'svg') {
                // For feather icons
                icon.outerHTML = feather.icons['check'].toSvg();
            } else {
                // For Font Awesome icons
                icon.outerHTML = '<i class="fas fa-check"></i>';
            }
            
            // Restore original icon after animation
            setTimeout(() => {
                const currentIcon = button.querySelector('i.fas, i.far, svg.feather');
                if (currentIcon) {
                    currentIcon.outerHTML = originalIcon;
                }
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
            const itemTotalElement = document.querySelector(`.cart-item[data-book-id="${bookId}"] .cart-item-total`);
            
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
                
                // Update cart summary
                updateCartSummary();
            } else {
                // If elements not found in DOM, just update the cart
                loadCartItems();
            }
        }
    }
}

/**
 * Load cart items from local storage and display them
 */
function loadCartItems() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartItemsContainer = document.getElementById('cart-items');
    const emptyCartMessage = document.getElementById('empty-cart-message');
    const cartSummary = document.getElementById('cart-summary');
    const cartContent = document.querySelector('.cart-content');
    
    if (!cartItemsContainer || !emptyCartMessage || !cartSummary) {
        console.error('Required DOM elements not found');
        return;
    }
    
    // Clear existing cart items
    cartItemsContainer.innerHTML = '';
    
    if (cart.length === 0) {
        // Show empty cart message
        emptyCartMessage.style.display = 'block';
        cartSummary.style.display = 'none';
        if (cartContent) cartContent.style.display = 'none';
        return;
    }
    
    // Hide empty cart message and show cart content
    emptyCartMessage.style.display = 'none';
    cartSummary.style.display = 'block';
    if (cartContent) cartContent.style.display = 'grid';
    
    // Add cart items to the container
    cart.forEach(item => {
        const cartItemElement = document.createElement('div');
        cartItemElement.className = 'cart-item';
        cartItemElement.setAttribute('data-book-id', item.id);
        
        const itemTotal = item.price * item.quantity;
        
        cartItemElement.innerHTML = `
            <div class="cart-item-details">
                <img src="${item.image}" alt="${item.title}" class="cart-item-image">
                <div class="cart-item-info">
                    <h3>${item.title}</h3>
                    <p>Author: ${item.author}</p>
                </div>
            </div>
            <div class="cart-item-price">₹${parseFloat(item.price).toFixed(2)}</div>
            <div class="cart-item-quantity">
                <div class="quantity-control">
                    <button class="quantity-btn" onclick="updateCartItemQuantity(${item.id}, ${item.quantity - 1})">-</button>
                    <input type="number" min="1" value="${item.quantity}" class="quantity-input" 
                        onchange="updateCartItemQuantity(${item.id}, this.value)">
                    <button class="quantity-btn" onclick="updateCartItemQuantity(${item.id}, ${item.quantity + 1})">+</button>
                </div>
            </div>
            <div class="cart-item-total">₹${itemTotal.toFixed(2)}</div>
            <div class="cart-item-action">
                <button class="remove-item-btn" onclick="removeFromCart(${item.id})">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
        
        cartItemsContainer.appendChild(cartItemElement);
    });
    
    // Update cart summary
    updateCartSummary();
}

/**
 * Update the cart summary with subtotal, shipping, and total
 * @param {Number} discountPercent - Optional discount percentage
 */
function updateCartSummary(discountPercent = 0) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const subtotalElement = document.getElementById('cart-subtotal');
    const totalElement = document.getElementById('cart-total-amount');
    
    if (!subtotalElement || !totalElement) {
        console.error('Cart summary elements not found');
        return;
    }
    
    // Calculate subtotal
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    
    // Fixed shipping cost
    const shipping = subtotal > 0 ? 40 : 0;
    
    // Calculate discount amount
    const discountAmount = subtotal * (discountPercent / 100);
    
    // Calculate total
    const total = subtotal + shipping - discountAmount;
    
    // Update the UI
    subtotalElement.textContent = `₹${subtotal.toFixed(2)}`;
    document.getElementById('cart-shipping').textContent = subtotal > 0 ? `₹${shipping.toFixed(2)}` : 'Free';
    totalElement.textContent = `₹${total.toFixed(2)}`;
    
    // Add discount row if a discount is applied
    if (discountPercent > 0) {
        // Check if discount row already exists
        let discountElement = document.getElementById('cart-discount');
        if (!discountElement) {
            // Create discount row
            const summaryDivider = document.querySelector('.summary-divider');
            if (summaryDivider) {
                const discountRow = document.createElement('div');
                discountRow.className = 'summary-row';
                discountRow.innerHTML = `
                    <span>Discount</span>
                    <span id="cart-discount">-₹${discountAmount.toFixed(2)}</span>
                `;
                summaryDivider.before(discountRow);
            }
        } else {
            // Update existing discount row
            discountElement.textContent = `-₹${discountAmount.toFixed(2)}`;
        }
    } else {
        // Remove discount row if it exists
        const discountRow = document.querySelector('.summary-row:has(#cart-discount)');
        if (discountRow) {
            discountRow.remove();
        }
    }
}

/**
 * Update the cart count in the header
 */
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartCount = document.getElementById('cart-count');
    
    if (cartCount) {
        const totalItems = cart.reduce((count, item) => count + item.quantity, 0);
        cartCount.textContent = totalItems;
        
        // Show/hide the badge
        if (totalItems > 0) {
            cartCount.style.display = 'inline-block';
        } else {
            cartCount.style.display = 'none';
        }
    }
}

/**
 * Show a toast notification
 * @param {String} message - Message to display
 * @param {String} type - Type of toast (success, error, info)
 */
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    
    if (!toastContainer) {
        console.error('Toast container not found');
        return;
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Set icon based on type
    let icon = '';
    switch (type) {
        case 'success':
            icon = '<i class="fas fa-check-circle"></i>';
            break;
        case 'error':
            icon = '<i class="fas fa-exclamation-circle"></i>';
            break;
        case 'info':
            icon = '<i class="fas fa-info-circle"></i>';
            break;
    }
    
    toast.innerHTML = `
        ${icon}
        <div class="toast-message">${message}</div>
    `;
    
    // Add toast to container
    toastContainer.appendChild(toast);
    
    // Remove toast after delay
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        
        setTimeout(() => {
            toastContainer.removeChild(toast);
        }, 300);
    }, 3000);
}