import pickle
import os
import difflib
import pandas as pd

# Global variables to cache the model in memory
_movies = None
_similarity = None

def load_models():
    """Loads the movies dataframe and similarity matrix from pickle files."""
    global _movies, _similarity
    if _movies is not None and _similarity is not None:
        return _movies, _similarity
    
    base_path = os.path.dirname(os.path.abspath(__file__))
    movies_path = os.path.join(base_path, 'models', 'movies.pkl')
    similarity_path = os.path.join(base_path, 'models', 'similarity.pkl')
    
    if not os.path.exists(movies_path) or not os.path.exists(similarity_path):
        raise FileNotFoundError(
            f"Pre-trained model pickle files not found at:\n - {movies_path}\n - {similarity_path}"
        )
        
    with open(movies_path, 'rb') as f:
        _movies = pickle.load(f)
    with open(similarity_path, 'rb') as f:
        _similarity = pickle.load(f)
        
    print("Movies and similarity models loaded successfully.")
    return _movies, _similarity

def get_movie_suggestions(query, limit=10):
    """Returns a list of movie titles matching the query for autocomplete."""
    movies_df, _ = load_models()
    if not query:
        return []
    
    query_clean = query.strip().lower()
    # Filter movies containing the search query safely (regex=False avoids regex parsing crashes)
    matches = movies_df[movies_df['title'].str.lower().str.contains(query_clean, na=False, regex=False)]
    
    # Sort matches: exact match, starts-with match, then other matches
    def sort_key(title):
        t_low = title.lower()
        if t_low == query_clean:
            return (0, len(title))
        elif t_low.startswith(query_clean):
            return (1, len(title))
        else:
            return (2, len(title))
            
    sorted_titles = sorted(matches['title'].tolist(), key=sort_key)
    return sorted_titles[:limit]

def get_popular_movies(limit=12):
    """Returns the top most popular movies based on the popularity score."""
    movies_df, _ = load_models()
    popular_df = movies_df.sort_values(by='popularity', ascending=False).head(limit)
    
    result = []
    for _, row in popular_df.iterrows():
        result.append(row_to_dict(row))
    return result

def get_trending_movies(limit=10):
    """Returns trending movies based on popularity and relatively recent release dates."""
    movies_df, _ = load_models()
    # Filter out movies with missing release date
    valid_df = movies_df[movies_df['release_date'].notna()]
    # Sort by release date and popularity
    trending_df = valid_df.sort_values(by=['release_date', 'popularity'], ascending=[False, False]).head(limit)
    
    result = []
    for _, row in trending_df.iterrows():
        result.append(row_to_dict(row))
    return result

def row_to_dict(row, similarity_score=None):
    """Converts a DataFrame row into a serializable dictionary for API response."""
    rel_date = str(row['release_date']) if pd.notna(row.get('release_date')) else ''
    rel_year = rel_date.split('-')[0] if rel_date and rel_date != 'nan' else 'N/A'
    
    return {
        'movie_id': int(row['movie_id']),
        'title': str(row['title']),
        'overview': str(row['overview']) if pd.notna(row.get('overview')) else '',
        'genres': list(row['genres_display']) if isinstance(row.get('genres_display'), (list, tuple)) else [],
        'cast': list(row['cast_display']) if isinstance(row.get('cast_display'), (list, tuple)) else [],
        'director': str(row['director']) if pd.notna(row.get('director')) else '',
        'vote_average': float(row['vote_average']) if pd.notna(row.get('vote_average')) else 0.0,
        'release_date': rel_date,
        'release_year': rel_year,
        'runtime': float(row['runtime']) if pd.notna(row.get('runtime')) else 0.0,
        'original_language': str(row['original_language']).upper() if pd.notna(row.get('original_language')) else '',
        'popularity': float(row['popularity']) if pd.notna(row.get('popularity')) else 0.0,
        'similarity_score': float(similarity_score) if similarity_score is not None else None
    }

def recommend(movie_title):
    """Finds top 10 recommended movies based on cosine similarity."""
    movies_df, similarity_matrix = load_models()
    
    titles_list = movies_df['title'].tolist()
    titles_lower = [t.lower() for t in titles_list]
    target_lower = movie_title.strip().lower()
    
    matching_idx = None
    # 1. Direct match check
    if target_lower in titles_lower:
        matching_idx = titles_lower.index(target_lower)
    else:
        # 2. Fuzzy match check
        close_matches = difflib.get_close_matches(movie_title, titles_list, n=1, cutoff=0.5)
        if close_matches:
            matching_idx = titles_lower.index(close_matches[0].lower())
            
    if matching_idx is None:
        return None  # No matching movie found
    
    # 3. Retrieve similarities
    distances = similarity_matrix[matching_idx]
    # Sort similarity indices in descending order
    similar_indices = sorted(list(enumerate(distances)), reverse=True, key=lambda x: x[1])
    
    # Extract top 10 items excluding the searched movie itself
    recommendations = []
    for i in similar_indices:
        idx = i[0]
        score = i[1]
        
        # Skip the movie itself
        if idx == matching_idx:
            continue
            
        row = movies_df.iloc[idx]
        recommendations.append(row_to_dict(row, score))
        
        if len(recommendations) == 10:
            break
            
    searched_movie = row_to_dict(movies_df.iloc[matching_idx])
    
    return {
        'searched_movie': searched_movie,
        'recommendations': recommendations
    }
