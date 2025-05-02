package models

import (
        "time"
)

// BookSummary represents a simplified version of a book for listing in profiles
type BookSummary struct {
        ID        int       `json:"id"`
        Title     string    `json:"title"`
        Author    string    `json:"author"`
        Price     float64   `json:"price"`
        ImageURL  string    `json:"image_url"`
        CreatedAt time.Time `json:"created_at"`
}

// User represents a user in the system
type User struct {
        ID              int            `json:"id"`
        Username        string         `json:"username"`
        Email           string         `json:"email"`
        PasswordHash    string         `json:"-"` // Never expose password hash
        Role            string         `json:"role"` // buyer, seller, or both
        Bio             string         `json:"bio"`
        ProfileImageURL string         `json:"profile_image_url"`
        CreatedAt       time.Time      `json:"created_at"`
        BookCount       int            `json:"book_count"`
        RecentBooks     []BookSummary  `json:"recent_books,omitempty"`
}

// SellerProfile represents a seller's profile with their books
type SellerProfile struct {
        ID              int       `json:"id"`
        Username        string    `json:"username"`
        Role            string    `json:"role"` // seller or both
        Bio             string    `json:"bio"`
        ProfileImageURL string    `json:"profile_image_url"`
        CreatedAt       time.Time `json:"created_at"`
        BookCount       int       `json:"book_count"`
        Rating          float64   `json:"rating"` // Average seller rating
        Books           []Book    `json:"books"`
}

// ProfileUpdate contains the fields that can be updated for a user's profile
type ProfileUpdate struct {
        Bio             string `json:"bio"`
        ProfileImageURL string `json:"profile_image_url"`
}

// UserSignup represents the data needed to create a new user
type UserSignup struct {
        Username string `json:"username" binding:"required"`
        Email    string `json:"email" binding:"required,email"`
        Password string `json:"password" binding:"required,min=8"`
        Role     string `json:"role" binding:"required,oneof=buyer seller"`
}

// UserLogin represents the data needed for user login
type UserLogin struct {
        Username string `json:"username" binding:"required"`
        Password string `json:"password" binding:"required"`
}

// UserResponse is the structure returned to clients after authentication
type UserResponse struct {
        ID       int    `json:"id"`
        Username string `json:"username"`
        Email    string `json:"email"`
        Role     string `json:"role"`
        Token    string `json:"token"`
}
