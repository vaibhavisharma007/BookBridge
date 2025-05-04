/**
 * Simplified Checkout functionality for BookBridge
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Checkout page loaded');
    
    // Initialize checkout
    loadCheckoutSummary();
    
    // Set up event listeners
    const applyPromoBtn = document.getElementById('apply-promo');
    if (applyPromoBtn) {
        applyPromoBtn.addEventListener('click', applyPromoCode);
    }
    
    // Add direct button click handler for form submission
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', function(event) {
            event.preventDefault();
            console.log('Order form submitted');
            handleOrderSubmit(event);
        });
    }
});

/**
 * Load checkout summary with cart items
 */
function loadCheckoutSummary() {
    console.log('Loading checkout summary');
    const cartContainer = document.getElementById('cart-summary');
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    if (!cartContainer) {
        console.error('Cart summary container not found');
        return;
    }
    
    if (cart.length === 0) {
        cartContainer.innerHTML = '<p>Your cart is empty. <a href="index.html">Continue shopping</a></p>';
        
        const checkoutForm = document.getElementById('checkout-form');
        if (checkoutForm) checkoutForm.style.display = 'none';
        
        return;
    }
    
    let subtotal = 0;
    const shipping = 40; // Fixed shipping cost
    cartContainer.innerHTML = '';
    
    // Create summary table
    const summaryTable = document.createElement('div');
    summaryTable.className = 'summary-table';
    
    // Add header
    const headerRow = document.createElement('div');
    headerRow.className = 'summary-header-row';
    headerRow.innerHTML = `
        <div class="summary-col-wide">Item</div>
        <div class="summary-col">Price</div>
        <div class="summary-col">Qty</div>
        <div class="summary-col">Total</div>
    `;
    summaryTable.appendChild(headerRow);
    
    // Add items
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        
        const itemRow = document.createElement('div');
        itemRow.className = 'summary-row-item';
        itemRow.innerHTML = `
            <div class="summary-col-wide">
                <div class="item-info">
                    <div class="item-title">${item.title}</div>
                    <div class="item-author">by ${item.author}</div>
                </div>
            </div>
            <div class="summary-col">₹${parseFloat(item.price).toFixed(2)}</div>
            <div class="summary-col">${item.quantity}</div>
            <div class="summary-col">₹${itemTotal.toFixed(2)}</div>
        `;
        summaryTable.appendChild(itemRow);
    });
    
    cartContainer.appendChild(summaryTable);
    
    // Add summary details
    const summaryDetails = document.createElement('div');
    summaryDetails.className = 'summary-details';
    
    // Calculate total
    const total = subtotal + shipping;
    
    summaryDetails.innerHTML = `
        <div class="summary-line">
            <span>Subtotal:</span>
            <span>₹${subtotal.toFixed(2)}</span>
        </div>
        <div class="summary-line">
            <span>Shipping:</span>
            <span>₹${shipping.toFixed(2)}</span>
        </div>
        <div class="summary-line total">
            <span>Total:</span>
            <span>₹${total.toFixed(2)}</span>
        </div>
    `;
    
    cartContainer.appendChild(summaryDetails);
}

/**
 * Handle order form submission
 * @param {Event} event - Form submission event
 */
function handleOrderSubmit(event) {
    console.log('Handling order submission');
    event.preventDefault();
    
    // Show loading state
    const submitButton = document.getElementById('place-order-button');
    const originalButtonText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    // Get form data
    const form = event.target;
    const formData = new FormData(form);
    const orderData = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        address: formData.get('address'),
        city: formData.get('city'),
        state: formData.get('state'),
        postalCode: formData.get('postal-code'),
        country: formData.get('country')
    };
    
    console.log('Order data:', orderData);
    
    // Get cart items
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length === 0) {
        showMessage('Your cart is empty. Please add items to your cart before checkout.', 'error');
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
        return;
    }
    
    // For demo purposes, simulate a successful order
    setTimeout(() => {
        console.log('Order created successfully');
        
        // Show success message
        document.getElementById('checkout-form').style.display = 'none';
        
        // Update order confirmation details
        document.getElementById('order-number').textContent = `BRS-${Math.floor(Math.random() * 100000)}`;
        document.getElementById('confirmation-email').textContent = orderData.email;
        
        // Show order confirmation
        document.getElementById('order-success').style.display = 'block';
        
        // Clear cart
        localStorage.removeItem('cart');
        
        // Update cart count
        if (typeof updateCartCount === 'function') {
            updateCartCount();
        }
    }, 2000);
}

