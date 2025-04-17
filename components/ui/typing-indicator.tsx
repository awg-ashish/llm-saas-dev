import React from "react";

interface TypingIndicatorProps {
  /** Additional classes for the container */
  className?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  className = "",
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="bg-gray-300 dark:bg-gray-600 rounded-full h-2 w-2 mx-1 animate-bounce"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  );
};
