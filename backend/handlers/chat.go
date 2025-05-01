package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"reselling-app/backend/db"
	"reselling-app/backend/models"
	"reselling-app/backend/utils"
)

// Active connections by chat ID
var activeConnections = make(map[int]map[*websocket.Conn]bool)

// HandleChatConnection manages WebSocket connections for real-time chat
func HandleChatConnection(w http.ResponseWriter, r *http.Request, bookIDStr string, upgrader websocket.Upgrader) {
	// Get book ID from URL parameter
	bookID, err := strconv.Atoi(bookIDStr)
	if err != nil {
		http.Error(w, "Invalid book ID", http.StatusBadRequest)
		return
	}

	// Extract JWT token from the Authorization header
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		http.Error(w, "Authorization header required", http.StatusUnauthorized)
		return
	}

	// Remove "Bearer " prefix
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		authHeader = authHeader[7:]
	}

	// Validate token
	claims, err := utils.ValidateToken(authHeader)
	if err != nil {
		http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
		return
	}

	userID := claims.UserID
	username := claims.Username
	role := claims.Role

	// Get book details to verify it exists and get seller ID
	var sellerID int
	var bookTitle string
	err = db.DB.QueryRow("SELECT seller_id, title FROM books WHERE id = $1", bookID).Scan(&sellerID, &bookTitle)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Book not found", http.StatusNotFound)
			return
		}
		log.Printf("Database error fetching book details: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Check if user is either the seller or a buyer
	if role == "seller" && userID != sellerID {
		http.Error(w, "You are not the seller of this book", http.StatusForbidden)
		return
	}

	// Get or create chat session
	var chatID int
	if role == "buyer" {
		// Check if chat already exists
		err = db.DB.QueryRow(
			"SELECT id FROM chats WHERE book_id = $1 AND buyer_id = $2 AND seller_id = $3",
			bookID, userID, sellerID,
		).Scan(&chatID)

		if err != nil {
			if err == sql.ErrNoRows {
				// Create new chat session
				err = db.DB.QueryRow(
					"INSERT INTO chats (book_id, buyer_id, seller_id) VALUES ($1, $2, $3) RETURNING id",
					bookID, userID, sellerID,
				).Scan(&chatID)
				if err != nil {
					log.Printf("Database error creating chat: %v", err)
					http.Error(w, "Failed to create chat session", http.StatusInternalServerError)
					return
				}
			} else {
				log.Printf("Database error checking chat: %v", err)
				http.Error(w, "Database error", http.StatusInternalServerError)
				return
			}
		}
	} else {
		// For seller, we need the buyer ID from the request
		buyerIDStr := r.URL.Query().Get("buyer_id")
		if buyerIDStr == "" {
			http.Error(w, "Buyer ID required", http.StatusBadRequest)
			return
		}

		buyerID, err := strconv.Atoi(buyerIDStr)
		if err != nil {
			http.Error(w, "Invalid buyer ID", http.StatusBadRequest)
			return
		}

		// Get the chat ID for this seller-buyer-book combination
		err = db.DB.QueryRow(
			"SELECT id FROM chats WHERE book_id = $1 AND buyer_id = $2 AND seller_id = $3",
			bookID, buyerID, userID,
		).Scan(&chatID)

		if err != nil {
			if err == sql.ErrNoRows {
				http.Error(w, "Chat session not found", http.StatusNotFound)
				return
			}
			log.Printf("Database error checking chat: %v", err)
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
	}

	// Upgrade HTTP connection to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}
	defer conn.Close()

	// Register connection
	if activeConnections[chatID] == nil {
		activeConnections[chatID] = make(map[*websocket.Conn]bool)
	}
	activeConnections[chatID][conn] = true
	defer func() {
		delete(activeConnections[chatID], conn)
		if len(activeConnections[chatID]) == 0 {
			delete(activeConnections, chatID)
		}
	}()

	// Send chat history
	history, err := getChatHistory(chatID)
	if err != nil {
		log.Printf("Error fetching chat history: %v", err)
		sendErrorMessage(conn, "Failed to load chat history")
	} else {
		historyMsg := models.WebSocketMessage{
			Type:      "history",
			Timestamp: time.Now(),
			Data:      history,
		}
		if err := conn.WriteJSON(historyMsg); err != nil {
			log.Printf("Error sending chat history: %v", err)
			return
		}
	}

	// Main message handling loop
	for {
		// Read message from client
		_, msg, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		// Parse message
		var wsMessage models.WebSocketMessage
		if err := json.Unmarshal(msg, &wsMessage); err != nil {
			log.Printf("Error parsing WebSocket message: %v", err)
			sendErrorMessage(conn, "Invalid message format")
			continue
		}

		// Handle message based on type
		if wsMessage.Type == "message" {
			// Save message to database
			var messageID int
			err = db.DB.QueryRow(
				"INSERT INTO messages (chat_id, sender_id, content) VALUES ($1, $2, $3) RETURNING id",
				chatID, userID, wsMessage.Content,
			).Scan(&messageID)
			if err != nil {
				log.Printf("Database error saving message: %v", err)
				sendErrorMessage(conn, "Failed to save message")
				continue
			}

			// Broadcast message to all connected clients
			broadcastMsg := models.WebSocketMessage{
				Type:      "message",
				Content:   wsMessage.Content,
				SenderID:  userID,
				ChatID:    chatID,
				Timestamp: time.Now(),
				Data: map[string]interface{}{
					"sender_name": username,
					"message_id":  messageID,
				},
			}

			broadcastToChat(chatID, broadcastMsg)
		}
	}
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
	
	// Get chat ID from URL
	chatID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chat ID"})
		return
	}

	// Verify the user is part of this chat
	var count int
	err = db.DB.QueryRow(
		"SELECT COUNT(*) FROM chats WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2)",
		chatID, userID,
	).Scan(&count)
	if err != nil {
		log.Printf("Database error checking chat access: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if count == 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to view this chat"})
		return
	}

	// Get chat messages
	messages, err := getChatHistory(chatID)
	if err != nil {
		log.Printf("Error fetching chat messages: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch chat messages"})
		return
	}

	// Mark messages as from self or other
	for i := range messages {
		messages[i].IsSelfSender = messages[i].SenderID == userID.(int)
	}

	c.JSON(http.StatusOK, messages)
}
