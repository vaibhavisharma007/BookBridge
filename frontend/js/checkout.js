/**
 * Checkout functionality for BookResell using Stripe
 */

// Store payment intent ID
let paymentIntentId = null;

// Get Stripe publishable key from environment variable
const stripePublishableKey = 'pk_test_51RKIsYHjfMD40GRvI3Svs7V2kcH49jVRIa4OuC7RuQP4suIPgtDIPBHgvyGmYePXOViB1MAa048qwhxm0Q2uFi00bWELVIC';

// Initialize Stripe.js
let stripe = Stripe(stripePublishableKey);
let elements = null;

// Initialize checkout page
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }
    
    // Initialize Feather icons
    feather.replace();
    
    // Load cart items for checkout summary
    loadCheckoutSummary();
    
    // Load shipping information
    loadShippingInfo();
    
    // Initialize Stripe and create payment intent
    initializeStripe();
    
    // Update cart count
    updateCartCount();
});

/**
 * Load checkout summary with cart items
 */
function loadCheckoutSummary() {
    const checkoutItemsContainer = document.getElementById('checkout-items');
    const checkoutTotal = document.getElementById('checkout-total');
    
    // Get cart items from local storage
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    if (cart.length === 0) {
        // If cart is empty, redirect to cart page
        window.location.href = 'cart.html';
        return;
    }
    
    // Calculate total amount
    let totalAmount = 0;
    let checkoutItemsHTML = '';
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        totalAmount += itemTotal;
        
        checkoutItemsHTML += `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <div>
                    <span>${item.title}</span>
                    <small class="d-block text-muted">Qty: ${item.quantity}</small>
                </div>
                <span>₹${itemTotal.toFixed(2)}</span>
            </div>
        `;
    });
    
    // Update checkout summary
    checkoutItemsContainer.innerHTML = checkoutItemsHTML;
    checkoutTotal.textContent = `₹${totalAmount.toFixed(2)}`;
}

/**
 * Load user shipping information
 */
function loadShippingInfo() {
    const shippingInfoContainer = document.getElementById('shipping-info');
    
    // Get user data from local storage
    const userData = getUserData();
    
    if (!userData || !userData.id) {
        shippingInfoContainer.innerHTML = `
            <p class="text-muted">Please <a href="login.html">log in</a> to continue checkout.</p>
        `;
        return;
    }
    
    // Display user information (in a real application, you would fetch address from API)
    shippingInfoContainer.innerHTML = `
        <p><strong>${userData.username}</strong></p>
        <p>${userData.email}</p>
        <p class="mb-0 text-muted">Shipping address will be collected during payment processing.</p>
    `;
}

/**
 * Initialize Stripe and create payment intent
 */
async function initializeStripe() {
    // Show loading indicator
    const loadingIndicator = document.getElementById('loading-indicator');
    const paymentFormContainer = document.getElementById('payment-form-container');
    
    try {
        // Calculate total amount from cart
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Create payment intent on the server
        const response = await fetch('/api/create-payment-intent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({
                amount: totalAmount,
                currency: 'inr',
                cart_items: cart
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to create payment intent');
        }
        
        const data = await response.json();
        paymentIntentId = data.id;
        
        // Initialize Stripe Elements
        const options = {
            clientSecret: data.client_secret,
            appearance: {
                theme: 'stripe',
                variables: {
                    colorPrimary: '#0d6efd',
                }
            },
        };
        
        elements = stripe.elements(options);
        
        // Create and mount the Payment Element
        const paymentElement = elements.create('payment');
        paymentElement.mount('#payment-element');
        
        // Show payment form and hide loading indicator
        loadingIndicator.style.display = 'none';
        paymentFormContainer.style.display = 'block';
        
        // Add submit event listener to the form
        const form = document.getElementById('payment-form');
        form.addEventListener('submit', handlePaymentSubmission);
        
    } catch (error) {
        console.error('Stripe initialization error:', error);
        loadingIndicator.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <p>There was an error initializing the payment system:</p>
                <p>${error.message}</p>
                <a href="cart.html" class="btn btn-outline-primary mt-3">Return to Cart</a>
            </div>
        `;
    }
}

/**
 * Handle payment form submission
 * @param {Event} event - Form submission event
 */
async function handlePaymentSubmission(event) {
    event.preventDefault();
    
    // Disable form submission during processing
    const submitButton = document.getElementById('submit-button');
    const buttonText = document.getElementById('button-text');
    const spinner = document.getElementById('spinner');
    
    // Show processing state
    submitButton.disabled = true;
    buttonText.textContent = 'Processing...';
    spinner.classList.remove('d-none');
    
    try {
        // Confirm payment with Stripe.js
        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: window.location.origin + '/payment-success.html',
            },
            redirect: 'if_required'
        });
        
        if (error) {
            // Show error message
            const cardErrors = document.getElementById('card-errors');
            cardErrors.textContent = error.message;
            
            // Reset button state
            submitButton.disabled = false;
            buttonText.textContent = 'Pay Now';
            spinner.classList.add('d-none');
        } else {
            // Payment succeeded (we'll get here if redirect isn't required)
            // Show success message and clear cart
            document.getElementById('payment-form-container').style.display = 'none';
            document.getElementById('payment-success').style.display = 'block';
            
            // Clear cart
            localStorage.setItem('cart', JSON.stringify([]));
            updateCartCount();
            
            // Record successful payment on the server
            await recordSuccessfulPayment();
        }
    } catch (error) {
        console.error('Payment error:', error);
        
        // Show error message
        const cardErrors = document.getElementById('card-errors');
        cardErrors.textContent = 'An unexpected error occurred. Please try again.';
        
        // Reset button state
        submitButton.disabled = false;
        buttonText.textContent = 'Pay Now';
        spinner.classList.add('d-none');
    }
}

/**
 * Record successful payment on the server
 */
async function recordSuccessfulPayment() {
    if (!paymentIntentId) return;
    
    try {
        // Send payment success info to server
        await fetch('/api/payment-success', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({
                payment_intent_id: paymentIntentId
            })
        });
    } catch (error) {
        console.error('Failed to record payment:', error);
    }
}