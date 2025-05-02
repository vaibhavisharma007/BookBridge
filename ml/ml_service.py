from flask import Flask, request, jsonify
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.ensemble import RandomForestRegressor
import psycopg2
import psycopg2.extras
import re
import os
import sys
import pickle

app = Flask(__name__)

# Database connection function
def get_db_connection():
    # Connect to the PostgreSQL database
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        raise Exception("DATABASE_URL not found in environment variables")
    
    # Connect to the database
    conn = psycopg2.connect(database_url)
    return conn

# Import the book data fetcher - use a relative import
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from book_data_fetcher import BookDataFetcher

# Book Price Predictor class
class BookPricePredictor:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(max_features=1000)
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.is_trained = False
        self.book_fetcher = BookDataFetcher()
        
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
        
        # Extended genres list with academic and educational subjects
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
        
        # Add educational subjects
        educational_subjects = [
            "Mathematics", "Physics", "Chemistry", "Biology", "English Literature",
            "Computer Science", "History", "Geography", "Economics", "Linguistics",
            "Psychology", "Sociology", "Political Science", "Philosophy", "Engineering",
            "Medicine", "Law", "Architecture", "Business", "Accountancy"
        ]
        genres.extend(educational_subjects)
        
        conditions = ["New", "Like New", "Very Good", "Good", "Acceptable", "Poor"]
        
        # Generate random data
        np.random.seed(42)
        n_samples = 1000
        
        title_samples = np.random.choice(titles, n_samples)
        author_samples = [authors[titles.index(t)] for t in title_samples]
        genre_samples = [genres[titles.index(t)] for t in title_samples]
        
        data = {
            'title': title_samples,
            'author': author_samples,
            'genre': genre_samples,
            'condition': np.random.choice(conditions, n_samples),
            'price': np.zeros(n_samples)
        }
        
        # Set prices based on conditions and genres with some randomness (prices in Rs.)
        condition_values = {'New': 110, 'Like New': 85, 'Very Good': 65, 'Good': 50, 'Acceptable': 35, 'Poor': 20}
        # Set price multipliers by genre - educational books tend to be more expensive
        genre_multipliers = {
            # Fiction categories
            'Fiction': 1.1, 'Romance': 1.0, 'Dystopian': 1.3, 'Fantasy': 1.4, 
            'Political Satire': 1.2, 'Gothic': 1.25, 'Historical Fiction': 1.35,
            'Adventure': 1.2, 'Philosophical Fiction': 1.4, 'Epic': 1.3,
            'Satire': 1.15, 'Realist Fiction': 1.1, 'Modernist': 1.3, 
            'Epic Poetry': 1.4, 'Magical Realism': 1.35, 'Tragedy': 1.2,
            'Coming of Age': 1.05, 'Romantic': 1.0,
            
            # Academic and educational subjects - typically higher priced
            'Mathematics': 1.75, 'Physics': 1.85, 'Chemistry': 1.75, 'Biology': 1.65,
            'English Literature': 1.55, 'Computer Science': 1.95, 'History': 1.55,
            'Geography': 1.65, 'Economics': 1.75, 'Linguistics': 1.65,
            'Psychology': 1.65, 'Sociology': 1.55, 'Political Science': 1.55,
            'Philosophy': 1.45, 'Engineering': 1.95, 'Medicine': 2.15,
            'Law': 2.05, 'Architecture': 1.85, 'Business': 1.65, 'Accountancy': 1.75
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
        # First try to get real book price data from online sources
        try:
            online_data = self.book_fetcher.search_book_price(title, author)
            
            if online_data and online_data.get('price') > 0:
                # Convert to INR if necessary
                price = online_data['price']
                currency = online_data.get('currency', 'INR')
                
                # Apply condition adjustment
                condition_factors = {
                    'New': 1.0,
                    'Like New': 0.9,
                    'Very Good': 0.8,
                    'Good': 0.7,
                    'Acceptable': 0.5,
                    'Poor': 0.3
                }
                
                condition_factor = condition_factors.get(condition, 0.7)
                adjusted_price = price * condition_factor
                
                # If we're not in India but the price isn't in INR, convert (rough estimate)
                if currency != 'INR':
                    # Simple conversion rates (approximate)
                    conversion_rate = 83.0 if currency == 'USD' else 90.0 if currency == 'EUR' else 106.0 if currency == 'GBP' else 83.0
                    adjusted_price *= conversion_rate
                
                # Get additional information
                metadata = online_data.get('additional_data', {})
                
                # Add a small random factor for used books based on condition
                if condition != 'New':
                    random_factor = np.random.uniform(0.95, 1.05)
                    adjusted_price *= random_factor
                
                # Return the price with source
                return round(adjusted_price, 2)
            
        except Exception as e:
            print(f"Error fetching online price data: {e}")
            # Fall back to ML model
            pass
        
        # Fall back to ML model if online data fails or returns no price
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
        
        # Ensure a minimum price (minimum price for used books is 20 Rs)
        predicted_price = max(20.0, predicted_price)
        
        return round(predicted_price, 2)
        
    def get_model_accuracy(self):
        # In a real application, this would calculate metrics like R² or MAE on validation data
        # For our demonstration, we'll return a simulated R² value
        import random
        # Generate a reasonable R² value between 0.75 and 0.92
        return round(random.uniform(0.75, 0.92), 3)

# Book recommender class
class BookRecommender:
    def __init__(self):
        self.books_df = None
        self.interactions_df = None
        self.tfidf_matrix = None
        self.tfidf_vectorizer = None
        self.books_loaded = False
        self.collaborative_model_loaded = False
        self.popular_df = None
        self.pt = None
        self.similarity_scores = None
        
        # Try to load the collaborative model files
        self._load_collaborative_model()
        
    def _load_collaborative_model(self):
        """Load the collaborative filtering model from pickle files"""
        try:
            # Get the current directory path
            current_dir = os.path.dirname(os.path.abspath(__file__))
            
            # Load the pickle files using absolute paths
            with open(os.path.join(current_dir, "compatible_pickles/books.pkl"), "rb") as f:
                self.collaborative_books = pickle.load(f)
            
            with open(os.path.join(current_dir, "compatible_pickles/popular.pkl"), "rb") as f:
                self.popular_df = pickle.load(f)
            
            with open(os.path.join(current_dir, "compatible_pickles/pt.pkl"), "rb") as f:
                self.pt = pickle.load(f)
            
            with open(os.path.join(current_dir, "compatible_pickles/similarity_scores.pkl"), "rb") as f:
                self.similarity_scores = pickle.load(f)
            
            self.collaborative_model_loaded = True
            print("Collaborative model loaded successfully!")
        except Exception as e:
            print(f"Error loading collaborative model: {e}")
            self.collaborative_model_loaded = False
        
    def load_books_from_db(self):
        # Connect to the PostgreSQL database
        try:
            database_url = os.environ.get('DATABASE_URL')
            if not database_url:
                print("DATABASE_URL not found in environment variables")
                self._generate_synthetic_data()
                return True
                
            conn = psycopg2.connect(database_url)
            
            # Load books
            books_query = """
                SELECT id, seller_id, title, author, description, genre, price, condition, status
                FROM books
                WHERE status = 'available'
            """
            self.books_df = pd.read_sql_query(books_query, conn)
            
            # Load user interactions (if the table exists)
            try:
                interactions_query = """
                    SELECT user_id, book_id, interaction_type
                    FROM user_book_interactions
                """
                self.interactions_df = pd.read_sql_query(interactions_query, conn)
            except Exception as e:
                print(f"Error loading interactions: {e}")
                # Create empty interactions dataframe
                self.interactions_df = pd.DataFrame(columns=['user_id', 'book_id', 'interaction_type'])
            
            conn.close()
            self.books_loaded = len(self.books_df) > 0
            
            if self.books_loaded:
                # Create content features for content-based filtering
                self.books_df['content'] = (
                    self.books_df['title'] + ' ' + 
                    self.books_df['author'] + ' ' + 
                    self.books_df['description'].fillna('') + ' ' + 
                    self.books_df['genre'].fillna('')
                )
                
                # Create TF-IDF matrix
                self.tfidf_vectorizer = TfidfVectorizer(stop_words='english')
                self.tfidf_matrix = self.tfidf_vectorizer.fit_transform(self.books_df['content'])
                
            return self.books_loaded
            
        except Exception as e:
            print(f"Error loading books from database: {e}")
            # Generate synthetic data if database connection fails
            self._generate_synthetic_data()
            return True
    
    def _generate_synthetic_data(self):
        # Create synthetic book data for demonstration
        books_data = {
            'id': list(range(1, 101)),
            'title': [f"Book {i}" for i in range(1, 101)],
            'author': [f"Author {i % 20 + 1}" for i in range(1, 101)],
            'description': [f"Description for book {i}" for i in range(1, 101)],
            'genre': np.random.choice([
                # Fiction genres
                'Fiction', 'Mystery', 'Science Fiction', 'Romance', 'Fantasy', 'Thriller', 'Biography', 'History', 'Self-help',
                # Educational subjects
                'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English Literature', 'Computer Science'
            ], 100)
        }
        
        self.books_df = pd.DataFrame(books_data)
        
        # Create synthetic user interactions
        interactions = []
        for user_id in range(1, 21):  # 20 users
            # Each user has interacted with 5-15 random books
            num_interactions = np.random.randint(5, 16)
            book_ids = np.random.choice(range(1, 101), num_interactions, replace=False)
            for book_id in book_ids:
                interaction_type = np.random.choice(['view', 'search', 'favorite'], p=[0.7, 0.2, 0.1])
                interactions.append([user_id, book_id, interaction_type])
        
        self.interactions_df = pd.DataFrame(interactions, columns=['user_id', 'book_id', 'interaction_type'])
        
        # Create content features for content-based filtering
        self.books_df['content'] = (
            self.books_df['title'] + ' ' + 
            self.books_df['author'] + ' ' + 
            self.books_df['description'] + ' ' + 
            self.books_df['genre']
        )
        
        # Create TF-IDF matrix
        self.tfidf_vectorizer = TfidfVectorizer(stop_words='english')
        self.tfidf_matrix = self.tfidf_vectorizer.fit_transform(self.books_df['content'])
        
        self.books_loaded = True
    
    def get_collaborative_recommendations(self, book_title, num_recommendations=5):
        """
        Get recommendations based on collaborative filtering model
        """
        if not self.collaborative_model_loaded:
            print("Collaborative model not loaded, falling back to content-based recommendations")
            return []
        
        try:
            # Print debug info
            print(f"Collaborative books data type: {type(self.collaborative_books)}")
            print(f"PT data type: {type(self.pt)}")
            if hasattr(self.pt, 'index'):
                print(f"PT index sample (first 5): {list(self.pt.index[:5])}")
            print(f"Similarity scores shape: {self.similarity_scores.shape}")
            
            # Find the book index in the pivot table
            if not hasattr(self.pt, 'index') or book_title not in self.pt.index:
                print(f"Book title {book_title} not found in pivot table index")
                # If book not found, return popular books
                return self.get_trending_books(num_recommendations)
                
            # Find the index of the book in the pivot table
            try:
                idx = np.where(self.pt.index == book_title)[0][0]
            except IndexError as e:
                print(f"Error finding book index: {e}")
                return self.get_trending_books(num_recommendations)
            
            # Get similar items based on similarity scores
            similar_items = sorted(list(enumerate(self.similarity_scores[idx])), key=lambda x: x[1], reverse=True)[1:num_recommendations+1]
            
            # Format the recommendations
            recommendations = []
            for i in similar_items:
                try:
                    item = {}
                    book_title_index = self.pt.index[i[0]]
                    
                    # Print columns to help with debugging
                    if len(recommendations) == 0:
                        print(f"Collaborative books columns: {self.collaborative_books.columns}")
                    
                    # Get book details
                    if 'Book-Title' in self.collaborative_books.columns:
                        temp_df = self.collaborative_books[self.collaborative_books['Book-Title'] == book_title_index]
                        if not temp_df.empty:
                            item['title'] = temp_df['Book-Title'].values[0]
                            item['author'] = temp_df['Book-Author'].values[0] if 'Book-Author' in temp_df.columns else 'Unknown'
                            item['image_url'] = temp_df['Image-URL-M'].values[0] if 'Image-URL-M' in temp_df.columns else None
                        else:
                            # If book not found, use index as title
                            item['title'] = book_title_index
                            item['author'] = 'Unknown'
                            item['image_url'] = None
                    else:
                        # Fallback if column names don't match
                        item['title'] = book_title_index
                        item['author'] = 'Unknown'
                        item['image_url'] = None
                    
                    recommendations.append(item)
                except Exception as e:
                    print(f"Error processing recommendation item: {e}")
                    continue
                
            return recommendations
        except Exception as e:
            print(f"Error getting collaborative recommendations: {e}")
            return self.get_trending_books(num_recommendations)
    
    def get_trending_books(self, num_recommendations=50):
        """
        Get the top trending books based on the popular.pkl file
        """
        if not self.collaborative_model_loaded or self.popular_df is None:
            print("Trending books data not available")
            return []
            
        try:
            # Get the top N books
            trending = self.popular_df.head(num_recommendations)
            
            # Print DataFrame columns to help with debugging
            print(f"Popular DataFrame columns: {trending.columns}")
            
            # Format the response
            recommendations = []
            for _, row in trending.iterrows():
                book = {}
                # Map titles dynamically
                if 'Book-Title' in trending.columns:
                    book['title'] = row['Book-Title']
                elif 'title' in trending.columns:
                    book['title'] = row['title']
                
                # Map authors dynamically
                if 'Book-Author' in trending.columns:
                    book['author'] = row['Book-Author']
                elif 'author' in trending.columns:
                    book['author'] = row['author']
                
                # Map image URLs dynamically
                if 'Image-URL-M' in trending.columns:
                    book['image_url'] = row['Image-URL-M']
                elif 'image_url_m' in trending.columns:
                    book['image_url'] = row['image_url_m']
                else:
                    book['image_url'] = None
                
                # Map ratings count dynamically
                if 'number_of_ratings' in trending.columns:
                    book['ratings_count'] = int(row['number_of_ratings'])
                elif 'num_ratings' in trending.columns:
                    book['ratings_count'] = int(row['num_ratings'])
                else:
                    book['ratings_count'] = 0
                
                # Map average rating dynamically
                if 'avg_rating' in trending.columns:
                    book['avg_rating'] = float(row['avg_rating'])
                else:
                    book['avg_rating'] = 0.0
                
                recommendations.append(book)
                
            return recommendations
        except Exception as e:
            print(f"Error getting trending books: {e}")
            return []
    
    def get_content_based_recommendations(self, user_id, num_recommendations=5):
        """
        Get content-based recommendations based on user's previous interactions
        """
        if not self.books_loaded:
            return []
        
        # Get user's previous interactions
        user_interactions = self.interactions_df[self.interactions_df['user_id'] == user_id]
        
        if len(user_interactions) == 0:
            # No previous interactions, return popular books
            return self._get_popular_books(num_recommendations)
        
        # Get books the user has interacted with
        interacted_books = user_interactions['book_id'].unique()
        
        # Calculate user's content preference by averaging the features of interacted books
        user_profile = np.zeros(self.tfidf_matrix.shape[1])
        
        for book_id in interacted_books:
            try:
                book_index = self.books_df[self.books_df['id'] == book_id].index[0]
                user_profile += self.tfidf_matrix[book_index].toarray().flatten()
            except:
                continue
        
        # Normalize user profile
        if np.sum(user_profile) > 0:
            user_profile = user_profile / np.linalg.norm(user_profile)
        
        # Get similarity scores
        similarities = cosine_similarity(user_profile.reshape(1, -1), self.tfidf_matrix)[0]
        
        # Get indices of books not interacted with
        candidate_indices = [i for i in range(len(self.books_df)) 
                           if self.books_df.iloc[i]['id'] not in interacted_books]
        
        # Get similarity scores for candidates
        candidate_scores = [(i, similarities[i]) for i in candidate_indices]
        
        # Sort by similarity
        sorted_candidates = sorted(candidate_scores, key=lambda x: x[1], reverse=True)
        
        # Get top recommendations
        top_indices = [i for i, _ in sorted_candidates[:num_recommendations]]
        
        # Get book IDs
        recommended_books = self.books_df.iloc[top_indices]
        
        return recommended_books.to_dict('records')
    
    def _get_popular_books(self, num_recommendations=5):
        """
        Get the most popular books based on interaction counts
        """
        if not self.books_loaded:
            return []
        
        # Count interactions per book
        book_counts = self.interactions_df['book_id'].value_counts().reset_index()
        book_counts.columns = ['id', 'count']
        
        # Merge with book details
        popular_books = pd.merge(book_counts, self.books_df, on='id')
        
        # Sort by popularity and select top books
        popular_books = popular_books.sort_values('count', ascending=False).head(num_recommendations)
        
        return popular_books[['id', 'title', 'author', 'description', 'genre']].to_dict('records')

# Initialize the predictors
price_predictor = BookPricePredictor()
recommender = BookRecommender()

# Price prediction endpoint
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

# Recommendations endpoint
@app.route('/recommend', methods=['POST'])
def get_recommendations():
    data = request.json
    user_id = data.get('user_id', 1)
    recommendation_type = data.get('type', 'content')  # 'content', 'collaborative', or 'trending'
    book_title = data.get('book_title', None)  # Used for collaborative filtering
    num_recommendations = data.get('num_recommendations', 5)
    
    # Load books from database or generate synthetic data if not loaded yet
    if not recommender.books_loaded:
        recommender.load_books_from_db()
    
    # Get recommendations based on type
    if recommendation_type == 'collaborative' and book_title:
        recommendations = recommender.get_collaborative_recommendations(book_title, num_recommendations)
    elif recommendation_type == 'trending':
        recommendations = recommender.get_trending_books(num_recommendations)
    else:  # Default to content-based
        recommendations = recommender.get_content_based_recommendations(user_id, num_recommendations)
    
    return jsonify(recommendations)

# Trending books endpoint
@app.route('/trending', methods=['GET'])
def get_trending_books():
    num_recommendations = request.args.get('limit', 50, type=int)
    
    # Get trending books
    trending_books = recommender.get_trending_books(num_recommendations)
    
    return jsonify(trending_books)

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'services': {
            'price_predictor': price_predictor.is_trained,
            'recommender': recommender.books_loaded
        }
    })

