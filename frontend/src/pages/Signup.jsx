// pages/Signup.jsx
// -----------------------------------------------------------------------
// The sign-up form. It calls `signup` from AuthContext, which now posts
// to the real backend (POST /api/auth/signup).
//
// EVERY account created here is a FARMER. You cannot sign up as an
// admin, and there's no dropdown to choose - the backend hard-codes
// role:"farmer" on this route (see backend/controllers/authController.js).
// If it didn't, anybody could make themselves an admin just by editing
// the request in their browser's dev-tools.
//
// The admin account is created once by the server itself from .env,
// in backend/config/seedUsers.js.
// -----------------------------------------------------------------------

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";

function Signup() {
  const { t } = useLanguage();
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !password) {
      setErrorMessage("Please fill in your name, email and password.");
      return;
    }
    // The backend enforces 6 characters too (models/User.js). Checking
    // here as well just gives a faster, friendlier message - we don't
    // rely on it for safety.
    if (password.length < 6) {
      setErrorMessage("Password should be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    const result = await signup({
      name: name.trim(),
      email: email.trim(),
      password,
      phone: phone.trim(),
      state: state.trim(),
    });

    setIsSubmitting(false);

    if (result.success) {
      // Signing up logs you straight in, so go to the farmer home page.
      navigate("/", { replace: true });
    } else {
      setErrorMessage(result.message);
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16 animate-fadeInUp">
      <div className="bg-white rounded-2xl shadow-soft border border-surface-300/60 p-8">
        <div className="text-4xl mb-3 text-center">🧑‍🌾</div>
        <h1 className="text-2xl font-bold text-ink-900 text-center mb-1">
          {t("signup_title")}
        </h1>
        <p className="text-ink-500 text-sm text-center mb-6">{t("signup_subtitle")}</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-600 mb-1">
              {t("label_name")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ramesh Patil"
              className="w-full border border-ink-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            />
          </div>

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
              className="w-full border border-ink-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            />
          </div>

          {/* Phone and state are optional - we don't want to block
              someone from signing up over a field they'd rather skip.
              The admin dashboard shows them when they're filled in. */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink-600 mb-1">
                Phone <span className="text-ink-400 font-normal">(optional)</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="98765 43210"
                className="w-full border border-ink-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-600 mb-1">
                State <span className="text-ink-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="Maharashtra"
                className="w-full border border-ink-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-600 mb-1">
              {t("label_password")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete="new-password"
              className="w-full border border-ink-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-600 mb-1">
              {t("label_confirm_password")}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              className="w-full border border-ink-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            />
          </div>

          {errorMessage && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary-gradient text-white font-semibold py-3.5 rounded-2xl shadow-soft hover:scale-[1.01] transition-all disabled:opacity-50"
          >
            {isSubmitting ? "Creating your account..." : t("btn_signup")}
          </button>
        </form>

        <p className="text-center text-sm text-ink-500 mt-5">
          {t("have_account")}{" "}
          <Link to="/login" className="text-primary-700 font-semibold hover:underline">
            {t("nav_login")}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;
