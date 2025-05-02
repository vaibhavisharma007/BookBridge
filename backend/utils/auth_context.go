package utils

import (
	"errors"
	"strconv"

	"github.com/gin-gonic/gin"
)

// GetUserIDFromContext extracts the user ID from the Gin context
// This function assumes the user ID was stored in the context by the auth middleware
func GetUserIDFromContext(c *gin.Context) (int, error) {
	userID, exists := c.Get("userID")
	if !exists {
		return 0, errors.New("user ID not found in context")
	}
	
	userIDInt, ok := userID.(int)
	if ok {
		return userIDInt, nil
	}
	
	// If the userID is stored as a string, try to convert it to int
	userIDStr, ok := userID.(string)
	if ok {
		id, err := strconv.Atoi(userIDStr)
		if err != nil {
			return 0, errors.New("invalid user ID format")
		}
		return id, nil
	}
	
	return 0, errors.New("user ID has invalid type")
}
