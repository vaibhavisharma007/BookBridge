package models

import (
	"time"
)

// Book represents a book listing in the system
type Book struct {
	ID             int       `json:"id"`
	SellerID       int       `json:"seller_id"`
	SellerUsername string    `json:"seller_username,omitempty"`
	Title          string    `json:"title"`
	Author         string    `json:"author"`
	Description    string    `json:"description"`
	Price          float64   `json:"price"`
	PredictedPrice float64   `json:"predicted_price,omitempty"`
	ImageURL       string    `json:"image_url"`
	Genre          string    `json:"genre"`
	Condition      string    `json:"condition"`
	Status         string    `json:"status"`
	CreatedAt      time.Time `json:"created_at"`
}

// BookInput represents the data needed to create a new book
type BookInput struct {
	Title       string  `json:"title" binding:"required"`
	Author      string  `json:"author" binding:"required"`
	Description string  `json:"description"`
	Price       float64 `json:"price" binding:"required,gt=0"`
	ImageURL    string  `json:"image_url"`
	Genre       string  `json:"genre"`
	Condition   string  `json:"condition"`
}

// PredictPriceRequest is used to send data to the price prediction service
type PredictPriceRequest struct {
	Title     string `json:"title"`
	Author    string `json:"author"`
	Genre     string `json:"genre"`
	Condition string `json:"condition"`
}

// PredictPriceResponse is the response from the price prediction service
type PredictPriceResponse struct {
	PredictedPrice float64 `json:"predicted_price"`
}

// RecommendationRequest is used to get book recommendations
type RecommendationRequest struct {
	UserID int `json:"user_id"`
}

// RecommendationResponse is the response from the recommendation service
type RecommendationResponse struct {
	Books []Book `json:"books"`
}

// UserBookInteraction represents a user's interaction with a book
type UserBookInteraction struct {
	ID              int       `json:"id"`
	UserID          int       `json:"user_id"`
	BookID          int       `json:"book_id"`
	InteractionType string    `json:"interaction_type"` // view, search, favorite
	CreatedAt       time.Time `json:"created_at"`
}
