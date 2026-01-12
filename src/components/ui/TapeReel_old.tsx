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
      style={{ opacity: active ? 1 : 0.4, transition: "opacity 0.3s ease" }}
    >
      <style>{`
        .reel-spin {
          animation: spin 2s linear infinite reverse;
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
      <rect x="4" y="8" width="72" height="64" rx="4" stroke="#F5A524" strokeWidth="2" fill="none"/>

      {/* Top panel line */}
      <line x1="4" y1="52" x2="76" y2="52" stroke="#F5A524" strokeWidth="1.5"/>

      {/* Left Reel */}
      <g
        className={active ? 'reel-spin' : 'reel-stopped'}
        style={{ transformOrigin: '22px 30px' }}
      >
        <circle cx="22" cy="30" r="14" stroke="#F5A524" strokeWidth="2" fill="none"/>
        <circle cx="22" cy="30" r="5" stroke="#F5A524" strokeWidth="1.5" fill="none"/>
        <line x1="22" y1="16" x2="22" y2="25" stroke="#F5A524" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="22" y1="35" x2="22" y2="44" stroke="#F5A524" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="8" y1="30" x2="17" y2="30" stroke="#F5A524" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="27" y1="30" x2="36" y2="30" stroke="#F5A524" strokeWidth="1.5" strokeLinecap="round"/>
      </g>

      {/* Right Reel */}
      <g
        className={active ? 'reel-spin' : 'reel-stopped'}
        style={{ transformOrigin: '58px 30px' }}
      >
        <circle cx="58" cy="30" r="14" stroke="#F5A524" strokeWidth="2" fill="none"/>
        <circle cx="58" cy="30" r="5" stroke="#F5A524" strokeWidth="1.5" fill="none"/>
        <line x1="58" y1="16" x2="58" y2="25" stroke="#F5A524" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="58" y1="35" x2="58" y2="44" stroke="#F5A524" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="44" y1="30" x2="53" y2="30" stroke="#F5A524" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="63" y1="30" x2="72" y2="30" stroke="#F5A524" strokeWidth="1.5" strokeLinecap="round"/>
      </g>

      {/* Tape path between reels */}
      <path
        d="M 22 44 Q 22 48 28 48 L 52 48 Q 58 48 58 44"
        stroke="#F5A524"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* Tape head */}
      <rect x="36" y="46" width="8" height="5" rx="1" stroke="#F5A524" strokeWidth="1.5" fill="none"/>

      {/* Control buttons */}
      <circle cx="20" cy="62" r="4" stroke="#F5A524" strokeWidth="1.5" fill="none"/>
      <circle cx="40" cy="62" r="4" stroke="#F5A524" strokeWidth="1.5" fill="none"/>
      <circle cx="60" cy="62" r="4" stroke="#F5A524" strokeWidth="1.5" fill="none"/>

      {/* Play triangle in middle button */}
      <path d="M 38 60 L 43 62 L 38 64 Z" fill="#F5A524"/>
    </svg>
  );
};

export default TapeReel;