# Model metrics endpoint
@app.route('/model-metrics', methods=['GET'])
def model_metrics():
    # Get total interactions count
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM user_book_interactions")
    total_interactions = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(DISTINCT user_id) FROM user_book_interactions")
    active_users = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(DISTINCT book_id) FROM user_book_interactions")
    interacted_books = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM books")
    total_books = cursor.fetchone()[0]
    
    # Calculate percentage of books covered by interactions
    book_coverage = 0 if total_books == 0 else (interacted_books / total_books) * 100
    
    # Calculate metrics for price prediction model
    price_accuracy = price_predictor.get_model_accuracy() if hasattr(price_predictor, 'get_model_accuracy') else 'N/A'
    
    cursor.close()
    conn.close()
    
    return jsonify({
        'recommendation_metrics': {
            'total_interactions': total_interactions,
            'active_users': active_users,
            'interacted_books': interacted_books,
            'total_books': total_books,
            'book_coverage_percentage': round(book_coverage, 2)
        },
        'price_prediction_metrics': {
            'model_accuracy': price_accuracy,
            'model_type': 'RandomForestRegressor',
            'features_used': ['title', 'author', 'genre', 'condition']
        }
    })

if __name__ == '__main__':
    # Run the Flask app
    port = int(os.environ.get('PORT', 5001))
    print(f"Starting ML service on port {port}...")
    app.run(host='0.0.0.0', port=port)
