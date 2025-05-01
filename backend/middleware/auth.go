package middleware

import (
        "net/http"
        "strings"

        "github.com/gin-gonic/gin"
        "reselling-app/utils"
)

// AuthMiddleware validates JWT token and sets user info in Gin context
func AuthMiddleware() gin.HandlerFunc {
        return func(c *gin.Context) {
                // Get Authorization header
                authHeader := c.GetHeader("Authorization")
                if authHeader == "" {
                        c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
                        c.Abort()
                        return
                }

                // Check if header has Bearer prefix
                splitToken := strings.Split(authHeader, "Bearer ")
                if len(splitToken) != 2 {
                        c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization format"})
                        c.Abort()
                        return
                }

                // Get token without Bearer prefix
                tokenString := splitToken[1]

                // Validate token
                claims, err := utils.ValidateToken(tokenString)
                if err != nil {
                        c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
                        c.Abort()
                        return
                }

                // Set user info in context
                c.Set("userID", claims.UserID)
                c.Set("username", claims.Username)
                c.Set("userRole", claims.Role)

                c.Next()
        }
}

// RoleMiddleware checks if user has specific role
func RoleMiddleware(role string) gin.HandlerFunc {
        return func(c *gin.Context) {
                userRole, exists := c.Get("userRole")
                if !exists {
                        c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
                        c.Abort()
                        return
                }

                if userRole != role {
                        c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
                        c.Abort()
                        return
                }

                c.Next()
        }
}
