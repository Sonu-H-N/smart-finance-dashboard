// api.js — thin fetch wrapper shared by every page.
// Configure the backend origin once here (empty string = same-origin deploy).
export const API_BASE = window.__API_BASE__ || "http://localhost:4000/api";

const TOKEN_KEY = "sf_token";
const USER_KEY = "sf_user";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isLoggedIn() {
  return Boolean(getToken());
}

/**
 * Core request helper. Throws an ApiError with a user-safe message on
 * failure. On 401 (expired/invalid session) it clears the session and
 * redirects to the login page automatically.
 */
export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function apiRequest(path, { method = "GET", body, params } = {}) {
  let url = `${API_BASE}${path}`;
  if (params) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    if (qs) url += `?${qs}`;
  }

  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new ApiError(
      "Can't reach the server. Check your connection or that the API is running.",
      0
    );
  }

  if (response.status === 204) return null;

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // no JSON body — fine for some responses
  }

  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/auth/")) {
      clearSession();
      window.location.href = "login.html";
    }
    throw new ApiError(payload?.error || "Something went wrong.", response.status, payload?.details);
  }

  return payload;
}

export const api = {
  get: (path, params) => apiRequest(path, { method: "GET", params }),
  post: (path, body) => apiRequest(path, { method: "POST", body }),
  put: (path, body) => apiRequest(path, { method: "PUT", body }),
  patch: (path, body) => apiRequest(path, { method: "PATCH", body }),
  del: (path) => apiRequest(path, { method: "DELETE" }),
};
