import React, { useState } from 'react';
import { Film, Tv, CheckCircle, Trash2, Clock, AlertTriangle, Star, Calendar, Tag } from 'lucide-react';
import StarRating from './StarRating';

const MediaCard = ({ media, onUpdateStatus, onUpdateRating, onDelete }) => {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingRating, setIsUpdatingRating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isWatched = media.status === 'Watched';
  const releaseYear = media.release_date ? media.release_date.substring(0, 4) : null;
  const posterUrl = media.poster_path && !imageError
    ? `https://image.tmdb.org/t/p/w500${media.poster_path}`
    : null;

  const handleMarkWatched = async () => {
    try {
      setIsUpdatingStatus(true);
      await onUpdateStatus(media.id, 'Watched');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleRatingChange = async (newRating) => {
    try {
      setIsUpdatingRating(true);
      await onUpdateRating(media.id, newRating);
    } finally {
      setIsUpdatingRating(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onDelete(media.id);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className={`media-card ${isWatched ? 'card-watched' : 'card-unwatched'}`}>
      {/* Poster Image Container */}
      <div className="card-poster-wrapper">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={media.title}
            className="card-poster-img"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="card-poster-placeholder">
            {media.type === 'Movie' ? (
              <Film size={40} className="placeholder-icon" />
            ) : (
              <Tv size={40} className="placeholder-icon" />
            )}
            <span className="placeholder-text">No Poster</span>
          </div>
        )}

        {/* Status Pill Badge over Poster */}
        <div className="poster-overlay-badges">
          <div className="media-type-badge">
            {media.type === 'Movie' ? (
              <>
                <Film size={13} className="type-icon" />
                <span>Movie</span>
              </>
            ) : (
              <>
                <Tv size={13} className="type-icon" />
                <span>TV Show</span>
              </>
            )}
          </div>

          <span className={`status-pill ${isWatched ? 'status-watched' : 'status-unwatched'}`}>
            {isWatched ? (
              <>
                <CheckCircle size={12} />
                <span>Watched</span>
              </>
            ) : (
              <>
                <Clock size={12} />
                <span>To Watch</span>
              </>
            )}
          </span>
        </div>
      </div>

      <div className="media-card-body">
        {/* Title */}
        <h3 className="media-title" title={media.title}>
          {media.title}
        </h3>

        {/* Subtitle / Year / TMDB Rating */}
        <div className="media-meta-row">
          {releaseYear && (
            <span className="meta-year">
              <Calendar size={13} />
              {releaseYear}
            </span>
          )}

          {media.tmdb_rating > 0 && (
            <span className="tmdb-score-pill" title={`TMDB Rating: ${media.tmdb_rating} / 10`}>
              <Star size={12} className="star-icon-tmdb" fill="#f59e0b" stroke="#f59e0b" />
              <span>TMDB {media.tmdb_rating}</span>
            </span>
          )}
        </div>

        {/* Genres */}
        {media.genre && (
          <div className="card-genre-tags">
            {media.genre.split(',').slice(0, 3).map((g, idx) => (
              <span key={idx} className="genre-tag">
                {g.trim()}
              </span>
            ))}
          </div>
        )}

        {/* Overview (if available, brief preview) */}
        {media.overview && (
          <p className="card-overview-text" title={media.overview}>
            {media.overview}
          </p>
        )}

        {/* Watched: Personal 5-Star Rating */}
        {isWatched ? (
          <div className="rating-section">
            <span className="rating-label">My Rating:</span>
            <StarRating
              rating={media.rating}
              onRate={handleRatingChange}
              disabled={isUpdatingRating || isDeleting}
              size={18}
            />
          </div>
        ) : (
          <div className="unwatched-actions">
            <button
              type="button"
              className="btn btn-watch"
              onClick={handleMarkWatched}
              disabled={isUpdatingStatus || isDeleting}
              title="Mark as watched"
            >
              <CheckCircle size={16} />
              <span>{isUpdatingStatus ? 'Updating...' : 'Mark as Watched'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer / Delete */}
      <div className="media-card-footer">
        {showDeleteConfirm ? (
          <div className="delete-confirm-box">
            <span className="confirm-text">
              <AlertTriangle size={14} className="confirm-icon" />
              Delete this item?
            </span>
            <div className="confirm-actions">
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="footer-actions">
            <button
              type="button"
              className="btn-icon-delete"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting || isUpdatingStatus || isUpdatingRating}
              aria-label="Delete media item"
              title="Delete item"
            >
              <Trash2 size={15} />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaCard;
