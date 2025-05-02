import pickle
import pandas as pd
import numpy as np

print("Inspecting pickle files from the book-recommender-system repository...")

# Load the pickle files
try:
    popular_df = pickle.load(open('book-recommender-system/popular.pkl', 'rb'))
    print("\nPopular dataframe loaded successfully!")
    print(f"Type: {type(popular_df)}")
    print(f"Shape: {popular_df.shape}")
    print(f"Columns: {popular_df.columns}")
    print("Sample data:")
    print(popular_df.head(2))
except Exception as e:
    print(f"Error loading popular.pkl: {e}")

try:
    pt = pickle.load(open('book-recommender-system/pt.pkl', 'rb'))
    print("\nPT (Pivot Table) loaded successfully!")
    print(f"Type: {type(pt)}")
    print(f"Shape: {pt.shape}")
    print("Sample data:")
    print(pt.head(2))
except Exception as e:
    print(f"Error loading pt.pkl: {e}")

try:
    books_df = pickle.load(open('book-recommender-system/books.pkl', 'rb'))
    print("\nBooks dataframe loaded successfully!")
    print(f"Type: {type(books_df)}")
    print(f"Shape: {books_df.shape}")
    print(f"Columns: {books_df.columns}")
    print("Sample data:")
    print(books_df.head(2))
except Exception as e:
    print(f"Error loading books.pkl: {e}")

try:
    similarity_scores = pickle.load(open('book-recommender-system/similarity_scores.pkl', 'rb'))
    print("\nSimilarity scores loaded successfully!")
    print(f"Type: {type(similarity_scores)}")
    print(f"Shape: {similarity_scores.shape}")
    print("Sample data:")
    print(similarity_scores[0][:5])  # First 5 scores of the first book
except Exception as e:
    print(f"Error loading similarity_scores.pkl: {e}")

# Copy the files to the ml directory
import shutil
import os

print("\nCopying pickle files to ml directory...")
try:
    os.makedirs("ml/pickles", exist_ok=True)
    shutil.copy("book-recommender-system/popular.pkl", "ml/pickles/")
    shutil.copy("book-recommender-system/pt.pkl", "ml/pickles/")
    shutil.copy("book-recommender-system/books.pkl", "ml/pickles/")
    shutil.copy("book-recommender-system/similarity_scores.pkl", "ml/pickles/")
    print("All files copied successfully!")
except Exception as e:
    print(f"Error copying files: {e}")
