// pages/Login.jsx
// -----------------------------------------------------------------------
// ONE login form for EVERYBODY - farmers and the admin alike.
//
// There is deliberately NO "admin login" button or separate admin login
// page. Here's how it works instead:
//
//   1. You type your email + password. That's it.
//   2. The backend checks them and, if they're right, replies with your
//      ROLE, which it reads from the database (backend/models/User.js).
//   3. THIS page looks at that role and sends you to the right place:
//        role === "admin"  ->  /admin       (the admin site)
//        role === "farmer" ->  the farmer site
//
// So the same form opens two different apps, and the farmer site never
// shows any hint that an admin area exists.
//
// A farmer can't reach the admin site by guessing the URL either -
// ProtectedRoute blocks the page, and the backend blocks the data.
// -----------------------------------------------------------------------

import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";

function Login() {
  const { t } = useLanguage();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If ProtectedRoute sent them here because they tried to open a page
  // while logged out, it stashed that page in location.state.from.
  // We'll send them back there after a successful login.
  const pageTheyWanted = location.state?.from?.pathname;

  async function handleSubmit(e) {
    e.preventDefault(); // stop the browser from reloading the page

    if (!email.trim() || !password) {
      setErrorMessage("Please fill in both fields.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true); // disables the button so you can't double-submit

    const result = await login({ email: email.trim(), password });

    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.message);
      return;
    }

    // ---- THE ROLE-BASED REDIRECT ----
    // This is the whole "admin credentials open the admin site" feature.
    if (result.user.role === "admin") {
      navigate("/admin", { replace: true });
    } else {
      // A farmer goes back to whatever page they originally wanted,
      // or the home page if they came here directly.
      navigate(pageTheyWanted || "/", { replace: true });
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16 animate-fadeInUp">
      <div className="bg-card rounded-2xl shadow-soft border border-surface-300/60 p-8">
        <div className="text-4xl mb-3 text-center">🔐</div>
        <h1 className="text-2xl font-bold text-ink-900 text-center mb-1">
          {t("login_title")}
        </h1>
        <p className="text-ink-500 text-sm text-center mb-6">{t("login_subtitle")}</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-600 mb-1">
              {t("label_email")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full border border-ink-200 rounded-xl px-3.5 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-600 mb-1">
              {t("label_password")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full border border-ink-200 rounded-xl px-3.5 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            />
          </div>

          {errorMessage && (
            <p className="text-negative-600 text-sm bg-negative-50 border border-negative-100 rounded-lg px-3 py-2">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary-gradient text-primary-foreground font-semibold py-3.5 rounded-2xl shadow-soft hover:scale-[1.01] transition-all disabled:opacity-50"
          >
            {isSubmitting ? "Logging in..." : t("btn_login")}
          </button>
        </form>

        <p className="text-center text-sm text-ink-500 mt-5">
          {t("no_account")}{" "}
          <Link to="/signup" className="text-primary-700 font-semibold hover:underline">
            {t("nav_signup")}
          </Link>
        </p>

        {/* NOTE: there used to be a "demo accounts" box here listing the
            admin and farmer passwords. It was removed on purpose -
            printing a working admin password on a public login screen
            hands anyone who visits the page full access to the admin
            site. Credentials now live only in backend/.env. */}
      </div>
    </div>
  );
}

export default Login;
