import React from 'react';

export const WavesIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg
      viewBox="0 0 120 28"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M0 15 C 30 28, 30 0, 60 15 C 90 28, 90 0, 120 15 L 120 28 L 0 28 Z" />
    </svg>
  );
};
