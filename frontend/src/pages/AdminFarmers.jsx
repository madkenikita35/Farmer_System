// pages/AdminFarmers.jsx
// -----------------------------------------------------------------------
// "How many farmers have enrolled, and who are they?"
//
// A searchable, paginated table of every farmer account, showing when
// they joined, when they last logged in, and how much they've actually
// used the app. Click a row to expand it and see that farmer's receipts
// and their personal activity history.
//
// An admin can also BLOCK a farmer here. Note we deactivate rather than
// delete: their uploaded receipts stay in the shared community price
// pool that other farmers' comparisons depend on. Deleting them would
// quietly make everyone else's price data worse.
// -----------------------------------------------------------------------

import { useState, useEffect } from "react";
import {
  getAdminFarmers,
  getAdminFarmerDetail,
  toggleFarmerActive,
} from "../api/api";
import StatCard from "../components/StatCard";
import { actionIcon } from "./AdminDashboard";

function AdminFarmers() {
  const [search, setSearch] = useState("");
  const [farmers, setFarmers] = useState([]);
  const [totalMatching, setTotalMatching] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Which farmer's row is currently expanded (their id), or null.
  const [expandedFarmerId, setExpandedFarmerId] = useState(null);

  // Reload whenever the page number changes.
  useEffect(() => {
    loadFarmers(search, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function loadFarmers(searchTerm, pageNumber) {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await getAdminFarmers({ search: searchTerm, page: pageNumber });
      setFarmers(response.data.farmers);
      setTotalMatching(response.data.totalMatching);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      console.error(error);
      setErrorMessage("Could not load the farmer list. Is the backend running?");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    setPage(1); // always jump back to page 1 for a new search
    loadFarmers(search.trim(), 1);
  }

  // Block / unblock a farmer, then update just that one row in our list
  // rather than re-fetching the whole page - it feels instant.
  async function handleToggleActive(farmerId) {
    try {
      const response = await toggleFarmerActive(farmerId);
      setFarmers((previous) =>
        previous.map((f) =>
          f.id === farmerId ? { ...f, isActive: response.data.isActive } : f
        )
      );
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Could not update that farmer.");
    }
  }

  const activeCount = farmers.filter((f) => f.isActive).length;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 animate-fadeIn">
      <h1 className="text-2xl font-bold text-ink-900 mb-2">🧑‍🌾 Enrolled Farmers</h1>
      <p className="text-ink-600 mb-6">
        Everyone who has signed up, with how much they've used the app.
        Click any row to see that farmer's receipts and activity.
      </p>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon="🧑‍🌾"
          label="Farmers Matching"
          value={totalMatching}
          tone="primary"
        />
        <StatCard icon="✅" label="Active on This Page" value={activeCount} />
        <StatCard icon="📄" label="Page" value={`${page} of ${totalPages}`} />
      </div>

      {/* ---------- Search ---------- */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, phone or state..."
          className="flex-1 border border-ink-200 rounded-xl px-4 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
        />
        <button
          type="submit"
          className="bg-primary-gradient text-primary-foreground font-semibold px-6 py-2.5 rounded-xl shadow-soft hover:scale-[1.02] transition-all"
        >
          🔍 Search
        </button>
      </form>

      {errorMessage && (
        <div className="bg-negative-50 text-negative-700 border border-negative-200 rounded-lg px-4 py-3 mb-6 text-sm">
          {errorMessage}
        </div>
      )}

      {/* ---------- Table ---------- */}
      {isLoading ? (
        <div className="text-center py-16 text-ink-500">
          <div className="text-3xl mb-2 animate-pulse">🧑‍🌾</div>
          <p className="text-sm">Loading farmers...</p>
        </div>
      ) : farmers.length === 0 ? (
        <div className="text-center py-16 text-ink-500 bg-card rounded-2xl border border-border">
          <div className="text-3xl mb-2">🤷</div>
          <p className="font-medium">No farmers found.</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl shadow-soft border border-surface-300/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-200/70 text-ink-600">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Farmer</th>
                  <th className="text-left px-4 py-3 font-semibold">State</th>
                  <th className="text-left px-4 py-3 font-semibold">Enrolled</th>
                  <th className="text-left px-4 py-3 font-semibold">Last Login</th>
                  <th className="text-right px-4 py-3 font-semibold">Receipts</th>
                  <th className="text-right px-4 py-3 font-semibold">Actions</th>
                  <th className="text-right px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {farmers.map((farmer) => (
                  <FarmerRow
                    key={farmer.id}
                    farmer={farmer}
                    isExpanded={expandedFarmerId === farmer.id}
                    onToggleExpand={() =>
                      setExpandedFarmerId(expandedFarmerId === farmer.id ? null : farmer.id)
                    }
                    onToggleActive={() => handleToggleActive(farmer.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
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

// ---------------------------------------------------------------------
// One farmer row. When expanded, it renders a SECOND <tr> underneath
// holding that farmer's full detail (fetched only when you open it -
// there's no point loading 20 farmers' receipts nobody asked to see).
// ---------------------------------------------------------------------
function FarmerRow({ farmer, isExpanded, onToggleExpand, onToggleActive }) {
  const [detail, setDetail] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Fetch the detail the first time this row is opened, and only then.
  useEffect(() => {
    if (!isExpanded || detail) return; // already open, or already loaded

    async function loadDetail() {
      setIsLoadingDetail(true);
      try {
        const response = await getAdminFarmerDetail(farmer.id);
        setDetail(response.data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoadingDetail(false);
      }
    }
    loadDetail();
  }, [isExpanded, detail, farmer.id]);

  return (
    <>
      <tr
        className={`border-t border-surface-200 hover:bg-primary-50/40 cursor-pointer ${
          isExpanded ? "bg-positive-50/50" : ""
        }`}
        onClick={onToggleExpand}
      >
        <td className="px-4 py-3">
          <p className="font-medium text-ink-900">{farmer.name}</p>
          <p className="text-xs text-ink-400">{farmer.email}</p>
          {farmer.phone && <p className="text-xs text-ink-400">📞 {farmer.phone}</p>}
        </td>
        <td className="px-4 py-3 text-ink-600">{farmer.state || "—"}</td>
        <td className="px-4 py-3 text-ink-600">
          {new Date(farmer.enrolledOn).toLocaleDateString()}
        </td>
        <td className="px-4 py-3 text-ink-600">
          {farmer.lastLoginAt ? new Date(farmer.lastLoginAt).toLocaleDateString() : "Never"}
        </td>
        <td className="px-4 py-3 text-right font-semibold">{farmer.receiptCount}</td>
        <td className="px-4 py-3 text-right text-ink-500">{farmer.activityCount}</td>
        <td className="px-4 py-3 text-right">
          {/* stopPropagation stops the click ALSO expanding the row -
              otherwise blocking someone would open their details too. */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleActive();
            }}
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              farmer.isActive
                ? "bg-positive-100 text-positive-700 hover:bg-positive-200"
                : "bg-negative-100 text-negative-700 hover:bg-negative-200"
            }`}
          >
            {farmer.isActive ? "Active" : "Blocked"}
          </button>
        </td>
      </tr>

      {isExpanded && (
        <tr className="bg-muted/70">
          {/* colSpan makes this cell stretch across all 7 columns */}
          <td colSpan={7} className="px-4 py-5">
            {isLoadingDetail ? (
              <p className="text-sm text-ink-500 text-center py-4">Loading details...</p>
            ) : !detail ? (
              <p className="text-sm text-negative-600 text-center py-4">
                Could not load this farmer's details.
              </p>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {/* ---- Their receipts ---- */}
                <div>
                  <h4 className="font-semibold text-ink-900 text-sm mb-2">
                    🧾 Receipts ({detail.receiptCount})
                  </h4>
                  {detail.receipts.length === 0 ? (
                    <p className="text-xs text-ink-500">No receipts uploaded yet.</p>
                  ) : (
                    <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {detail.receipts.map((r) => (
                        <li
                          key={r._id}
                          className="bg-card rounded-lg border border-border px-3 py-2 text-xs"
                        >
                          <div className="flex justify-between gap-2">
                            <span className="font-medium text-ink-900">{r.crop}</span>
                            <VerdictBadge verdict={r.verdict} />
                          </div>
                          <p className="text-ink-500 mt-0.5">
                            {r.mandiName} · ₹{r.pricePerQuintal}/qtl · {r.quantityInQuintal} qtl
                          </p>
                          <p className="text-ink-400">{r.date}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* ---- Their activity ---- */}
                <div>
                  <h4 className="font-semibold text-ink-900 text-sm mb-2">
                    ⚡ Recent Activity
                  </h4>
                  {detail.activity.length === 0 ? (
                    <p className="text-xs text-ink-500">No activity recorded yet.</p>
                  ) : (
                    <ul className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {detail.activity.map((a) => (
                        <li key={a._id} className="flex items-start gap-2 text-xs">
                          <span>{actionIcon(a.action)}</span>
                          <div>
                            <p className="text-ink-700">{a.description}</p>
                            <p className="text-ink-400">
                              {new Date(a.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// A small coloured pill for a receipt's verdict.
function VerdictBadge({ verdict }) {
  const styles = {
    "Fair Price": "bg-positive-100 text-positive-700",
    Underpaid: "bg-negative-100 text-negative-700",
    Overpaid: "bg-blue-100 text-blue-700",
    "No Data": "bg-muted text-ink-600",
  };

  return (
    <span className={`px-2 py-0.5 rounded-full font-medium ${styles[verdict] || styles["No Data"]}`}>
      {verdict}
    </span>
  );
}

export default AdminFarmers;
