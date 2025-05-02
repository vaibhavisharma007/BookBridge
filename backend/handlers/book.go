package handlers

import (
        "bytes"
        "database/sql"
        "encoding/json"
        "fmt"
        "log"
        "math"
        "net/http"
        "strconv"
        "strings"
        "time"

        "github.com/gin-gonic/gin"
        "reselling-app/db"
        "reselling-app/models"
)

// GetAllBooks returns all book listings
func GetAllBooks(c *gin.Context) {
        // Get query parameters for filtering
        genre := c.Query("genre")
        minPrice := c.Query("min_price")
        maxPrice := c.Query("max_price")
        query := c.Query("search")

        // Build SQL query with optional filters
        sqlQuery := `
                SELECT b.id, b.seller_id, u.username, b.title, b.author, b.description, 
                       b.price, b.image_url, b.genre, b.condition, b.status, b.created_at
                FROM books b
                JOIN users u ON b.seller_id = u.id
                WHERE b.status = 'available'
        `
        var params []interface{}
        paramCounter := 1

        // Add filters if provided
        if genre != "" {
                sqlQuery += fmt.Sprintf(" AND b.genre = $%d", paramCounter)
                params = append(params, genre)
                paramCounter++
        }

        if minPrice != "" {
                minPriceFloat, err := strconv.ParseFloat(minPrice, 64)
                if err == nil {
                        sqlQuery += fmt.Sprintf(" AND b.price >= $%d", paramCounter)
                        params = append(params, minPriceFloat)
                        paramCounter++
                }
        }

        if maxPrice != "" {
                maxPriceFloat, err := strconv.ParseFloat(maxPrice, 64)
                if err == nil {
                        sqlQuery += fmt.Sprintf(" AND b.price <= $%d", paramCounter)
                        params = append(params, maxPriceFloat)
                        paramCounter++
                }
        }

        if query != "" {
                sqlQuery += fmt.Sprintf(" AND (b.title ILIKE $%d OR b.author ILIKE $%d OR b.description ILIKE $%d)",
                        paramCounter, paramCounter, paramCounter)
                params = append(params, "%"+query+"%")
                paramCounter++
        }

        sqlQuery += " ORDER BY b.created_at DESC"

        // Execute query
        rows, err := db.DB.Query(sqlQuery, params...)
        if err != nil {
                log.Printf("Database error fetching books: %v", err)
                c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch books"})
                return
        }
        defer rows.Close()

        // Initialize an empty array to avoid null JSON response
        books := []models.Book{}
        
        // Parse results
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

        if err := rows.Err(); err != nil {
                log.Printf("Error iterating book rows: %v", err)
                c.JSON(http.StatusInternalServerError, gin.H{"error": "Error processing book data"})
                return
        }

        // Even if no books found, this will return an empty array instead of null
        c.JSON(http.StatusOK, books)
}

// GetBook returns a specific book by ID
func GetBook(c *gin.Context) {
        // Get book ID from URL
        bookID, err := strconv.Atoi(c.Param("id"))
        if err != nil {
                c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid book ID"})
                return
        }

        // Get authenticated user ID from context, if available (not required)
        userID, exists := c.Get("userID")
        
        // Query to get book details
        var book models.Book
        err = db.DB.QueryRow(`
                SELECT b.id, b.seller_id, u.username, b.title, b.author, b.description, 
                       b.price, b.image_url, b.genre, b.condition, b.status, b.created_at
                FROM books b
                JOIN users u ON b.seller_id = u.id
                WHERE b.id = $1`,
                bookID,
        ).Scan(
                &book.ID, &book.SellerID, &book.SellerUsername, &book.Title, &book.Author,
                &book.Description, &book.Price, &book.ImageURL, &book.Genre, &book.Condition,
                &book.Status, &book.CreatedAt,
        )

        if err != nil {
                if err == sql.ErrNoRows {
                        c.JSON(http.StatusNotFound, gin.H{"error": "Book not found"})
                        return
                }
                log.Printf("Database error fetching book: %v", err)
                c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch book details"})
                return
        }

        // Record user interaction for recommendation system if user is authenticated
        if exists {
                // Don't block the response for this operation
                go func(uid, bid int) {
                        _, err := db.DB.Exec(
                                "INSERT INTO user_book_interactions (user_id, book_id, interaction_type) VALUES ($1, $2, 'view')",
                                uid, bid,
                        )
                        if err != nil {
                                log.Printf("Error recording user interaction: %v", err)
                        }
                }(userID.(int), bookID)
        }

        c.JSON(http.StatusOK, book)
}

