// pages/AdminActivity.jsx
// -----------------------------------------------------------------------
// "What have farmers been doing?"
//
// The full activity feed - every login, signup, rate check, mandi search
// and receipt upload, newest first. You can filter by action type, or
// search for a particular farmer's name/email.
//
// Every row here was written by logActivity() in
// backend/services/activityService.js, which the controllers call
// whenever something noteworthy happens.
// -----------------------------------------------------------------------

import { useState, useEffect } from "react";
import { getAdminActivity } from "../api/api";
import { actionIcon } from "./AdminDashboard";

// The action types a farmer can trigger, with friendly labels for the
// filter buttons. The codes must match the `action` enum in
// backend/models/ActivityLog.js.
const ACTION_FILTERS = [
  { code: "", label: "All activity" },
  { code: "SIGNUP", label: "Signups" },
  { code: "LOGIN", label: "Logins" },
  { code: "UPLOAD_RECEIPT", label: "Receipt uploads" },
  { code: "SCAN_RECEIPT", label: "Receipt scans" },
  { code: "CHECK_RATES", label: "Rate checks" },
  { code: "SEARCH_MANDI", label: "Mandi searches" },
  { code: "VIEW_MANDI", label: "Mandi views" },
];

function AdminActivity() {
  const [selectedAction, setSelectedAction] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [activity, setActivity] = useState([]);
  const [actionCounts, setActionCounts] = useState([]);
  const [totalMatching, setTotalMatching] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Reload whenever the filter or page changes.
  useEffect(() => {
    loadActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAction, page]);

  async function loadActivity() {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await getAdminActivity({
        action: selectedAction,
        search: search.trim(),
        page,
      });
      setActivity(response.data.activity);
      setActionCounts(response.data.actionCounts);
      setTotalMatching(response.data.totalMatching);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      console.error(error);
      setErrorMessage("Could not load the activity feed. Is the backend running?");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    loadActivity();
  }

  // Picking a filter should always start again from page 1, otherwise
  // you can end up on "page 5" of a filter that only has 2 pages.
  function handleFilterChange(code) {
    setSelectedAction(code);
    setPage(1);
  }

  // Look up how many rows exist for one action code, for the little
  // count next to each filter button.
  function countFor(code) {
    if (!code) return actionCounts.reduce((sum, a) => sum + a.count, 0);
    return actionCounts.find((a) => a.action === code)?.count ?? 0;
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 animate-fadeIn">
      <h1 className="text-2xl font-bold text-ink-900 mb-2">⚡ Farmer Activity</h1>
      <p className="text-ink-600 mb-6">
        Everything farmers have done in the app, newest first.
      </p>

      {/* ---------- Filter chips ---------- */}
      <div className="flex flex-wrap gap-2 mb-5">
        {ACTION_FILTERS.map((filter) => (
          <button
            key={filter.code}
            onClick={() => handleFilterChange(filter.code)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
              selectedAction === filter.code
                ? "bg-primary-600 text-white"
                : "bg-white text-ink-600 border border-gray-200 hover:border-brand-green"
            }`}
          >
            {filter.label}
            <span className="ml-1.5 opacity-70">({countFor(filter.code)})</span>
          </button>
        ))}
      </div>

      {/* ---------- Search ---------- */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by farmer name, email or description..."
          className="flex-1 border border-ink-200 rounded-xl px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
        />
        <button
          type="submit"
          className="bg-primary-gradient text-white font-semibold px-6 py-2.5 rounded-xl shadow-soft hover:scale-[1.02] transition-all"
        >
          🔍 Search
        </button>
      </form>

      {errorMessage && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 mb-6 text-sm">
          {errorMessage}
        </div>
      )}

      <p className="text-sm text-ink-500 mb-3">
        Showing {activity.length} of {totalMatching} entries
      </p>

      {/* ---------- The feed ---------- */}
      {isLoading ? (
        <div className="text-center py-16 text-ink-500">
          <div className="text-3xl mb-2 animate-pulse">⚡</div>
          <p className="text-sm">Loading activity...</p>
        </div>
      ) : activity.length === 0 ? (
        <div className="text-center py-16 text-ink-500 bg-white rounded-2xl border border-gray-100">
          <div className="text-3xl mb-2">🤷</div>
          <p className="font-medium">No activity matched.</p>
          <p className="text-sm mt-1">
            Try a different filter, or wait for farmers to use the app.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-soft border border-surface-300/60 divide-y divide-surface-200">
          {activity.map((item) => (
            <div key={item._id} className="flex items-start gap-3 px-5 py-4">
              <span className="text-xl">{actionIcon(item.action)}</span>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800">{item.description}</p>
                <p className="text-xs text-ink-400 mt-0.5">
                  {item.userName} · {item.userEmail}
                </p>

                {/* If the log row carried extra details, show them as
                    small chips. Object.entries turns { crop: "Wheat" }
                    into [["crop", "Wheat"]] so we can map over it. */}
                {item.details && Object.keys(item.details).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {Object.entries(item.details)
                      .filter(([, value]) => value !== null && value !== "")
                      .map(([key, value]) => (
                        <span
                          key={key}
                          className="bg-gray-50 text-ink-500 px-2 py-0.5 rounded text-[11px]"
                        >
                          {key}: <strong>{String(value)}</strong>
                        </span>
                      ))}
                  </div>
                )}
              </div>

              <span className="text-xs text-ink-400 whitespace-nowrap">
                {new Date(item.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ---------- Pagination ---------- */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg border border-ink-200 text-ink-600 disabled:opacity-40 hover:bg-surface-200 transition-all"
          >
            ← Previous
          </button>
          <span className="text-sm text-ink-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg border border-ink-200 text-ink-600 disabled:opacity-40 hover:bg-surface-200 transition-all"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

export default AdminActivity;
