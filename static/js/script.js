/**
 * CineMatch Frontend Logic
 * Implements: Asynchronous API calls, Autocomplete with keyboard nav,
 * TMDB Poster & Trailer integration, Favorites and Search History, Carousel controls
 */

// TMDB Config - key is loaded dynamically from the server at startup
let TMDB_API_KEY = '';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

/**
 * Fetches the TMDB API key from the Flask backend (reads from TMDB_API_KEY env var).
 * Must be called before any TMDB API requests.
 */
async function initTmdbApiKey() {
    try {
        const res = await fetch('/api/tmdb-config');
        if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
        const data = await res.json();
        if (data.apiKey && data.apiKey.length > 0) {
            TMDB_API_KEY = data.apiKey;
        } else {
            console.warn('TMDB_API_KEY is not configured on the server. Posters will use fallback images.');
        }
    } catch (e) {
        console.warn('Could not load TMDB config from server:', e.message);
    }
}


// State Variables
let popularMoviesList = [];
let trendingMoviesList = [];
let recommendedMoviesList = [];
let currentSearchedMovie = null;

// DOM Elements
const searchInput = document.getElementById('movie-search-input');
const autocompleteDropdown = document.getElementById('autocomplete-dropdown');
const recommendBtn = document.getElementById('recommend-btn');
const clearSearchBtn = document.getElementById('clear-search-btn');
const recentSearchesTags = document.getElementById('recent-searches-tags');
const recentSearchesContainer = document.getElementById('recent-searches-container');

// Section Containers
const recommendationsSection = document.getElementById('recommendations-section');
const recommendationsTitle = document.getElementById('recommendations-title');
const recommendationsGrid = document.getElementById('recommendations-grid');
const searchedMovieSummary = document.getElementById('searched-movie-summary');
const closeResultsBtn = document.getElementById('close-results-btn');

const trendingCarouselTrack = document.getElementById('trending-carousel-track');
const popularGrid = document.getElementById('popular-grid');

// Carousel Controls
const trendPrev = document.getElementById('trend-prev');
const trendNext = document.getElementById('trend-next');

// Modals
const movieDetailModal = document.getElementById('movie-detail-modal');
const modalBodyContent = document.getElementById('modal-body-content');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalBackdropClose = document.getElementById('modal-backdrop-close');

const trailerModal = document.getElementById('trailer-modal');
const trailerVideoContainer = document.getElementById('trailer-video-container');
const trailerCloseBtn = document.getElementById('trailer-close-btn');
const trailerBackdropClose = document.getElementById('trailer-backdrop-close');

// Drawer Favorites
const favoritesDrawer = document.getElementById('favorites-drawer');
const favoritesToggle = document.getElementById('favorites-toggle');
const closeDrawerBtn = document.getElementById('close-drawer-btn');
const drawerOverlay = document.getElementById('drawer-overlay');
const favoritesListContainer = document.getElementById('favorites-list-container');
const favBadge = document.getElementById('fav-badge');

// Theme Toggle
const themeToggle = document.getElementById('theme-toggle');

// Toast Container
const toastContainer = document.getElementById('toast-container');

// Keyboard Navigation autocomplete state
let activeSuggestionIndex = -1;

/* ==========================================================================
   Initialization
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
    // Load TMDB API key from server env FIRST (must complete before poster fetches)
    await initTmdbApiKey();

    // Load Landing Page content (posters will now use the valid key)
    fetchPopularMovies();
    fetchTrendingMovies();
    
    // Setup Event Listeners
    initSearchEvents();
    initCarouselEvents();
    initModalEvents();
    initDrawerEvents();
    initThemeToggle();
    
    // Render Favorite badge and tags
    updateFavoritesBadge();
    renderRecentSearches();
    
    // Page load animation effect
    document.body.classList.add('loaded');
});

/* ==========================================================================
   Theme management
   ========================================================================== */

function initThemeToggle() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }
    
    themeToggle.addEventListener('click', () => {
        if (document.body.classList.contains('dark-theme')) {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
            localStorage.setItem('theme', 'light');
            showToast('Midnight light theme active', 'info');
        } else {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
            themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
            localStorage.setItem('theme', 'dark');
            showToast('Cinematic dark theme active', 'info');
        }
    });
}

