import { useState } from "react";

interface StarRatingProps {
  rating: number;
  onChange?: (rating: number) => void;
  maxStars?: number;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function StarRating({
  rating,
  onChange,
  maxStars = 5,
  disabled = false,
  className = "",
  size = "md",
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const sizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-2xl",
  };

  const isInteractive = !!onChange && !disabled;

  const handleRating = (value: number) => {
    if (isInteractive) {
      onChange(value);
    }
  };

  return (
    <div
      className={`flex items-center gap-1 ${className}`}
      data-testid={isInteractive ? "star-picker" : "star-rating-static"}
    >
      {Array.from({ length: maxStars }, (_, i) => i + 1).map((star) => {
        const isActive = star <= (hoverRating || rating);

        if (isInteractive) {
          return (
            <button
              key={star}
              type="button"
              data-testid={`star-${star}`}
              onClick={() => handleRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className={`${sizes[size]} transition-transform hover:scale-110 focus:outline-none`}
            >
              {isActive ? (
                <span className="text-yellow-400">★</span>
              ) : (
                <span className="text-gray-300">☆</span>
              )}
            </button>
          );
        }

        return (
          <span
            key={star}
            className={`${sizes[size]} ${isActive ? "text-yellow-400" : "text-gray-300"}`}
          >
            {isActive ? "★" : "☆"}
          </span>
        );
      })}
    </div>
  );
}
