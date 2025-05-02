package handlers

import (
	"database/sql"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"reselling-app/db"
	"reselling-app/models"
)

// GetUserProfile returns the user profile for a given user ID
func GetUserProfile(c *gin.Context) {
	// Get user ID from URL
	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Query to get user details
	var user models.User
	err = db.DB.QueryRow(`
		SELECT id, username, email, role, created_at, bio, profile_image_url, 
			(SELECT COUNT(*) FROM books WHERE seller_id = users.id AND status = 'available') as book_count
		FROM users
		WHERE id = $1`,
		userID,
	).Scan(
		&user.ID, &user.Username, &user.Email, &user.Role, &user.CreatedAt, 
		&user.Bio, &user.ProfileImageURL, &user.BookCount,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}
		log.Printf("Database error fetching user: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user details"})
		return
	}

	// Don't send the email to clients unless it's the user's own profile
	if authenticatedUserID, exists := c.Get("userID"); !exists || authenticatedUserID.(int) != userID {
		user.Email = "" // Clear email for privacy
	}

	// Get the user's recent books
	rows, err := db.DB.Query(`
		SELECT id, title, author, price, image_url, created_at 
		FROM books 
		WHERE seller_id = $1 AND status = 'available' 
		ORDER BY created_at DESC LIMIT 5`,
		userID,
	)

	if err != nil {
		log.Printf("Database error fetching user's books: %v", err)
		// We'll continue even if this fails
		user.RecentBooks = []models.BookSummary{}
	} else {
		defer rows.Close()

		user.RecentBooks = []models.BookSummary{}
		for rows.Next() {
			var book models.BookSummary
			err := rows.Scan(
				&book.ID, &book.Title, &book.Author, &book.Price, &book.ImageURL, &book.CreatedAt,
			)
			if err != nil {
				log.Printf("Error scanning book row: %v", err)
				continue
			}
			user.RecentBooks = append(user.RecentBooks, book)
		}
	}

	c.JSON(http.StatusOK, user)
}

// GetSellerProfile returns the seller profile and their books
func GetSellerProfile(c *gin.Context) {
	// Get seller ID from URL
	sellerID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid seller ID"})
		return
	}

	// Query to get seller details
	var seller models.SellerProfile
	err = db.DB.QueryRow(`
		SELECT id, username, role, created_at, bio, profile_image_url, 
			(SELECT COUNT(*) FROM books WHERE seller_id = users.id AND status = 'available') as book_count,
			(SELECT AVG(rating) FROM seller_ratings WHERE seller_id = users.id) as avg_rating
		FROM users
		WHERE id = $1 AND role IN ('seller', 'both')`,
		sellerID,
	).Scan(
		&seller.ID, &seller.Username, &seller.Role, &seller.CreatedAt, 
		&seller.Bio, &seller.ProfileImageURL, &seller.BookCount, &seller.Rating,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Seller not found"})
			return
		}
		log.Printf("Database error fetching seller: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch seller details"})
		return
	}

	// Get the seller's books
	rows, err := db.DB.Query(`
		SELECT id, title, author, description, price, image_url, genre, condition, created_at 
		FROM books 
		WHERE seller_id = $1 AND status = 'available' 
		ORDER BY created_at DESC`,
		sellerID,
	)

	if err != nil {
		log.Printf("Database error fetching seller's books: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch seller's books"})
		return
	}
	defer rows.Close()

	seller.Books = []models.Book{}
	for rows.Next() {
		var book models.Book
		book.SellerID = sellerID
		book.SellerUsername = seller.Username
		err := rows.Scan(
			&book.ID, &book.Title, &book.Author, &book.Description, 
			&book.Price, &book.ImageURL, &book.Genre, &book.Condition, &book.CreatedAt,
		)
		if err != nil {
			log.Printf("Error scanning book row: %v", err)
			continue
		}
		// Only include books with valid image URLs to clean up listings
		if book.ImageURL != "" && book.ImageURL != "null" {
			seller.Books = append(seller.Books, book)
		}
	}

	c.JSON(http.StatusOK, seller)
}

// UpdateUserProfile updates the user profile
func UpdateUserProfile(c *gin.Context) {
	// Get authenticated user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Parse request body
	var profileUpdate models.ProfileUpdate
	if err := c.ShouldBindJSON(&profileUpdate); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Update user profile
	_, err := db.DB.Exec(`
		UPDATE users 
		SET bio = $1, profile_image_url = $2
		WHERE id = $3`,
		profileUpdate.Bio, profileUpdate.ProfileImageURL, userID,
	)

	if err != nil {
		log.Printf("Database error updating user profile: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user profile"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Profile updated successfully"})
}
