// context/AuthContext.jsx
// -----------------------------------------------------------------------
// This file answers one question for the whole app: "who is logged in?"
//
// Any component can ask, like this:
//
//     const { currentUser, isAdmin, login, logout } = useAuth();
//
// ---------------------------------------------------------------------
// NOTHING ABOUT THE USER IS STORED IN THE BROWSER
// ---------------------------------------------------------------------
// This file used to write the whole user record - name, email, phone,
// role - into localStorage under "mandi_current_user", and api.js
// stored the token next to it. Two things were wrong with that:
//
//   1. localStorage is readable by ANY script on the page, so a single
//      XSS bug leaked the token AND a tidy bundle of personal data.
//   2. It sat on disk after the browser closed, on a device that may
//      well be shared.
//
// Now:
//   - The user object lives in React state below. It is gone on reload.
//   - The access token lives in a variable in api.js. Also gone.
//   - The only thing that survives a reload is the refresh cookie,
//     which is HttpOnly - JavaScript cannot read it, so XSS cannot
//     steal it.
//
// On load we call /auth/refresh. The cookie proves who we are, the
// server returns a fresh access token plus the user, and we are back
// where we were - without ever having written anything down.
//
// ---------------------------------------------------------------------
// ABOUT `isAdmin`
// ---------------------------------------------------------------------
// The role now comes from the server on every load and is never
// persisted, so there is no stored value for anyone to edit. (Before,
// someone could set role:"admin" in dev-tools and see the admin page
// shell - useless, because every admin route is guarded server-side by
// `adminOnly`, but it looked alarming.)
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
  logoutEverywhereRequest,
  refreshRequest,
  setAccessToken,
  clearAccessToken,
  purgeLegacyStorage,
} from "../api/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // The logged-in user, or null.
  //
  // It starts as null on EVERY load - there is deliberately no stored
  // copy to seed it from any more. `isCheckingAuth` below is what stops
  // that null being mistaken for "logged out" while /auth/refresh is
  // still in flight.
  const [currentUser, setCurrentUser] = useState(null);

  // "Are we still checking whether the saved token is valid?"
  // This matters a lot: without it, ProtectedRoute would see
  // currentUser === null for a split second on every refresh and kick
  // a genuinely logged-in user back to the login page.
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // ---- Runs ONCE when the app first loads ----
  useEffect(() => {
    async function restoreSession() {
      // Clear out the token and user record the OLD version of this app
      // left on this device, plus stale keys from another app that
      // shared this dev origin. One-time cleanup - see api.js.
      purgeLegacyStorage();

      try {
        // The browser attaches the HttpOnly refresh cookie by itself.
        // If it is valid we get a new access token and the user back;
        // if there is no cookie the server answers 401 and we simply
        // stay logged out.
        const response = await refreshRequest();
        setAccessToken(response.data.accessToken);
        setCurrentUser(response.data.user);
      } catch (error) {
        // No cookie, expired, or the account was deactivated.
        clearAccessToken();
        setCurrentUser(null);
      } finally {
        setIsCheckingAuth(false);
      }
    }

    restoreSession();
  }, []); // the empty [] means "only run this on first load"

  // A small helper so login() and signup() don't repeat themselves.
  //
  // Note what it does NOT do any more: write to localStorage. The token
  // goes into a variable in api.js, the user into React state, and the
  // refresh cookie was already set by the server on the response.
  function storeSession(accessToken, user) {
    setAccessToken(accessToken);
    setCurrentUser(user);
  }

  // ---------------------------------------------------------------
  // signup - always creates a FARMER (the backend enforces that).
  // Returns { success, message?, user? } so the page can show errors.
  // ---------------------------------------------------------------
  async function signup({ name, email, password, phone, state }) {
    try {
      const response = await signupRequest({ name, email, password, phone, state });
      const { accessToken, user } = response.data;
      storeSession(accessToken, user);
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
      const { accessToken, user } = response.data;
      storeSession(accessToken, user);
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
      // This one matters now. The server deletes the refresh-token row
      // and clears the cookie, so the session is genuinely dead rather
      // than just forgotten by this tab.
      await logoutRequest();
    } catch (error) {
      // Ignored on purpose - see the comment above.
    } finally {
      clearAccessToken();
      purgeLegacyStorage();
      setCurrentUser(null);
    }
  }

  // ---------------------------------------------------------------
  // logoutEverywhere - ends every session on every device.
  //
  // The one thing to reach for if a farmer thinks someone else has
  // been in their account.
  // ---------------------------------------------------------------
  async function logoutEverywhere() {
    try {
      await logoutEverywhereRequest();
    } catch (error) {
      // Same reasoning as logout(): never trap someone in a
      // logged-in state because the network failed.
    } finally {
      clearAccessToken();
      purgeLegacyStorage();
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
    logoutEverywhere,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Small helper hook, used like: const { currentUser, login, logout } = useAuth();
export function useAuth() {
  return useContext(AuthContext);
}
