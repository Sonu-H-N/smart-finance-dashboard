import { api, ApiError, setSession, isLoggedIn } from "./api.js";
import { applyFieldErrors } from "./ui.js";

if (isLoggedIn()) {
  window.location.href = "index.html";
}

const form = document.getElementById("registerForm");
const submitBtn = document.getElementById("submitBtn");
const formError = document.getElementById("formError");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.classList.remove("show");
  applyFieldErrors(form, []);

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  submitBtn.disabled = true;
  submitBtn.textContent = "Creating account…";

  try {
    const { token, user } = await api.post("/auth/register", { name, email, password });
    setSession(token, user);
    window.location.href = "index.html";
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.details) applyFieldErrors(form, err.details);
      formError.textContent = err.message;
      formError.classList.add("show");
    } else {
      formError.textContent = "Something went wrong. Please try again.";
      formError.classList.add("show");
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Create account";
  }
});
