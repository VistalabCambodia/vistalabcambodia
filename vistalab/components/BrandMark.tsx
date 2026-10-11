import React from 'react';

export function BrandMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" role="img" aria-label="VistaLab mark" fill="none">
      <path d="M7 10 22.5 39 41 8" stroke="#153C73" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M39 4.5c-3.8 5.4-5.4 8.5-5.4 11.1a5.6 5.6 0 0 0 11.2 0c0-2.6-1.7-5.7-5.8-11.1Z" fill="#278548" />
      <path d="M39.5 10.1c-1.1 1.4-1.6 2.5-1.6 3.6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
