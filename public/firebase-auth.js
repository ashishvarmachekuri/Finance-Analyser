
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

// Replace these values with your Firebase project's web configuration.

const firebaseConfig = {
  apiKey: "AIzaSyCJRC-pTYCye_OCi53BxaqXovDUlNI7L80",
  authDomain: "finance-analyser-48f76.firebaseapp.com",
  projectId: "finance-analyser-48f76",
  storageBucket: "finance-analyser-48f76.firebasestorage.app",
  messagingSenderId: "698639839161",
  appId: "1:698639839161:web:b2318fcbc1c8fb7e595068",
  measurementId: "G-DZ1BGKTCM7"
};


const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

window.financeAuth = {
  getCurrentUser: () => auth.currentUser,

  async getToken() {
    const user = auth.currentUser;
    if (!user) throw new Error("Please sign in first.");
    return user.getIdToken();
  },

  async googleLogin() {
    const provider = new GoogleAuthProvider();

    // Ask Google to display the account chooser.
    provider.setCustomParameters({
        prompt: "select_account"
    });

    await signInWithPopup(auth, provider);
},

  async emailLogin(email, password) {
    await signInWithEmailAndPassword(auth, email, password);
  },

  async register(email, password) {
    await createUserWithEmailAndPassword(auth, email, password);
  },

  async logout() {
    await signOut(auth);
  }
};

