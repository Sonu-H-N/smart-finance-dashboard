window.login = function () {

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  if (username === "admin" && password === "1234") {
    localStorage.setItem("loggedIn", "true");
    window.location.href = "index.html";
  } else {
    document.getElementById("error").innerText = "Invalid credentials";
  }

};

// Allow pressing Enter in either field to submit
document.addEventListener("DOMContentLoaded", () => {
  const username = document.getElementById("username");
  const password = document.getElementById("password");

  [username, password].forEach(field => {
    if (!field) return;
    field.addEventListener("keydown", e => {
      if (e.key === "Enter") window.login();
    });
  });

  // If already logged in, skip straight to the dashboard
  if (localStorage.getItem("loggedIn") === "true") {
    window.location.href = "index.html";
  }
});

// Register service worker for offline support
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {
    // Offline support unavailable (e.g. file:// protocol) — non-fatal
  });
}