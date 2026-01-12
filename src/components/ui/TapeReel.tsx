import React from 'react';

interface TapeReelProps {
  active: boolean;
  size?: number;
}

export const TapeReel: React.FC<TapeReelProps> = ({ active, size = 80 }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 80 80" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ opacity: active ? 1 : 0.4, transition: 'opacity 0.3s ease' }}
    >
      <style>{`
        .reel-spin {
          animation: spin 1.5s linear infinite reverse;
        }
        .reel-stopped {
          animation: none;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      
      {/* Machine Body */}
      <rect x="8" y="12" width="64" height="56" rx="4" stroke="#F5A524" strokeWidth="2" fill="none"/>
      
      {/* Left Reel */}
      <g className={active ? 'reel-spin' : 'reel-stopped'} style={{ transformOrigin: '26px 36px' }}>
        <circle cx="26" cy="36" r="12" stroke="#F5A524" strokeWidth="2" fill="none"/>
        <circle cx="26" cy="36" r="3" fill="#F5A524"/>
        {/* 3 spokes at 120° intervals */}
        <line x1="26" y1="26" x2="26" y2="33" stroke="#F5A524" strokeWidth="2" strokeLinecap="round"/>
        <line x1="17.4" y1="41" x2="23.4" y2="37.5" stroke="#F5A524" strokeWidth="2" strokeLinecap="round"/>
        <line x1="34.6" y1="41" x2="28.6" y2="37.5" stroke="#F5A524" strokeWidth="2" strokeLinecap="round"/>
      </g>
      
      {/* Right Reel */}
      <g className={active ? 'reel-spin' : 'reel-stopped'} style={{ transformOrigin: '54px 36px' }}>
        <circle cx="54" cy="36" r="12" stroke="#F5A524" strokeWidth="2" fill="none"/>
        <circle cx="54" cy="36" r="3" fill="#F5A524"/>
        {/* 3 spokes at 120° intervals */}
        <line x1="54" y1="26" x2="54" y2="33" stroke="#F5A524" strokeWidth="2" strokeLinecap="round"/>
        <line x1="45.4" y1="41" x2="51.4" y2="37.5" stroke="#F5A524" strokeWidth="2" strokeLinecap="round"/>
        <line x1="62.6" y1="41" x2="56.6" y2="37.5" stroke="#F5A524" strokeWidth="2" strokeLinecap="round"/>
      </g>
      
      {/* Tape path */}
      <path d="M 26 48 Q 40 56 54 48" stroke="#F5A524" strokeWidth="2" fill="none" strokeLinecap="round"/>
      
      {/* Tape head */}
      <rect x="36" y="52" width="8" height="6" rx="1" stroke="#F5A524" strokeWidth="2" fill="none"/>
    </svg>
  );
};

export default TapeReel;
