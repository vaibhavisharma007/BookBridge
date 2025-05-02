/**
 * Profile functionality for BookResell
 */

// Initialize the profile page
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is authenticated
    if (!isAuthenticated()) {
        window.location.href = 'login.html?redirect=profile.html';
        return;
    }
    
    // Initialize tabs
    initializeTabs();
    
    // Load profile data
    loadProfileData();
    
    // Load orders, addresses, and wishlist
    loadOrders();
    loadAddresses();
    loadWishlist();
    
    // Setup event listeners
    setupEventListeners();
});

/**
 * Initialize the tab functionality
 */
function initializeTabs() {
    const tabLinks = document.querySelectorAll('.nav-link');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all links and panes
            tabLinks.forEach(l => l.classList.remove('active'));
            tabPanes.forEach(p => {
                p.classList.remove('show', 'active');
            });
            
            // Add active class to clicked link
            link.classList.add('active');
            
            // Show the corresponding pane
            const targetId = link.getAttribute('data-bs-target').substring(1);
            const targetPane = document.getElementById(targetId);
            if (targetPane) {
                targetPane.classList.add('show', 'active');
            }
        });
    });
}

/**
 * Load the user's profile data
 */
function loadProfileData() {
    const profileData = document.getElementById('profile-data');
    const userData = getUserData();
    
    if (!userData) {
        profileData.innerHTML = '<p class="text-danger">Error loading profile data. Please try again.</p>';
        return;
    }
    
    // Display user data
    profileData.innerHTML = `
        <p><strong>Name:</strong> ${userData.name || userData.username || 'Not provided'}</p>
        <p><strong>Email:</strong> ${userData.email || 'Not provided'}</p>
        <p><strong>Phone:</strong> ${userData.phone || 'Not provided'}</p>
        <p><strong>Role:</strong> ${userData.role ? userData.role.charAt(0).toUpperCase() + userData.role.slice(1) : 'User'}</p>
        <p><strong>Member Since:</strong> ${new Date(userData.created_at || Date.now()).toLocaleDateString()}</p>
    `;
    
    // Pre-fill the edit form
    document.getElementById('name').value = userData.name || userData.username || '';
    document.getElementById('email').value = userData.email || '';
    document.getElementById('phone').value = userData.phone || '';
}

/**
 * Load the user's order history
 */
function loadOrders() {
    const ordersList = document.getElementById('orders-list');
    
    // For MVP, we'll just show a placeholder
    // In a real implementation, this would fetch orders from the server
    ordersList.innerHTML = `
        <div class="order-item">
            <div class="order-header">
                <div class="order-number">#ORD12345</div>
                <div class="order-date">May 1, 2025</div>
                <div class="order-status completed">Delivered</div>
            </div>
            <div class="order-items">
                <div class="order-item-row">
                    <div>The Great Gatsby - F. Scott Fitzgerald</div>
                    <div>₹250.00 x 1</div>
                </div>
                <div class="order-item-row">
                    <div>To Kill a Mockingbird - Harper Lee</div>
                    <div>₹350.00 x 1</div>
                </div>
            </div>
            <div class="order-total">Total: ₹600.00</div>
        </div>
        
        <div class="order-item">
            <div class="order-header">
                <div class="order-number">#ORD12344</div>
                <div class="order-date">April 26, 2025</div>
                <div class="order-status processing">Processing</div>
            </div>
            <div class="order-items">
                <div class="order-item-row">
                    <div>1984 - George Orwell</div>
                    <div>₹300.00 x 1</div>
                </div>
            </div>
            <div class="order-total">Total: ₹300.00</div>
        </div>
        
        <div class="order-item">
            <div class="order-header">
                <div class="order-number">#ORD12340</div>
                <div class="order-date">April 10, 2025</div>
                <div class="order-status cancelled">Cancelled</div>
            </div>
            <div class="order-items">
                <div class="order-item-row">
                    <div>Pride and Prejudice - Jane Austen</div>
                    <div>₹280.00 x 1</div>
                </div>
                <div class="order-item-row">
                    <div>David Copperfield - Charles Dickens</div>
                    <div>₹320.00 x 1</div>
                </div>
            </div>
            <div class="order-total">Total: ₹600.00</div>
        </div>
    `;
}

/**
 * Load the user's saved addresses
 */
