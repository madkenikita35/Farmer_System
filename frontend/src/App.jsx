// App.jsx
// -----------------------------------------------------------------------
// This file does ONE job: it says which URL shows which page, using
// react-router-dom's <Routes> / <Route>.
//
// The frame around the pages - sidebar, top bar, footer - lives in
// components/AppShell.jsx. It used to be written out here, which meant
// this file mixed "what the app looks like" with "where the pages are",
// and both got harder to read.
//
// It's also where we wrap the whole app with our two Context Providers
// (see src/context/):
//   - ThemeProvider: which accent colour the app is using.
//   - LanguageProvider: lets any page/component read/change EN vs MR.
//   - AuthProvider: lets any page/component know who's logged in.
//
// ThemeProvider is OUTERMOST because it depends on nothing - it reads
// two words from localStorage and writes them onto <html>. It does not
// need to know who is logged in or what language they read.
//
// ---------------------------------------------------------------------
// HOW THE ROUTES ARE PROTECTED (read this part!)
// ---------------------------------------------------------------------
// There are three kinds of route below:
//
//   1. PUBLIC       - /login and /signup. You must be able to reach
//                     these while logged out, or you could never get in.
//
//   2. LOGGED IN    - wrapped in <ProtectedRoute>. Farmers AND admins
//                     can see them. A logged-out visitor is bounced to
//                     /login. This is the "after login only, a user can
//                     enter the website" requirement - notice that even
//                     the HOME page is wrapped, so there is no page at
//                     all a stranger can browse.
//
//   3. ADMIN ONLY   - wrapped in <ProtectedRoute adminOnly>. A farmer
//                     who types /admin gets redirected to their own
//                     dashboard instead.
//
// Remember: these guards are for convenience and a clean experience.
// The REAL security is in the backend, where every API route checks the
// token and the role again. See backend/middleware/auth.js.
// -----------------------------------------------------------------------

import { Routes, Route } from "react-router-dom";
import { LanguageProvider } from "./context/LanguageContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./components/AppShell";
import VoiceAssistant from "./components/VoiceAssistant";

// Farmer-side pages
import Home from "./pages/Home";
import Upload from "./pages/Upload";
import CheckRates from "./pages/CheckRates";
import Dashboard from "./pages/Dashboard";
import Mandis from "./pages/Mandis";
import MandiDetail from "./pages/MandiDetail";
import NearbyMandis from "./pages/NearbyMandis";
import CropsList from "./pages/CropsList";
import CropTrend from "./pages/CropTrend";

// Public pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";

// Admin-side pages
import AdminDashboard from "./pages/AdminDashboard";
import AdminFarmers from "./pages/AdminFarmers";
import AdminActivity from "./pages/AdminActivity";

function App() {
  return (
    // ---- ORDER MATTERS HERE ----
    // AuthProvider must be on the OUTSIDE, because LanguageProvider asks
    // it "is this an admin?" in order to force the admin panel to
    // English. Swap these two and the app crashes, because
    // LanguageProvider would be calling useAuth() before AuthProvider
    // exists. See the long comment in context/LanguageContext.jsx.
    <ThemeProvider>
      <AuthProvider>
        <LanguageProvider>
          <AppShell>
            <Routes>
              {/* ---------- 1. PUBLIC ---------- */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* ---------- 2. LOGGED IN (farmer or admin) ---------- */}
              <Route
                path="/"
                element={<Home />}
              />
              <Route
                path="/upload"
                element={
                  <ProtectedRoute reasonKey="auth_needed_upload">
                    <Upload />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/check-rates"
                element={<CheckRates />}
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute reasonKey="auth_needed_dashboard">
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mandis"
                element={<Mandis />}
              />
              {/* "Which mandi near me pays the most?" - needs a login
                  like every other farmer page. */}
              <Route
                path="/nearby"
                element={<NearbyMandis />}
              />
              {/* The mandi name is passed as ?mandi=...&state=... rather
                  than in the path, because real mandi names contain
                  spaces and brackets that are awkward in a URL path. */}
              <Route
                path="/mandis/view"
                element={<MandiDetail />}
              />

              {/* Crop price trends over time: the list of crops, and
                  one crop's line graph. Both are farmer-facing, so they
                  sit in the logged-in block rather than the admin one. */}
              <Route
                path="/crops"
                element={<CropsList />}
              />
              <Route
                path="/crops/:cropName"
                element={<CropTrend />}
              />

              <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* ---------- 3. ADMIN ONLY ---------- */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/farmers"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminFarmers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/activity"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminActivity />
                  </ProtectedRoute>
                }
              />

              {/* ---------- Anything else: a friendly 404 ---------- */}
              {/* path="*" is react-router's "none of the above" case. */}
              <Route path="*" element={<NotFound />} />
            </Routes>

            {/* The voice assistant floats above every page. It's for
                FARMERS - the admin panel is a desk tool in English, and a
                mic orb there would just be in the way. FarmerOnlyVoice
                below makes that call. */}
            <FarmerOnlyVoice />
          </AppShell>
        </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

// Shows the voice assistant only to logged-in farmers.
//
// It has to be its own component rather than an inline check, because
// useAuth() only works INSIDE AuthProvider - and App() itself is what
// renders that provider, so it can't call the hook on itself.
function FarmerOnlyVoice() {
  const { isLoggedIn, isAdmin } = useAuth();
  if (!isLoggedIn || isAdmin) return null;
  return <VoiceAssistant />;
}

// A tiny inline page for unknown URLs. Kept here rather than in its own
// file because it's only a handful of lines.
function NotFound() {
  return (
    <div className="max-w-md mx-auto text-center px-6 py-24">
      <div className="text-3xl mb-4">🌾</div>
      <h1 className="text-2xl font-semibold text-ink-900 mb-2">Page not found</h1>
      <p className="text-ink-500">
        That page doesn't exist. Use the menu above to get back on track.
      </p>
    </div>
  );
}

export default App;
