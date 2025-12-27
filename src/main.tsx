import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// One-time cache clear for existing users with stale PWA cache
// This version number should be incremented when a breaking cache issue is fixed
const CACHE_VERSION = 'v2';
const CACHE_CLEARED_KEY = `ember-amp-cache-cleared-${CACHE_VERSION}`;

async function clearStaleCaches(): Promise<void> {
  // Skip if already cleared for this version
  if (localStorage.getItem(CACHE_CLEARED_KEY)) {
    return;
  }

  // Clear all caches
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('Cleared stale caches:', cacheNames);
    } catch (err) {
      console.warn('Failed to clear caches:', err);
    }
  }

  // Unregister all service workers to force fresh registration
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
      console.log('Unregistered service workers:', registrations.length);
    } catch (err) {
      console.warn('Failed to unregister service workers:', err);
    }
  }

  // Mark as cleared
  localStorage.setItem(CACHE_CLEARED_KEY, 'true');

  // Reload to apply changes (only if we actually cleared something)
  if ('caches' in window || 'serviceWorker' in navigator) {
    window.location.reload();
  }
}

// Run cache clear before rendering
clearStaleCaches().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});