// AddBook creates a new book listing after checking price prediction
func AddBook(c *gin.Context) {
        // Get user ID from authentication
        userID, _ := c.Get("userID")
        userRole, _ := c.Get("userRole")

        // Verify the user is a seller
        if userRole != "seller" {
                c.JSON(http.StatusForbidden, gin.H{"error": "Only sellers can add books"})
                return
        }

        // Parse input
        var input models.BookInput
        if err := c.ShouldBindJSON(&input); err != nil {
                c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
                return
        }

        // Truncate fields that exceed database column limits
        if len(input.Title) > 100 {
                input.Title = input.Title[:97] + "..."
                log.Printf("Title truncated to stay within database limits")
        }
        if len(input.Author) > 100 {
                input.Author = input.Author[:97] + "..."
                log.Printf("Author truncated to stay within database limits")
        }
        if len(input.Genre) > 50 {
                input.Genre = input.Genre[:47] + "..."
                log.Printf("Genre truncated to stay within database limits")
        }
        if len(input.Condition) > 20 {
                input.Condition = input.Condition[:17] + "..."
                log.Printf("Condition truncated to stay within database limits")
        }

        // Call ML service to predict price
        predictedPrice, err := getPredictedPrice(input)
        if err != nil {
                log.Printf("Error predicting price: %v", err)
                c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to predict book price"})
                return
        }

        // Check if seller's price is greater than predicted price
        if input.Price > predictedPrice {
                c.JSON(http.StatusBadRequest, gin.H{
                        "error":           "Price exceeds the fair market value",
                        "predicted_price": predictedPrice,
                })
                return
        }

        // Insert book into database
        var bookID int
        err = db.DB.QueryRow(`
                INSERT INTO books (seller_id, title, author, description, price, predicted_price, image_url, genre, condition) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id`,
                userID, input.Title, input.Author, input.Description, input.Price, 
                predictedPrice, input.ImageURL, input.Genre, input.Condition,
        ).Scan(&bookID)

        if err != nil {
                log.Printf("Database error creating book: %v", err)
                c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create book listing"})
                return
        }

        // Return created book
        var book models.Book
        err = db.DB.QueryRow(`
                SELECT b.id, b.seller_id, u.username, b.title, b.author, b.description, 
                       b.price, b.predicted_price, b.image_url, b.genre, b.condition, b.status, b.created_at
                FROM books b
                JOIN users u ON b.seller_id = u.id
                WHERE b.id = $1`,
                bookID,
        ).Scan(
                &book.ID, &book.SellerID, &book.SellerUsername, &book.Title, &book.Author,
                &book.Description, &book.Price, &book.PredictedPrice, &book.ImageURL, 
                &book.Genre, &book.Condition, &book.Status, &book.CreatedAt,
        )

        if err != nil {
                log.Printf("Error fetching created book: %v", err)
                c.JSON(http.StatusCreated, gin.H{
                        "message": "Book created successfully",
                        "id":      bookID,
                })
                return
        }

        c.JSON(http.StatusCreated, book)
}

// DeleteBook removes a book listing
func DeleteBook(c *gin.Context) {
        // Get user ID from authentication
        userID, _ := c.Get("userID")

        // Get book ID from URL
        bookID, err := strconv.Atoi(c.Param("id"))
        if err != nil {
                c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid book ID"})
                return
        }

        // Verify the user is the seller of this book
        var sellerID int
        err = db.DB.QueryRow("SELECT seller_id FROM books WHERE id = $1", bookID).Scan(&sellerID)
        if err != nil {
                if err == sql.ErrNoRows {
                        c.JSON(http.StatusNotFound, gin.H{"error": "Book not found"})
                        return
                }
                log.Printf("Database error checking book ownership: %v", err)
                c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
                return
        }

        if sellerID != userID.(int) {
                c.JSON(http.StatusForbidden, gin.H{"error": "You can only delete your own book listings"})
                return
        }

        // Delete the book
        _, err = db.DB.Exec("DELETE FROM books WHERE id = $1", bookID)
        if err != nil {
                log.Printf("Database error deleting book: %v", err)
                c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete book"})
                return
        }

        c.JSON(http.StatusOK, gin.H{"message": "Book successfully deleted"})
}

