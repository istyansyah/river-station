import React from 'react';

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ className = '', ...props }) => {
  return (
    <div
      className={`animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      role="status"
      aria-label="loading"
      {...props}
    />
  );
};
