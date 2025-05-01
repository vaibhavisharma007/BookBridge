from flask import Flask, request, jsonify
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestRegressor
import psycopg2
import psycopg2.extras
import re
import os

app = Flask(__name__)

# A simple model for book price prediction
class BookPricePredictor:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(max_features=1000)
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.is_trained = False
        
        # Create synthetic training data since we don't have actual data
        self._create_synthetic_data()
        self._train_model()
    
    def _create_synthetic_data(self):
        # Creating a synthetic dataset for demonstration
        titles = [
            "The Great Gatsby", "To Kill a Mockingbird", "1984", "Pride and Prejudice",
            "The Catcher in the Rye", "Animal Farm", "Lord of the Flies", "The Hobbit",
            "Brave New World", "Fahrenheit 451", "Jane Eyre", "Wuthering Heights",
            "The Grapes of Wrath", "The Old Man and the Sea", "Moby Dick",
            "Crime and Punishment", "War and Peace", "The Odyssey", "The Iliad",
            "Don Quixote", "Les Misérables", "Anna Karenina", "Ulysses",
            "The Divine Comedy", "One Hundred Years of Solitude", "Hamlet",
            "Frankenstein", "The Picture of Dorian Gray", "Alice's Adventures in Wonderland",
            "Little Women", "The Brothers Karamazov", "The Count of Monte Cristo",
            "A Tale of Two Cities", "Great Expectations", "Dracula", "The Scarlet Letter",
            "The Adventures of Huckleberry Finn", "Gone with the Wind", "The Alchemist"
        ]
        
        authors = [
            "F. Scott Fitzgerald", "Harper Lee", "George Orwell", "Jane Austen",
            "J.D. Salinger", "George Orwell", "William Golding", "J.R.R. Tolkien",
            "Aldous Huxley", "Ray Bradbury", "Charlotte Brontë", "Emily Brontë",
            "John Steinbeck", "Ernest Hemingway", "Herman Melville",
            "Fyodor Dostoevsky", "Leo Tolstoy", "Homer", "Homer",
            "Miguel de Cervantes", "Victor Hugo", "Leo Tolstoy", "James Joyce",
            "Dante Alighieri", "Gabriel García Márquez", "William Shakespeare",
            "Mary Shelley", "Oscar Wilde", "Lewis Carroll",
            "Louisa May Alcott", "Fyodor Dostoevsky", "Alexandre Dumas",
            "Charles Dickens", "Charles Dickens", "Bram Stoker", "Nathaniel Hawthorne",
            "Mark Twain", "Margaret Mitchell", "Paulo Coelho"
        ]
        
        genres = [
            "Fiction", "Fiction", "Dystopian", "Romance",
            "Fiction", "Political Satire", "Fiction", "Fantasy",
            "Dystopian", "Dystopian", "Gothic", "Gothic",
            "Historical Fiction", "Fiction", "Adventure",
            "Philosophical Fiction", "Historical Fiction", "Epic", "Epic",
            "Satire", "Historical Fiction", "Realist Fiction", "Modernist",
            "Epic Poetry", "Magical Realism", "Tragedy", 
            "Gothic", "Gothic", "Fantasy",
            "Coming of Age", "Philosophical Fiction", "Adventure",
            "Historical Fiction", "Coming of Age", "Gothic", "Romantic",
            "Adventure", "Historical Fiction", "Fantasy"
        ]
        
        conditions = ["New", "Like New", "Very Good", "Good", "Acceptable", "Poor"]
        
        # Generate random data
        np.random.seed(42)
        n_samples = 1000
        
        data = {
            'title': np.random.choice(titles, n_samples),
            'author': [authors[titles.index(t)] for t in data['title']] if 'title' in data else np.random.choice(authors, n_samples),
            'genre': [genres[titles.index(t)] for t in data['title']] if 'title' in data else np.random.choice(genres, n_samples),
            'condition': np.random.choice(conditions, n_samples),
            'price': np.zeros(n_samples)
        }
        
        # Set prices based on conditions and genres with some randomness
        condition_values = {'New': 25, 'Like New': 20, 'Very Good': 15, 'Good': 10, 'Acceptable': 5, 'Poor': 2}
        genre_multipliers = {
            'Fiction': 1.0, 'Romance': 0.9, 'Dystopian': 1.2, 'Fantasy': 1.3, 
            'Political Satire': 1.1, 'Gothic': 1.15, 'Historical Fiction': 1.25,
            'Adventure': 1.1, 'Philosophical Fiction': 1.3, 'Epic': 1.2,
            'Satire': 1.05, 'Realist Fiction': 1.0, 'Modernist': 1.2, 
            'Epic Poetry': 1.3, 'Magical Realism': 1.25, 'Tragedy': 1.1,
            'Coming of Age': 0.95, 'Romantic': 0.9
        }
        
        for i in range(n_samples):
            base_price = condition_values[data['condition'][i]]
            genre_mult = genre_multipliers.get(data['genre'][i], 1.0)
            author_popularity = 1.0 + (authors.index(data['author'][i]) % 10) / 10  # Some authors more valuable
            
            # Add randomness
            random_factor = np.random.normal(1.0, 0.2)  # Normal distribution around 1.0
            data['price'][i] = base_price * genre_mult * author_popularity * random_factor
        
        self.data = pd.DataFrame(data)
    
    def _train_model(self):
        # Text feature: combine title, author and genre
        self.data['text_features'] = self.data['title'] + ' ' + self.data['author'] + ' ' + self.data['genre']
        
        # Transform text to TF-IDF features
        X_text = self.vectorizer.fit_transform(self.data['text_features'])
        
        # One-hot encode the condition
        X_condition = pd.get_dummies(self.data['condition'], prefix='condition')
        
        # Combine all features
        X = np.hstack((X_text.toarray(), X_condition.values))
        y = self.data['price']
        
        # Train the model
        self.model.fit(X, y)
        self.is_trained = True
        
        # Save condition columns for prediction
        self.condition_columns = X_condition.columns
    
    def predict(self, title, author, genre, condition):
        if not self.is_trained:
            self._train_model()
        
        # Create text feature
        text_feature = title + ' ' + author + ' ' + genre
        X_text = self.vectorizer.transform([text_feature])
        
        # Create one-hot encoded condition
        condition_one_hot = np.zeros(len(self.condition_columns))
        for i, col in enumerate(self.condition_columns):
            if col == f'condition_{condition}':
                condition_one_hot[i] = 1
                break
        
        # Combine features
        X = np.hstack((X_text.toarray(), condition_one_hot.reshape(1, -1)))
        
        # Predict price
        predicted_price = self.model.predict(X)[0]
        
        # Add a small random factor to make it more realistic
        random_factor = np.random.uniform(0.95, 1.05)
        predicted_price *= random_factor
        
        # Ensure a minimum price
        predicted_price = max(5.0, predicted_price)
        
        return round(predicted_price, 2)

# Initialize the predictor
price_predictor = BookPricePredictor()

@app.route('/predict-price', methods=['POST'])
def predict_price():
    data = request.json
    
    # Extract data
    title = data.get('title', '')
    author = data.get('author', '')
    genre = data.get('genre', '')
    condition = data.get('condition', 'Good')  # Default to Good if not provided
    
    # Predict price
    predicted_price = price_predictor.predict(title, author, genre, condition)
    
    return jsonify({'predicted_price': predicted_price})

if __name__ == '__main__':
    # Run the Flask app
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port)
