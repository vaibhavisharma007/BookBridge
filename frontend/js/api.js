/**
 * API utilities for BookResell
 */

/**
 * Base URL for API requests
 */
const BASE_URL = '/api';

/**
 * Get authentication headers for API requests
 * @returns {Object} Headers object with Authorization if authenticated
 */
function getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
}

/**
 * Create a payment intent with Stripe
 * @param {Number} amount - The payment amount in INR
 * @param {Array} cartItems - Cart items for the payment
 * @returns {Promise} Promise resolving to payment intent data
 */
async function createPaymentIntent(amount, cartItems = []) {
    try {
        const response = await fetch(`${BASE_URL}/create-payment-intent`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                amount,
                currency: 'inr',
                cart_items: cartItems
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create payment intent');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Payment intent creation error:', error);
        throw error;
    }
}

/**
 * Record a successful payment
 * @param {String} paymentIntentId - Stripe payment intent ID
 * @returns {Promise} Promise resolving to success message
 */
async function recordPaymentSuccess(paymentIntentId) {
    try {
        const response = await fetch(`${BASE_URL}/payment-success`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                payment_intent_id: paymentIntentId
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to record payment');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Payment recording error:', error);
        throw error;
    }
}