/* ==========================================================================
   TMDB Dynamic Poster Retrieval
   ========================================================================== */

const TMDB_CACHE = new Map();

/**
 * Fetches detailed info about a movie from TMDB API with cache & timeout.
 */
async function fetchTmdbDetails(movieId) {
    if (!movieId) return null;
    if (TMDB_CACHE.has(movieId)) {
        return TMDB_CACHE.get(movieId);
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    
    try {
        const response = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (response.status === 401) {
            throw new Error('Invalid API key');
        } else if (response.status === 404) {
            throw new Error('Movie not found');
        } else if (!response.ok) {
            throw new Error(`HTTP Error ${response.status}`);
        }
        
        const data = await response.json();
        TMDB_CACHE.set(movieId, data);
        return data;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Network timeout');
        }
        throw error;
    }
}

/**
 * Fetches the movie poster from TMDB API. If fails, returns a generated SVG fallback.
 */
async function fetchPosterUrl(tmdbId, movieTitle) {
    if (!tmdbId) return getPosterFallback(movieTitle);
    
    try {
        const details = await fetchTmdbDetails(tmdbId);
        if (details && details.poster_path) {
            return `${TMDB_IMAGE_BASE}${details.poster_path}`;
        }
    } catch (e) {
        console.warn(`Could not load TMDB poster for movie: ${movieTitle} (ID: ${tmdbId}). Error: ${e.message}`);
        if (e.message === 'Invalid API key') {
            showToast('TMDB API key is invalid.', 'error');
        }
    }
    return getPosterFallback(movieTitle);
}

