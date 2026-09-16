// App.jsx
// -----------------------------------------------------------------------
// This is the "shell" of our app: it always shows the Navbar and Footer,
// and swaps out the page content in between based on the current URL,
// using react-router-dom's <Routes> / <Route>.
//
// It's also where we wrap the whole app with our two Context Providers
// (see src/context/):
//   - LanguageProvider: lets any page/component read/change EN vs MR.
//   - AuthProvider: lets any page/component know who's logged in.
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
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

// Farmer-side pages
import Home from "./pages/Home";
import Upload from "./pages/Upload";
import CheckRates from "./pages/CheckRates";
import Dashboard from "./pages/Dashboard";
import Mandis from "./pages/Mandis";
import MandiDetail from "./pages/MandiDetail";
import NearbyMandis from "./pages/NearbyMandis";

// Public pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";

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
    <AuthProvider>
      <LanguageProvider>
        <div className="min-h-screen flex flex-col">
          <Navbar />

          {/* flex-1 pushes the Footer down to the bottom even on short pages */}
          <main className="flex-1">
            <Routes>
              {/* ---------- 1. PUBLIC ---------- */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* ---------- 2. LOGGED IN (farmer or admin) ---------- */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/upload"
                element={
                  <ProtectedRoute>
                    <Upload />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/check-rates"
                element={
                  <ProtectedRoute>
                    <CheckRates />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mandis"
                element={
                  <ProtectedRoute>
                    <Mandis />
                  </ProtectedRoute>
                }
              />
              {/* "Which mandi near me pays the most?" - needs a login
                  like every other farmer page. */}
              <Route
                path="/nearby"
                element={
                  <ProtectedRoute>
                    <NearbyMandis />
                  </ProtectedRoute>
                }
              />
              {/* The mandi name is passed as ?mandi=...&state=... rather
                  than in the path, because real mandi names contain
                  spaces and brackets that are awkward in a URL path. */}
              <Route
                path="/mandis/view"
                element={
                  <ProtectedRoute>
                    <MandiDetail />
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
          </main>

          <Footer />
        </div>
      </LanguageProvider>
    </AuthProvider>
  );
}

// A tiny inline page for unknown URLs. Kept here rather than in its own
// file because it's only a handful of lines.
function NotFound() {
  return (
    <div className="max-w-md mx-auto text-center px-6 py-24">
      <div className="text-5xl mb-4">🌾</div>
      <h1 className="text-2xl font-bold text-brand-navy mb-2">Page not found</h1>
      <p className="text-gray-500">
        That page doesn't exist. Use the menu above to get back on track.
      </p>
    </div>
  );
}

export default App;
