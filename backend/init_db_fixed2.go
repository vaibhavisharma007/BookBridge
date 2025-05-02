package main

import (
	"database/sql"
	"fmt"
	"log"
	"math"
	"math/rand"
	"time"

	"reselling-app/db"
	_ "github.com/lib/pq"
)

// Book struct for database operations
type Book struct {
	ID             int
	SellerID       int
	Title          string
	Author         string
	Description    string
	Price          float64
	PredictedPrice float64
	ImageURL       sql.NullString
	Genre          string
	Condition      string
	Status         string
	CreatedAt      time.Time
}

// User struct for database operations
type User struct {
	ID        int
	Username  string
	Email     string
	Password  string
	Role      string
	CreatedAt time.Time
}

func main() {
	// Connect to the database
	if err := db.InitDB(); err != nil {
		log.Fatalf("Failed to connect to the database: %v", err)
	}
	
	// Use the global DB instance
	database := db.DB
	defer database.Close()

	// Check if users exist
	var userCount int
	err1 := database.QueryRow("SELECT COUNT(*) FROM users").Scan(&userCount)
	if err1 != nil {
		log.Fatalf("Failed to check if users exist: %v", err1)
	}

	// Create sample users if none exist
	if userCount == 0 {
		fmt.Println("Creating sample users...")
		createUsers(database)
	}

	// Check if books exist
	var bookCount int
	err2 := database.QueryRow("SELECT COUNT(*) FROM books").Scan(&bookCount)
	if err2 != nil {
		log.Fatalf("Failed to check if books exist: %v", err2)
	}

	// Create sample books if none exist
	if bookCount == 0 {
		fmt.Println("Creating sample books...")
		createBooks(database)
	}

	fmt.Println("Database initialization complete.")
}

func createUsers(db *sql.DB) {
	// Sample users with hashed passwords (bcrypt hash of "password123")
	users := []User{
		{Username: "johndoe", Email: "john@example.com", Password: "$2a$10$3JRtS2UvgfUr3azvr9OmEeUZ4WR7YE8M61X4XZNqKpuRU1Tv2n7Cq", Role: "buyer"},
		{Username: "janedoe", Email: "jane@example.com", Password: "$2a$10$3JRtS2UvgfUr3azvr9OmEeUZ4WR7YE8M61X4XZNqKpuRU1Tv2n7Cq", Role: "seller"},
		{Username: "bobsmith", Email: "bob@example.com", Password: "$2a$10$3JRtS2UvgfUr3azvr9OmEeUZ4WR7YE8M61X4XZNqKpuRU1Tv2n7Cq", Role: "seller"},
	}

	// Insert users
	for _, user := range users {
		_, err := db.Exec(
			"INSERT INTO users (username, email, password, role, created_at) VALUES ($1, $2, $3, $4, $5)",
			user.Username, user.Email, user.Password, user.Role, time.Now(),
		)
		if err != nil {
			log.Printf("Failed to insert user %s: %v", user.Username, err)
		}
	}
}

