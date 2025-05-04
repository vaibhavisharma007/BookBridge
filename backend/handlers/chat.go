package handlers

import (
	"database/sql"
	"log"
	"net/http"
	"strconv"
	"time"

	"reselling-app/db"
	"reselling-app/models"
	"reselling-app/utils"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all connections for simplicity
	},
}

// Active connections by chat ID
var activeConnections = make(map[int]map[*websocket.Conn]bool)

// --- Community Chat ---
var communityClients = make(map[*websocket.Conn]bool)

// HandleWebSocket handles WebSocket connections for chat
func HandleWebSocket(c *gin.Context) {
	// Upgrade HTTP connection to WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}
	defer conn.Close()

	// Get user authentication from query parameters
	token := c.Query("token")
	if token == "" {
		log.Printf("No token provided")
		conn.WriteJSON(map[string]interface{}{"type": "error", "content": "Authentication required"})
		return
	}

	// Validate token and get user info
	claims, err := utils.ValidateToken(token)
	if err != nil {
		log.Printf("Invalid token: %v", err)
		conn.WriteJSON(map[string]interface{}{"type": "error", "content": "Invalid authentication"})
		return
	}
	userID := claims.UserID
	role := claims.Role

	// Get book and seller info from query parameters
	bookIDStr := c.Query("book_id")
	sellerIDStr := c.Query("seller_id")

	var bookID, sellerID int
	var bookTitle string

	if bookIDStr != "" && sellerIDStr != "" {
		// Convert IDs to integers
		bookID, err = strconv.Atoi(bookIDStr)
		if err != nil {
			log.Printf("Invalid book ID: %v", err)
			conn.WriteJSON(map[string]interface{}{"type": "error", "content": "Invalid book ID"})
			return
		}

		sellerID, err = strconv.Atoi(sellerIDStr)
		if err != nil {
			log.Printf("Invalid seller ID: %v", err)
			conn.WriteJSON(map[string]interface{}{"type": "error", "content": "Invalid seller ID"})
			return
		}

		// Get book details
		err = db.DB.QueryRow("SELECT title, seller_id FROM books WHERE id = $1", bookID).Scan(&bookTitle, &sellerID)
		if err != nil {
			if err == sql.ErrNoRows {
				log.Printf("Book not found: %d", bookID)
				conn.WriteJSON(map[string]interface{}{"type": "error", "content": "Book not found"})
				return
			}
			log.Printf("Database error fetching book details: %v", err)
			conn.WriteJSON(map[string]interface{}{"type": "error", "content": "Database error"})
			return
		}

		log.Printf("Book found - ID: %d, Title: %s, Seller ID: %d", bookID, bookTitle, sellerID)

		// Check if user is either the seller or a buyer
		if role == "seller" && userID != sellerID {
			conn.WriteJSON(map[string]interface{}{"type": "error", "content": "You are not the seller of this book"})
			return
		}

		// Get or create chat session
		var chatID int

		log.Printf("Processing chat for user ID: %d, role: %s, book ID: %d, seller ID: %d", userID, role, bookID, sellerID)

		if role == "buyer" {
			// Check if chat already exists
			err = db.DB.QueryRow(
				"SELECT id FROM chats WHERE book_id = $1 AND buyer_id = $2 AND seller_id = $3",
				bookID, userID, sellerID,
			).Scan(&chatID)

			if err != nil {
				if err == sql.ErrNoRows {
					// Create new chat session
					log.Printf("Creating new chat for buyer ID: %d with seller ID: %d about book ID: %d", userID, sellerID, bookID)
					err = db.DB.QueryRow(
						"INSERT INTO chats (book_id, buyer_id, seller_id) VALUES ($1, $2, $3) RETURNING id",
						bookID, userID, sellerID,
					).Scan(&chatID)
					if err != nil {
						log.Printf("Database error creating chat: %v", err)
						conn.WriteJSON(map[string]interface{}{"type": "error", "content": "Failed to create chat session"})
						return
					}
					log.Printf("Created new chat with ID: %d", chatID)

					// Notify the client that a new chat was created
					conn.WriteJSON(map[string]interface{}{
						"type":       "chat_created",
						"chat_id":    chatID,
						"book_id":    bookID,
						"book_title": bookTitle,
						"seller_id":  sellerID,
					})
				} else {
					log.Printf("Database error checking chat: %v", err)
					conn.WriteJSON(map[string]interface{}{"type": "error", "content": "Database error"})
					return
				}
			} else {
				log.Printf("Found existing chat with ID: %d", chatID)
			}
		}
	}

	// Handle incoming messages
	for {
		var msg models.WebSocketMessage
		err := conn.ReadJSON(&msg)
		if err != nil {
			log.Printf("Error reading message: %v", err)
			break
		}

		// Process message based on type
		switch msg.Type {
		case "message":
			// Save message to database
			err = db.DB.QueryRow(
				"INSERT INTO messages (chat_id, sender_id, content) VALUES ($1, $2, $3) RETURNING id",
				msg.ChatID, userID, msg.Content,
			).Scan(&msg.ID)
			if err != nil {
				log.Printf("Error saving message: %v", err)
				conn.WriteJSON(map[string]interface{}{"type": "error", "content": "Failed to send message"})
				continue
			}

			// Broadcast message to all connected clients in the chat
			msg.SenderID = userID
			msg.Timestamp = time.Now()
			broadcastToChat(msg.ChatID, msg)

		case "typing":
			// Handle typing indicator
			// You can implement this if needed

		default:
			log.Printf("Unknown message type: %s", msg.Type)
		}
	}
}

