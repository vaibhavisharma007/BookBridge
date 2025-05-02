package main

import (
        "log"
        "net/http"
        "os"
        "strings"

        "github.com/gin-contrib/cors"
        "github.com/gin-gonic/gin"
        "github.com/gorilla/websocket"
        "reselling-app/db"
        "reselling-app/handlers"
        "reselling-app/middleware"
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

        // Use the router to set up routes for API calls
        // For simplicity, let's set up a very basic file server to serve the frontend
        
        // Create a simple handler function to output debug info and serve files
        simpleIndexHandler := func(w http.ResponseWriter, r *http.Request) {
            log.Printf("Received request for path: %s", r.URL.Path)
            
            // Get the current working directory
            workDir, err := os.Getwd()
            if err != nil {
                log.Printf("Error getting working directory: %v", err)
                http.Error(w, "Internal Server Error", http.StatusInternalServerError)
                return
            }
            
            // Since we're in the backend directory, we need to go up one level
            // to get to the project root where the frontend directory is located
            projectRoot := workDir
            if strings.HasSuffix(workDir, "/backend") {
                projectRoot = workDir[:len(workDir)-len("/backend")]
            }
            
            // Default to index.html for root path
            path := r.URL.Path
            if path == "/" || path == "" {
                path = "/index.html"
            }
            
            filePath := projectRoot + "/frontend" + path
            
            // Check if file exists
            _, err = os.Stat(filePath)
            if os.IsNotExist(err) {
                log.Printf("File not found: %s", filePath)
                
                // If it's an HTML request, serve index.html instead
                if !strings.HasPrefix(path, "/api/") && (!strings.Contains(path, ".") ||
                   strings.HasSuffix(path, ".html")) {
                    log.Printf("Serving index.html instead")
                    http.ServeFile(w, r, projectRoot+"/frontend/index.html")
                    return
                }
                
                http.NotFound(w, r)
                return
            }
            
            log.Printf("Serving file: %s", filePath)
            http.ServeFile(w, r, filePath)
        }
        
        // Set up API routes first
        // Then set up a wildcard handler for all non-API routes

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
                books.POST("/predict-price", handlers.PredictPrice)
        }

        // Chatbot route
        router.POST("/api/chatbot", handlers.ChatbotResponse)
        
        // Chat routes
        chats := router.Group("/api/chats")
        {
                chats.Use(middleware.AuthMiddleware())
                chats.GET("", handlers.GetUserChats)
                chats.GET("/:id", handlers.GetChatMessages)
        }

        // WebSocket handler for chat
        router.GET("/ws/chat/:bookId", func(c *gin.Context) {
                handlers.HandleChatConnection(c.Writer, c.Request, c.Param("bookId"), upgrader)
        })
        
        // Add explicit routes for common files
        router.GET("/", func(c *gin.Context) {
            simpleIndexHandler(c.Writer, c.Request)
        })
        
        router.GET("/index.html", func(c *gin.Context) {
            simpleIndexHandler(c.Writer, c.Request)
        })
        
        router.GET("/login.html", func(c *gin.Context) {
            simpleIndexHandler(c.Writer, c.Request)
        })
        
        router.GET("/register.html", func(c *gin.Context) {
            simpleIndexHandler(c.Writer, c.Request)
        })
        
        router.GET("/book-detail.html", func(c *gin.Context) {
            simpleIndexHandler(c.Writer, c.Request)
        })
        
        router.GET("/seller-dashboard.html", func(c *gin.Context) {
            simpleIndexHandler(c.Writer, c.Request)
        })
        
        router.GET("/chat.html", func(c *gin.Context) {
            simpleIndexHandler(c.Writer, c.Request)
        })
        
        // Static file directories
        router.GET("/css/*filepath", func(c *gin.Context) {
            simpleIndexHandler(c.Writer, c.Request)
        })
        
        router.GET("/js/*filepath", func(c *gin.Context) {
            simpleIndexHandler(c.Writer, c.Request)
        })
        
        router.GET("/images/*filepath", func(c *gin.Context) {
            simpleIndexHandler(c.Writer, c.Request)
        })

        // Add a catch-all handler for all non-API routes
        // This needs to be AFTER all other routes
        router.NoRoute(func(c *gin.Context) {
            // Forward the request to our simple handler
            simpleIndexHandler(c.Writer, c.Request)
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