function loadAddresses() {
    const addressesList = document.getElementById('addresses-list');
    
    // For MVP, we'll just show a placeholder
    // In a real implementation, this would fetch addresses from the server
    addressesList.innerHTML = `
        <div class="address-card default">
            <span class="default-badge">Default</span>
            <h4>Home</h4>
            <p>123 Main Street</p>
            <p>Bangalore, Karnataka 560001</p>
            <div class="address-actions">
                <button type="button" class="edit-address" data-address-id="1">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button type="button" class="remove-address" data-address-id="1">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
        
        <div class="address-card">
            <h4>Work</h4>
            <p>456 Tech Park, Building 4</p>
            <p>Mumbai, Maharashtra 400001</p>
            <div class="address-actions">
                <button type="button" class="edit-address" data-address-id="2">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button type="button" class="remove-address" data-address-id="2">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;
}

/**
 * Load the user's wishlist
 */
function loadWishlist() {
    const wishlistItems = document.getElementById('wishlist-items');
    
    // For MVP, we'll just show a placeholder
    // In a real implementation, this would fetch wishlist items from the server
    wishlistItems.innerHTML = `
        <div class="wishlist-container">
            <div class="wishlist-item">
                <img src="https://via.placeholder.com/300x450?text=Book+Cover" alt="Book Cover">
                <div class="wishlist-item-content">
                    <h4>Harry Potter and the Philosopher's Stone</h4>
                    <p>J.K. Rowling</p>
                    <p class="wishlist-item-price">₹450.00</p>
                    <div class="wishlist-item-actions">
                        <button class="primary-button">Add to Cart</button>
                        <button class="remove-wishlist" data-book-id="1">Remove</button>
                    </div>
                </div>
            </div>
            
            <div class="wishlist-item">
                <img src="https://via.placeholder.com/300x450?text=Book+Cover" alt="Book Cover">
                <div class="wishlist-item-content">
                    <h4>The Hobbit</h4>
                    <p>J.R.R. Tolkien</p>
                    <p class="wishlist-item-price">₹350.00</p>
                    <div class="wishlist-item-actions">
                        <button class="primary-button">Add to Cart</button>
                        <button class="remove-wishlist" data-book-id="2">Remove</button>
                    </div>
                </div>
            </div>
            
            <div class="wishlist-item">
                <img src="https://via.placeholder.com/300x450?text=Book+Cover" alt="Book Cover">
                <div class="wishlist-item-content">
                    <h4>The Alchemist</h4>
                    <p>Paulo Coelho</p>
                    <p class="wishlist-item-price">₹300.00</p>
                    <div class="wishlist-item-actions">
                        <button class="primary-button">Add to Cart</button>
                        <button class="remove-wishlist" data-book-id="3">Remove</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Set up event listeners for profile page interactions
 */
function setupEventListeners() {
    // Profile editing
    const editProfileBtn = document.getElementById('edit-profile');
    const cancelEditBtn = document.getElementById('cancel-edit');
    const profileForm = document.getElementById('profile-form');
    
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            document.querySelector('.edit-profile-form').style.display = 'block';
            editProfileBtn.style.display = 'none';
        });
    }
    
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            document.querySelector('.edit-profile-form').style.display = 'none';
            editProfileBtn.style.display = 'block';
        });
    }
    
    if (profileForm) {
        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // TODO: Send updated profile data to server
            alert('Profile updated successfully!');
            document.querySelector('.edit-profile-form').style.display = 'none';
            editProfileBtn.style.display = 'block';
            
            // Update displayed profile data
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const phone = document.getElementById('phone').value;
            
            const profileData = document.getElementById('profile-data');
            const userData = getUserData();
            
            profileData.innerHTML = `
                <p><strong>Name:</strong> ${name || 'Not provided'}</p>
                <p><strong>Email:</strong> ${email || 'Not provided'}</p>
                <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
                <p><strong>Role:</strong> ${userData.role ? userData.role.charAt(0).toUpperCase() + userData.role.slice(1) : 'User'}</p>
                <p><strong>Member Since:</strong> ${new Date(userData.created_at || Date.now()).toLocaleDateString()}</p>
            `;
        });
    }
    
    // Address form toggle
    const addAddressBtn = document.getElementById('add-address');
    const cancelAddressBtn = document.getElementById('cancel-address');
    const addressForm = document.getElementById('address-form');
    
    if (addAddressBtn) {
        addAddressBtn.addEventListener('click', () => {
            document.getElementById('address-form-container').style.display = 'block';
            addAddressBtn.style.display = 'none';
        });
    }
    
    if (cancelAddressBtn) {
        cancelAddressBtn.addEventListener('click', () => {
            document.getElementById('address-form-container').style.display = 'none';
            addAddressBtn.style.display = 'block';
        });
    }
    
    if (addressForm) {
        addressForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // TODO: Send new address data to server
            alert('Address added successfully!');
            document.getElementById('address-form-container').style.display = 'none';
            addAddressBtn.style.display = 'block';
            
            // Reset form
            addressForm.reset();
        });
    }
    
    // Password change form
    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            if (newPassword !== confirmPassword) {
                alert('New passwords do not match!');
                return;
            }
            
            // TODO: Send password update to server
            alert('Password updated successfully!');
            
            // Reset form
            passwordForm.reset();
        });
    }
    
    // Email preferences form
    const emailPreferencesForm = document.getElementById('email-preferences-form');
    if (emailPreferencesForm) {
        emailPreferencesForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // TODO: Send email preferences to server
            alert('Email preferences updated successfully!');
        });
    }
    
    // Add to cart buttons in wishlist
    const addToCartBtns = document.querySelectorAll('.wishlist-item .primary-button');
    addToCartBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const wishlistItem = this.closest('.wishlist-item');
            const title = wishlistItem.querySelector('h4').textContent;
            const author = wishlistItem.querySelector('p').textContent;
            const priceText = wishlistItem.querySelector('.wishlist-item-price').textContent;
            const price = parseFloat(priceText.replace('₹', ''));
            const id = parseInt(wishlistItem.querySelector('.remove-wishlist').dataset.bookId);
            
            addToCart({
                id,
                title,
                author,
                price,
                image: wishlistItem.querySelector('img').src
            });
        });
    });
    
    // Remove from wishlist buttons
    const removeWishlistBtns = document.querySelectorAll('.remove-wishlist');
    removeWishlistBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const bookId = this.dataset.bookId;
            // TODO: Send remove request to server
            this.closest('.wishlist-item').remove();
        });
    });
}