/**
 * Device detection utilities
 * Uses user-agent and media queries for reliable mobile detection
 */

/**
 * Detect if the device is a mobile/tablet based on user agent.
 * This is more reliable than window width for detecting actual mobile devices
 * vs desktop browsers with small windows.
 * 
 * @returns true if the device is mobile/tablet, false for desktop
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    return false;
  }
  
  const userAgent = navigator.userAgent || navigator.vendor || '';
  
  // Check for mobile/tablet user agents
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i;
  
  // Also check for touch-only devices without mouse (more reliable for tablets)
  const isTouchOnly = 'ontouchstart' in window && 
    navigator.maxTouchPoints > 0 && 
    !matchMedia('(pointer: fine)').matches;
  
  return mobileRegex.test(userAgent) || isTouchOnly;
}

