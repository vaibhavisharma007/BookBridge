package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"reselling-app/backend/db"
	"reselling-app/backend/handlers"
	"reselling-app/backend/middleware"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all connections for simplicity
	},
}

func main() {
	// Initialize database connection
	if err := db.InitDB(); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Set up Gin router
	router := gin.Default()

	// Configure CORS
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Serve static files from frontend directory
	router.Static("/static", "./frontend")

	// Auth routes
	auth := router.Group("/api/auth")
	{
		auth.POST("/register", handlers.Register)
		auth.POST("/login", handlers.Login)
	}

	// Book routes
	books := router.Group("/api/books")
	{
		books.GET("", handlers.GetAllBooks)
		books.GET("/:id", handlers.GetBook)
		books.POST("", middleware.AuthMiddleware(), handlers.AddBook)
		books.DELETE("/:id", middleware.AuthMiddleware(), handlers.DeleteBook)
		books.GET("/recommendations", middleware.AuthMiddleware(), handlers.GetRecommendedBooks)
	}

	// Chatbot route
	router.POST("/api/chatbot", handlers.ChatbotResponse)

	// WebSocket handler for chat
	router.GET("/ws/chat/:bookId", func(c *gin.Context) {
		handlers.HandleChatConnection(c.Writer, c.Request, c.Param("bookId"), upgrader)
	})

	// Determine port for server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}

	// Start server
	log.Printf("Server starting on port %s...", port)
	if err := router.Run("0.0.0.0:" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
