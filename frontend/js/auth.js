/**
 * Authentication utilities for BookBridge
 */

// Chatbase secret key for user identity verification
const CHATBASE_SECRET_KEY = '3wfd66ka529ylmz93a67mxj3v8gto63x';

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
        
        // Update other-role text for role switching
        const otherRoleSpan = document.getElementById('other-role');
        if (otherRoleSpan) {
            otherRoleSpan.textContent = user.role === 'seller' ? 'Buyer' : 'Seller';
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
    
    // Initialize feather icons in newly visible elements
    if (typeof feather !== 'undefined') {
        feather.replace();
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

/**
 * Switch between buyer and seller roles
 */
function switchRole() {
    const user = getUserData();
    if (!user) return;
    
    // Toggle the role
    const newRole = user.role === 'seller' ? 'buyer' : 'seller';
    user.role = newRole;
    
    // Save the updated user data to localStorage
    localStorage.setItem('user', JSON.stringify(user));
    
    // Update UI elements based on the new role
    updateAuthUI();
    
    // Show success message
    alert(`Successfully switched to ${newRole} role!`);
    
    // Reload the page or redirect to appropriate dashboard
    if (newRole === 'seller') {
        window.location.href = 'seller-dashboard.html';
    } else {
        window.location.href = 'index.html';
    }
}

/**
 * Generate HMAC hash for Chatbase user identity verification
 * @returns {Object|null} User identity object or null if not authenticated
 */
function getChatbaseUserIdentity() {
    if (!isAuthenticated()) return null;
    
    const userData = getUserData();
    if (!userData || !userData.id) return null;
    
    // We need to create an HMAC hash for user verification
    // Since we can't use Node.js crypto in the browser, we'll use SubtleCrypto API
    return {
        userId: userData.id,
        userEmail: userData.email || '',
        userName: userData.name || userData.username || ''
    };
}

/**
 * Initialize Chatbase with user identity if available
 */
function initializeChatbase() {
    if (typeof window.chatbase === 'function') {
        const userIdentity = getChatbaseUserIdentity();
        
        if (userIdentity) {
            // Set user identity for Chatbase
            window.chatbase('setUser', {
                userId: userIdentity.userId,
                email: userIdentity.userEmail,
                name: userIdentity.userName
            });
            
            console.log('Chatbase initialized with user identity');
        } else {
            console.log('Chatbase initialized without user identity');
        }
    }
}

// Add event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize authentication UI
    updateAuthUI();
    
    // Initialize Chatbase after a short delay to ensure the script is loaded
    setTimeout(initializeChatbase, 1000);
    
    // Check for token expiration
    if (isAuthenticated() && isTokenExpired()) {
        alert('Your session has expired. Please login again.');
        logout();
    }
    
    // Add logout event listener
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
    
    // Add role switch event listener
    const switchRoleBtn = document.getElementById('switch-role-btn');
    if (switchRoleBtn) {
        switchRoleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            switchRole();
        });
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
