// pages/AdminDashboard.jsx
// -----------------------------------------------------------------------
// The admin's home screen - the thing you see immediately after logging
// in with the admin account.
//
// It answers the questions an admin actually cares about:
//   - How many farmers have enrolled? How many joined this week?
//   - How many are actually ACTIVE (doing things), not just signed up?
//   - How many receipts have been uploaded? Are farmers being underpaid?
//   - Which crops and mandis come up most?
//   - What's happening right now? (a live activity preview)
//
// All of this comes from ONE API call: GET /api/admin/stats, which is
// blocked for farmers by the backend (see backend/routes/adminRoutes.js).
// -----------------------------------------------------------------------

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { getAdminStats } from "../api/api";
import { useAuth } from "../context/AuthContext";
import StatCard from "../components/StatCard";
import VerdictPieChart from "../components/VerdictPieChart";
import {
  ActivityIcon,
  DateIcon,
  FarmersIcon,
  InfoIcon,
  OkIcon,
  ReceiptIcon,
  WarnIcon,
  ICON_MD,
  ICON_STROKE,
  RupeeIcon,
  SignupIcon,
  LoginIcon,
  LogoutIcon,
  UploadIcon,
  CameraIcon,
  SearchIcon,
  MandiIcon,
} from "../components/icons";

