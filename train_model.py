import pandas as pd
import numpy as np
import json
import ast
import pickle
import os
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from nltk.stem.porter import PorterStemmer

def main():
    print("Loading datasets...")
    # Read the raw datasets
    movies = pd.read_csv('tmdb_5000_movies.csv')
    credits = pd.read_csv('tmdb_5000_credits.csv')

    print("Merging datasets on title...")
    # Merge datasets on 'title'
    movies = movies.merge(credits, on='title')

    # Columns of interest: id, title, overview, genres, keywords, cast, crew, vote_average, release_date, runtime, original_language, popularity
    movies = movies[['id', 'title', 'overview', 'genres', 'keywords', 'cast', 'crew', 'vote_average', 'release_date', 'runtime', 'original_language', 'popularity']]

    # Drop null values in columns where missing data breaks logical flow (overview, release_date, runtime)
    print("Cleaning missing values and duplicates...")
    movies.dropna(subset=['overview', 'release_date', 'runtime'], inplace=True)
    movies['genres'] = movies['genres'].fillna('[]')
    movies['keywords'] = movies['keywords'].fillna('[]')
    movies['cast'] = movies['cast'].fillna('[]')
    movies['crew'] = movies['crew'].fillna('[]')
    movies = movies.drop_duplicates()

    # Parsers
    def convert_genres_keywords(obj):
        try:
            return [i['name'] for i in ast.literal_eval(obj)]
        except:
            return []

    def get_top_cast(obj, limit=5):
        try:
            cast_list = ast.literal_eval(obj)
            return [i['name'] for i in cast_list[:limit]]
        except:
            return []

    def get_director(obj):
        try:
            for i in ast.literal_eval(obj):
                if i.get('job') == 'Director':
                    return i['name']
        except:
            pass
        return ""

    print("Parsing metadata fields...")
    # Raw but clean metadata for UI display
    movies['genres_display'] = movies['genres'].apply(convert_genres_keywords)
    movies['keywords_display'] = movies['keywords'].apply(convert_genres_keywords)
    movies['cast_display'] = movies['cast'].apply(lambda x: get_top_cast(x, 5))
    movies['director'] = movies['crew'].apply(get_director)

    # For similarity tags: collapse spaces and lowercase
    def collapse(L):
        return [i.replace(" ", "").lower() for i in L]

    # For similarity, use top 3 cast as in notebook
    movies['cast_tags'] = movies['cast'].apply(lambda x: get_top_cast(x, 3))

    movies['genres_collapsed'] = movies['genres_display'].apply(collapse)
    movies['keywords_collapsed'] = movies['keywords_display'].apply(collapse)
    movies['cast_collapsed'] = movies['cast_tags'].apply(collapse)
    movies['director_collapsed'] = movies['director'].apply(lambda x: [x.replace(" ", "").lower()] if x else [])
    movies['overview_words'] = movies['overview'].apply(lambda x: x.split() if isinstance(x, str) else [])

    # Combine into tags string
    movies['tags'] = movies['overview_words'] + movies['genres_collapsed'] + movies['keywords_collapsed'] + movies['cast_collapsed'] + movies['director_collapsed']
    movies['tags'] = movies['tags'].apply(lambda x: " ".join(x).lower())

    print("Applying Porter Stemmer...")
    ps = PorterStemmer()
    def stem(text):
        return " ".join([ps.stem(word) for word in text.split()])

    movies['tags'] = movies['tags'].apply(stem)

    print("Vectorizing and computing cosine similarity...")
    cv = CountVectorizer(max_features=5000, stop_words='english')
    vectors = cv.fit_transform(movies['tags']).toarray()
    similarity = cosine_similarity(vectors)

    # Ensure models directory exists
    os.makedirs('models', exist_ok=True)

    # Prepare final metadata table for pickling
    movies.rename(columns={'id': 'movie_id'}, inplace=True)
    final_movies = movies[['movie_id', 'title', 'overview', 'genres_display', 'cast_display', 'director', 'vote_average', 'release_date', 'runtime', 'original_language', 'popularity']]

    print("Saving pickles...")
    with open('models/movies.pkl', 'wb') as f:
        pickle.dump(final_movies, f)

    with open('models/similarity.pkl', 'wb') as f:
        pickle.dump(similarity, f)

    print("Model preprocessing and training completed successfully!")

if __name__ == "__main__":
    main()
