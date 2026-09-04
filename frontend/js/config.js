// config.js — loaded as a plain (non-module) script BEFORE the module
// scripts, so window.__API_BASE__ is available when api.js evaluates.
//
// Change this if your backend runs somewhere other than localhost:4000,
// or leave as-is for local development.
window.__API_BASE__ = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:4000/api"
  : `${window.location.origin}/api`;

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      // Offline shell unavailable (e.g. file:// protocol) — non-fatal
    });
  });
}