function getPosterFallback(title) {
    const cleanTitle = title.replace(/[&<>"']/g, "");
    // Base64 encode SVG to prevent double-quotes escaping in HTML attributes
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450"><rect width="100%" height="100%" fill="#1E293B"/><g fill="#64748B"><rect x="100" y="160" width="100" height="80" rx="6" fill="none" stroke="#64748B" stroke-width="4"/><path d="M120 220 L140 190 L160 210 L180 180 L200 220 Z"/></g><text x="50%" y="300" font-family="sans-serif" font-weight="bold" font-size="16" fill="#E2E8F0" text-anchor="middle">${cleanTitle}</text><text x="50%" y="330" font-family="sans-serif" font-size="12" fill="#94A3B8" text-anchor="middle">Poster Unavailable</text></svg>`;
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}


/* ==========================================================================
   Data Fetching Actions
   ========================================================================== */

async function fetchPopularMovies() {
    try {
        const response = await fetch('/api/movies/popular');
        if (!response.ok) throw new Error('Failed to load popular movies');
        
        popularMoviesList = await response.json();
        renderMovieGrid(popularGrid, popularMoviesList);
    } catch (error) {
        console.error(error);
        showToast('Error loading popular movies', 'error');
    }
}

async function fetchTrendingMovies() {
    try {
        const response = await fetch('/api/movies/trending');
        if (!response.ok) throw new Error('Failed to load trending movies');
        
        trendingMoviesList = await response.json();
        renderCarousel(trendingCarouselTrack, trendingMoviesList);
    } catch (error) {
        console.error(error);
        showToast('Error loading trending movies', 'error');
    }
}

async function getRecommendations(movieTitle) {
    if (!movieTitle) return;
    
    // Show spinner & reset grid
    recommendationsSection.classList.remove('hidden');
    recommendationsGrid.innerHTML = `
        <div class="spinner-wrapper">
            <div class="spinner"></div>
        </div>
    `;
    searchedMovieSummary.innerHTML = `
        <div class="spinner-wrapper">
            <div class="spinner"></div>
        </div>
    `;
    
    // Smooth scroll to results
    recommendationsSection.scrollIntoView({ behavior: 'smooth' });
    
    try {
        const response = await fetch('/api/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ movie: movieTitle })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            if (data.type === 'NOT_FOUND') {
                renderEmptyState(recommendationsGrid, `No movie found matching "${movieTitle}". Please try another search.`);
                searchedMovieSummary.innerHTML = '';
                showToast(`Movie not found`, 'error');
            } else {
                throw new Error(data.error || 'Server error');
            }
            return;
        }
        
        currentSearchedMovie = data.searched_movie;
        recommendedMoviesList = data.recommendations;
        
        // Render
        renderSearchedMovieSummary(currentSearchedMovie);
        renderMovieGrid(recommendationsGrid, recommendedMoviesList);
        recommendationsTitle.innerHTML = `Similar to <span class="text-accent">${currentSearchedMovie.title}</span>`;
        
        // Add to history
        addSearchHistory(currentSearchedMovie.title);
        
        // Update hero backdrop dynamically if backdrop exists
        setHeroBackdrop(currentSearchedMovie.movie_id);
        
    } catch (error) {
        console.error(error);
        renderEmptyState(recommendationsGrid, `Something went wrong: ${error.message}`);
        searchedMovieSummary.innerHTML = '';
        showToast('Error generating recommendations', 'error');
    }
}

async function setHeroBackdrop(tmdbId) {
    try {
        // Use the unified cache-backed fetchTmdbDetails to avoid redundant API calls
        const data = await fetchTmdbDetails(tmdbId);
        if (data && data.backdrop_path) {
            const backdropUrl = `https://image.tmdb.org/t/p/original${data.backdrop_path}`;
            const backdropEl = document.getElementById('hero-backdrop');
            backdropEl.style.backgroundImage = `url(${backdropUrl})`;
            backdropEl.style.opacity = '0.22';
        }
    } catch (e) {
        console.warn('Could not update hero backdrop:', e.message);
    }
}


/* ==========================================================================
   Render UI Components
   ========================================================================== */

function renderMovieGrid(container, movies) {
    container.innerHTML = '';
    if (movies.length === 0) {
        renderEmptyState(container, 'No movies found.');
        return;
    }
    
    movies.forEach(movie => {
        const card = createMovieCard(movie);
        container.appendChild(card);
    });
}

function renderCarousel(container, movies) {
    container.innerHTML = '';
    if (movies.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No trending movies.</p></div>';
        return;
    }
    
    movies.forEach(movie => {
        const card = createMovieCard(movie);
        container.appendChild(card);
    });
}

function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.dataset.id = movie.movie_id;
    
    const isFav = isMovieFavorite(movie.movie_id);
    
    card.innerHTML = `
        <div class="card-poster-wrapper">
            <div class="spinner-wrapper">
                <div class="spinner"></div>
            </div>
            <img class="card-poster" src="" alt="${movie.title}" loading="lazy">
            <span class="card-rating-badge"><i class="fa-solid fa-star"></i> ${movie.vote_average.toFixed(1)}</span>
            <button class="card-favorite-btn ${isFav ? 'active' : ''}" aria-label="Favorite">
                <i class="fa-${isFav ? 'solid' : 'regular'} fa-heart"></i>
            </button>
        </div>
        <div class="card-content">
            <h3 class="card-title">${movie.title}</h3>
            <div class="card-metadata">
                <span>${movie.release_year}</span>
                <span class="meta-divider"></span>
                <span>${movie.original_language}</span>
            </div>
            <p class="card-genres">${movie.genres.slice(0, 2).join(', ')}</p>
        </div>
    `;
    
    const img = card.querySelector('.card-poster');
    const spinner = card.querySelector('.spinner-wrapper');
    
    img.onload = () => {
        if (spinner) {
            spinner.style.opacity = '0';
            setTimeout(() => spinner.remove(), 250);
        }
        img.style.opacity = '1';
    };
    
    img.onerror = () => {
        if (img.dataset.fallback) return;
        img.dataset.fallback = 'true';
        img.src = getPosterFallback(movie.title);
        if (spinner) {
            spinner.style.opacity = '0';
            setTimeout(() => spinner.remove(), 250);
        }
        img.style.opacity = '1';
    };
    
    // Load poster asynchronously
    fetchPosterUrl(movie.movie_id, movie.title).then(url => {
        img.src = url;
    });
    
    // Bind Details Click on the card content/poster
    card.querySelector('.card-poster-wrapper').addEventListener('click', (e) => {
        if (e.target.closest('.card-favorite-btn')) return; // ignore favorite click
        openDetailsModal(movie);
    });
    card.querySelector('.card-content').addEventListener('click', () => {
        openDetailsModal(movie);
    });
    
    // Bind Favorite Button click
    const favBtn = card.querySelector('.card-favorite-btn');
    favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(movie, favBtn);
    });
    
    return card;
}

