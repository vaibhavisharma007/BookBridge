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
        
        // If the user has saved addresses, populate the form
        if (user.addresses && user.addresses.length > 0) {
            const defaultAddress = user.addresses[0]; // Use the first address as default
            document.getElementById('address').value = defaultAddress.street || '';
            document.getElementById('city').value = defaultAddress.city || '';
            document.getElementById('state').value = defaultAddress.state || '';
            document.getElementById('postal-code').value = defaultAddress.postalCode || '';
            
            // Set country if it exists
            const countrySelect = document.getElementById('country');
            if (countrySelect && defaultAddress.country) {
                for (let i = 0; i < countrySelect.options.length; i++) {
                    if (countrySelect.options[i].value === defaultAddress.country) {
                        countrySelect.selectedIndex = i;
                        break;
                    }
                }
            }
        }
        
        // Set phone number if available
        if (user.phone) {
            document.getElementById('phone').value = user.phone;
        }
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
    const phone = document.getElementById('phone').value.trim();
    const address = document.getElementById('address').value.trim();
    const city = document.getElementById('city').value.trim();
    const state = document.getElementById('state').value.trim();
    const postalCode = document.getElementById('postal-code').value.trim();
    const country = document.getElementById('country').value;
    
    if (!name || !email || !address || !city || !state || !postalCode || !country) {
        showMessage('Please fill in all required fields', 'error');
        return;
    }
    
    // Show loading state
    setLoading(true);
    
    try {
        // Save the shipping information to user data for future use
        const userData = JSON.parse(localStorage.getItem('userData')) || {};
        
        // Create or update the addresses array
        if (!userData.addresses) {
            userData.addresses = [];
        }
        
        // Add the current address if it's not already saved
        const newAddress = {
            street: address,
            city: city,
            state: state,
            postalCode: postalCode,
            country: country
        };
        
        // Check if this address already exists
        const addressExists = userData.addresses.some(addr => 
            addr.street === address && 
            addr.city === city && 
            addr.state === state && 
            addr.postalCode === postalCode
        );
        
        if (!addressExists) {
            userData.addresses.unshift(newAddress); // Add to the beginning of the array
            // Keep only the last 3 addresses
            if (userData.addresses.length > 3) {
                userData.addresses = userData.addresses.slice(0, 3);
            }
        }
        
        // Update phone if provided
        if (phone) {
            userData.phone = phone;
        }
        
        // Save updated user data
        localStorage.setItem('userData', JSON.stringify(userData));
        
        // Update the confirmation email in the success page
        document.getElementById('confirmation-email').textContent = email;
        
        // Generate a random order number if payment is successful
        const orderNumber = 'BRS-' + Math.floor(10000 + Math.random() * 90000);
        document.getElementById('order-number').textContent = orderNumber;
        
        // Confirm the payment with Stripe
        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/payment-success.html`,
                receipt_email: email,
                payment_method_data: {
                    billing_details: {
                        name: name,
                        email: email,
                        phone: phone,
                        address: {
                            line1: address,
                            city: city,
                            state: state,
                            postal_code: postalCode,
                            country: country
                        }
                    }
                }
            },
        });
        
        // This point is only reached if there's an immediate error when confirming the payment
        if (error) {
            showMessage(`Payment error: ${error.message}`, 'error');
        }
        
    } catch (e) {
        console.error('Payment submission error:', e);
        showMessage('An unexpected error occurred during payment processing. Please try again.', 'error');
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
            <i class="fas fa-spinner fa-spin"></i>
            <span>Processing Payment...</span>
        `;
    } else {
        submitButton.disabled = false;
        submitButton.innerHTML = 'Complete Payment <i class="fas fa-lock"></i>';
    }
}

/**
 * Show a message to the user
 * @param {String} messageText - The message to display
 * @param {String} type - The message type (success, error, info)
 */
