/**
 * Checkout functionality for BookResell
 */

// Initialize the stripe elements
let stripe;
let elements;
let paymentElement;
let cardElement;
let form;

/**
 * Load checkout summary with cart items
 */
async function loadCheckoutSummary() {
    const cartContainer = document.getElementById('cart-summary');
    const totalAmountElement = document.getElementById('total-amount');
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    if (cart.length === 0) {
        cartContainer.innerHTML = '<p>Your cart is empty. <a href="index.html">Continue shopping</a></p>';
        document.getElementById('checkout-form').style.display = 'none';
        document.getElementById('payment-container').style.display = 'none';
        return;
    }
    
    let totalAmount = 0;
    cartContainer.innerHTML = '';
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        totalAmount += itemTotal;
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.innerHTML = `
            <div class="item-details">
                <h4>${item.title}</h4>
                <p>Author: ${item.author}</p>
                <p>Price: ₹${item.price.toFixed(2)}</p>
                <p>Quantity: ${item.quantity}</p>
            </div>
            <div class="item-total">
                <p>₹${itemTotal.toFixed(2)}</p>
            </div>
        `;
        
        cartContainer.appendChild(itemElement);
    });
    
    // Add total row
    const totalRow = document.createElement('div');
    totalRow.className = 'cart-total';
    totalRow.innerHTML = `
        <h3>Total:</h3>
        <h3>₹${totalAmount.toFixed(2)}</h3>
    `;
    
    cartContainer.appendChild(totalRow);
    totalAmountElement.innerText = `₹${totalAmount.toFixed(2)}`;
    
    // Store the total amount in a data attribute for the payment form
    document.getElementById('checkout-form').dataset.amount = totalAmount;
    
    // Initialize Stripe payment
    await initializeStripe(totalAmount, cart);
}

/**
 * Load user shipping information
 */
function loadShippingInfo() {
    const user = JSON.parse(localStorage.getItem('userData'));
    
    if (user) {
        document.getElementById('name').value = user.name || '';
        document.getElementById('email').value = user.email || '';
    }
}

/**
 * Initialize Stripe and create payment intent
 */
async function initializeStripe(amount, cartItems) {
    try {
        // Use our API to create a payment intent
        const { id, client_secret } = await createPaymentIntent(amount, cartItems);
        
        // Store the payment intent ID for later reference
        document.getElementById('checkout-form').dataset.paymentIntentId = id;
        
        // Initialize Stripe with our public key
        const stripePublicKey = "pk_test_51RKIsYHjfMD40GRvGDRD5fUXTquuT9fxhjSBEVWGbjwUwvfYBqp8RJukBCJbNyjTYbvTfY3nNZeyrYu2YuJlZoct00Rq1Nvclt";
        stripe = Stripe(stripePublicKey);
        
        // Create an elements instance
        elements = stripe.elements({
            clientSecret: client_secret,
        });
        
        // Create and mount the Payment Element
        const paymentElementOptions = {
            layout: {
                type: 'tabs',
                defaultCollapsed: false,
            },
        };
        
        paymentElement = elements.create('payment', paymentElementOptions);
        paymentElement.mount('#payment-element');
        
        // Show the payment section
        document.getElementById('payment-container').style.display = 'block';
        
        // Setup form submission
        form = document.getElementById('checkout-form');
        form.addEventListener('submit', handlePaymentSubmission);
        
    } catch (error) {
        console.error('Stripe initialization error:', error);
        const paymentContainer = document.getElementById('payment-container');
        paymentContainer.innerHTML = `<div class="error-message">Error initializing payment system: ${error.message}. Please try again later.</div>`;
    }
}

/**
 * Handle payment form submission
 * @param {Event} event - Form submission event
 */
async function handlePaymentSubmission(event) {
    event.preventDefault();
    
    // Validate the form
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const address = document.getElementById('address').value.trim();
    const city = document.getElementById('city').value.trim();
    const postalCode = document.getElementById('postal-code').value.trim();
    
    if (!name || !email || !address || !city || !postalCode) {
        showMessage('Please fill in all required fields', 'error');
        return;
    }
    
    // Show loading state
    setLoading(true);
    
    try {
        // Confirm the payment
        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/payment-success.html`,
                receipt_email: email,
            },
        });
        
        // This point is only reached if there's an immediate error when confirming the payment
        if (error) {
            showMessage(error.message, 'error');
        }
        
    } catch (e) {
        showMessage('An unexpected error occurred', 'error');
    }
    
    setLoading(false);
}

/**
 * Set the loading state
 * @param {Boolean} isLoading - Whether the form is in loading state
 */
function setLoading(isLoading) {
    const submitButton = document.getElementById('submit-button');
    
    if (isLoading) {
        submitButton.disabled = true;
        submitButton.innerHTML = `
            <div class="spinner"></div>
            <span>Processing...</span>
        `;
    } else {
        submitButton.disabled = false;
        submitButton.innerHTML = 'Pay Now';
    }
}

/**
 * Show a message to the user
 * @param {String} messageText - The message to display
 * @param {String} type - The message type (success, error)
 */
function showMessage(messageText, type = 'info') {
    const messageContainer = document.getElementById('message-container');
    const message = document.createElement('div');
    
    message.classList.add('alert');
    message.classList.add(`alert-${type}`);
    message.textContent = messageText;
    
    messageContainer.innerHTML = '';
    messageContainer.appendChild(message);
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            messageContainer.innerHTML = '';
        }, 5000);
    }
}

/**
 * Handle payment success when returning from Stripe
 */
function handlePaymentReturnStatus() {
    // Get client secret from URL
    const urlParams = new URLSearchParams(window.location.search);
    const paymentIntentClientSecret = urlParams.get('payment_intent_client_secret');
    const redirectStatus = urlParams.get('redirect_status');
    
    if (redirectStatus === 'succeeded' && paymentIntentClientSecret) {
        // Show success message and clear cart
        showMessage('Payment successful! Thank you for your purchase.', 'success');
        localStorage.removeItem('cart');
        
        // Update the UI to show success state
        document.getElementById('checkout-form').style.display = 'none';
        document.getElementById('payment-success').style.display = 'block';
        
        // Record payment success on the server
        const paymentIntentId = urlParams.get('payment_intent');
        if (paymentIntentId) {
            recordSuccessfulPayment(paymentIntentId)
                .then(() => {
                    console.log('Payment recorded successfully');
                })
                .catch(error => {
                    console.error('Error recording payment:', error);
                });
        }
    } else if (redirectStatus === 'failed') {
        showMessage('Payment failed. Please try again.', 'error');
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is authenticated
    const isAuthenticated = localStorage.getItem('authToken') !== null;
    
    if (!isAuthenticated) {
        // Redirect to login page if not authenticated
        window.location.href = 'login.html?redirect=checkout.html';
        return;
    }
    
    // Handle return from Stripe redirect
    handlePaymentReturnStatus();
    
    // Load checkout page
    await loadCheckoutSummary();
    loadShippingInfo();
});
