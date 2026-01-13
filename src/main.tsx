import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// One-time cache clear for existing users with stale PWA cache
// This version number should be incremented when a breaking cache issue is fixed
const CACHE_VERSION = "v7";
const CACHE_CLEARED_KEY = `ember-amp-cache-cleared-${CACHE_VERSION}`;

async function clearStaleCaches(): Promise<void> {
  // Skip if already cleared for this version
  if (localStorage.getItem(CACHE_CLEARED_KEY)) {
    return;
  }

  // Clear all caches
  if ("caches" in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      console.log("Cleared stale caches:", cacheNames);
    } catch (err) {
      console.warn("Failed to clear caches:", err);
    }
  }

  // Unregister all service workers to force fresh registration
  if ("serviceWorker" in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
      console.log("Unregistered service workers:", registrations.length);
    } catch (err) {
      console.warn("Failed to unregister service workers:", err);
    }
  }

  // Mark as cleared
  localStorage.setItem(CACHE_CLEARED_KEY, "true");

  // Reload to apply changes (only if we actually cleared something)
  if ("caches" in window || "serviceWorker" in navigator) {
    window.location.reload();
  }
}

// Setup PWA update prompt
function setupPWAUpdatePrompt(): void {
  const updateSW = registerSW({
    onNeedRefresh() {
      // Show update prompt to user
      showUpdateToast(updateSW);
    },
    onOfflineReady() {
      console.log("App ready for offline use");
    },
  });
}

// Show update toast notification
function showUpdateToast(
  updateSW: (reloadPage?: boolean) => Promise<void>,
): void {
  // Create toast element
  const toast = document.createElement("div");
  toast.id = "pwa-update-toast";
  toast.innerHTML = `
    <div style="
      position: fixed;
      bottom: 64px;
      left: 50%;
      transform: translateX(-50%);
      background: #111113;
      border: 1px solid rgba(245, 158, 11, 0.4);
      border-radius: 8px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      z-index: 9999;
      font-family: Inter, system-ui, sans-serif;
    ">
      <span style="color: #e8dccc; font-size: 14px;">New version available</span>
      <button id="pwa-update-btn" style="
        background: #F59E0B;
        color: #e8dccc;
        border: none;
        border-radius: 4px;
        padding: 6px 12px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
      ">Refresh</button>
      <button id="pwa-dismiss-btn" style="
        background: transparent;
        color: #A1A1AA;
        border: none;
        padding: 4px 8px;
        font-size: 13px;
        cursor: pointer;
      ">Later</button>
    </div>
  `;

  document.body.appendChild(toast);

  // Handle refresh click
  document.getElementById("pwa-update-btn")?.addEventListener("click", () => {
    updateSW(true);
  });

  // Handle dismiss click
  document.getElementById("pwa-dismiss-btn")?.addEventListener("click", () => {
    toast.remove();
  });
}

// Run cache clear before rendering
clearStaleCaches().then(() => {
  // Setup PWA update handling
  setupPWAUpdatePrompt();

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