// min returns the minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// Helper function to get chat history
func getChatHistory(chatID int) ([]models.ChatMessage, error) {
	rows, err := db.DB.Query(`
			SELECT m.id, m.chat_id, m.sender_id, u.username, m.content, m.created_at
			FROM messages m
			JOIN users u ON m.sender_id = u.id
			WHERE m.chat_id = $1
			ORDER BY m.created_at ASC`,
		chatID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []models.ChatMessage
	for rows.Next() {
		var msg models.ChatMessage
		if err := rows.Scan(
			&msg.ID, &msg.ChatID, &msg.SenderID, &msg.SenderName, &msg.Content, &msg.CreatedAt,
		); err != nil {
			log.Printf("Error scanning message row: %v", err)
			continue
		}
		messages = append(messages, msg)
	}

	return messages, nil
}

// Helper function to send error message to client
func sendErrorMessage(conn *websocket.Conn, errorMsg string) {
	errMsg := models.WebSocketMessage{
		Type:      "error",
		Content:   errorMsg,
		Timestamp: time.Now(),
	}
	if err := conn.WriteJSON(errMsg); err != nil {
		log.Printf("Error sending error message: %v", err)
	}
}

// Helper function to broadcast message to all clients in a chat
func broadcastToChat(chatID int, message models.WebSocketMessage) {
	if connections, ok := activeConnections[chatID]; ok {
		for conn := range connections {
			if err := conn.WriteJSON(message); err != nil {
				log.Printf("Broadcast error: %v", err)
				conn.Close()
				delete(connections, conn)
			}
		}
	}
}

// GetUserChats returns all chat sessions for a user
func GetUserChats(c *gin.Context) {
	userID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	var rows *sql.Rows
	var err error

	// Different query based on user role
	if userRole == "buyer" {
		rows, err = db.DB.Query(`
				SELECT c.id, c.book_id, b.title, c.buyer_id, u1.username, c.seller_id, u2.username, c.created_at
				FROM chats c
				JOIN books b ON c.book_id = b.id
				JOIN users u1 ON c.buyer_id = u1.id
				JOIN users u2 ON c.seller_id = u2.id
				WHERE c.buyer_id = $1
				ORDER BY c.created_at DESC`,
			userID,
		)
	} else {
		rows, err = db.DB.Query(`
				SELECT c.id, c.book_id, b.title, c.buyer_id, u1.username, c.seller_id, u2.username, c.created_at
				FROM chats c
				JOIN books b ON c.book_id = b.id
				JOIN users u1 ON c.buyer_id = u1.id
				JOIN users u2 ON c.seller_id = u2.id
				WHERE c.seller_id = $1
				ORDER BY c.created_at DESC`,
			userID,
		)
	}

	if err != nil {
		log.Printf("Database error fetching chats: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch chat sessions"})
		return
	}
	defer rows.Close()

	var chats []models.ChatSession
	for rows.Next() {
		var chat models.ChatSession
		if err := rows.Scan(
			&chat.ChatID, &chat.BookID, &chat.BookTitle, &chat.BuyerID, &chat.BuyerName,
			&chat.SellerID, &chat.SellerName, &chat.CreatedAt,
		); err != nil {
			log.Printf("Error scanning chat row: %v", err)
			continue
		}

		// Get last message preview
		var lastMessage models.ChatMessage
		err := db.DB.QueryRow(`
				SELECT m.id, m.sender_id, u.username, m.content, m.created_at
				FROM messages m
				JOIN users u ON m.sender_id = u.id
				WHERE m.chat_id = $1
				ORDER BY m.created_at DESC
				LIMIT 1`,
			chat.ChatID,
		).Scan(
			&lastMessage.ID, &lastMessage.SenderID, &lastMessage.SenderName,
			&lastMessage.Content, &lastMessage.CreatedAt,
		)
		if err == nil {
			chat.Messages = []models.ChatMessage{lastMessage}
		}

		chats = append(chats, chat)
	}

	c.JSON(http.StatusOK, chats)
}