func createBooks(db *sql.DB) {
	// Get seller IDs
	rows, err := db.Query("SELECT id FROM users WHERE role = 'seller'")
	if err != nil {
		log.Fatalf("Failed to get seller IDs: %v", err)
	}
	defer rows.Close()

	var sellerIDs []int
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			log.Fatalf("Failed to scan seller ID: %v", err)
		}
		sellerIDs = append(sellerIDs, id)
	}

	if len(sellerIDs) == 0 {
		log.Fatalf("No sellers found in the database")
	}

	// Sample books
	books := []Book{
		{
			Title:       "To Kill a Mockingbird",
			Author:      "Harper Lee",
			Description: "A classic novel about racial injustice and moral growth in the American South.",
			Price:       12.99,
			Genre:       "Fiction",
			Condition:   "Good",
			Status:      "available",
			ImageURL:    sql.NullString{String: "https://m.media-amazon.com/images/I/71FxgtFKcQL._AC_UF1000,1000_QL80_.jpg", Valid: true},
		},
		{
			Title:       "1984",
			Author:      "George Orwell",
			Description: "A dystopian novel set in a totalitarian society where critical thought is suppressed.",
			Price:       9.99,
			Genre:       "Dystopian",
			Condition:   "Very Good",
			Status:      "available",
			ImageURL:    sql.NullString{String: "https://m.media-amazon.com/images/I/71kxa1-0mfL._AC_UF1000,1000_QL80_.jpg", Valid: true},
		},
		{
			Title:       "The Great Gatsby",
			Author:      "F. Scott Fitzgerald",
			Description: "A novel depicting the extravagance and moral emptiness of the Jazz Age.",
			Price:       8.50,
			Genre:       "Fiction",
			Condition:   "Like New",
			Status:      "available",
			ImageURL:    sql.NullString{String: "https://m.media-amazon.com/images/I/71FTb9X6wsL._AC_UF1000,1000_QL80_.jpg", Valid: true},
		},
		{
			Title:       "Pride and Prejudice",
			Author:      "Jane Austen",
			Description: "A romantic novel of manners that depicts the emotional development of Elizabeth Bennet.",
			Price:       7.99,
			Genre:       "Romance",
			Condition:   "Good",
			Status:      "available",
			ImageURL:    sql.NullString{String: "https://m.media-amazon.com/images/I/61gY+fCgXML._AC_UF1000,1000_QL80_.jpg", Valid: true},
		},
		{
			Title:       "The Hobbit",
			Author:      "J.R.R. Tolkien",
			Description: "A fantasy novel about the adventures of a hobbit named Bilbo Baggins.",
			Price:       15.99,
			Genre:       "Fantasy",
			Condition:   "Very Good",
			Status:      "available",
			ImageURL:    sql.NullString{String: "https://m.media-amazon.com/images/I/710+HcoP38L._AC_UF1000,1000_QL80_.jpg", Valid: true},
		},
		{
			Title:       "Brave New World",
			Author:      "Aldous Huxley",
			Description: "A dystopian novel set in a genetically-engineered future society.",
			Price:       10.50,
			Genre:       "Dystopian",
			Condition:   "Acceptable",
			Status:      "available",
			ImageURL:    sql.NullString{String: "https://m.media-amazon.com/images/I/81zE42gT3xL._AC_UF1000,1000_QL80_.jpg", Valid: true},
		},
		{
			Title:       "The Catcher in the Rye",
			Author:      "J.D. Salinger",
			Description: "A novel depicting the experiences of a disaffected teenager in New York City.",
			Price:       8.99,
			Genre:       "Fiction",
			Condition:   "Good",
			Status:      "available",
			ImageURL:    sql.NullString{String: "https://m.media-amazon.com/images/I/91HPG31dTwL._AC_UF1000,1000_QL80_.jpg", Valid: true},
		},
		{
			Title:       "Crime and Punishment",
			Author:      "Fyodor Dostoevsky",
			Description: "A novel focusing on the mental anguish of a murderer.",
			Price:       11.99,
			Genre:       "Philosophical Fiction",
			Condition:   "Good",
			Status:      "available",
			ImageURL:    sql.NullString{String: "https://m.media-amazon.com/images/I/71V0THcuFOL._AC_UF1000,1000_QL80_.jpg", Valid: true},
		},
		{
			Title:       "Moby Dick",
			Author:      "Herman Melville",
			Description: "A novel about the voyage of the whaling ship Pequod and its captain's obsessive quest for revenge.",
			Price:       9.75,
			Genre:       "Adventure",
			Condition:   "Acceptable",
			Status:      "available",
			ImageURL:    sql.NullString{String: "https://m.media-amazon.com/images/I/41Xn+5VOrPL.jpg", Valid: true},
		},
		{
			Title:       "Wuthering Heights",
			Author:      "Emily Brontë",
			Description: "A gothic novel of revenge and romantic love set in the Yorkshire moors.",
			Price:       7.50,
			Genre:       "Gothic",
			Condition:   "Good",
			Status:      "available",
			ImageURL:    sql.NullString{String: "https://m.media-amazon.com/images/I/91G3gOHEZ6L._AC_UF1000,1000_QL80_.jpg", Valid: true},
		},
	}

	// Randomize seller IDs and predicted prices
	rand.Seed(time.Now().UnixNano())
	for i := range books {
		// Assign random seller ID
		books[i].SellerID = sellerIDs[rand.Intn(len(sellerIDs))]
		
		// Set predicted price slightly different from price
		difference := rand.Float64() * 2.0 - 1.0 // Random value between -1.0 and 1.0
		books[i].PredictedPrice = books[i].Price * (1.0 + difference*0.1) // +/- 10% of price
		books[i].PredictedPrice = math.Round(books[i].PredictedPrice*100) / 100 // Round to 2 decimal places
	}

	// Insert books
	for _, book := range books {
		_, err := db.Exec(
			"INSERT INTO books (seller_id, title, author, description, price, predicted_price, image_url, genre, condition, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
			book.SellerID, book.Title, book.Author, book.Description, book.Price, book.PredictedPrice, book.ImageURL, book.Genre, book.Condition, book.Status, time.Now(),
		)
		if err != nil {
			log.Printf("Failed to insert book %s: %v", book.Title, err)
		}
	}
}