/**
 * Apply a promo code to the order
 */
function applyPromoCode() {
    console.log('Applying promo code');
    
    const promoInput = document.getElementById('promo-code');
    if (!promoInput) {
        console.error('Promo code input not found');
        return;
    }
    
    const promoCode = promoInput.value.trim();
    if (!promoCode) {
        showMessage('Please enter a promo code', 'error');
        return;
    }
    
    // Valid promo codes (in a real app, this would be checked against a database)
    const validPromoCodes = {
        'WELCOME10': 10,
        'BOOKS20': 20,
        'SUMMER15': 15
    };
    
    // Check if promo code is valid
    if (validPromoCodes[promoCode]) {
        const discount = validPromoCodes[promoCode];
        showMessage(`Promo code applied! ${discount}% discount`, 'success');
        
        // Apply discount to summary
        const summaryDetails = document.querySelector('.summary-details');
        if (summaryDetails) {
            // Calculate discount amount
            const subtotal = parseFloat(summaryDetails.querySelector('.summary-line:first-child span:last-child').textContent.replace('₹', ''));
            const discountAmount = subtotal * (discount / 100);
            
            // Check if discount line already exists
            let discountLine = summaryDetails.querySelector('.discount-line');
            
            if (!discountLine) {
                // Create discount line
                discountLine = document.createElement('div');
                discountLine.className = 'summary-line discount-line';
                discountLine.innerHTML = `
                    <span>Discount (${promoCode}):</span>
                    <span>-₹${discountAmount.toFixed(2)}</span>
                `;
                
                // Insert before total
                const totalLine = summaryDetails.querySelector('.total');
                if (totalLine) {
                    summaryDetails.insertBefore(discountLine, totalLine);
                } else {
                    summaryDetails.appendChild(discountLine);
                }
            } else {
                // Update existing discount line
                discountLine.innerHTML = `
                    <span>Discount (${promoCode}):</span>
                    <span>-₹${discountAmount.toFixed(2)}</span>
                `;
            }
            
            // Update total
            const totalLine = summaryDetails.querySelector('.total');
            if (totalLine) {
                const subtotal = parseFloat(summaryDetails.querySelector('.summary-line:first-child span:last-child').textContent.replace('₹', ''));
                const shipping = parseFloat(summaryDetails.querySelector('.summary-line:nth-child(2) span:last-child').textContent.replace('₹', ''));
                const newTotal = subtotal + shipping - discountAmount;
                
                totalLine.querySelector('span:last-child').textContent = `₹${newTotal.toFixed(2)}`;
            }
        }
        
        // Disable promo input and button
        promoInput.disabled = true;
        document.getElementById('apply-promo').disabled = true;
    } else {
        showMessage('Invalid promo code', 'error');
        promoInput.classList.add('shake');
        setTimeout(() => {
            promoInput.classList.remove('shake');
        }, 500);
    }
}

/**
 * Show a message to the user
 * @param {String} message - Message to display
 * @param {String} type - Message type (success, error, info)
 */
function showMessage(message, type = 'info') {
    console.log(`Showing message: ${message} (${type})`);
    
    const messageContainer = document.getElementById('message-container');
    if (!messageContainer) {
        console.error('Message container not found');
        return;
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
