import pickle
import os

print('Working directory:', os.getcwd())

try:
    with open('data/books.pkl', 'rb') as f:
        books = pickle.load(f)
    print('\nBooks:')
    print('Type:', type(books))
    print('Shape:', books.shape if hasattr(books, 'shape') else 'No shape attribute')
    print('Columns:', list(books.columns) if hasattr(books, 'columns') else 'No columns attribute')
    print('First 2 rows:')
    print(books.head(2) if hasattr(books, 'head') else 'No head method')
except Exception as e:
    print(f'Error loading books.pkl: {e}')

try:
    with open('data/popular.pkl', 'rb') as f:
        popular_df = pickle.load(f)
    print('\nPopular books:')
    print('Type:', type(popular_df))
    print('Shape:', popular_df.shape if hasattr(popular_df, 'shape') else 'No shape attribute')
    print('Columns:', list(popular_df.columns) if hasattr(popular_df, 'columns') else 'No columns attribute')
    print('First 2 rows:')
    print(popular_df.head(2) if hasattr(popular_df, 'head') else 'No head method')
except Exception as e:
    print(f'Error loading popular.pkl: {e}')

try:
    with open('data/similarity_scores.pkl', 'rb') as f:
        similarity_scores = pickle.load(f)
    print('\nSimilarity scores:')
    print('Type:', type(similarity_scores))
    print('Shape:', similarity_scores.shape if hasattr(similarity_scores, 'shape') else 'No shape attribute')
    print('First element type:', type(similarity_scores[0]) if len(similarity_scores) > 0 else 'Empty')
except Exception as e:
    print(f'Error loading similarity_scores.pkl: {e}')

try:
    with open('data/pt.pkl', 'rb') as f:
        pt = pickle.load(f)
    print('\nPT:')
    print('Type:', type(pt))
    print('Shape:', pt.shape if hasattr(pt, 'shape') else 'No shape attribute')
    print('First few items:', pt.head(2) if hasattr(pt, 'head') else 'No head method')
except Exception as e:
    print(f'Error loading pt.pkl: {e}')
