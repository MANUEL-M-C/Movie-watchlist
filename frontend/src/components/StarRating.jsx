import React, { useState } from 'react';
import { Star } from 'lucide-react';

const StarRating = ({ rating = 0, onRate, disabled = false, size = 20 }) => {
  const [hoverRating, setHoverRating] = useState(0);

  const handleClick = (starValue) => {
    if (disabled || !onRate) return;
    // Clicking the same rating again resets to 0 (unrated) or updates to new rating
    const newRating = starValue === rating ? 0 : starValue;
    onRate(newRating);
  };

  return (
    <div className="star-rating-container" role="group" aria-label="5 Star Rating">
      {[1, 2, 3, 4, 5].map((starValue) => {
        const isFilled = hoverRating ? starValue <= hoverRating : starValue <= rating;
        return (
          <button
            key={starValue}
            type="button"
            className={`star-btn ${isFilled ? 'filled' : 'empty'} ${disabled ? 'disabled' : ''}`}
            onClick={() => handleClick(starValue)}
            onMouseEnter={() => !disabled && setHoverRating(starValue)}
            onMouseLeave={() => !disabled && setHoverRating(0)}
            disabled={disabled}
            aria-label={`Rate ${starValue} star${starValue > 1 ? 's' : ''}`}
            title={`Rate ${starValue} / 5`}
          >
            <Star
              size={size}
              className={`star-icon ${isFilled ? 'icon-filled' : 'icon-empty'}`}
              fill={isFilled ? '#f59e0b' : 'none'}
              stroke={isFilled ? '#f59e0b' : '#6b7280'}
              strokeWidth={1.75}
            />
          </button>
        );
      })}
      <span className="rating-text">
        {hoverRating > 0
          ? `${hoverRating}/5`
          : rating > 0
          ? `${rating}/5`
          : 'Unrated'}
      </span>
    </div>
  );
};

export default StarRating;
