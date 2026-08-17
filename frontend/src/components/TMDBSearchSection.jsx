import React, { useState } from 'react';
import api from '../services/api';
import {
  Search,
  Film,
  Tv,
  Plus,
  Check,
  Star,
  Calendar,
  Sparkles,
  AlertCircle,
  X,
  Loader2,
} from 'lucide-react';

const TMDBSearchSection = ({ onMediaAdded, existingMediaList = [] }) => {
  const [query, setQuery] = useState('');
  const [mediaType, setMediaType] = useState('movie'); // 'movie' or 'tv'
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchedQuery, setSearchedQuery] = useState('');
  const [addingTmdbId, setAddingTmdbId] = useState(null);

  // Set of existing TMDB IDs in the user's watchlist for fast duplicate detection
  const existingTmdbIds = new Set(
    existingMediaList
      .filter((item) => item.tmdb_id)
      .map((item) => item.tmdb_id)
  );

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) {
      setErrorMessage('Enter a movie or TV show name.');
      return;
    }

    setIsSearching(true);
    setErrorMessage('');
    setSearchedQuery(query.trim());

    try {
      const response = await api.get('/api/tmdb/search/', {
        params: {
          query: query.trim(),
          type: mediaType,
        },
      });

      setResults(response.data?.results || []);
    } catch (err) {
      console.error('TMDB Search failed:', err);
      let msg = 'Movie service is temporarily unavailable.';
      if (err.response?.data?.error) {
        msg = err.response.data.error;
      } else if (err.code === 'ERR_NETWORK') {
        msg = 'Cannot connect to the Django server. Make sure the backend is running.';
      }
      setErrorMessage(msg);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setErrorMessage('');
    setSearchedQuery('');
  };

  const handleAdd = async (item) => {
    if (addingTmdbId) return;
    setAddingTmdbId(item.tmdb_id);

    try {
      const payload = {
        title: item.title,
        type: item.type,
        status: 'Unwatched',
        rating: 0,
        tmdb_id: item.tmdb_id,
        poster_path: item.poster_path || '',
        genre: Array.isArray(item.genre) ? item.genre.join(', ') : item.genre || '',
        tmdb_rating: item.tmdb_rating || 0.0,
        overview: item.overview || '',
        release_date: item.release_date || '',
      };

      const res = await api.post('/api/media/', payload);
      if (onMediaAdded) {
        onMediaAdded(res.data);
      }
    } catch (err) {
      console.error('Failed to add TMDB title:', err);
      let msg = 'Failed to add title to watchlist.';
      if (err.response?.data?.tmdb_id) {
        msg = Array.isArray(err.response.data.tmdb_id)
          ? err.response.data.tmdb_id[0]
          : err.response.data.tmdb_id;
      } else if (err.response?.data?.detail) {
        msg = err.response.data.detail;
      }
      setErrorMessage(msg);
    } finally {
      setAddingTmdbId(null);
    }
  };

  return (
    <section className="tmdb-search-section">
      <div className="tmdb-search-header">
        <div className="tmdb-badge">
          <Sparkles size={16} className="tmdb-sparkle-icon" />
          <span>TMDB Movie & TV Discovery</span>
        </div>
        <h3 className="tmdb-heading">Search & Add to Your Watchlist</h3>
        <p className="tmdb-subheading">
          Explore millions of movies and shows with real posters, ratings, and genre tags.
        </p>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="tmdb-search-form">
        <div className="tmdb-input-group">
          {/* Movie / TV Toggle */}
          <div className="media-type-selector">
            <button
              type="button"
              className={`type-toggle-btn ${mediaType === 'movie' ? 'active' : ''}`}
              onClick={() => setMediaType('movie')}
              title="Search Movies"
            >
              <Film size={16} />
              <span>Movies</span>
            </button>
            <button
              type="button"
              className={`type-toggle-btn ${mediaType === 'tv' ? 'active' : ''}`}
              onClick={() => setMediaType('tv')}
              title="Search TV Shows"
            >
              <Tv size={16} />
              <span>TV Shows</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="tmdb-input-wrapper">
            <Search size={18} className="search-field-icon" />
            <input
              type="text"
              className="tmdb-search-input"
              placeholder={`Search ${mediaType === 'movie' ? 'movies' : 'TV shows'} by title (e.g. Inception, Breaking Bad)...`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isSearching}
            />
            {query && (
              <button
                type="button"
                className="btn-clear-query"
                onClick={handleClear}
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Search Button */}
          <button
            type="submit"
            className="btn btn-primary tmdb-search-btn"
            disabled={isSearching || !query.trim()}
          >
            {isSearching ? (
              <>
                <Loader2 size={16} className="spin" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Search size={16} />
                <span>Search TMDB</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Error Message */}
      {errorMessage && (
        <div className="alert-box error tmdb-alert" role="alert">
          <AlertCircle size={18} className="alert-icon" />
          <div className="alert-message">{errorMessage}</div>
          <button
            type="button"
            className="alert-close"
            onClick={() => setErrorMessage('')}
          >
            ×
          </button>
        </div>
      )}

      {/* Search Results Grid */}
      {isSearching ? (
        <div className="tmdb-loading-state">
          <div className="spinner"></div>
          <p>Searching TMDB database for "{query}"...</p>
        </div>
      ) : results.length > 0 ? (
        <div className="tmdb-results-container">
          <div className="results-header-row">
            <h4 className="results-count-title">
              Found {results.length} result{results.length !== 1 ? 's' : ''} for "{searchedQuery}"
            </h4>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={handleClear}
            >
              Close Results
            </button>
          </div>

          <div className="tmdb-poster-grid">
            {results.map((item) => {
              const isAlreadyInWatchlist = existingTmdbIds.has(item.tmdb_id);
              const isCurrentlyAdding = addingTmdbId === item.tmdb_id;
              const releaseYear = item.release_date
                ? item.release_date.substring(0, 4)
                : null;
              const posterUrl = item.poster_path
                ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                : null;

              return (
                <div key={item.tmdb_id} className="tmdb-result-card">
                  {/* Poster Image */}
                  <div className="tmdb-poster-frame">
                    {posterUrl ? (
                      <img
                        src={posterUrl}
                        alt={item.title}
                        className="tmdb-poster-img"
                        loading="lazy"
                      />
                    ) : (
                      <div className="tmdb-no-poster">
                        {item.type === 'Movie' ? (
                          <Film size={36} className="no-poster-icon" />
                        ) : (
                          <Tv size={36} className="no-poster-icon" />
                        )}
                        <span>No Poster</span>
                      </div>
                    )}

                    {/* TMDB Rating Badge */}
                    {item.tmdb_rating > 0 && (
                      <div className="tmdb-rating-overlay" title={`TMDB Rating: ${item.tmdb_rating}/10`}>
                        <Star size={12} fill="#f59e0b" stroke="#f59e0b" />
                        <span>{item.tmdb_rating}</span>
                      </div>
                    )}

                    {/* Type Badge */}
                    <div className="tmdb-type-overlay">
                      {item.type === 'Movie' ? 'Movie' : 'TV'}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="tmdb-card-content">
                    <h4 className="tmdb-item-title" title={item.title}>
                      {item.title}
                    </h4>

                    <div className="tmdb-item-meta">
                      {releaseYear && (
                        <span className="tmdb-meta-year">
                          <Calendar size={12} />
                          {releaseYear}
                        </span>
                      )}
                      {item.genre && item.genre.length > 0 && (
                        <span className="tmdb-meta-genres">
                          {item.genre.slice(0, 2).join(' • ')}
                        </span>
                      )}
                    </div>

                    {item.overview && (
                      <p className="tmdb-item-overview" title={item.overview}>
                        {item.overview}
                      </p>
                    )}

                    {/* Add to Watchlist Button */}
                    <div className="tmdb-action-wrapper">
                      {isAlreadyInWatchlist ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-in-watchlist"
                          disabled
                          title="Already in your watchlist"
                        >
                          <Check size={14} />
                          <span>In Watchlist</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary btn-add-tmdb"
                          onClick={() => handleAdd(item)}
                          disabled={isCurrentlyAdding}
                        >
                          {isCurrentlyAdding ? (
                            <>
                              <Loader2 size={14} className="spin" />
                              <span>Adding...</span>
                            </>
                          ) : (
                            <>
                              <Plus size={14} />
                              <span>Add to Watchlist</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : searchedQuery && !isSearching ? (
        <div className="tmdb-empty-search">
          <Film size={40} className="empty-search-icon" />
          <h4>No {mediaType === 'movie' ? 'movies' : 'TV shows'} found</h4>
          <p>We couldn't find any results matching "{searchedQuery}". Try another search title.</p>
        </div>
      ) : null}
    </section>
  );
};

export default TMDBSearchSection;
