// context/AuthContext.jsx
// -----------------------------------------------------------------------
// This file answers one question for the whole app: "who is logged in?"
//
// Any component can ask, like this:
//
//     const { currentUser, isAdmin, login, logout } = useAuth();
//
// ---------------------------------------------------------------------
// WHAT CHANGED FROM THE OLD VERSION (worth reading)
// ---------------------------------------------------------------------
// This used to be a fake login that stored PLAIN TEXT passwords in the
// browser's localStorage. It's now wired to the real backend:
//
//   - Passwords are sent to the server and checked against a bcrypt
//     hash. We never store a password in the browser at all.
//   - The server sends back a TOKEN, which api.js attaches to every
//     future request automatically.
//   - The server also sends back the user's ROLE ("farmer" or "admin"),
//     which is what makes role-based access work.
//
// ---------------------------------------------------------------------
// ABOUT `isAdmin` - AN IMPORTANT NOTE ON SECURITY
// ---------------------------------------------------------------------
// We keep the user (including their role) in localStorage so a page
// refresh doesn't log you out. A clever user COULD open dev-tools and
// edit that stored role to "admin".
//
// That would let them see the admin PAGE shell - and absolutely nothing
// else, because every admin API route is guarded server-side by
// `adminOnly` (backend/middleware/auth.js). They'd get a wall of 403
// errors and an empty screen.
//
// On top of that, `refreshUser()` below re-asks the server "who am I?"
// every time the app loads, and overwrites the stored user with the
// real answer - so a tampered role gets corrected within a second.
//
// THE RULE TO REMEMBER: frontend role checks are for CONVENIENCE
// (showing the right menu, redirecting to the right page). The BACKEND
// check is the actual security. Never rely on the frontend alone.
// -----------------------------------------------------------------------

import { createContext, useContext, useState, useEffect } from "react";
import {
  loginRequest,
  signupRequest,
  logoutRequest,
  getMeRequest,
  saveToken,
  getToken,
  clearToken,
} from "../api/api";

const AuthContext = createContext(null);

const USER_KEY = "mandi_current_user";

export function AuthProvider({ children }) {
  // The logged-in user, or null. We read localStorage for the INITIAL
  // value so that a page refresh doesn't flash "logged out" for a
  // moment before the server confirms who we are.
  const [currentUser, setCurrentUser] = useState(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  });

  // "Are we still checking whether the saved token is valid?"
  // This matters a lot: without it, ProtectedRoute would see
  // currentUser === null for a split second on every refresh and kick
  // a genuinely logged-in user back to the login page.
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // ---- Runs ONCE when the app first loads ----
  useEffect(() => {
    async function checkSavedLogin() {
      const token = getToken();

      // No token saved? Then nobody is logged in. Nothing to check.
      if (!token) {
        setCurrentUser(null);
        setIsCheckingAuth(false);
        return;
      }

      try {
        // Ask the server to confirm the token is still valid and tell
        // us who it belongs to. This is also what corrects a tampered
        // role in localStorage - see the long note at the top.
        const response = await getMeRequest();
        setCurrentUser(response.data.user);
        localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
      } catch (error) {
        // Token expired, or the account was deleted/deactivated.
        clearToken();
        localStorage.removeItem(USER_KEY);
        setCurrentUser(null);
      } finally {
        setIsCheckingAuth(false);
      }
    }

    checkSavedLogin();
  }, []); // the empty [] means "only run this on first load"

  // A small helper so login() and signup() don't repeat themselves.
  function storeSession(token, user) {
    saveToken(token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setCurrentUser(user);
  }

  // ---------------------------------------------------------------
  // signup - always creates a FARMER (the backend enforces that).
  // Returns { success, message?, user? } so the page can show errors.
  // ---------------------------------------------------------------
  async function signup({ name, email, password, phone, state }) {
    try {
      const response = await signupRequest({ name, email, password, phone, state });
      const { token, user } = response.data;
      storeSession(token, user);
      return { success: true, user };
    } catch (error) {
      return {
        success: false,
        // The backend sends a helpful message (e.g. "email already
        // exists"). If the server is down there IS no response, so we
        // fall back to a generic message - that's what the ?. is for.
        message:
          error.response?.data?.message ||
          "Could not create your account. Is the backend server running?",
      };
    }
  }

  // ---------------------------------------------------------------
  // login - ONE form for both farmers and admins.
  //
  // The returned `user.role` is what the Login page uses to decide
  // where to send them:  admin -> /admin,  farmer -> /
  // That's why there's no separate "admin login" button anywhere.
  // ---------------------------------------------------------------
  async function login({ email, password }) {
    try {
      const response = await loginRequest({ email, password });
      const { token, user } = response.data;
      storeSession(token, user);
      return { success: true, user };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Could not log you in. Is the backend server running?",
      };
    }
  }

  // ---------------------------------------------------------------
  // logout - tell the server (for the activity log), then forget
  // everything locally. The local cleanup happens even if the network
  // call fails, because being unable to reach the server should never
  // trap someone in a logged-in state.
  // ---------------------------------------------------------------
  async function logout() {
    try {
      await logoutRequest();
    } catch (error) {
      // Ignored on purpose - see the comment above.
    } finally {
      clearToken();
      localStorage.removeItem(USER_KEY);
      setCurrentUser(null);
    }
  }

  const value = {
    currentUser,
    // Convenience flags so components can write `if (isAdmin)` instead
    // of `currentUser && currentUser.role === "admin"` everywhere.
    isAdmin: currentUser?.role === "admin",
    isFarmer: currentUser?.role === "farmer",
    isLoggedIn: Boolean(currentUser),
    isCheckingAuth,
    signup,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Small helper hook, used like: const { currentUser, login, logout } = useAuth();
export function useAuth() {
  return useContext(AuthContext);
}