function createAuthScreen() {
  if (document.getElementById("firebase-auth-screen")) return;

  const screen = document.createElement("div");
  screen.id = "firebase-auth-screen";
  screen.innerHTML = `
    
<div class="auth-layout">
  <section class="auth-form-panel">
    <div class="auth-card">
      <div class="auth-logo">
        <div class="auth-logo-icon">₹</div>
        <span>Finance Analyser</span>
      </div>

      <div class="auth-heading">
        <h2>Welcome back</h2>
        <p id="firebase-auth-message">
          Sign in to continue to your dashboard.
        </p>
      </div>

      <button type="button" id="firebase-google-login"
              class="auth-google-button">
        <span class="google-letter" aria-hidden="true">
  <svg viewBox="0 0 48 48" width="17" height="17">
    <path fill="#4285F4" d="M43.6 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.7c3.9-3.6 6-8.9 6-15.3z"/>
    <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.7-5.1c-1.8 1.2-4 2-6.8 2-5.2 0-9.7-3.5-11.3-8.2H5.8v5.2A20 20 0 0 0 24 44z"/>
    <path fill="#FBBC05" d="M12.7 27.8a12 12 0 0 1 0-7.6V15H5.8a20 20 0 0 0 0 18l6.9-5.2z"/>
    <path fill="#EA4335" d="M24 12.1c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 6.2 29.5 4 24 4A20 20 0 0 0 5.8 15l6.9 5.2c1.6-4.7 6.1-8.1 11.3-8.1z"/>
  </svg>
</span>
        Continue with Google
      </button>

      <div class="auth-divider">
        <span></span>
        <span>or continue with email</span>
        <span></span>
      </div>

      <form id="firebase-email-form" class="auth-email-form">
        <label for="firebase-email">Email address</label>
        <input id="firebase-email" type="email"
          placeholder="Enter your email address"
          autocomplete="email" required>

        <label for="firebase-password">Password</label>
        <div class="auth-password-wrap">
          <input id="firebase-password" type="password"
            placeholder="Enter your password"
            autocomplete="current-password"
            minlength="6" required>
          <button type="button" id="toggle-password"
                  class="auth-password-toggle"
                  aria-label="Show password">Show</button>
        </div>

        <button type="submit" id="firebase-email-login"
                class="auth-submit-button">
          Sign in
        </button>

        <button type="button" id="firebase-register"
                class="auth-register-button">
          Create an account
        </button>
      </form>

      <p id="firebase-auth-error" class="auth-error" role="alert"></p>

      <div class="auth-privacy">
        <span aria-hidden="true">♢</span>
        Your financial data stays private and secure.
      </div>
    </div>
  </section>
</div>

  `;

  const style = document.createElement("style");
  
style.textContent = `
  

#firebase-auth-screen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
  background: #f3f6fb;
  font-family: Arial, Helvetica, sans-serif;
}

.auth-layout {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}


.auth-form-panel {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  box-sizing: border-box;
}

.auth-card {
  width: 100%;
  box-sizing: border-box;
  padding: 34px 32px 26px;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 12px 35px rgba(25, 45, 80, 0.10);
}


.auth-logo {
  display: none;
}

.auth-heading {
  margin: 0;
  color: #10264a;
  text-align: center;
}

.auth-heading h2 {
  margin: 0 0 6px;
  font-size: 28px;
  line-height: 1.3;
  font-weight: 700;
}

.auth-heading p {
  margin: 0;
  color: #8490a4;
  font-size: 13px;
  line-height: 1.5;
  text-align: center;
}

.auth-google-button {
  width: 100%;
  height: 46px;
  margin: 14px 0 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid #d8e0ec;
  border-radius: 5px;
  background: #ffffff;
  color: #172b4d;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.auth-google-button:hover {
  background: #f8faff;
  border-color: #c4d3ee;
}

.google-letter {
  font-size: 17px;
  font-weight: 700;
  color: #4285f4;
}

.auth-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 8px 0 14px;
  color: #8793a7;
  font-size: 10px;
}

.auth-divider::before,
.auth-divider::after {
  content: "";
  height: 1px;
  flex: 1;
  background: #dce3ed;
}

.auth-email-form label {
  display: block;
  margin: 10px 0 6px;
  color: #172b4d;
  font-size: 13px;
  font-weight: 600;
}

.auth-email-form input {
  width: 100%;
  height: 44px;
  box-sizing: border-box;
  padding: 0 11px;
  border: 1px solid #d8e0ec;
  border-radius: 5px;
  background: #ffffff;
  color: #172b4d;
  font-size: 13px;
  outline: none;
}

.auth-email-form input::placeholder {
  color: #9aa6ba;
}

.auth-email-form input:focus {
  border-color: #3762e8;
  box-shadow: 0 0 0 2px rgba(55, 98, 232, 0.10);
}

.auth-password-wrap {
  display: flex;
  align-items: center;
  position: relative;
}

.auth-password-wrap input {
  padding-right: 50px;
}

.auth-password-toggle {
  position: absolute;
  right: 10px;
  padding: 4px 0;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.auth-submit-button {
  width: 100%;
  height: 44px;
  margin-top: 14px;
  border: none;
  border-radius: 5px;
  background: #2859e8;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.auth-submit-button:hover {
  background: #1e49ce;
}

.auth-register-button {
  display: block;
  margin: 12px auto 0;
  padding: 4px;
  border: none;
  background: transparent;
  color: #2859e8;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.auth-register-button:hover {
  text-decoration: underline;
}

.auth-error {
  color: #dc2626;
  font-size: 11px;
  text-align: center;
  overflow-wrap: anywhere;
}

.auth-privacy {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #edf0f5;
  color: #8490a4;
  font-size: 11px;
  line-height: 1.5;
  text-align: center;
}

.auth-privacy span {
  margin-right: 5px;
  color: #647db9;
}

.auth-google-button:disabled,
.auth-submit-button:disabled,
.auth-register-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

@media (max-width: 480px) {
  #firebase-auth-screen {
    padding: 16px;
  }

  .auth-form-panel {
    max-width: 400px;
  }

  .auth-card {
    padding: 28px 22px 22px;
  }

  .auth-heading h2 {
    font-size: 25px;
  }
}


`;


  document.head.appendChild(style);
  document.body.appendChild(screen);

  const error = document.getElementById("firebase-auth-error");
  const email = document.getElementById("firebase-email");
  const password = document.getElementById("firebase-password");

const togglePassword = document.getElementById("toggle-password");

togglePassword.addEventListener("click", () => {
    const isPasswordHidden = password.type === "password";

    password.type = isPasswordHidden ? "text" : "password";
    togglePassword.textContent = isPasswordHidden ? "Hide" : "Show";

    togglePassword.setAttribute(
        "aria-label",
        isPasswordHidden ? "Hide password" : "Show password"
    );
});


async function runAuth(action) {
    const error = document.getElementById("firebase-auth-error");
    const buttons = document.querySelectorAll(
        "#firebase-auth-screen button"
    );

    error.textContent = "";
    buttons.forEach(button => {
        button.disabled = true;
    });

    try {
        await action();
        // Firebase's onAuthStateChanged listener handles successful sign-in.
    } catch (err) {
        console.error("Firebase authentication failed:", err);

        error.textContent = err.code
            ? `${err.code}: ${err.message}`
            : (err.message || "Authentication failed.");
    } finally {
        buttons.forEach(button => {
            button.disabled = false;
        });
    }
}

  document.getElementById("firebase-google-login").onclick = () =>
    runAuth(() => window.financeAuth.googleLogin());

  document.getElementById("firebase-email-form").onsubmit = event => {
  event.preventDefault();

  const registerButton = document.getElementById("firebase-register");
  const submitButton = document.getElementById("firebase-email-login");
  const message = document.getElementById("firebase-auth-message");

  if (registerButton.dataset.mode === "register") {
    // Submit registration when in registration mode.
    if (!email.checkValidity() || !password.checkValidity()) {
      document.getElementById("firebase-email-form").reportValidity();
      return;
    }

    runAuth(() =>
      window.financeAuth.register(email.value.trim(), password.value)
    );
    return;
  }

  runAuth(() =>
    window.financeAuth.emailLogin(email.value.trim(), password.value)
  );
};

  document.getElementById("firebase-register").onclick = () => {
  const message = document.getElementById("firebase-auth-message");
  const registerButton = document.getElementById("firebase-register");
  const submitButton = document.getElementById("firebase-email-login");
  const emailInput = document.getElementById("firebase-email");
  const passwordInput = document.getElementById("firebase-password");

  const isRegistering = registerButton.dataset.mode === "register";

  if (!isRegistering) {
    // Switch to registration mode.
    registerButton.dataset.mode = "register";
    message.textContent = "Create an account to get started.";
    submitButton.textContent = "Create account";
    registerButton.textContent = "Already have an account? Sign in";
    passwordInput.setAttribute("autocomplete", "new-password");
    emailInput.value = "";
    passwordInput.value = "";
    error.textContent = "";
    return;
  }

  if (!emailInput.checkValidity()) {
    emailInput.reportValidity();
    return;
  }

  if (!passwordInput.checkValidity()) {
    passwordInput.reportValidity();
    return;
  }

  runAuth(() =>
    window.financeAuth.register(
      emailInput.value.trim(),
      passwordInput.value
    )
  );
};
}

