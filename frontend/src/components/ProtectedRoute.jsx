// components/ProtectedRoute.jsx
// -----------------------------------------------------------------------
// A wrapper that decides whether someone is allowed to see a page.
//
// You use it in App.jsx by wrapping the page you want to protect:
//
//   <Route path="/upload" element={
//     <ProtectedRoute><Upload /></ProtectedRoute>
//   } />
//
// ...or, for an admin-only page, add the adminOnly flag:
//
//   <Route path="/admin" element={
//     <ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>
//   } />
//
// "children" is a special React prop meaning "whatever was written
// between the opening and closing tags" - so here, the page itself.
//
// ---------------------------------------------------------------------
// REMEMBER: this is convenience, not security.
// ---------------------------------------------------------------------
// This file stops someone WANDERING into a page they shouldn't see. It
// does NOT stop a determined person, because all of this runs in their
// own browser where they can change anything.
//
// The real protection is on the backend: every API route behind these
// pages is guarded by `protect` / `adminOnly` (backend/middleware/auth.js).
// So even if someone forced this component to render the admin page,
// every piece of data on it would come back as a 403 error.
// -----------------------------------------------------------------------

import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import SignInPrompt from "./SignInPrompt";

function ProtectedRoute({ children, adminOnly = false, reasonKey }) {
  const { isLoggedIn, isAdmin, isCheckingAuth } = useAuth();
  const { t } = useLanguage();

  // ---- CASE 1: we're still asking the server "is this token valid?" ----
  // We MUST wait. If we didn't, a logged-in user pressing F5 would be
  // bounced to /login for a split second before the check finished,
  // which looks broken and is very annoying.
  if (isCheckingAuth) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-ink-500">
        <p className="text-sm">{t("common_checking_login")}</p>
      </div>
    );
  }

  // ---- CASE 2: not logged in at all -> go to the login page ----
  // `state={{ from: location }}` remembers which page they were trying
  // to reach, so Login.jsx can send them back there afterwards instead
  // of dumping them on the home page.
  // `replace` swaps the history entry instead of adding one, so the
  // browser Back button doesn't bounce them straight back here.
  if (!isLoggedIn) {
    // NOT a redirect. A guest who clicked "Upload Receipt" and got
    // thrown to /login would, after signing up, land on the home page -
    // having lost the thing they came to do. This keeps them on the
    // page and explains why this one needs an account.
    return <SignInPrompt reasonKey={reasonKey} />;
  }

  // ---- CASE 3: logged in, but this page needs an admin ----
  // A farmer who types /admin by hand lands here. We send them to their
  // own dashboard rather than showing a scary error.
  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // ---- CASE 4: all good - show the page ----
  return children;
}

export default ProtectedRoute;
