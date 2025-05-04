package utils

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"strings"
)

const (
	geminiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
)

// GeminiClient represents a client for the Gemini API
type GeminiClient struct {
	APIKey string
}

// GeminiRequest represents a request to the Gemini API
type GeminiRequest struct {
	Contents []Content `json:"contents"`
}

// Content represents the content of a Gemini request
type Content struct {
	Parts []Part `json:"parts"`
}

// Part represents a part of the content in a Gemini request
type Part struct {
	Text string `json:"text"`
}

// GeminiResponse represents a response from the Gemini API
type GeminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
}

// NewGeminiClient creates a new Gemini client
func NewGeminiClient() (*GeminiClient, error) {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("GEMINI_API_KEY environment variable is not set")
	}
	return &GeminiClient{APIKey: apiKey}, nil
}

// GenerateContent sends a request to the Gemini API to generate content
func (c *GeminiClient) GenerateContent(ctx context.Context, prompt string) (string, error) {
	// Create the request body
	requestBody := GeminiRequest{
		Contents: []Content{
			{
				Parts: []Part{
					{
						Text: prompt,
					},
				},
			},
		},
	}

	// Convert the request body to JSON
	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request body: %v", err)
	}

	// Create the HTTP request
	url := fmt.Sprintf("%s?key=%s", geminiEndpoint, c.APIKey)
	req, err := http.NewRequestWithContext(ctx, "POST", url, strings.NewReader(string(jsonBody)))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")

	// Send the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to send request: %v", err)
	}
	defer resp.Body.Close()

	// Read the response
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response body: %v", err)
	}

	// Check if the response is successful
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API request failed with status code %d: %s", resp.StatusCode, string(body))
	}

	// Parse the response
	var geminiResponse GeminiResponse
	if err := json.Unmarshal(body, &geminiResponse); err != nil {
		return "", fmt.Errorf("failed to unmarshal response: %v", err)
	}

	// Extract the generated text
	if len(geminiResponse.Candidates) == 0 || len(geminiResponse.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("no content generated")
	}

	return geminiResponse.Candidates[0].Content.Parts[0].Text, nil
}

// CreateBookRecommendationPrompt creates a prompt for book recommendations
func CreateBookRecommendationPrompt(userQuery string, userID int) string {
	return fmt.Sprintf(`
**System Instructions:**
You are BookBridge's helpful AI book recommendation assistant. Your goal is to understand the user's reading preferences and recommend relevant books available in a second-hand marketplace context (mentioning genres, authors, or themes). Be friendly, engaging, and focus specifically on recommending books or asking clarifying questions to narrow down recommendations. Do not discuss topics unrelated to books or BookBridge. Do not invent book titles or authors; speak generally about types of books based on the user's description.

**User's Book Preference:**
%s

**Task:**
Based on the user's preference, suggest types of books or authors they might enjoy. Ask clarifying questions if needed to provide better recommendations.
`, userQuery)
}