// GetChatMessages returns all messages for a specific chat
func GetChatMessages(c *gin.Context) {
	userID, _ := c.Get("userID")
	log.Printf("[DEBUG] GetChatMessages called by userID: %v", userID)
	// Get chat ID from URL
	chatID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		log.Printf("[ERROR] Invalid chat ID: %s", c.Param("id"))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chat ID"})
		return
	}
	log.Printf("[DEBUG] Checking access for userID: %v to chatID: %d", userID, chatID)
	// Verify the user is part of this chat
	var count int
	err = db.DB.QueryRow(
		"SELECT COUNT(*) FROM chats WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2)",
		chatID, userID,
	).Scan(&count)
	if err != nil {
		log.Printf("[ERROR] Database error checking chat access: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if count == 0 {
		log.Printf("[ERROR] User ID %v attempted to access chat ID %d without permission", userID, chatID)
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to view this chat"})
		return
	}
	log.Printf("[DEBUG] User ID %v has permission to access chat ID %d", userID, chatID)
	// Get chat messages
	messages, err := getChatHistory(chatID)
	if err != nil {
		log.Printf("[ERROR] Error fetching chat messages: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch chat messages"})
		return
	}
	log.Printf("[DEBUG] Found %d messages for chat ID %d", len(messages), chatID)
	// Mark messages as from self or other
	for i := range messages {
		messages[i].IsSelfSender = messages[i].SenderID == userID.(int)
	}
	c.JSON(http.StatusOK, messages)
}

// HandleCommunityWebSocket handles WebSocket connections for community chat
func HandleCommunityWebSocket(c *gin.Context) {
	// Upgrade HTTP connection to WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("[COMMUNITY] Failed to upgrade connection: %v", err)
		return
	}
	defer conn.Close()

	// Authenticate user
	token := c.Query("token")
	if token == "" {
		conn.WriteJSON(map[string]interface{}{"type": "error", "content": "Authentication required"})
		return
	}
	claims, err := utils.ValidateToken(token)
	if err != nil {
		conn.WriteJSON(map[string]interface{}{"type": "error", "content": "Invalid authentication"})
		return
	}
	userID := claims.UserID
	username := claims.Username

	// Register client
	communityClients[conn] = true
	log.Printf("[COMMUNITY] User %s (ID %d) joined community chat", username, userID)
	defer func() {
		delete(communityClients, conn)
		log.Printf("[COMMUNITY] User %s (ID %d) left community chat", username, userID)
	}()

	// Listen for messages
	for {
		var msg models.WebSocketMessage
		err := conn.ReadJSON(&msg)
		if err != nil {
			log.Printf("[COMMUNITY] Error reading message: %v", err)
			break
		}
		if msg.Type == "message" {
			msg.SenderID = userID
			msg.SenderName = username
			msg.Timestamp = time.Now()
			broadcastCommunityMessage(msg)
		}
	}
}

func broadcastCommunityMessage(msg models.WebSocketMessage) {
	for conn := range communityClients {
		if err := conn.WriteJSON(msg); err != nil {
			log.Printf("[COMMUNITY] Broadcast error: %v", err)
			conn.Close()
			delete(communityClients, conn)
		}
	}
}