async function renderSearchedMovieSummary(movie) {
    const posterUrl = await fetchPosterUrl(movie.movie_id, movie.title);
    searchedMovieSummary.innerHTML = `
        <img class="summary-poster-small" src="${posterUrl}" alt="${movie.title}">
        <div class="summary-info">
            <span class="section-category">Now showing similar to:</span>
            <h3>${movie.title}</h3>
            <div class="summary-meta">
                <span>${movie.release_year}</span>
                <span>•</span>
                <span>Rating: <strong class="text-accent">${movie.vote_average.toFixed(1)}/10</strong></span>
                <span>•</span>
                <span>Director: ${movie.director || 'N/A'}</span>
            </div>
            <p class="summary-desc">${movie.overview}</p>
        </div>
    `;
}

function renderEmptyState(container, message) {
    container.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1;">
            <i class="fa-solid fa-circle-info empty-icon"></i>
            <p>${message}</p>
        </div>
    `;
}

/* ==========================================================================
   Autocomplete search suggestions logic
   ========================================================================== */

let debounceTimer;

function initSearchEvents() {
    // Input key typing
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        
        if (query) {
            clearSearchBtn.style.display = 'block';
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                fetchAutocompleteSuggestions(query);
            }, 250); // 250ms debounce
        } else {
            clearSearchBtn.style.display = 'none';
            closeSuggestions();
        }
    });
    
    // Keyboard listener inside search input for autocomplete list
    searchInput.addEventListener('keydown', (e) => {
        const items = autocompleteDropdown.querySelectorAll('.suggestion-item');
        if (!items.length) return;
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeSuggestionIndex = (activeSuggestionIndex + 1) % items.length;
            highlightSuggestion(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeSuggestionIndex = (activeSuggestionIndex - 1 + items.length) % items.length;
            highlightSuggestion(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeSuggestionIndex > -1 && items[activeSuggestionIndex]) {
                selectSuggestion(items[activeSuggestionIndex].dataset.title);
            } else {
                triggerSearch(searchInput.value.trim());
            }
        } else if (e.key === 'Escape') {
            closeSuggestions();
        }
    });
    
    // Button clicks
    recommendBtn.addEventListener('click', () => {
        triggerSearch(searchInput.value.trim());
    });
    
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        closeSuggestions();
        searchInput.focus();
    });
    
    // Close suggestions on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            closeSuggestions();
        }
    });
    
    // Close results action
    closeResultsBtn.addEventListener('click', () => {
        recommendationsSection.classList.add('hidden');
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        // Reset hero backdrop
        document.getElementById('hero-backdrop').style.backgroundImage = 'url("https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1925&auto=format&fit=crop")';
        document.getElementById('hero-backdrop').style.opacity = '0.15';
    });
}

async function fetchAutocompleteSuggestions(query) {
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('API Error');
        const suggestions = await response.json();
        
        renderSuggestions(suggestions);
    } catch (e) {
        console.error('Failed to fetch autocomplete suggestions:', e);
    }
}

function renderSuggestions(suggestions) {
    autocompleteDropdown.innerHTML = '';
    activeSuggestionIndex = -1;
    
    if (suggestions.length === 0) {
        autocompleteDropdown.innerHTML = `<div class="no-suggestion-item">"No movie found."</div>`;
        autocompleteDropdown.classList.add('active');
        return;
    }
    
    suggestions.forEach(title => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.dataset.title = title;
        div.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i> <span>${title}</span>`;
        
        div.addEventListener('click', () => {
            selectSuggestion(title);
        });
        autocompleteDropdown.appendChild(div);
    });
    
    autocompleteDropdown.classList.add('active');
}

