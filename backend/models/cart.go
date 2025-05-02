package models

// CartItem represents an item in a shopping cart
type CartItem struct {
	ID             int     `json:"id"`
	Title          string  `json:"title"` 
	Author         string  `json:"author"`
	Price          float64 `json:"price"`
	SellerID       int     `json:"seller_id"`
	SellerUsername string  `json:"seller_username"`
	ImageURL       string  `json:"image_url"`
	Quantity       int     `json:"quantity"`
}

// Order represents a complete order
type Order struct {
	ID          int     `json:"id"`
	UserID      int     `json:"user_id"`
	TotalAmount float64 `json:"total_amount"`
	Status      string  `json:"status"` // pending, paid, shipped, completed, cancelled
	CreatedAt   string  `json:"created_at"`
	UpdatedAt   string  `json:"updated_at"`
}

// OrderItem represents an item within an order
type OrderItem struct {
	ID        int     `json:"id"`
	OrderID   int     `json:"order_id"`
	BookID    int     `json:"book_id"`
	Title     string  `json:"title"`
	Price     float64 `json:"price"`
	Quantity  int     `json:"quantity"`
	SellerID  int     `json:"seller_id"`
	Subtotal  float64 `json:"subtotal"`
	CreatedAt string  `json:"created_at"`
}