function showMessage(messageText, type = 'info') {
    const messageContainer = document.getElementById('message-container');
    const message = document.createElement('div');
    
    message.classList.add('alert');
    message.classList.add(`alert-${type}`);
    
    // Add appropriate icon based on message type
    let icon = '';
    switch(type) {
        case 'success':
            icon = '<i class="fas fa-check-circle"></i>';
            break;
        case 'error':
            icon = '<i class="fas fa-exclamation-circle"></i>';
            break;
        case 'info':
        default:
            icon = '<i class="fas fa-info-circle"></i>';
    }
    
    message.innerHTML = `${icon} <span class="alert-message">${messageText}</span>`;
    
    messageContainer.innerHTML = '';
    messageContainer.appendChild(message);
    
    // Auto-hide success and info messages after 5 seconds
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            if (messageContainer.contains(message)) {
                message.classList.add('fade-out');
                setTimeout(() => {
                    if (messageContainer.contains(message)) {
                        messageContainer.removeChild(message);
                    }
                }, 300);
            }
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
        
        // Set confirmation email from user data
        const userData = JSON.parse(localStorage.getItem('userData')) || {};
        if (userData.email) {
            document.getElementById('confirmation-email').textContent = userData.email;
        }
        
        // Generate a random order number 
        const orderNumber = 'BRS-' + Math.floor(10000 + Math.random() * 90000);
        document.getElementById('order-number').textContent = orderNumber;
        
        // Activate the third step in the checkout process
        const steps = document.querySelectorAll('.checkout-steps .step');
        if (steps.length >= 3) {
            steps[2].classList.add('active');
        }
        
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

/**
 * Apply a promo code to the order
 */
function applyPromoCode() {
    const promoCodeInput = document.getElementById('promo-code');
    const promoCode = promoCodeInput.value.trim().toUpperCase();
    
    if (!promoCode) {
        showMessage('Please enter a promo code', 'error');
        return;
    }
    
    // List of valid promo codes with their discount percentages
    const validPromoCodes = {
        'WELCOME10': 10,
        'BOOKS25': 25,
        'STUDENT15': 15,
        'FESTIVAL20': 20
    };
    
    if (validPromoCodes[promoCode]) {
        // Get the discount percentage
        const discountPercentage = validPromoCodes[promoCode];
        
        // Get the current total amount
        const amount = parseFloat(document.getElementById('checkout-form').dataset.amount);
        
        // Calculate the discounted amount
        const discountAmount = (amount * discountPercentage / 100);
        const discountedTotal = amount - discountAmount;
        
        // Update the total amount in the UI
        const totalAmountElement = document.getElementById('total-amount');
        totalAmountElement.innerHTML = `<span class="original-price">₹${amount.toFixed(2)}</span> <span class="discounted-price">₹${discountedTotal.toFixed(2)}</span> <span class="discount-badge">-${discountPercentage}%</span>`;
        
        // Update the data attribute with the new amount
        document.getElementById('checkout-form').dataset.amount = discountedTotal;
        
        // Update the cart total
        const cartTotalElement = document.querySelector('.cart-total h3:last-child');
        if (cartTotalElement) {
            cartTotalElement.innerHTML = `<span class="original-price">₹${amount.toFixed(2)}</span> <span class="discounted-price">₹${discountedTotal.toFixed(2)}</span>`;
        }
        
        showMessage(`Promo code ${promoCode} applied! You saved ₹${discountAmount.toFixed(2)}`, 'success');
        
        // Disable the promo code input and button
        promoCodeInput.disabled = true;
        document.getElementById('apply-promo').disabled = true;
        document.getElementById('apply-promo').textContent = 'Applied';
        document.getElementById('apply-promo').classList.add('applied');
        
        // Add the promo info to the form for server processing
        document.getElementById('checkout-form').dataset.promoCode = promoCode;
        document.getElementById('checkout-form').dataset.discountPercentage = discountPercentage;
        
        // Reinitialize Stripe with the new amount
        initializeStripe(discountedTotal, JSON.parse(localStorage.getItem('cart')) || []);
        
    } else {
        showMessage('Invalid promo code. Please try again.', 'error');
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
    
    // Add event listener for promo code button
    const applyPromoButton = document.getElementById('apply-promo');
    if (applyPromoButton) {
        applyPromoButton.addEventListener('click', applyPromoCode);
    }
    
    // Add event listener for promo code input (apply on Enter key)
    const promoCodeInput = document.getElementById('promo-code');
    if (promoCodeInput) {
        promoCodeInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                applyPromoCode();
            }
        });
    }
});
