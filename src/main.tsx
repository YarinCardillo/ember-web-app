import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// One-time cache clear for existing users with stale PWA cache
// This version number should be incremented when a breaking cache issue is fixed
const CACHE_VERSION = "v8";
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

  // Check for updates every 5 minutes while app is open
  // This is a lightweight fetch that doesn't affect audio or auto-refresh
  setInterval(
    () => {
      navigator.serviceWorker
        .getRegistration()
        .then((reg) => reg?.update())
        .catch(() => {
          // Silently ignore - network might be unavailable
        });
    },
    5 * 60 * 1000,
  ); // 5 minutes
}

// Show update toast notification
function showUpdateToast(
  updateSW: (reloadPage?: boolean) => Promise<void>,
): void {
  // Prevent duplicate toasts
  if (document.getElementById("pwa-update-toast")) {
    return;
  }

  // Create toast element with all styles on the root element
  const toast = document.createElement("div");
  toast.id = "pwa-update-toast";
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "64px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "#111113",
    border: "1px solid rgba(245, 158, 11, 0.4)",
    borderRadius: "8px",
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
    zIndex: "9999",
    fontFamily: "Inter, system-ui, sans-serif",
  });

  // Create text span
  const text = document.createElement("span");
  text.textContent = "New version available";
  Object.assign(text.style, {
    color: "#e8dccc",
    fontSize: "14px",
  });

  // Create refresh button
  const refreshBtn = document.createElement("button");
  refreshBtn.textContent = "Refresh";
  Object.assign(refreshBtn.style, {
    background: "#F59E0B",
    color: "#111113",
    border: "none",
    borderRadius: "4px",
    padding: "6px 12px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  });
  refreshBtn.onclick = () => {
    updateSW(true);
  };

  // Create dismiss button
  const dismissBtn = document.createElement("button");
  dismissBtn.textContent = "Later";
  Object.assign(dismissBtn.style, {
    background: "transparent",
    color: "#A1A1AA",
    border: "none",
    padding: "4px 8px",
    fontSize: "13px",
    cursor: "pointer",
  });
  dismissBtn.onclick = () => {
    toast.remove();
  };

  // Assemble and append
  toast.appendChild(text);
  toast.appendChild(refreshBtn);
  toast.appendChild(dismissBtn);
  document.body.appendChild(toast);
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