function showAuthScreen() {
  createAuthScreen();
  document.getElementById("firebase-auth-screen").style.display = "flex";
}

function hideAuthScreen() {
  const screen = document.getElementById("firebase-auth-screen");
  if (screen) screen.style.display = "none";
}




onAuthStateChanged(auth, user => {
  if (user) {
    hideAuthScreen();

    const logoutButton = document.getElementById("logoutButton");
    if (logoutButton) {
      logoutButton.disabled = false;
      logoutButton.innerHTML =
        '<span aria-hidden="true">↪</span> Log out';
    }
  } else {
    showAuthScreen();

    // Clear credentials whenever the user is signed out.
    const emailInput = document.getElementById("firebase-email");
    const passwordInput = document.getElementById("firebase-password");
    const error = document.getElementById("firebase-auth-error");
    const message = document.getElementById("firebase-auth-message");
    const registerButton = document.getElementById("firebase-register");
    const submitButton = document.getElementById("firebase-email-login");

    if (emailInput) emailInput.value = "";
    if (passwordInput) passwordInput.value = "";
    if (error) error.textContent = "";

    // Reset the form to its default sign-in mode.
    if (registerButton) {
      registerButton.dataset.mode = "";
      registerButton.textContent = "Create an account";
    }

    if (submitButton) {
      submitButton.textContent = "Sign in";
    }

    if (message) {
      message.textContent = "Sign in to continue to your dashboard.";
    }

    if (passwordInput) {
      passwordInput.setAttribute("autocomplete", "current-password");
      passwordInput.type = "password";
    }

    const togglePassword = document.getElementById("toggle-password");
    if (togglePassword) {
      togglePassword.textContent = "Show";
      togglePassword.setAttribute("aria-label", "Show password");
    }
  }

  window.dispatchEvent(new CustomEvent("finance-auth-state", {
    detail: { user }
  }));
});




 // Connect the dashboard's Log out button to Firebase.


function attachLogoutHandler() {
    const logoutButton = document.getElementById("logoutButton");

    if (!logoutButton || logoutButton.dataset.authHandlerAttached === "true") {
        return;
    }

    logoutButton.dataset.authHandlerAttached = "true";

    logoutButton.addEventListener("click", async () => {
        logoutButton.disabled = true;
        logoutButton.textContent = "Signing out...";

        try {
            await window.financeAuth.logout();
        } catch (error) {
            console.error("Logout failed:", error);
            alert("Unable to log out. Please try again.");
        } finally {
            logoutButton.disabled = false;
            logoutButton.innerHTML =
                '<span aria-hidden="true">↪</span> Log out';
        }
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachLogoutHandler);
} else {
    attachLogoutHandler();
}