function AdminDashboard() {
  const { currentUser } = useAuth();

  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const response = await getAdminStats();
        setStats(response.data);
      } catch (error) {
        console.error(error);
        setErrorMessage("Could not load admin statistics. Is the backend running?");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="text-center py-24 text-ink-500">
        <p className="text-sm">Loading admin dashboard...</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="bg-negative-50 text-negative-700 border border-negative-200 rounded-md px-4 py-3 text-sm">{errorMessage}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 animate-fadeIn">
      {/* ---------- Header ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
        <h1 className="text-2xl font-semibold text-ink-900 animate-fadeInLeft"> Admin Dashboard</h1>
        <span className="text-sm text-ink-500">
          Signed in as <strong>{currentUser?.name}</strong>
        </span>
      </div>
      <p className="text-ink-600 mb-8">
        A live view of everyone using the app - who's enrolled, what they're
        doing, and whether they're getting fair prices.
      </p>
      {/* ---------- Farmer enrolment cards ---------- */}
      <h2 className="text-sm font-medium text-ink-500 uppercase tracking-wide mb-3">
        Farmers
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={FarmersIcon}
          label="Total Farmers Enrolled"
          value={stats.totalFarmers}
          tone="primary"/>
        <StatCard icon={OkIcon} label="Active Accounts" value={stats.activeFarmers} />
        <StatCard icon={InfoIcon} label="Joined This Week" value={stats.newFarmersThisWeek} />
        <StatCard
          icon={ActivityIcon}
          label="Active in Last 30 Days"
          value={stats.activeUsersLast30Days}
          tone="accent"/>
      </div>
      {/* ---------- Receipt / price-fairness cards ---------- */}
      <h2 className="text-sm font-medium text-ink-500 uppercase tracking-wide mb-3">
        Receipts &amp; Fair Prices
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={ReceiptIcon} label="Total Receipts" value={stats.totalReceipts} />
        <StatCard icon={DateIcon} label="Uploaded This Week" value={stats.receiptsThisWeek} />
        <StatCard
          icon={WarnIcon}
          label="Underpaid Sales"
          value={stats.underpaidCount}
          tone="under"/>
        <StatCard
          icon={RupeeIcon}
          label="Total Farmer Loss (₹)"
          value={stats.totalPotentialLoss.toLocaleString("en-IN")}
          tone="under"/>
      </div>
      {/* ---------- Charts ---------- */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
      {/* Signups + uploads per day over the last 2 weeks */}
        <div className="bg-card rounded-lg shadow-soft p-6 border border-surface-300/60 hover-lift animate-fadeInUp">
          <h3 className="font-medium text-ink-900 mb-4">
             Signups &amp; Uploads (last 14 days)
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={stats.signupsByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
      {/* Show just "16/09" instead of the full date, or the
                  labels overlap and become unreadable. */}
              <XAxis
                dataKey="date"
          tick={{ fontSize: 11 }}
                tickFormatter={(d) => d.slice(8) + "/" + d.slice(5, 7)}
              />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line
                type="monotone"
          dataKey="signups"
          name="New farmers"
          stroke="#2E7D32"strokeWidth={2}
              />
              <Line
                type="monotone"
          dataKey="receipts"
          name="Receipts uploaded"
          stroke="#D97706"strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      {/* Are farmers overall getting fair prices? */}
        <div className="bg-card rounded-lg shadow-soft p-6 border border-surface-300/60 hover-lift animate-fadeInUp">
          <h3 className="font-medium text-ink-900 mb-4"> Verdicts Across All Receipts</h3>
          <VerdictPieChart data={stats.verdictBreakdown} />
        </div>
      {/* Most-uploaded crops */}
        <div className="bg-card rounded-lg shadow-soft p-6 border border-surface-300/60 hover-lift animate-fadeInUp">
          <h3 className="font-medium text-ink-900 mb-4"> Most Uploaded Crops</h3>{stats.topCrops.length === 0 ? (
            <EmptyChartNote />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.topCrops}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="crop" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Receipts" fill="#2E7D32" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      {/* Most-used mandis */}
        <div className="bg-card rounded-lg shadow-soft p-6 border border-surface-300/60 hover-lift animate-fadeInUp">
          <h3 className="font-medium text-ink-900 mb-4"> Most Reported Mandis</h3>{stats.topMandis.length === 0 ? (
            <EmptyChartNote />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.topMandis} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="mandi" tick={{ fontSize: 10 }} width={110} />
                <Tooltip />
                <Bar dataKey="count" name="Receipts" fill="#1F3B57" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      {/* ---------- Farmers by state ---------- */}
      {stats.farmersByState.length > 0 && (
        <div className="bg-card rounded-lg shadow-soft p-6 border border-surface-300/60 mb-8">
          <h3 className="font-medium text-ink-900 mb-4"> Farmers by State</h3>
          <div className="flex flex-wrap gap-2">{stats.farmersByState.map((row) => (
              <span
                key={row.state}
                className="bg-positive-50 text-positive-800 px-3 py-1.5 rounded-full text-sm">{row.state}: <strong>{row.count}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ---------- Recent activity preview ---------- */}
      <div className="bg-card rounded-lg shadow-soft p-6 border border-surface-300/60 hover-lift animate-fadeInUp">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-ink-900"> Latest Farmer Activity</h3>
          <Link to="/admin/activity" className="text-sm text-primary-700 font-medium hover:underline">
            View all 
          </Link>
        </div>{stats.recentActivity.length === 0 ? (
          <p className="text-sm text-ink-500 py-6 text-center">
            No activity recorded yet. It'll appear here as soon as farmers log
            in and upload receipts.
          </p>
        ) : (
          <ul className="divide-y divide-surface-200">{stats.recentActivity.map((item) => (
              <li key={item._id} className="py-3 flex items-start gap-3">
                {(() => {
                  const Icon = actionIcon(item.action);
                  return <Icon size={ICON_MD} strokeWidth={ICON_STROKE} className="text-ink-400 shrink-0" aria-hidden="true" />;
                })()}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink-800">{item.description}</p>
                  <p className="text-xs text-ink-400">{item.userEmail} · {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* ---------- Quick links to the other admin pages ---------- */}
      <div className="grid sm:grid-cols-2 gap-4 mt-8">
        <Link
          to="/admin/farmers"className="bg-card rounded-lg shadow-soft border border-surface-300/60 p-6 hover:border-brand-green hover-lift animate-popIn">
          <h4 className="font-medium text-ink-900">Manage Farmers</h4>
          <p className="text-sm text-ink-500">
            Search every enrolled farmer, see their uploads, and block or
            unblock accounts.
          </p>
        </Link>
        <Link
          to="/admin/activity"className="bg-card rounded-lg shadow-soft border border-surface-300/60 p-6 hover:border-brand-green hover-lift animate-popIn">
          <h4 className="font-medium text-ink-900">Full Activity Log</h4>
          <p className="text-sm text-ink-500">
            Every login, search and upload, newest first - filterable by type.
          </p>
        </Link>
      </div>
    </div>
  );
}

// Shown in place of a chart when there's genuinely no data yet, which
// is better than an empty white box that looks broken.
function EmptyChartNote() {
  return (
    <div className="h-[260px] flex items-center justify-center text-sm text-ink-400 text-center px-4">
      No receipts uploaded yet - this chart fills in once farmers start
      uploading.
    </div>
  );
}

// Turns an action code like "UPLOAD_RECEIPT" into a little icon.
// Exported so AdminActivity.jsx can reuse it instead of duplicating it.
export function actionIcon(action) {
  // Returns a COMPONENT, not a character - so callers render it as
  // <Icon /> and it inherits the row's colour and size. These were
  // emoji, which could do neither.
  const icons = {
    SIGNUP: SignupIcon,
    LOGIN: LoginIcon,
    LOGOUT: LogoutIcon,
    UPLOAD_RECEIPT: UploadIcon,
    SCAN_RECEIPT: CameraIcon,
    CHECK_RATES: SearchIcon,
    SEARCH_MANDI: SearchIcon,
    VIEW_MANDI: MandiIcon,
  };
  return icons[action] || ActivityIcon;
}

export default AdminDashboard;
