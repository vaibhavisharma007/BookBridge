package handlers

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"reselling-app/db"
	"reselling-app/models"
	"reselling-app/utils"
)

// ChatbotResponse handles book recommendation requests via the chatbot
func ChatbotResponse(c *gin.Context) {
	var input models.ChatbotQuery

	// Validate input
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID from context if authenticated
	var userID int
	userIDValue, exists := c.Get("userID")
	if exists {
		userID = userIDValue.(int)
	}

	// Create a context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Create a new Gemini client
	geminiClient, err := utils.NewGeminiClient()
	if err != nil {
		log.Printf("Error creating Gemini client: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize AI service"})
		return
	}

	// Create the prompt for book recommendations
	prompt := utils.CreateBookRecommendationPrompt(input.Query, userID)

	// Generate content using the Gemini API
	response, err := geminiClient.GenerateContent(ctx, prompt)
	if err != nil {
		log.Printf("Error generating content: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate recommendations"})
		return
	}

	// If the user is authenticated, store the interaction
	if userID > 0 {
		go storeUserChatbotInteraction(userID, input.Query, response)
	}

	// Find relevant books based on the query
	relevantBooks, err := findRelevantBooks(input.Query)
	if err != nil {
		log.Printf("Error finding relevant books: %v", err)
		// Continue with the response even if book search fails
	}

	// Return the response
	c.JSON(http.StatusOK, models.ChatbotResponse{
		Response: response,
		Books:    relevantBooks,
	})
}

// storeUserChatbotInteraction stores the user's interaction with the chatbot
func storeUserChatbotInteraction(userID int, query, response string) {
	// Store the interaction in the database for future reference
	_, err := db.DB.Exec(
		"INSERT INTO chatbot_interactions (user_id, query, response, created_at) VALUES ($1, $2, $3, $4)",
		userID, query, response, time.Now(),
	)
	if err != nil {
		log.Printf("Error storing chatbot interaction: %v", err)
	}
}

// findRelevantBooks finds books relevant to the user's query
func findRelevantBooks(query string) ([]models.Book, error) {
	// Search for books that match the query in title, author, or description
	rows, err := db.DB.Query(`
		SELECT b.id, b.seller_id, u.username, b.title, b.author, b.description, 
			   b.price, b.image_url, b.genre, b.condition, b.status, b.created_at
		FROM books b
		JOIN users u ON b.seller_id = u.id
		WHERE b.status = 'available' AND 
			  (b.title ILIKE $1 OR b.author ILIKE $1 OR b.description ILIKE $1 OR b.genre ILIKE $1)
		ORDER BY b.created_at DESC
		LIMIT 5
	`, "%"+query+"%")

	if err != nil {
		if err == sql.ErrNoRows {
			return []models.Book{}, nil
		}
		return nil, err
	}
	defer rows.Close()

	var books []models.Book
	for rows.Next() {
		var book models.Book
		if err := rows.Scan(
			&book.ID, &book.SellerID, &book.SellerUsername, &book.Title, &book.Author,
			&book.Description, &book.Price, &book.ImageURL, &book.Genre, &book.Condition,
			&book.Status, &book.CreatedAt,
		); err != nil {
			log.Printf("Error scanning book row: %v", err)
			continue
		}
		books = append(books, book)
	}

	return books, nil
}
