package handlers

import (
        "fmt"
        "log"
        "net/http"
        "os"
        "strconv"

        "github.com/gin-gonic/gin"
        "github.com/stripe/stripe-go/v72"
        "github.com/stripe/stripe-go/v72/paymentintent"
        "reselling-app/models"
        "reselling-app/utils"
)

// InitStripe initializes the Stripe client with the API key
func InitStripe() {
        stripeKey := os.Getenv("STRIPE_SECRET_KEY")
        if stripeKey == "" {
                log.Println("Warning: STRIPE_SECRET_KEY environment variable not set. Stripe payments will not work.")
        }
        stripe.Key = stripeKey
}

// CreatePaymentIntent creates a new payment intent in Stripe
func CreatePaymentIntent(c *gin.Context) {
        // Validate authentication
        userID, err := utils.GetUserIDFromContext(c)
        if err != nil {
                c.JSON(http.StatusUnauthorized, gin.H{"error": "Please log in to complete this action."})
                return
        }

        // Parse request body
        var req struct {
                Amount    float64           `json:"amount"`
                Currency  string            `json:"currency"`
                CartItems []models.CartItem `json:"cart_items"`
        }

        if err := c.BindJSON(&req); err != nil {
                c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
                return
        }

        // Validate request
        if req.Amount <= 0 {
                c.JSON(http.StatusBadRequest, gin.H{"error": "Amount must be greater than 0"})
                return
        }

        if req.Currency == "" {
                // Default to INR if not specified
                req.Currency = "inr"
        }

        // Convert amount to cents/paisa (Stripe uses smallest currency unit)
        amountInSmallestUnit := int64(req.Amount * 100)

        // Create metadata map for the payment intent
        metadata := make(map[string]string)
        metadata["user_id"] = strconv.Itoa(userID)

        // Add cart item details to the metadata
        if len(req.CartItems) > 0 {
                for i, item := range req.CartItems {
                        metadata[fmt.Sprintf("item_%d_id", i)] = strconv.Itoa(item.ID)
                        metadata[fmt.Sprintf("item_%d_quantity", i)] = strconv.Itoa(item.Quantity)
                }
        }

        // Create payment intent params
        params := &stripe.PaymentIntentParams{
                Amount:   stripe.Int64(amountInSmallestUnit),
                Currency: stripe.String(req.Currency),
        }
        
        // Set the metadata
        params.AddMetadata("user_id", strconv.Itoa(userID))
        for k, v := range metadata {
                if k != "user_id" { // Already added above
                        params.AddMetadata(k, v)
                }
        }

        // Create the payment intent
        pi, err := paymentintent.New(params)
        if err != nil {
                log.Printf("Error creating payment intent: %v", err)
                c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create payment intent"})
                return
        }

        // Return the client secret to the client
        c.JSON(http.StatusOK, gin.H{
                "id":            pi.ID,
                "client_secret": pi.ClientSecret,
        })
}

// RecordPaymentSuccess records a successful payment
func RecordPaymentSuccess(c *gin.Context) {
        // Validate authentication
        userID, err := utils.GetUserIDFromContext(c)
        if err != nil {
                c.JSON(http.StatusUnauthorized, gin.H{"error": "Please log in to complete this action."})
                return
        }

        // Parse request body
        var req struct {
                PaymentIntentID string `json:"payment_intent_id"`
        }

        if err := c.BindJSON(&req); err != nil {
                c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
                return
        }

        // Validate request
        if req.PaymentIntentID == "" {
                c.JSON(http.StatusBadRequest, gin.H{"error": "Payment intent ID is required"})
                return
        }

        // Retrieve the payment intent from Stripe to verify its status
        pi, err := paymentintent.Get(req.PaymentIntentID, nil)
        if err != nil {
                log.Printf("Error retrieving payment intent: %v", err)
                c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify payment status"})
                return
        }

        // Check if the payment was successful
        if pi.Status != stripe.PaymentIntentStatusSucceeded {
                c.JSON(http.StatusBadRequest, gin.H{"error": "Payment has not been completed successfully"})
                return
        }

        // Verify that this payment was made by the current user
        paymentUserID, _ := strconv.Atoi(pi.Metadata["user_id"])
        if paymentUserID != userID {
                c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to record this payment"})
                return
        }

        // TODO: Update the database to mark the order as paid
        // This would include:
        // 1. Creating an order record
        // 2. Creating order line items
        // 3. Updating book status to 'sold'
        // 4. Sending email notifications

        // Return success
        c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Payment recorded successfully"})
}
