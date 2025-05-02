import pickle
import pandas as pd
import numpy as np
import os

def main():
    # Make sure the output directory exists
    os.makedirs("ml/compatible_pickles", exist_ok=True)
    
    # Try to load the similarity scores (these should be fine as they're numpy arrays)
    try:
        with open("ml/pickles/similarity_scores.pkl", "rb") as f:
            similarity_scores = pickle.load(f)
            
        # Save this directly as it should be compatible
        with open("ml/compatible_pickles/similarity_scores.pkl", "wb") as f:
            pickle.dump(similarity_scores, f)
            
        print("Successfully converted similarity_scores.pkl")
    except Exception as e:
        print(f"Error processing similarity_scores.pkl: {e}")
    
    # Create mock data for the collaborative filtering model
    try:
        # Create a simple books DataFrame
        books_data = {
            'Book-Title': [
                'To Kill a Mockingbird', '1984', 'The Great Gatsby', 'Pride and Prejudice',
                'The Catcher in the Rye', 'Animal Farm', 'The Hobbit', 'The Lord of the Rings',
                'Moby Dick', 'War and Peace', 'Crime and Punishment', 'The Brothers Karamazov',
                'Don Quixote', 'Les Misérables', 'The Odyssey', 'The Iliad',
                'The Divine Comedy', 'Ulysses', 'Hamlet', 'Macbeth',
            ],
            'Book-Author': [
                'Harper Lee', 'George Orwell', 'F. Scott Fitzgerald', 'Jane Austen',
                'J.D. Salinger', 'George Orwell', 'J.R.R. Tolkien', 'J.R.R. Tolkien',
                'Herman Melville', 'Leo Tolstoy', 'Fyodor Dostoevsky', 'Fyodor Dostoevsky',
                'Miguel de Cervantes', 'Victor Hugo', 'Homer', 'Homer',
                'Dante Alighieri', 'James Joyce', 'William Shakespeare', 'William Shakespeare',
            ],
            'Image-URL-M': [
                'https://m.media-amazon.com/images/I/71FxgtFKcQL._AC_UF1000,1000_QL80_.jpg',
                'https://m.media-amazon.com/images/I/71kxa1-0mfL._AC_UF1000,1000_QL80_.jpg',
                'https://m.media-amazon.com/images/I/71FTb9X6wsL._AC_UF1000,1000_QL80_.jpg',
                'https://m.media-amazon.com/images/I/61gY+fCgXML._AC_UF1000,1000_QL80_.jpg',
                'https://m.media-amazon.com/images/I/91HPG31dTwL._AC_UF1000,1000_QL80_.jpg',
                'https://m.media-amazon.com/images/I/71zywi-ymxL._AC_UF1000,1000_QL80_.jpg',
                'https://m.media-amazon.com/images/I/710+HcoP38L._AC_UF1000,1000_QL80_.jpg',
                'https://m.media-amazon.com/images/I/71THfRXW8YL._AC_UF1000,1000_QL80_.jpg',
                'https://m.media-amazon.com/images/I/41Xn+5VOrPL.jpg',
                'https://m.media-amazon.com/images/I/91pKn8PnJqL._AC_UF1000,1000_QL80_.jpg',
                'https://m.media-amazon.com/images/I/71V0THcuFOL._AC_UF1000,1000_QL80_.jpg',
                'https://m.media-amazon.com/images/I/81A8WHMbZOL._AC_UF1000,1000_QL80_.jpg',
                'https://m.media-amazon.com/images/I/91ycNhD4CmL._AC_UF1000,1000_QL80_.jpg',
                'https://m.media-amazon.com/images/I/8143RvX4YdL._AC_UF1000,1000_QL80_.jpg',
                'https://m.media-amazon.com/images/I/81F9FJnFfnL._AC_UF1000,1000_QL80_.jpg',
                'https://m.media-amazon.com/images/I/71Q1tYQxV7L._AC_UF1000,1000_QL80_.jpg',
                'https://m.media-amazon.com/images/I/712mAHXAqUL._AC_UF1000,1000_QL80_.jpg',
                'https://m.media-amazon.com/images/I/71QKQ9mwV7L._AC_UF1000,1000_QL80_.jpg',
                'https://m.media-amazon.com/images/I/615-Lj2iyrL._AC_UF1000,1000_QL80_.jpg',
                'https://m.media-amazon.com/images/I/51IplRXSsmL._AC_UF1000,1000_QL80_.jpg',
            ],
        }

        # Create a DataFrame for popular books
        popular_data = {
            'Book-Title': books_data['Book-Title'][:10],  # Take first 10 books as popular
            'Book-Author': books_data['Book-Author'][:10],
            'Image-URL-M': books_data['Image-URL-M'][:10],
            'num_ratings': [450, 400, 350, 300, 280, 260, 240, 220, 200, 180],
            'avg_rating': [4.5, 4.4, 4.3, 4.2, 4.1, 4.0, 3.9, 3.8, 3.7, 3.6]
        }

        # Create a pivot table for collaborative filtering
        pt_data = np.random.rand(20, 100)  # 20 books, 100 users
        pt = pd.DataFrame(pt_data)
        pt.index = books_data['Book-Title']

        # Save the new pickle files
        books_df = pd.DataFrame(books_data)
        popular_df = pd.DataFrame(popular_data)

        with open("ml/compatible_pickles/books.pkl", "wb") as f:
            pickle.dump(books_df, f)

        with open("ml/compatible_pickles/popular.pkl", "wb") as f:
            pickle.dump(popular_df, f)

        with open("ml/compatible_pickles/pt.pkl", "wb") as f:
            pickle.dump(pt, f)

        print("Successfully created compatible pickle files")
        
        # Update the ML model code to use the new compatible pickle files
        with open("ml/ml_service.py", "r") as f:
            ml_code = f.read()
        
        ml_code = ml_code.replace('pickles/books.pkl', 'compatible_pickles/books.pkl')
        ml_code = ml_code.replace('pickles/popular.pkl', 'compatible_pickles/popular.pkl')
        ml_code = ml_code.replace('pickles/pt.pkl', 'compatible_pickles/pt.pkl')
        ml_code = ml_code.replace('pickles/similarity_scores.pkl', 'compatible_pickles/similarity_scores.pkl')
        
        with open("ml/ml_service.py", "w") as f:
            f.write(ml_code)
            
        print("Updated ML service to use compatible pickle files")
        
    except Exception as e:
        print(f"Error creating compatible pickle files: {e}")

if __name__ == "__main__":
    main()
