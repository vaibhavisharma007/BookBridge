package models

import (
	"time"
)

// Chat represents a chat session between a buyer and seller for a specific book
type Chat struct {
	ID        int       `json:"id"`
	BookID    int       `json:"book_id"`
	BuyerID   int       `json:"buyer_id"`
	SellerID  int       `json:"seller_id"`
	CreatedAt time.Time `json:"created_at"`
}

// Message represents a single message in a chat
type Message struct {
	ID        int       `json:"id"`
	ChatID    int       `json:"chat_id"`
	SenderID  int       `json:"sender_id"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
}

// ChatMessage represents a message with additional user information
type ChatMessage struct {
	ID           int       `json:"id"`
	ChatID       int       `json:"chat_id"`
	SenderID     int       `json:"sender_id"`
	SenderName   string    `json:"sender_name"`
	Content      string    `json:"content"`
	CreatedAt    time.Time `json:"created_at"`
	IsSelfSender bool      `json:"is_self_sender,omitempty"`
}

// ChatSession represents the full chat session with book and user details
type ChatSession struct {
	ChatID      int           `json:"chat_id"`
	BookID      int           `json:"book_id"`
	BookTitle   string        `json:"book_title"`
	BuyerID     int           `json:"buyer_id"`
	BuyerName   string        `json:"buyer_name"`
	SellerID    int           `json:"seller_id"`
	SellerName  string        `json:"seller_name"`
	Messages    []ChatMessage `json:"messages"`
	CreatedAt   time.Time     `json:"created_at"`
}

// WebSocketMessage represents the structure used for websocket communication
type WebSocketMessage struct {
	Type      string      `json:"type"` // "message", "system", "error"
	Content   string      `json:"content"`
	SenderID  int         `json:"sender_id,omitempty"`
	ChatID    int         `json:"chat_id,omitempty"`
	Timestamp time.Time   `json:"timestamp"`
	Data      interface{} `json:"data,omitempty"`
}

// ChatbotQuery represents a query sent to the chatbot
type ChatbotQuery struct {
	Query string `json:"query" binding:"required"`
}

// ChatbotResponse represents the response from the chatbot
type ChatbotResponse struct {
	Response string `json:"response"`
	Books    []Book `json:"books,omitempty"`
}
