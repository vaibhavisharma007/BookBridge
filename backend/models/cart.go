package models

// CartItem represents an item in the shopping cart
type CartItem struct {
	ID       int    `json:"id"`       // Book ID
	Title    string `json:"title"`    // Book title
	Author   string `json:"author"`   // Book author
	Price    float64 `json:"price"`    // Book price
	Quantity int    `json:"quantity"` // Quantity in cart
}
