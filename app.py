import os
import traceback
from flask import Flask, render_template, request, jsonify
import model

app = Flask(__name__)

# Preload models on startup to speed up subsequent requests
try:
    print("Preloading recommendation models...")
    model.load_models()
except Exception as e:
    print(f"WARNING: Could not preload models: {e}")

@app.route('/')
def home():
    """Serves the main landing page of the application."""
    return render_template('index.html')

@app.route('/api/search', methods=['GET'])
def search_suggestions():
    """Handles autocomplete requests. Returns list of movie titles matching 'q' query param."""
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify([])
    try:
        suggestions = model.get_movie_suggestions(query, limit=10)
        return jsonify(suggestions)
    except Exception as e:
        app.logger.error(f"Error in autocomplete search: {e}\n{traceback.format_exc()}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/recommend', methods=['POST'])
def recommend_movies():
    """Handles movie recommendation requests. Expects JSON post data with 'movie'."""
    data = request.get_json() or {}
    movie_title = data.get('movie', '').strip()
    
    if not movie_title:
        return jsonify({"error": "Movie name is required"}), 400
        
    try:
        results = model.recommend(movie_title)
        if results is None:
            return jsonify({
                "error": f"Movie '{movie_title}' not found in our database.",
                "type": "NOT_FOUND"
            }), 404
            
        return jsonify(results)
    except Exception as e:
        app.logger.error(f"Error in generating recommendations: {e}\n{traceback.format_exc()}")
        return jsonify({"error": "Internal server error during recommendation"}), 500

@app.route('/api/movies/popular', methods=['GET'])
def popular_movies():
    """Returns top 12 popular movies sorted by popularity metric."""
    try:
        limit = int(request.args.get('limit', 12))
        movies = model.get_popular_movies(limit=limit)
        return jsonify(movies)
    except Exception as e:
        app.logger.error(f"Error in popular movies: {e}\n{traceback.format_exc()}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/movies/trending', methods=['GET'])
def trending_movies():
    """Returns trending movies based on popularity and release year."""
    try:
        limit = int(request.args.get('limit', 10))
        movies = model.get_trending_movies(limit=limit)
        return jsonify(movies)
    except Exception as e:
        app.logger.error(f"Error in trending movies: {e}\n{traceback.format_exc()}")
        return jsonify({"error": "Internal server error"}), 500

@app.errorhandler(404)
def page_not_found(e):
    return render_template('index.html'), 200 # SPA fallback

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)