// GetRecommendedBooks returns book recommendations for the user
func GetRecommendedBooks(c *gin.Context) {
        userID, _ := c.Get("userID")

        // Call recommender service to get book recommendations
        recommendations, err := getRecommendations(userID.(int))
        if err != nil {
                log.Printf("Error getting recommendations: %v", err)
                c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get recommendations"})
                return
        }

        c.JSON(http.StatusOK, recommendations)
}

// ChatbotResponse handles book search queries via the chatbot
func ChatbotResponse(c *gin.Context) {
        var query models.ChatbotQuery
        if err := c.ShouldBindJSON(&query); err != nil {
                c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
                return
        }

        // Simple keyword-based search for the chatbot
        rows, err := db.DB.Query(`
                SELECT b.id, b.seller_id, u.username, b.title, b.author, b.description, 
                       b.price, b.image_url, b.genre, b.condition, b.status, b.created_at
                FROM books b
                JOIN users u ON b.seller_id = u.id
                WHERE b.status = 'available' AND 
                      (b.title ILIKE $1 OR b.author ILIKE $1 OR b.genre ILIKE $1 OR b.description ILIKE $1)
                LIMIT 5`,
                "%"+query.Query+"%",
        )
        
        if err != nil {
                log.Printf("Database error in chatbot search: %v", err)
                c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search books"})
                return
        }
        defer rows.Close()

        // Initialize empty array to avoid null response
        books := []models.Book{}
        
        // Parse results
        for rows.Next() {
                var book models.Book
                if err := rows.Scan(
                        &book.ID, &book.SellerID, &book.SellerUsername, &book.Title, &book.Author,
                        &book.Description, &book.Price, &book.ImageURL, &book.Genre, &book.Condition,
                        &book.Status, &book.CreatedAt,
                ); err != nil {
                        log.Printf("Error scanning book row in chatbot: %v", err)
                        continue
                }
                books = append(books, book)
        }

        response := "I found these books that might interest you:"
        if len(books) == 0 {
                response = "I couldn't find any books matching your query. Try different keywords or check all available books."
        }

        c.JSON(http.StatusOK, models.ChatbotResponse{
                Response: response,
                Books:    books,
        })
}