function highlightSuggestion(items) {
    items.forEach((item, idx) => {
        if (idx === activeSuggestionIndex) {
            item.classList.add('selected');
            // Ensure scrolled into view in dropdown
            item.scrollIntoView({ block: 'nearest' });
            searchInput.value = item.dataset.title; // preview in input box
        } else {
            item.classList.remove('selected');
        }
    });
}

function selectSuggestion(title) {
    searchInput.value = title;
    closeSuggestions();
    triggerSearch(title);
}

function closeSuggestions() {
    autocompleteDropdown.classList.remove('active');
    autocompleteDropdown.innerHTML = '';
    activeSuggestionIndex = -1;
}

function triggerSearch(query) {
    if (!query) {
        showToast('Please type a movie name first.', 'info');
        return;
    }
    closeSuggestions();
    getRecommendations(query);
}

/* ==========================================================================
   Details Modal Logic
   ========================================================================== */

function initModalEvents() {
    // Closes detail modal
    modalCloseBtn.addEventListener('click', closeDetailsModal);
    modalBackdropClose.addEventListener('click', closeDetailsModal);
    
    // Closes trailer modal
    trailerCloseBtn.addEventListener('click', closeTrailerModal);
    trailerBackdropClose.addEventListener('click', closeTrailerModal);
    
    // Esc key close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDetailsModal();
            closeTrailerModal();
        }
    });
}

async function openDetailsModal(movie) {
    // Show details modal and block main page scrolling
    movieDetailModal.classList.add('open');
    document.body.style.overflow = 'hidden';
    
    // Set loading placeholder or clear modal content first to show transition
    modalBodyContent.innerHTML = `
        <div class="spinner-wrapper" style="padding: 100px 0;">
            <div class="spinner"></div>
        </div>
    `;
    
    let posterUrl = getPosterFallback(movie.title);
    let backdropUrl = '';
    let tmdbInfo = null;
    
    try {
        posterUrl = await fetchPosterUrl(movie.movie_id, movie.title);
        backdropUrl = posterUrl; // fallback
        
        tmdbInfo = await fetchTmdbDetails(movie.movie_id);
        if (tmdbInfo && tmdbInfo.backdrop_path) {
            backdropUrl = `https://image.tmdb.org/t/p/original${tmdbInfo.backdrop_path}`;
        }
    } catch (e) {
        console.warn(`Could not load details from TMDB API: ${e.message}`);
    }
    
    const isFav = isMovieFavorite(movie.movie_id);
    
    // Resolve display variables (TMDB API values preferred with database fallback)
    const title = tmdbInfo ? tmdbInfo.title : movie.title;
    const rating = tmdbInfo ? tmdbInfo.vote_average : movie.vote_average;
    const overview = tmdbInfo ? tmdbInfo.overview : movie.overview;
    const runtime = tmdbInfo ? tmdbInfo.runtime : movie.runtime;
    const releaseDate = tmdbInfo ? tmdbInfo.release_date : movie.release_date;
    const releaseYear = (releaseDate && releaseDate.includes('-')) ? releaseDate.split('-')[0] : movie.release_year;
    const genres = (tmdbInfo && tmdbInfo.genres) ? tmdbInfo.genres.map(g => g.name) : movie.genres;
    const language = tmdbInfo ? tmdbInfo.original_language.toUpperCase() : movie.original_language;
    const popularity = tmdbInfo ? tmdbInfo.popularity : movie.popularity;
    
    modalBodyContent.innerHTML = `
        <div class="modal-hero">
            <div class="modal-hero-backdrop" style="background-image: url('${backdropUrl}')"></div>
            <div class="modal-hero-overlay"></div>
            <div class="modal-hero-content">
                <img class="modal-poster" src="${posterUrl}" alt="${title}">
                <div class="modal-main-details">
                    <h2 class="modal-title">${title}</h2>
                    <div class="modal-meta-row">
                        <span class="modal-rating-pill"><i class="fa-solid fa-star"></i> ${rating.toFixed(1)}</span>
                        <span class="meta-divider"></span>
                        <span>${releaseYear}</span>
                        <span class="meta-divider"></span>
                        <span>${runtime > 0 ? runtime + ' min' : 'N/A'}</span>
                        <span class="meta-divider"></span>
                        <span>${language}</span>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-content-grid">
            <div class="modal-overview-section">
                <h4>Overview</h4>
                <p class="modal-overview-text">${overview || 'No description available.'}</p>
                <div class="modal-action-row">
                    <button class="btn btn-primary" id="modal-watch-trailer-btn">
                        <i class="fa-solid fa-play"></i> Watch Trailer
                    </button>
                    <button class="btn btn-secondary" id="modal-recommend-similar-btn">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> Recommend Similar
                    </button>
                    <button class="btn btn-secondary ${isFav ? 'active' : ''}" id="modal-favorite-btn">
                        <i class="fa-${isFav ? 'solid' : 'regular'} fa-heart"></i> ${isFav ? 'Bookmarked' : 'Add to Favorites'}
                    </button>
                </div>
            </div>
            <div class="modal-info-list">
                <div class="info-item">
                    <span class="info-label">Director</span>
                    <span class="info-value">${movie.director || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Top Cast</span>
                    <span class="info-value">${movie.cast && movie.cast.length > 0 ? movie.cast.slice(0, 5).join(', ') : 'N/A'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Genres</span>
                    <div class="genre-tags-list">
                        ${genres.map(g => `<span class="genre-tag">${g}</span>`).join('')}
                    </div>
                </div>
                <div class="info-item">
                    <span class="info-label">Popularity</span>
                    <span class="info-value">${popularity.toFixed(1)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Release Date</span>
                    <span class="info-value">${releaseDate || 'N/A'}</span>
                </div>
            </div>
        </div>
    `;
    
    // Bind Watch Trailer click
    document.getElementById('modal-watch-trailer-btn').addEventListener('click', () => {
        openTrailerModal(movie.movie_id, title);
    });
    
    // Bind Recommend Similar click
    document.getElementById('modal-recommend-similar-btn').addEventListener('click', () => {
        closeDetailsModal();
        triggerSearch(title);
    });
    
    // Bind Favorite click
    const favBtn = document.getElementById('modal-favorite-btn');
    favBtn.addEventListener('click', () => {
        toggleFavorite(movie, favBtn);
        // Toggle text inside modal button
        const active = isMovieFavorite(movie.movie_id);
        favBtn.innerHTML = `<i class="fa-${active ? 'solid' : 'regular'} fa-heart"></i> ${active ? 'Bookmarked' : 'Add to Favorites'}`;
        // Sync original grids
        const gridFavBtn = document.querySelector(`.movie-card[data-id="${movie.movie_id}"] .card-favorite-btn`);
        if (gridFavBtn) {
            gridFavBtn.classList.toggle('active', active);
            gridFavBtn.innerHTML = `<i class="fa-${active ? 'solid' : 'regular'} fa-heart"></i>`;
        }
    });
}

