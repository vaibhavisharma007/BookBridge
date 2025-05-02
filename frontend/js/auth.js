/**
 * Authentication utilities for BookResell
 */

/**
 * Check if user is authenticated
 * @returns {Boolean} True if authenticated
 */
function isAuthenticated() {
    return localStorage.getItem('token') !== null && localStorage.getItem('user') !== null;
}

/**
 * Get user data from local storage
 * @returns {Object|null} User data or null if not authenticated
 */
function getUserData() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    try {
        return JSON.parse(userStr);
    } catch (e) {
        console.error('Error parsing user data:', e);
        return null;
    }
}

/**
 * Get authentication headers for API requests
 * @returns {Object} Headers object with Authorization if authenticated
 */
function getAuthHeaders() {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    const token = localStorage.getItem('token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
}

/**
 * Logout the current user
 */
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

/**
 * Update UI elements based on authentication state
 */
function updateAuthUI() {
    const user = getUserData();
    
    // Elements to show/hide based on authentication
    const authenticatedElements = document.querySelectorAll('.authenticated');
    const unauthenticatedElements = document.querySelectorAll('.unauthenticated');
    const sellerOnlyElements = document.querySelectorAll('.seller-only');
    const buyerOnlyElements = document.querySelectorAll('.buyer-only');
    const adminOnlyElements = document.querySelectorAll('.admin-only');
    
    if (user) {
        // User is authenticated
        authenticatedElements.forEach(el => el.style.display = '');
        unauthenticatedElements.forEach(el => el.style.display = 'none');
        
        // Set username in navbar
        const usernameDisplay = document.getElementById('username-display');
        if (usernameDisplay) {
            usernameDisplay.textContent = user.username;
        }
        
        // Show/hide role-specific elements
        if (user.role === 'seller') {
            sellerOnlyElements.forEach(el => el.style.display = '');
            buyerOnlyElements.forEach(el => el.style.display = 'none');
            adminOnlyElements.forEach(el => el.style.display = 'none');
        } else if (user.role === 'admin') {
            sellerOnlyElements.forEach(el => el.style.display = '');
            buyerOnlyElements.forEach(el => el.style.display = '');
            adminOnlyElements.forEach(el => el.style.display = '');
        } else {
            sellerOnlyElements.forEach(el => el.style.display = 'none');
            buyerOnlyElements.forEach(el => el.style.display = '');
            adminOnlyElements.forEach(el => el.style.display = 'none');
        }
    } else {
        // User is not authenticated
        authenticatedElements.forEach(el => el.style.display = 'none');
        unauthenticatedElements.forEach(el => el.style.display = '');
        sellerOnlyElements.forEach(el => el.style.display = 'none');
        buyerOnlyElements.forEach(el => el.style.display = 'none');
        adminOnlyElements.forEach(el => el.style.display = 'none');
    }
}

/**
 * Check if token is expired
 * @returns {Boolean} True if token is expired or invalid
 */
function isTokenExpired() {
    const token = localStorage.getItem('token');
    if (!token) return true;
    
    try {
        // Parse the token (assuming JWT format: header.payload.signature)
        const payload = token.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        
        // Check if token is expired
        return decoded.exp * 1000 < Date.now();
    } catch (e) {
        console.error('Error checking token expiration:', e);
        return true;
    }
}

// Add event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize authentication UI
    updateAuthUI();
    
    // Check for token expiration
    if (isAuthenticated() && isTokenExpired()) {
        alert('Your session has expired. Please login again.');
        logout();
    }
    
    // Add logout event listener
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Add books navigation event listener
    const navBooks = document.getElementById('nav-books');
    if (navBooks) {
        navBooks.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'index.html#books';
        });
    }
});