// UpdateBook updates an existing book listing
func UpdateBook(c *gin.Context) {
    // Get user ID from authentication
    userID, _ := c.Get("userID")

    // Get book ID from URL
    bookID, err := strconv.Atoi(c.Param("id"))
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid book ID"})
        return
    }

    // Check if the book exists and belongs to the current user
    var sellerID int
    err = db.DB.QueryRow("SELECT seller_id FROM books WHERE id = $1", bookID).Scan(&sellerID)
    if err != nil {
        if err == sql.ErrNoRows {
            c.JSON(http.StatusNotFound, gin.H{"error": "Book not found"})
        } else {
            log.Printf("Database error checking book ownership: %v", err)
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify book ownership"})
        }
        return
    }

    // Verify ownership
    if sellerID != userID.(int) {
        c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to edit this book"})
        return
    }

    // Parse request body
    var input struct {
        Title       string  `json:"title"`
        Author      string  `json:"author"`
        Description string  `json:"description"`
        Price       float64 `json:"price"`
        ImageURL    string  `json:"image_url"`
        Genre       string  `json:"genre"`
        Condition   string  `json:"condition"`
    }

    if err := c.ShouldBindJSON(&input); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input data"})
        return
    }
    
    // Truncate fields that exceed database column limits
    if len(input.Title) > 100 {
        input.Title = input.Title[:97] + "..."
        log.Printf("Title truncated to stay within database limits")
    }
    if len(input.Author) > 100 {
        input.Author = input.Author[:97] + "..."
        log.Printf("Author truncated to stay within database limits")
    }
    if len(input.Genre) > 50 {
        input.Genre = input.Genre[:47] + "..."
        log.Printf("Genre truncated to stay within database limits")
    }
    if len(input.Condition) > 20 {
        input.Condition = input.Condition[:17] + "..."
        log.Printf("Condition truncated to stay within database limits")
    }

    // Only update image URL if one is provided
    var updateQuery string
    var params []interface{}

    if input.ImageURL != "" {
        updateQuery = `
            UPDATE books 
            SET title = $1, author = $2, description = $3, price = $4, 
                image_url = $5, genre = $6, condition = $7 
            WHERE id = $8
        `
        params = append(params, input.Title, input.Author, input.Description, input.Price, 
                        input.ImageURL, input.Genre, input.Condition, bookID)
    } else {
        updateQuery = `
            UPDATE books 
            SET title = $1, author = $2, description = $3, price = $4, 
                genre = $5, condition = $6 
            WHERE id = $7
        `
        params = append(params, input.Title, input.Author, input.Description, 
                        input.Price, input.Genre, input.Condition, bookID)
    }

    // Execute update
    _, err = db.DB.Exec(updateQuery, params...)
    if err != nil {
        log.Printf("Database error updating book: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update book"})
        return
    }

    // Fetch updated book details
    var book models.Book
    err = db.DB.QueryRow(`
        SELECT b.id, b.seller_id, u.username, b.title, b.author, b.description, 
               b.price, b.image_url, b.genre, b.condition, b.status, b.created_at
        FROM books b
        JOIN users u ON b.seller_id = u.id
        WHERE b.id = $1`,
        bookID,
    ).Scan(
        &book.ID, &book.SellerID, &book.SellerUsername, &book.Title, &book.Author,
        &book.Description, &book.Price, &book.ImageURL, &book.Genre, &book.Condition,
        &book.Status, &book.CreatedAt,
    )

    if err != nil {
        log.Printf("Error fetching updated book: %v", err)
        c.JSON(http.StatusOK, gin.H{
            "message": "Book updated successfully",
            "id":      bookID,
        })
        return
    }

    c.JSON(http.StatusOK, book)
}

// Helper function to predict book price using ML service
func getPredictedPrice(book models.BookInput) (float64, error) {
        // Prepare request to ML service
        requestData := models.PredictPriceRequest{
                Title:     book.Title,
                Author:    book.Author,
                Genre:     book.Genre,
                Condition: book.Condition,
        }
        
        requestJSON, err := json.Marshal(requestData)
        if err != nil {
                return fallbackPricePrediction(book), nil
        }

        // Call ML service with timeout
        client := &http.Client{
                Timeout: 3 * time.Second, // 3 second timeout
        }
        
        resp, err := client.Post("http://localhost:5001/predict-price", "application/json", bytes.NewBuffer(requestJSON))
        if err != nil {
                log.Printf("ML service error: %v. Using fallback pricing.", err)
                return fallbackPricePrediction(book), nil
        }
        defer resp.Body.Close()

        // Check response status
        if resp.StatusCode != http.StatusOK {
                log.Printf("ML service returned non-200 status code: %d. Using fallback pricing.", resp.StatusCode)
                return fallbackPricePrediction(book), nil
        }

        // Parse response
        var prediction models.PredictPriceResponse
        if err := json.NewDecoder(resp.Body).Decode(&prediction); err != nil {
                log.Printf("Error decoding ML service response: %v. Using fallback pricing.", err)
                return fallbackPricePrediction(book), nil
        }

        // Validate the predicted price
        if prediction.PredictedPrice <= 0 {
                log.Printf("ML service returned invalid price: %f. Using fallback pricing.", prediction.PredictedPrice)
                return fallbackPricePrediction(book), nil
        }

        return prediction.PredictedPrice, nil
}

