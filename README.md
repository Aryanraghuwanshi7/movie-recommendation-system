<div align="center">

# 🎬 Movie Recommendation System

### AI-Powered Content-Based Movie Recommendations

[![Python](https://img.shields.io/badge/Python-3.11-blue?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.0-black?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-1.5-orange?style=for-the-badge&logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![Pandas](https://img.shields.io/badge/Pandas-2.2-150458?style=for-the-badge&logo=pandas&logoColor=white)](https://pandas.pydata.org)
[![NumPy](https://img.shields.io/badge/NumPy-1.26-013243?style=for-the-badge&logo=numpy&logoColor=white)](https://numpy.org)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![TMDB API](https://img.shields.io/badge/TMDB-API-01b4e4?style=for-the-badge&logo=themoviedatabase&logoColor=white)](https://www.themoviedb.org/documentation/api)

---

*Discover movies you'll love — powered by machine learning cosine similarity and the TMDB API.*

</div>

---

## 📌 Project Overview

**Movie Recommendation System** is a full-stack web application that uses **Content-Based Filtering** to recommend movies similar to a user's choice. The recommendation engine is built from scratch using a machine learning pipeline that computes a cosine similarity matrix over a processed feature space derived from movie overviews, genres, keywords, cast, and crew data.

The application is served via a **Flask** web server and features a premium dark-themed UI inspired by modern streaming platforms. Movie posters, backdrop images, and trailers are fetched dynamically from the **TMDB API**, making the experience visually rich and interactive.

> **Dataset:** [TMDB 5000 Movie Dataset](https://www.kaggle.com/datasets/tmdb/tmdb-movie-metadata) — contains metadata for 4,806 films.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔍 **Smart Search** | Autocomplete search with keyboard navigation and debounced API calls |
| 🤖 **ML Recommendations** | Top-10 similar movies based on cosine similarity |
| 🎭 **Movie Details Modal** | Poster, backdrop, overview, cast, director, genres, rating, runtime |
| 🎬 **Trailer Playback** | Embedded YouTube trailer via TMDB Videos endpoint |
| ❤️ **Favorites Drawer** | Save and revisit favourite movies using localStorage |
| 🕐 **Search History** | Persisted recent searches for quick re-access |
| 🔥 **Trending Carousel** | Horizontal scrolling section of trending movies |
| ⭐ **Popular Section** | Grid of most-popular movies on landing page |
| 💀 **Skeleton Loading** | Shimmer placeholders while data loads |
| 🌙 **Dark / Light Theme** | Toggle between cinematic dark and light modes |
| 📱 **Responsive Design** | Fully mobile-optimised layout |
| 🛡️ **Graceful Error Handling** | API timeouts, missing posters, invalid keys — all handled cleanly |

---

## 📸 Demo Screenshots

> Add your screenshots here after running the project locally.

| Landing Page | Recommendations |
|:---:|:---:|
| ![Landing Page](docs/screenshots/landing.png) | ![Recommendations](docs/screenshots/recommendations.png) |

| Movie Details Modal | Watch Trailer |
|:---:|:---:|
| ![Details Modal](docs/screenshots/modal.png) | ![Trailer](docs/screenshots/trailer.png) |

| Favorites Drawer | Mobile View |
|:---:|:---:|
| ![Favorites](docs/screenshots/favorites.png) | ![Mobile](docs/screenshots/mobile.png) |

> 📷 *To add your own screenshots: run the project locally, take screenshots, and place them in a `docs/screenshots/` folder.*

---

## 🛠️ Tech Stack

### Backend
| Technology | Role |
|---|---|
| **Python 3.11** | Core programming language |
| **Flask 3.0** | Web framework and REST API server |
| **Pickle** | Model serialisation (movies.pkl, similarity.pkl) |
| **NLTK** | Porter Stemmer for text normalisation |

### Machine Learning
| Technology | Role |
|---|---|
| **Scikit-Learn** | CountVectorizer + Cosine Similarity computation |
| **Pandas** | Data loading, preprocessing, and feature engineering |
| **NumPy** | Numerical operations on the similarity matrix |

### Frontend
| Technology | Role |
|---|---|
| **HTML5** | Semantic page structure |
| **Vanilla CSS3** | Custom glassmorphism dark-theme styling |
| **JavaScript (ES6+)** | Dynamic rendering, fetch API, localStorage |
| **Font Awesome 6** | Icon library |
| **Google Fonts (Inter, Outfit)** | Typography |

### External API
| Service | Role |
|---|---|
| **TMDB API** | Movie posters, backdrop images, trailer videos |

---

## 🧠 Machine Learning Pipeline

The recommendation engine is built using **Content-Based Filtering** — the idea is to represent each movie as a "bag of words" derived from its metadata, then find movies with the most similar bags.

```
Raw CSV Data (TMDB 5000)
        │
        ▼
┌────────────────────┐
│   Data Merging     │  ← merge movies.csv + credits.csv on 'title'
└────────────────────┘
        │
        ▼
┌────────────────────┐
│  Feature Selection │  ← overview, genres, keywords, cast (top 3), director
└────────────────────┘
        │
        ▼
┌────────────────────┐
│  Text Preprocessing│  ← collapse spaces, lowercase, Porter Stemming
└────────────────────┘
        │
        ▼
┌────────────────────┐
│  CountVectorizer   │  ← max_features=5000, stop_words='english'
│  (Bag of Words)    │
└────────────────────┘
        │
        ▼
┌────────────────────┐
│  Cosine Similarity │  ← 4806×4806 similarity matrix
│  Matrix            │
└────────────────────┘
        │
        ▼
┌────────────────────┐
│  Pickle Serialise  │  ← movies.pkl + similarity.pkl
└────────────────────┘
```

### Why Content-Based Filtering?

Content-Based Filtering recommends movies based on the **attributes of a movie itself** (genre, cast, director, keywords), not on user behaviour. This means:
- No cold-start problem for movies
- No need for user rating history
- Works well for discovering niche or less-popular films similar to a known one

### Why Cosine Similarity?

After vectorising the text tags, each movie becomes a high-dimensional vector. **Cosine similarity** measures the angle between two vectors — movies with similar content will have vectors pointing in similar directions (cosine close to 1).

```python
from sklearn.metrics.pairwise import cosine_similarity

# 4806 × 5000 sparse matrix → 4806 × 4806 similarity matrix
similarity = cosine_similarity(vectors)
```

---

## 🏗️ Website Architecture

```
Browser (Client)
      │
      │  HTTP Requests (JSON / HTML)
      ▼
┌──────────────────────────────┐
│       Flask Server           │
│  ┌─────────────────────────┐ │
│  │    app.py  (Routes)     │ │  ← GET /, GET /api/search
│  │                         │ │  ← POST /api/recommend
│  │                         │ │  ← GET /api/movies/popular
│  │                         │ │  ← GET /api/movies/trending
│  └─────────────────────────┘ │
│  ┌─────────────────────────┐ │
│  │    model.py  (Engine)   │ │  ← load_models(), recommend()
│  │                         │ │  ← get_popular_movies()
│  │                         │ │  ← get_trending_movies()
│  └─────────────────────────┘ │
│  ┌─────────────────────────┐ │
│  │   models/movies.pkl     │ │  ← DataFrame with movie metadata
│  │   models/similarity.pkl │ │  ← 4806×4806 cosine similarity matrix
│  └─────────────────────────┘ │
└──────────────────────────────┘
      │
      │  External API Calls (from browser JS)
      ▼
┌──────────────────────────────┐
│         TMDB API             │
│  • Movie details + posters   │
│  • Backdrop images           │
│  • Trailer video keys        │
└──────────────────────────────┘
```

---

## 📁 Project Structure

```
content_based_recommender_system/
│
├── app.py                    # Flask application — routes & API endpoints
├── model.py                  # Recommendation engine — loads pickles, runs similarity
├── train_model.py            # Data preprocessing & model training script
├── requirements.txt          # Python dependencies
├── notebook.ipynb            # Original Jupyter notebook (ML exploration)
│
├── models/                   # Serialised model artifacts (auto-generated)
│   ├── movies.pkl            # Movie metadata DataFrame
│   └── similarity.pkl        # Cosine similarity matrix
│
├── templates/
│   └── index.html            # Jinja2 HTML template (single-page app shell)
│
├── static/
│   ├── css/
│   │   └── style.css         # Premium dark glassmorphism styles
│   └── js/
│       └── script.js         # Frontend logic — fetch, autocomplete, modals, TMDB
│
├── tmdb_5000_movies.csv      # Raw TMDB movies dataset (required for training)
├── tmdb_5000_credits.csv     # Raw TMDB credits dataset (required for training)
│
└── docs/
    └── screenshots/          # Add your screenshots here
```

---

## ⚙️ Installation

### Prerequisites

- Python 3.9 or higher
- pip package manager
- A **TMDB API key** (free — see [Getting Your TMDB API Key](#-getting-your-tmdb-api-key))
- The TMDB 5000 dataset CSV files (from [Kaggle](https://www.kaggle.com/datasets/tmdb/tmdb-movie-metadata))

### Step 1 — Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/movie-recommendation-system.git
cd movie-recommendation-system
```

### Step 2 — Create and Activate a Virtual Environment (Recommended)

```bash
# macOS / Linux
python3 -m venv venv
source venv/bin/activate

# Windows
python -m venv venv
venv\Scripts\activate
```

### Step 3 — Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 4 — Download the Dataset

Download the following two CSV files from Kaggle and place them in the project root directory:

- [`tmdb_5000_movies.csv`](https://www.kaggle.com/datasets/tmdb/tmdb-movie-metadata?select=tmdb_5000_movies.csv)
- [`tmdb_5000_credits.csv`](https://www.kaggle.com/datasets/tmdb/tmdb-movie-metadata?select=tmdb_5000_credits.csv)

### Step 5 — Configure Your TMDB API Key

Open `static/js/script.js` and replace the existing key with your own:

```javascript
// static/js/script.js
const TMDB_API_KEY = 'YOUR_TMDB_API_KEY_HERE';
```

> 🔑 See [Getting Your TMDB API Key](#-getting-your-tmdb-api-key) below.

---

## 🚀 How to Run

### Step 1 — Train the Model

This preprocesses the raw CSV data, builds the cosine similarity matrix, and saves the pickle files into `models/`.

```bash
python train_model.py
```

Expected output:
```
Loading datasets...
Merging datasets on title...
Cleaning missing values and duplicates...
Parsing metadata fields...
Applying Porter Stemmer...
Vectorizing and computing cosine similarity...
Saving pickles...
Model preprocessing and training completed successfully!
```

> ⏱️ This typically takes **30–90 seconds** depending on your hardware.

### Step 2 — Start the Flask Server

```bash
python app.py
```

Expected output:
```
Preloading recommendation models...
Movies and similarity models loaded successfully.
 * Serving Flask app 'app'
 * Debug mode: on
 * Running on http://0.0.0.0:5001
```

### Step 3 — Open in Browser

Navigate to:

```
http://localhost:5001
```

---

## 🔑 Getting Your TMDB API Key

1. Visit [https://www.themoviedb.org/](https://www.themoviedb.org/) and create a free account.
2. Go to **Account Settings** → **API** → **Request an API Key**.
3. Select **Developer** and fill in the required fields.
4. Copy your **API Key (v3 auth)**.
5. Replace the key in `static/js/script.js` as described above.

> ⚠️ **Keep your API key private.** Do not commit it to a public repository. Consider using environment variables for production deployments.

---

## 📊 Dataset Information

| Property | Value |
|---|---|
| **Source** | [TMDB 5000 Movie Dataset — Kaggle](https://www.kaggle.com/datasets/tmdb/tmdb-movie-metadata) |
| **Movies** | 4,806 (after merging and cleaning) |
| **Features Used** | `overview`, `genres`, `keywords`, `cast` (top 3), `crew` (director) |
| **Feature Size** | 5,000-dimensional bag-of-words vector per movie |
| **Similarity Matrix** | 4,806 × 4,806 cosine similarity matrix |
| **Files** | `tmdb_5000_movies.csv`, `tmdb_5000_credits.csv` |

### Columns Used

| Column | Source File | Description |
|---|---|---|
| `title` | movies.csv | Movie title (used for matching) |
| `overview` | movies.csv | Plot summary |
| `genres` | movies.csv | List of genres |
| `keywords` | movies.csv | Associated keywords |
| `cast` | credits.csv | Top 3 cast members |
| `crew` | credits.csv | Director name |
| `id` | movies.csv | TMDB movie ID (for API calls) |
| `vote_average` | movies.csv | TMDB rating score |
| `popularity` | movies.csv | TMDB popularity metric |
| `release_date` | movies.csv | Release date |
| `runtime` | movies.csv | Movie duration in minutes |
| `original_language` | movies.csv | Language code |

---

## 🔬 Model Training Details

The model training script (`train_model.py`) performs the following pipeline:

```python
# 1. Merge datasets
movies = pd.read_csv('tmdb_5000_movies.csv')
credits = pd.read_csv('tmdb_5000_credits.csv')
movies = movies.merge(credits, on='title')

# 2. Parse and clean JSON-like columns
movies['genres'] = movies['genres'].apply(convert_genres_keywords)
movies['keywords'] = movies['keywords'].apply(convert_genres_keywords)
movies['cast'] = movies['cast'].apply(lambda x: get_top_cast(x, limit=3))
movies['director'] = movies['crew'].apply(get_director)

# 3. Build unified tags string
movies['tags'] = (
    overview_words + genres + keywords + cast + director
)

# 4. Apply Porter Stemming
movies['tags'] = movies['tags'].apply(stem)

# 5. Vectorise
cv = CountVectorizer(max_features=5000, stop_words='english')
vectors = cv.fit_transform(movies['tags']).toarray()

# 6. Compute cosine similarity
similarity = cosine_similarity(vectors)

# 7. Pickle
pickle.dump(movies_metadata, open('models/movies.pkl', 'wb'))
pickle.dump(similarity, open('models/similarity.pkl', 'wb'))
```

### Recommendation Function

```python
def recommend(movie_title):
    # Case-insensitive + fuzzy matching for robustness
    index = find_movie_index(movie_title)
    
    # Sort by similarity score (descending)
    distances = sorted(
        enumerate(similarity[index]),
        reverse=True,
        key=lambda x: x[1]
    )
    
    # Return top 10 (excluding the movie itself)
    return [movies.iloc[i[0]] for i in distances[1:11]]
```

---

## 🔮 Future Improvements

- [ ] **Collaborative Filtering** — Combine content-based with user rating history using Matrix Factorisation
- [ ] **User Accounts** — Registration, login, and personalised watchlists
- [ ] **Advanced Filters** — Filter recommendations by genre, language, year range, or rating threshold
- [ ] **TF-IDF Vectorisation** — Replace CountVectorizer with TF-IDF for better weighting of rare terms
- [ ] **Streaming Availability** — Show which platforms (Netflix, Prime, Hotstar) the movie is available on
- [ ] **Review Sentiment** — Integrate TMDB user review sentiment to boost or demote recommendations
- [ ] **Mobile App** — React Native wrapper around the Flask API

---

## 🙏 Acknowledgements

- **[TMDB (The Movie Database)](https://www.themoviedb.org/)** — for the comprehensive movie metadata API and dataset
- **[Kaggle TMDB 5000 Movie Dataset](https://www.kaggle.com/datasets/tmdb/tmdb-movie-metadata)** — the dataset used to train the recommendation model
- **[Scikit-Learn](https://scikit-learn.org/)** — for CountVectorizer and cosine_similarity
- **[NLTK](https://www.nltk.org/)** — for the Porter Stemmer
- **[Font Awesome](https://fontawesome.com/)** — for the UI icon library
- **[Google Fonts](https://fonts.google.com/)** — for the Inter and Outfit typefaces

---

## 🤝 Contribution & Development Notes

This project is a reflection of my machine learning learning journey, and I want to be transparent about how it was built:

- **Machine Learning Model & Recommendation Pipeline:** The content-based filtering approach, feature engineering (combining overview, genres, keywords, cast, and crew into tags), CountVectorizer, Porter Stemming, and cosine similarity computation were implemented by me as part of my ML coursework and self-learning journey. I understand how each step of the pipeline functions and why specific choices were made.

- **Web Application & Frontend:** The web frontend (UI design, HTML/CSS layout, JavaScript interactivity, and a significant portion of the Flask API integration) was developed with the assistance of AI coding tools. This allowed me to build a polished, production-quality interface that would otherwise take much longer to implement independently.

- **Integration, Testing & Deployment:** I personally integrated the ML model with the web application, configured the TMDB API integration, tested the full recommendation pipeline end-to-end, debugged edge cases, and customised the application to match my vision for the project.

- **Learning Outcome:** This project represents both my ability to implement a machine learning recommendation system and my practical approach to modern software development — using AI-assisted tools as a force multiplier while maintaining full understanding and ownership of the project.

> I believe being transparent about AI-assisted development is a mark of professional integrity. This is increasingly a standard practice in the industry.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2026 Aryan Raghuwanshi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

## 👤 Author

<div align="center">

**Aryan Raghuwanshi**

[![GitHub](https://img.shields.io/badge/GitHub-Aryanraghuwanshi7-181717?style=for-the-badge&logo=github)](https://github.com/Aryanraghuwanshi7)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=for-the-badge&logo=linkedin)](https://linkedin.com/in/aryanraghuwanshi)

*Built with ❤️ using Flask and Machine Learning*

</div>

---

<div align="center">

⭐ **If you found this project useful, please give it a star!** ⭐

</div>
