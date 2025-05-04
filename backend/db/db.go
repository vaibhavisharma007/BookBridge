package db

import (
        "database/sql"
        "fmt"
        "log"
        "os"

        _ "github.com/lib/pq"
)

var DB *sql.DB

// InitDB initializes the database connection
func InitDB() error {
        // First check for DATABASE_URL which is provided by Replit
        databaseURL := os.Getenv("DATABASE_URL")
        var connStr string
        
        if databaseURL != "" {
                // Use the DATABASE_URL if available (Replit environment)
                connStr = databaseURL
                log.Println("Using DATABASE_URL for connection")
        } else {
                // Fall back to individual connection parameters if DATABASE_URL is not available
                var (
                        host     = os.Getenv("PGHOST")
                        port     = os.Getenv("PGPORT")
                        user     = os.Getenv("PGUSER")
                        password = os.Getenv("PGPASSWORD")
                        dbname   = os.Getenv("PGDATABASE")
                )

                // Fall back to default values if environment variables are not set
                if host == "" {
                        host = "localhost"
                }
                if port == "" {
                        port = "5432"
                }
                if user == "" {
                        user = "postgres"
                }
                if dbname == "" {
                        dbname = "bookreselling"
                }
                
                connStr = fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable", 
                        host, port, user, password, dbname)
                log.Println("Using individual connection parameters for database connection")
        }

        var err error
        DB, err = sql.Open("postgres", connStr)
        if err != nil {
                return err
        }

        if err = DB.Ping(); err != nil {
                return err
        }

        // Create necessary tables if they don't exist
        if err = createTables(); err != nil {
                return err
        }

        log.Println("Successfully connected to the database")
        return nil
}

// createTables creates all necessary tables in the database
func createTables() error {
        queries := []string{
                `CREATE TABLE IF NOT EXISTS users (
                        id SERIAL PRIMARY KEY,
                        username VARCHAR(50) UNIQUE NOT NULL,
                        email VARCHAR(100) UNIQUE NOT NULL,
                        password_hash VARCHAR(100) NOT NULL,
                        role VARCHAR(10) NOT NULL CHECK (role IN ('buyer', 'seller')),
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )`,
                `CREATE TABLE IF NOT EXISTS books (
                        id SERIAL PRIMARY KEY,
                        seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                        title VARCHAR(100) NOT NULL,
                        author VARCHAR(100) NOT NULL,
                        description TEXT,
                        price DECIMAL(10, 2) NOT NULL,
                        predicted_price DECIMAL(10, 2) NOT NULL,
                        image_url TEXT,
                        genre VARCHAR(50),
                        condition VARCHAR(20),
                        status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'sold', 'reserved')),
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )`,
                `CREATE TABLE IF NOT EXISTS chats (
                        id SERIAL PRIMARY KEY,
                        book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
                        buyer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                        seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )`,
                `CREATE TABLE IF NOT EXISTS messages (
                        id SERIAL PRIMARY KEY,
                        chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
                        sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                        content TEXT NOT NULL,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )`,
                `CREATE TABLE IF NOT EXISTS user_book_interactions (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                        book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
                        interaction_type VARCHAR(20) CHECK (interaction_type IN ('view', 'search', 'favorite')),
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )`,
                `CREATE TABLE IF NOT EXISTS chatbot_interactions (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                        query TEXT NOT NULL,
                        response TEXT NOT NULL,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )`,
        }

        for _, query := range queries {
                _, err := DB.Exec(query)
                if err != nil {
                        return err
                }
        }

        return nil
}
