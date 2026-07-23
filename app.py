import os
import pickle
import difflib
import traceback
import pandas as pd
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# Cache variables for pre-loaded models
_movies = None
_similarity = None

def load_models():
    """Loads the movies dataframe and similarity matrix from pre-trained pickle files."""
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

    print("Pre-trained movies and similarity models loaded successfully.")
    return _movies, _similarity

# Preload models on application startup
try:
    print("Preloading recommendation models on startup...")
    load_models()
except Exception as e:
    print(f"WARNING: Could not preload models on startup: {e}")

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

def get_movie_suggestions(query, limit=10):
    """Returns a list of movie titles matching query for autocomplete."""
    movies_df, _ = load_models()
    if not query:
        return []
    
    query_clean = query.strip().lower()
    matches = movies_df[movies_df['title'].str.lower().str.contains(query_clean, na=False, regex=False)]
    
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
    """Returns top popular movies sorted by popularity."""
    movies_df, _ = load_models()
    popular_df = movies_df.sort_values(by='popularity', ascending=False).head(limit)
    return [row_to_dict(row) for _, row in popular_df.iterrows()]

def get_trending_movies(limit=10):
    """Returns trending movies sorted by release date and popularity."""
    movies_df, _ = load_models()
    valid_df = movies_df[movies_df['release_date'].notna()]
    trending_df = valid_df.sort_values(by=['release_date', 'popularity'], ascending=[False, False]).head(limit)
    return [row_to_dict(row) for _, row in trending_df.iterrows()]

def recommend(movie_title):
    """Finds top 10 recommended movies based on cosine similarity."""
    movies_df, similarity_matrix = load_models()
    
    titles_list = movies_df['title'].tolist()
    titles_lower = [t.lower() for t in titles_list]
    target_lower = movie_title.strip().lower()
    
    matching_idx = None
    if target_lower in titles_lower:
        matching_idx = titles_lower.index(target_lower)
    else:
        close_matches = difflib.get_close_matches(movie_title, titles_list, n=1, cutoff=0.5)
        if close_matches:
            matching_idx = titles_lower.index(close_matches[0].lower())
            
    if matching_idx is None:
        return None

    distances = similarity_matrix[matching_idx]
    similar_indices = sorted(list(enumerate(distances)), reverse=True, key=lambda x: x[1])
    
    recommendations = []
    for idx, score in similar_indices:
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

# Routes
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/search', methods=['GET'])
def search_suggestions():
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify([])
    try:
        suggestions = get_movie_suggestions(query, limit=10)
        return jsonify(suggestions)
    except Exception as e:
        app.logger.error(f"Error in autocomplete search: {e}\n{traceback.format_exc()}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/recommend', methods=['POST'])
def recommend_movies():
    data = request.get_json() or {}
    movie_title = data.get('movie', '').strip()
    if not movie_title:
        return jsonify({"error": "Movie name is required"}), 400
    try:
        results = recommend(movie_title)
        if results is None:
            return jsonify({
                "error": f"Movie '{movie_title}' not found in database.",
                "type": "NOT_FOUND"
            }), 404
        return jsonify(results)
    except Exception as e:
        app.logger.error(f"Error generating recommendations: {e}\n{traceback.format_exc()}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/movies/popular', methods=['GET'])
def popular_movies():
    try:
        limit = int(request.args.get('limit', 12))
        movies = get_popular_movies(limit=limit)
        return jsonify(movies)
    except Exception as e:
        app.logger.error(f"Error loading popular movies: {e}\n{traceback.format_exc()}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/movies/trending', methods=['GET'])
def trending_movies():
    try:
        limit = int(request.args.get('limit', 10))
        movies = get_trending_movies(limit=limit)
        return jsonify(movies)
    except Exception as e:
        app.logger.error(f"Error loading trending movies: {e}\n{traceback.format_exc()}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/tmdb-config', methods=['GET'])
def tmdb_config():
    """Returns TMDB API key from environment variable to the frontend."""
    api_key = os.environ.get('TMDB_API_KEY', '')
    return jsonify({'apiKey': api_key})

@app.errorhandler(404)
def page_not_found(e):
    return render_template('index.html'), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)
