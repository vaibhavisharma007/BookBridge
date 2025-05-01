from flask import Flask, request, jsonify
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import sqlite3
import os

app = Flask(__name__)

# Book recommender class
class BookRecommender:
    def __init__(self):
        self.books_df = None
        self.interactions_df = None
        self.tfidf_matrix = None
        self.tfidf_vectorizer = None
        self.books_loaded = False
        
    def load_books_from_db(self, db_path):
        # Connect to the PostgreSQL database
        try:
            conn = sqlite3.connect(db_path)
            
            # Load books
            books_query = """
                SELECT id, title, author, description, genre
                FROM books
                WHERE status = 'available'
            """
            self.books_df = pd.read_sql_query(books_query, conn)
            
            # Load user interactions
            interactions_query = """
                SELECT user_id, book_id, interaction_type
                FROM user_book_interactions
            """
            self.interactions_df = pd.read_sql_query(interactions_query, conn)
            
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
            'genre': np.random.choice(['Fiction', 'Mystery', 'Science Fiction', 'Romance', 'Fantasy', 'Thriller', 'Biography', 'History', 'Self-help'], 100)
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

# Initialize the recommender
recommender = BookRecommender()

@app.route('/recommend', methods=['POST'])
def get_recommendations():
    data = request.json
    user_id = data.get('user_id', 1)
    
    # Load books from database or generate synthetic data if not loaded yet
    if not recommender.books_loaded:
        # Assuming the database is in the parent directory since this is in the /ml folder
        recommender.load_books_from_db('../bookreselling.db')
    
    # Get recommendations
    recommendations = recommender.get_content_based_recommendations(user_id)
    
    return jsonify(recommendations)

if __name__ == '__main__':
    # Run the Flask app
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port)