// Fallback price prediction in case ML service is unavailable
func fallbackPricePrediction(book models.BookInput) float64 {
        // Base price depends on genre
        basePrice := 350.0 // Default base price
        
        // Check for academic books
        if book.Genre == "Academic" || 
           book.Genre == "Textbook" || 
           book.Genre == "Education" || 
           strings.Contains(strings.ToLower(book.Title), "jee") || 
           strings.Contains(strings.ToLower(book.Title), "neet") {
                basePrice = 650.0 // Academic books are typically more expensive
        } else if book.Genre == "Fiction" || 
                  book.Genre == "Novel" || 
                  book.Genre == "Literature" {
                basePrice = 300.0 // Fiction books might be cheaper
        }
        
        // Adjust price based on condition
        conditionFactor := 0.7 // Default condition factor
        switch book.Condition {
        case "New":
                conditionFactor = 1.0
        case "Like New":
                conditionFactor = 0.9
        case "Very Good":
                conditionFactor = 0.8
        case "Good":
                conditionFactor = 0.7
        case "Acceptable":
                conditionFactor = 0.5
        case "Poor":
                conditionFactor = 0.3
        }
        
        // Calculate adjusted price
        adjustedPrice := basePrice * conditionFactor
        
        // Ensure price is within reasonable bounds
        if adjustedPrice < 100.0 {
                adjustedPrice = 100.0
        } else if adjustedPrice > 2000.0 {
                adjustedPrice = 2000.0
        }
        
        return math.Round(adjustedPrice)
}

// Helper function to get book recommendations
func getRecommendations(userID int) ([]models.Book, error) {
        // Prepare request to recommender service
        requestData := models.RecommendationRequest{
                UserID: userID,
        }
        
        requestJSON, err := json.Marshal(requestData)
        if err != nil {
                log.Printf("Error marshaling recommendation request: %v", err)
                return getFallbackRecommendations()
        }

        // Call recommender service
        resp, err := http.Post("http://localhost:5001/recommend", "application/json", bytes.NewBuffer(requestJSON))
        if err != nil {
                // Fallback to database query for top books if service is unavailable
                log.Printf("Error connecting to recommendation service: %v", err)
                return getFallbackRecommendations()
        }
        defer resp.Body.Close()

        // Check response status
        if resp.StatusCode != http.StatusOK {
                log.Printf("Recommendation service returned non-OK status: %d", resp.StatusCode)
                return getFallbackRecommendations()
        }

        // Parse response
        recommendations := []models.Book{} // Initialize as empty array
        if err := json.NewDecoder(resp.Body).Decode(&recommendations); err != nil {
                log.Printf("Error decoding recommendation response: %v", err)
                return getFallbackRecommendations()
        }

        return recommendations, nil
}

// PredictPrice returns a book price prediction based on ML model
func PredictPrice(c *gin.Context) {
        // Parse input
        var input models.BookInput
        if err := c.ShouldBindJSON(&input); err != nil {
                c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
                return
        }
        
        // Truncate fields that exceed database column limits to ensure consistent behavior
        if len(input.Title) > 100 {
                input.Title = input.Title[:97] + "..."
        }
        if len(input.Author) > 100 {
                input.Author = input.Author[:97] + "..."
        }
        if len(input.Genre) > 50 {
                input.Genre = input.Genre[:47] + "..."
        }
        if len(input.Condition) > 20 {
                input.Condition = input.Condition[:17] + "..."
        }

        // Call ML service to predict price
        predictedPrice, err := getPredictedPrice(input)
        if err != nil {
                log.Printf("Error predicting price: %v", err)
                c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to predict book price"})
                return
        }

        // Return the predicted price
        c.JSON(http.StatusOK, models.PredictPriceResponse{
                PredictedPrice: predictedPrice,
        })
}

// Fallback recommendation method if ML service is unavailable
func getFallbackRecommendations() ([]models.Book, error) {
        rows, err := db.DB.Query(`
                SELECT b.id, b.seller_id, u.username, b.title, b.author, b.description, 
                       b.price, b.image_url, b.genre, b.condition, b.status, b.created_at
                FROM books b
                JOIN users u ON b.seller_id = u.id
                WHERE b.status = 'available'
                ORDER BY b.created_at DESC
                LIMIT 5`,
        )
        
        if err != nil {
                log.Printf("Database error in fallback recommendations: %v", err)
                return []models.Book{}, nil
        }
        defer rows.Close()

        // Initialize an empty array to avoid null response
        books := []models.Book{}
        
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