function closeDetailsModal() {
    movieDetailModal.classList.remove('open');
    document.body.style.overflow = '';
}

/* ==========================================================================
   Trailer Modal Embed Logic
   ========================================================================== */

async function openTrailerModal(tmdbId, title) {
    if (!tmdbId) {
        showToast('Trailer unavailable: Invalid ID', 'error');
        return;
    }
    
    // Show spinner in trailer container
    trailerVideoContainer.innerHTML = `
        <div class="spinner-wrapper" style="position:absolute; top:40%; left:45%">
            <div class="spinner"></div>
        </div>
    `;
    trailerModal.classList.add('open');
    
    // Fetch trailer videos with timeout protection
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    
    try {
        const response = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/videos?api_key=${TMDB_API_KEY}`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (response.status === 401) throw new Error('Invalid API key');
        if (response.status === 404) throw new Error('Movie not found');
        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
        
        const data = await response.json();
        const videos = data.results || [];
        
        // Find first YouTube Trailer, then Teaser, then any YouTube video
        const trailer = videos.find(v => v.site === 'YouTube' && v.type === 'Trailer')
            || videos.find(v => v.site === 'YouTube' && v.type === 'Teaser')
            || videos.find(v => v.site === 'YouTube');
        
        if (trailer && trailer.key) {
            // Embed YouTube iframe
            trailerVideoContainer.innerHTML = `
                <iframe src="https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0&modestbranding=1" 
                    title="${title} Official Trailer" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                </iframe>
            `;
        } else {
            // Fallback YouTube search link
            const searchQuery = encodeURIComponent(`${title} official movie trailer`);
            trailerVideoContainer.innerHTML = `
                <div class="empty-state" style="padding: 100px 20px;">
                    <i class="fa-brands fa-youtube empty-icon text-accent"></i>
                    <p style="margin-bottom:20px">No official trailer available on TMDB for this movie.</p>
                    <a href="https://www.youtube.com/results?search_query=${searchQuery}" target="_blank" class="btn btn-primary">
                        <i class="fa-solid fa-up-right-from-square"></i> Search on YouTube
                    </a>
                </div>
            `;
            showToast('Direct trailer embed not found.', 'info');
        }
        
    } catch (e) {
        clearTimeout(timeoutId);
        console.error('Trailer error:', e.message);
        
        let errorMsg = `Failed to retrieve trailer: ${e.message}`;
        if (e.name === 'AbortError') errorMsg = 'Trailer request timed out. Please try again.';
        
        trailerVideoContainer.innerHTML = `
            <div class="empty-state" style="padding: 100px 20px;">
                <i class="fa-solid fa-triangle-exclamation empty-icon"></i>
                <p>${errorMsg}</p>
            </div>
        `;
        showToast(errorMsg, 'error');
    }
}

function closeTrailerModal() {
    trailerModal.classList.remove('open');
    trailerVideoContainer.innerHTML = ''; // Kill video stream/audio
}

/* ==========================================================================
   Favorites Drawer Management
   ========================================================================== */

function initDrawerEvents() {
    favoritesToggle.addEventListener('click', (e) => {
        e.preventDefault();
        openDrawer();
    });
    
    closeDrawerBtn.addEventListener('click', closeDrawer);
    drawerOverlay.addEventListener('click', closeDrawer);
}

function openDrawer() {
    favoritesDrawer.classList.add('open');
    drawerOverlay.classList.add('active');
    renderFavoritesList();
}

function closeDrawer() {
    favoritesDrawer.classList.remove('open');
    drawerOverlay.classList.remove('active');
}

function getFavorites() {
    return JSON.parse(localStorage.getItem('favorites')) || [];
}

function isMovieFavorite(movieId) {
    const list = getFavorites();
    return list.some(item => item.movie_id === movieId);
}

function toggleFavorite(movie, btnEl) {
    let list = getFavorites();
    const id = movie.movie_id;
    const exists = list.some(item => item.movie_id === id);
    
    if (exists) {
        // remove
        list = list.filter(item => item.movie_id !== id);
        localStorage.setItem('favorites', JSON.stringify(list));
        if (btnEl) {
            btnEl.classList.remove('active');
            btnEl.innerHTML = btnEl.classList.contains('card-favorite-btn') ? `<i class="fa-regular fa-heart"></i>` : `<i class="fa-regular fa-heart"></i> Add to Favorites`;
        }
        showToast(`Removed "${movie.title}" from favorites`, 'info');
    } else {
        // add
        list.push({
            movie_id: movie.movie_id,
            title: movie.title,
            genres: movie.genres,
            vote_average: movie.vote_average,
            release_year: movie.release_year,
            original_language: movie.original_language,
            overview: movie.overview,
            cast: movie.cast,
            director: movie.director,
            popularity: movie.popularity,
            release_date: movie.release_date,
            runtime: movie.runtime
        });
        localStorage.setItem('favorites', JSON.stringify(list));
        if (btnEl) {
            btnEl.classList.add('active');
            btnEl.innerHTML = btnEl.classList.contains('card-favorite-btn') ? `<i class="fa-solid fa-heart"></i>` : `<i class="fa-solid fa-heart"></i> Bookmarked`;
        }
        showToast(`Added "${movie.title}" to favorites`, 'success');
    }
    
    updateFavoritesBadge();
    
    // If favorites drawer is open, refresh its list
    if (favoritesDrawer.classList.contains('open')) {
        renderFavoritesList();
    }
}

function updateFavoritesBadge() {
    const count = getFavorites().length;
    favBadge.textContent = count;
    favBadge.style.display = count > 0 ? 'inline-block' : 'none';
}

function renderFavoritesList() {
    favoritesListContainer.innerHTML = '';
    const favorites = getFavorites();
    
    if (favorites.length === 0) {
        favoritesListContainer.innerHTML = `
            <div class="empty-state" style="padding-top:100px">
                <i class="fa-solid fa-heart-circle-xmark empty-icon"></i>
                <p>Your bookmark list is empty.</p>
                <p style="font-size:0.85rem; margin-top:8px">Click the heart icon on any movie card to add it here.</p>
            </div>
        `;
        return;
    }
    
    favorites.forEach(movie => {
        const item = document.createElement('div');
        item.className = 'fav-item';
        
        item.innerHTML = `
            <img class="fav-item-poster" src="" alt="${movie.title}">
            <div class="fav-item-details">
                <span class="fav-item-title">${movie.title}</span>
                <div class="fav-item-meta">
                    <span class="text-accent"><i class="fa-solid fa-star"></i> ${movie.vote_average.toFixed(1)}</span>
                    <span>•</span>
                    <span>${movie.release_year}</span>
                </div>
            </div>
            <span class="fav-item-remove" title="Remove Favorite"><i class="fa-solid fa-trash-can"></i></span>
        `;
        
        // Load poster async
        fetchPosterUrl(movie.movie_id, movie.title).then(url => {
            item.querySelector('.fav-item-poster').src = url;
        });
        
        // Open details on click
        item.addEventListener('click', (e) => {
            if (e.target.closest('.fav-item-remove')) return;
            closeDrawer();
            openDetailsModal(movie);
        });
        
        // Remove favorite on delete click
        item.querySelector('.fav-item-remove').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(movie);
            
            // Sync grids in main dashboard
            const gridFavBtn = document.querySelector(`.movie-card[data-id="${movie.movie_id}"] .card-favorite-btn`);
            if (gridFavBtn) {
                gridFavBtn.classList.remove('active');
                gridFavBtn.innerHTML = `<i class="fa-regular fa-heart"></i>`;
            }
        });
        
        favoritesListContainer.appendChild(item);
    });
}

/* ==========================================================================
   Search History LocalStorage
   ========================================================================== */

function getSearchHistory() {
    return JSON.parse(localStorage.getItem('searchHistory')) || [];
}

function addSearchHistory(title) {
    let list = getSearchHistory();
    // Keep list unique and max 5 items
    list = list.filter(item => item.toLowerCase() !== title.toLowerCase());
    list.unshift(title);
    list = list.slice(0, 5);
    
    localStorage.setItem('searchHistory', JSON.stringify(list));
    renderRecentSearches();
}

function renderRecentSearches() {
    const list = getSearchHistory();
    recentSearchesTags.innerHTML = '';
    
    if (list.length === 0) {
        recentSearchesContainer.style.display = 'none';
        return;
    }
    
    recentSearchesContainer.style.display = 'flex';
    
    list.forEach(title => {
        const tag = document.createElement('span');
        tag.className = 'recent-tag';
        tag.innerHTML = `<i class="fa-solid fa-clock"></i> ${title}`;
        
        tag.addEventListener('click', () => {
            searchInput.value = title;
            clearSearchBtn.style.display = 'block';
            triggerSearch(title);
        });
        
        recentSearchesTags.appendChild(tag);
    });
}

/* ==========================================================================
   Trending Carousel controls
   ========================================================================== */

function initCarouselEvents() {
    trendNext.addEventListener('click', () => {
        const scrollAmount = trendingCarouselTrack.clientWidth * 0.75;
        trendingCarouselTrack.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    });
    
    trendPrev.addEventListener('click', () => {
        const scrollAmount = trendingCarouselTrack.clientWidth * 0.75;
        trendingCarouselTrack.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    });
}

/* ==========================================================================
   Toast Notifications Utilities
   ========================================================================== */

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-triangle-exclamation';
    
    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Fade out and remove after 3.5s
    setTimeout(() => {
        toast.style.animation = 'fadeIn var(--transition-fast) reverse forwards';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3500);
}
