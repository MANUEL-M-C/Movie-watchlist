import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import MediaCard from '../components/MediaCard';
import StarRating from '../components/StarRating';
import TMDBSearchSection from '../components/TMDBSearchSection';
import {
  Film,
  Tv,
  LogOut,
  PlusCircle,
  Clock,
  CheckCircle2,
  Clapperboard,
  User,
  AlertCircle,
  RefreshCw,
  Search,
} from 'lucide-react';

const Watchlist = () => {
  const { user, logout } = useAuth();

  const [mediaList, setMediaList] = useState([]);
  const [activeTab, setActiveTab] = useState('Unwatched'); // 'Unwatched' (To Watch) or 'Watched'
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Manual Add Form State
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('Movie');
  const [newStatus, setNewStatus] = useState('Unwatched');
  const [newRating, setNewRating] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchMedia = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const response = await api.get('/api/media/');
      setMediaList(response.data);
    } catch (err) {
      console.error('Failed to load watchlist:', err);
      setErrorMessage('Could not load watchlist. Please try refreshing.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const handleTMDBMediaAdded = (createdItem) => {
    // Add to list and ensure we are in the item's status tab (typically Unwatched)
    setMediaList((prev) => [createdItem, ...prev]);
    setActiveTab(createdItem.status || 'Unwatched');
    setSuccessMessage(`"${createdItem.title}" added to your watchlist!`);
    setTimeout(() => setSuccessMessage(''), 4500);
  };

  const handleAddMedia = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsAdding(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const payload = {
        title: newTitle.trim(),
        type: newType,
        status: newStatus,
        rating: newStatus === 'Watched' ? newRating : 0,
      };

      const response = await api.post('/api/media/', payload);
      const createdItem = response.data;

      // Add to list and switch to the item's status tab
      setMediaList((prev) => [createdItem, ...prev]);
      setActiveTab(createdItem.status);

      // Reset form
      setNewTitle('');
      setNewType('Movie');
      setNewStatus('Unwatched');
      setNewRating(0);
      setShowAddForm(false);

      setSuccessMessage(`"${createdItem.title}" added to your watchlist!`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Failed to add media:', err);
      let msg = 'Failed to add media item.';
      if (err.response && err.response.data) {
        if (err.response.data.title) msg = `Title: ${err.response.data.title[0]}`;
        else if (err.response.data.detail) msg = err.response.data.detail;
      }
      setErrorMessage(msg);
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateStatus = async (id, newStatusVal) => {
    try {
      setErrorMessage('');
      const response = await api.patch(`/api/media/${id}/`, {
        status: newStatusVal,
      });

      const updated = response.data;
      setMediaList((prev) =>
        prev.map((item) => (item.id === id ? updated : item))
      );

      // Show toast and auto-switch to Watched tab if marked as watched
      if (newStatusVal === 'Watched') {
        setSuccessMessage(`Moved "${updated.title}" to Watched! Rate it below.`);
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      setErrorMessage('Could not update status. Please try again.');
    }
  };

  const handleUpdateRating = async (id, newRatingVal) => {
    try {
      setErrorMessage('');
      const response = await api.patch(`/api/media/${id}/`, {
        rating: newRatingVal,
      });

      const updated = response.data;
      setMediaList((prev) =>
        prev.map((item) => (item.id === id ? updated : item))
      );
    } catch (err) {
      console.error('Failed to update rating:', err);
      setErrorMessage('Could not update rating. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    try {
      setErrorMessage('');
      await api.delete(`/api/media/${id}/`);
      setMediaList((prev) => prev.filter((item) => item.id !== id));
      setSuccessMessage('Item removed from watchlist.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Failed to delete media:', err);
      setErrorMessage('Could not delete item. Please try again.');
    }
  };

  // Filtered lists for the two tabs
  const unwatchedItems = useMemo(
    () => mediaList.filter((item) => item.status === 'Unwatched'),
    [mediaList]
  );

  const watchedItems = useMemo(
    () => mediaList.filter((item) => item.status === 'Watched'),
    [mediaList]
  );

  const currentTabItems = activeTab === 'Unwatched' ? unwatchedItems : watchedItems;

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return currentTabItems;
    return currentTabItems.filter((item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
  }, [currentTabItems, searchQuery]);

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <header className="navbar">
        <div className="nav-brand">
          <Clapperboard size={26} className="brand-icon" />
          <div className="brand-text">
            <h2>Watchlist</h2>
            <span className="brand-tagline">Personal Cinema Hub</span>
          </div>
        </div>

        <div className="nav-user-menu">
          <div className="user-pill" title={`Logged in as ${user?.username || 'User'}`}>
            <User size={16} />
            <span className="username">{user?.username || 'Account'}</span>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-logout"
            onClick={logout}
            title="Log out of your account"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Messages / Alerts */}
        {errorMessage && (
          <div className="alert-box error" role="alert">
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

        {successMessage && (
          <div className="alert-box success" role="alert">
            <CheckCircle2 size={18} className="alert-icon" />
            <div className="alert-message">{successMessage}</div>
          </div>
        )}

        {/* TMDB Movie & TV Search & Discovery Section */}
        <TMDBSearchSection
          onMediaAdded={handleTMDBMediaAdded}
          existingMediaList={mediaList}
        />

        {/* Action Header & Tabs */}
        <section className="watchlist-controls">
          <div className="tabs-wrapper">
            <div className="tabs-list" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'Unwatched'}
                className={`tab-item ${activeTab === 'Unwatched' ? 'active' : ''}`}
                onClick={() => setActiveTab('Unwatched')}
              >
                <Clock size={17} />
                <span>To Watch</span>
                <span className="badge-count">{unwatchedItems.length}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'Watched'}
                className={`tab-item ${activeTab === 'Watched' ? 'active' : ''}`}
                onClick={() => setActiveTab('Watched')}
              >
                <CheckCircle2 size={17} />
                <span>Watched</span>
                <span className="badge-count">{watchedItems.length}</span>
              </button>
            </div>

            <button
              type="button"
              className={`btn ${showAddForm ? 'btn-secondary' : 'btn-outline'} btn-add-toggle`}
              onClick={() => setShowAddForm((prev) => !prev)}
            >
              <PlusCircle size={18} />
              <span>{showAddForm ? 'Close Manual Form' : 'Manual Add'}</span>
            </button>
          </div>
        </section>

        {/* Add Movie / Show Form Section (Custom / Manual addition) */}
        {showAddForm && (
          <section className="add-media-section">
            <div className="add-card">
              <h3 className="section-heading">Add Custom Title</h3>
              <form onSubmit={handleAddMedia} className="add-media-form">
                <div className="form-grid">
                  <div className="form-group span-2">
                    <label htmlFor="media-title">Title *</label>
                    <input
                      id="media-title"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Custom Home Video, Indie Film..."
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="media-type">Type</label>
                    <select
                      id="media-type"
                      className="form-select"
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                    >
                      <option value="Movie">🎬 Movie</option>
                      <option value="TV">📺 TV Show</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="media-status">Status</label>
                    <select
                      id="media-status"
                      className="form-select"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                    >
                      <option value="Unwatched">⏳ To Watch</option>
                      <option value="Watched">✅ Watched</option>
                    </select>
                  </div>

                  {newStatus === 'Watched' && (
                    <div className="form-group span-2 rating-form-row">
                      <label>Initial Rating (0-5 Stars)</label>
                      <StarRating
                        rating={newRating}
                        onRate={(val) => setNewRating(val)}
                        size={24}
                      />
                    </div>
                  )}
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isAdding || !newTitle.trim()}
                  >
                    {isAdding ? 'Adding...' : 'Save to Watchlist'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        {/* Filter within active tab */}
        <section className="search-bar-section">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder={`Filter titles in "${activeTab === 'Unwatched' ? 'To Watch' : 'Watched'}" list...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
                title="Clear filter"
              >
                ×
              </button>
            )}
          </div>
          <button
            type="button"
            className="btn-refresh"
            onClick={fetchMedia}
            title="Refresh list"
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
          </button>
        </section>

        {/* Media Grid / List */}
        <section className="media-display-section">
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading your watchlist...</p>
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="media-grid">
              {filteredItems.map((item) => (
                <MediaCard
                  key={item.id}
                  media={item}
                  onUpdateStatus={handleUpdateStatus}
                  onUpdateRating={handleUpdateRating}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              {searchQuery ? (
                <>
                  <Search size={48} className="empty-icon" />
                  <h3>No matches found</h3>
                  <p>No results matching "{searchQuery}" in this tab.</p>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear Filter
                  </button>
                </>
              ) : activeTab === 'Unwatched' ? (
                <>
                  <Film size={48} className="empty-icon" />
                  <h3>Your "To Watch" list is empty</h3>
                  <p>Search movies & TV shows using the TMDB search above to add your first title!</p>
                </>
              ) : (
                <>
                  <CheckCircle2 size={48} className="empty-icon" />
                  <h3>No watched titles yet</h3>
                  <p>
                    When you finish watching an item, mark it as watched to rate
                    and track it here.
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setActiveTab('Unwatched')}
                  >
                    View To Watch List
                  </button>
                </>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Watchlist;
