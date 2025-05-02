import requests
from bs4 import BeautifulSoup
import json
import time
import re

class BookDataFetcher:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        })
    
    def search_google_books(self, title, author=None):
        """Search Google Books API for book information"""
        try:
            query = title
            if author:
                query += f"+inauthor:{author}"
                
            url = f"https://www.googleapis.com/books/v1/volumes?q={query}&maxResults=5"
            response = self.session.get(url, timeout=5)
            response.raise_for_status()
            
            data = response.json()
            
            if 'items' not in data or len(data['items']) == 0:
                return None
                
            # Get the first result
            book_data = data['items'][0]['volumeInfo']
            
            result = {
                'title': book_data.get('title', ''),
                'authors': book_data.get('authors', []),
                'publisher': book_data.get('publisher', ''),
                'published_date': book_data.get('publishedDate', ''),
                'description': book_data.get('description', ''),
                'page_count': book_data.get('pageCount', 0),
                'categories': book_data.get('categories', []),
                'average_rating': book_data.get('averageRating', 0),
                'ratings_count': book_data.get('ratingsCount', 0),
                'price_info': self._extract_price_info(book_data),
            }
            
            return result
        except Exception as e:
            print(f"Error searching Google Books: {e}")
            return None
    
    def _extract_price_info(self, book_data):
        # Extract price info if available
        price_info = {'price': 0, 'currency': 'INR'}
        
        if 'listPrice' in book_data:
            price_info['price'] = book_data['listPrice'].get('amount', 0)
            price_info['currency'] = book_data['listPrice'].get('currencyCode', 'INR')
        
        return price_info
    
    def search_book_price(self, title, author=None):
        """Search for book prices from multiple sources"""
        # First try Google Books
        google_data = self.search_google_books(title, author)
        
        if google_data and google_data['price_info']['price'] > 0:
            return {
                'price': google_data['price_info']['price'],
                'currency': google_data['price_info']['currency'],
                'source': 'Google Books',
                'additional_data': google_data
            }
        
        # If Google Books doesn't have price, we'll use simulated data
        # based on book metadata like pages, category, and ratings
        if google_data:
            estimated_price = self._estimate_price_from_metadata(google_data)
            return {
                'price': estimated_price,
                'currency': 'INR',
                'source': 'Estimated',
                'additional_data': google_data
            }
        
        return None
    
    def _estimate_price_from_metadata(self, book_data):
        """Estimate book price based on metadata"""
        base_price = 300  # Base price in INR
        
        # Adjust for page count
        if book_data['page_count'] > 0:
            page_factor = min(book_data['page_count'] / 300, 2.0)  # Cap at 2x for very long books
            base_price *= (0.7 + (0.3 * page_factor))
        
        # Adjust for ratings
        if book_data['ratings_count'] > 0:
            rating_factor = min(book_data['average_rating'] / 5.0 * 1.5, 1.5)  # Higher rated books
            popularity_factor = min(book_data['ratings_count'] / 1000, 1.3)  # More popular books
            base_price *= rating_factor * popularity_factor
        
        # Adjust for categories/genres
        academic_keywords = ['textbook', 'education', 'academic', 'study', 'mathematics', 'science', 'physics', 'chemistry', 'biology']
        if book_data['categories']:
            for category in book_data['categories']:
                category_lower = category.lower()
                # Academic books tend to be more expensive
                if any(keyword in category_lower for keyword in academic_keywords):
                    base_price *= 1.4
                # Fiction tends to be less expensive
                elif 'fiction' in category_lower:
                    base_price *= 0.9
                    
        # Adjust for recency of publication
        if book_data['published_date']:
            try:
                year = int(book_data['published_date'][:4])
                current_year = 2025  # Assuming current year
                years_old = current_year - year
                
                if years_old < 1:  # New release
                    base_price *= 1.4
                elif years_old < 3:  # Recent book
                    base_price *= 1.2
                elif years_old > 15:  # Older book
                    base_price *= 0.7
            except:
                pass
        
        # Apply condition discount for used books
        return round(base_price, 2)
    
    def get_similar_books(self, title, author=None, max_results=5):
        """Get similar books based on title and author"""
        try:
            query = title
            if author:
                query += f"+inauthor:{author}"
                
            url = f"https://www.googleapis.com/books/v1/volumes?q={query}&maxResults={max_results}"
            response = self.session.get(url, timeout=5)
            response.raise_for_status()
            
            data = response.json()
            
            if 'items' not in data or len(data['items']) == 0:
                return []
            
            similar_books = []
            
            for item in data['items']:
                book_data = item['volumeInfo']
                book = {
                    'title': book_data.get('title', ''),
                    'authors': book_data.get('authors', []),
                    'description': book_data.get('description', '')[:200] + '...' if book_data.get('description') else '',
                    'image_url': book_data.get('imageLinks', {}).get('thumbnail', ''),
                    'publisher': book_data.get('publisher', ''),
                    'published_date': book_data.get('publishedDate', ''),
                }
                similar_books.append(book)
            
            return similar_books
            
        except Exception as e:
            print(f"Error fetching similar books: {e}")
            return []

# Test the fetcher
if __name__ == "__main__":
    fetcher = BookDataFetcher()
    result = fetcher.search_book_price("Ikigai", "Héctor García")
    print(json.dumps(result, indent=2))
    
    # Test academic book
    result = fetcher.search_book_price("RD Sharma Class 10 Maths", "R D Sharma")
    print(json.dumps(result, indent=2))
