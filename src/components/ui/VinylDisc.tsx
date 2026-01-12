import React from 'react';

interface VinylDiscProps {
  active: boolean;
  size?: number;
}

export const VinylDisc: React.FC<VinylDiscProps> = ({ active, size = 80 }) => {
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
        .vinyl-spin {
          animation: spin 2s linear infinite;
        }
        .vinyl-stopped {
          animation: none;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      
      <g className={active ? 'vinyl-spin' : 'vinyl-stopped'} style={{ transformOrigin: '40px 40px' }}>
        {/* Outer disc */}
        <circle cx="40" cy="40" r="32" stroke="#F5A524" strokeWidth="2" fill="none"/>
        
        {/* Grooves */}
        <circle cx="40" cy="40" r="26" stroke="#F5A524" strokeWidth="1" fill="none" opacity="0.5"/>
        <circle cx="40" cy="40" r="20" stroke="#F5A524" strokeWidth="1" fill="none" opacity="0.5"/>
        
        {/* Label area */}
        <circle cx="40" cy="40" r="12" stroke="#F5A524" strokeWidth="2" fill="none"/>
        
        {/* Center hole */}
        <circle cx="40" cy="40" r="3" fill="#F5A524"/>
        
        {/* Label detail (makes rotation visible) */}
        <circle cx="40" cy="32" r="2" fill="#F5A524"/>
      </g>
    </svg>
  );
};

export default VinylDisc;
