# Mandi Price Checker — Complete Project Documentation

**For someone who has just joined and has never seen this codebase.**

This file is a plain Markdown file inside the repository. It needs no
login, no cloud account and no internet connection — open it in any text
editor, or read it rendered on GitHub.

> **Scope of this file.** `README.md` explains the *product idea* and the
> older features in narrative form. **This file is the technical
> reference**: every folder, every file, every dependency, every
> endpoint, every environment variable, and every known limitation.
> Where the two overlap, this file is the newer one.

---

## Table of contents

1. [What this app does](#1-what-this-app-does)
2. [The stack, and why each piece is here](#2-the-stack-and-why-each-piece-is-here)
3. [Getting it running in 10 minutes](#3-getting-it-running-in-10-minutes)
4. [Environment variables — every one](#4-environment-variables--every-one)
5. [Repository layout](#5-repository-layout)
6. [Backend: every file explained](#6-backend-every-file-explained)
7. [The API: every endpoint](#7-the-api-every-endpoint)
8. [Database models](#8-database-models)
9. [Frontend: every file explained](#9-frontend-every-file-explained)
10. [Authentication and who can see what](#10-authentication-and-who-can-see-what)
11. [The design system](#11-the-design-system)
12. [Internationalisation (11 languages)](#12-internationalisation-11-languages)
13. [The Android app (Capacitor)](#13-the-android-app-capacitor)
14. [Performance and caching](#14-performance-and-caching)
15. [Deployment (Render)](#15-deployment-render)
16. [How a request flows, end to end](#16-how-a-request-flows-end-to-end)
17. [Known limitations and gotchas](#17-known-limitations-and-gotchas)
18. [Glossary](#18-glossary)
19. [Changelog](#changelog)

---

## 1. What this app does

An Indian farmer sells a crop at a *mandi* (a government-regulated
wholesale market) and has no easy way to know whether the price they
were paid was fair. Prices vary a lot between mandis on the same day.

This app answers two questions:

1. **"Was I paid fairly?"** — upload a photo of your sale receipt. The
   app reads it with OCR and compares your price against the official
   government rate for that crop, that mandi, that date.
2. **"Where should I sell?"** — search a crop and see today's rates
   near you, across your state, and across India, so you know whether
   driving further is worth it.

Every price shown comes from one of **two sources**, and the app always
says which:

| Source | What it is | Where it comes from |
|---|---|---|
| **Government** | Official Agmarknet mandi rates | `data.gov.in` API |
| **Farmer-reported** | Prices from receipts other users uploaded | Our own MongoDB |

There is also **historical price trend** data from a third source, CEDA
(Centre for Economic Data & Analysis, Ashoka University).

---

## 2. The stack, and why each piece is here

### Backend — Node.js + Express

| Package | Version | What it does here |
|---|---|---|
| `express` | ^4.19.2 | The web server and routing |
| `mongoose` | ^8.4.0 | MongoDB models and queries |
| `jsonwebtoken` | ^9.0.3 | Signs the 15-minute access tokens |
| `bcryptjs` | ^3.0.3 | Hashes passwords (and refresh tokens) |
| `cookie-parser` | ^1.4.7 | Reads the HttpOnly refresh-token cookie |
| `cors` | ^2.8.5 | Controls which websites may call the API |
| `helmet` | ^8.3.0 | Sets security headers (CSP, HSTS, etc.) |
| `express-rate-limit` | ^8.7.0 | Stops one IP hammering the API |
| `dotenv` | ^16.4.5 | Loads `.env` into `process.env` |
| `axios` | ^1.7.2 | Calls the government and CEDA APIs |
| `multer` | ^1.4.5-lts.1 | Handles the receipt image upload |
| `sharp` | ^0.35.4 | Pre-processes receipt images before OCR |
| `tesseract.js` | ^5.1.0 | The OCR engine that reads receipts |
| `nodemon` (dev) | ^3.1.0 | Restarts the server when a file changes |

### Frontend — React + Vite

| Package | Version | What it does here |
|---|---|---|
| `react` / `react-dom` | ^18.3.1 | The UI library |
| `react-router-dom` | ^7.18.4 | Client-side routing (17 routes) |
| `axios` | ^1.7.2 | All API calls, with auth interceptors |
| `recharts` | ^2.12.7 | Every chart (bar, line, pie) |
| `lucide-react` | ^1.47.0 | **All** icons — see §11 |
| `@capacitor/core` `/cli` `/android` | ^8.5.2 | Wraps the web app as an Android app |
| `@capacitor/splash-screen` | ^8.0.2 | The launch screen |
| `@capacitor/status-bar` | ^8.0.3 | Colours the phone's status bar |
| `vite` (dev) | ^7.3.6 | Dev server and production bundler |
| `@vitejs/plugin-react` (dev) | ^5.2.0 | React support in Vite |
| `tailwindcss` (dev) | ^3.4.4 | All styling |
| `postcss` / `autoprefixer` (dev) | | Tailwind's build pipeline |

> **Version pinning note.** `@vitejs/plugin-react` is deliberately held
> at **5.x**, not 6.x. Version 6 requires Vite 8; this project uses Vite
> 7. Upgrading one without the other breaks the build with an `ERESOLVE`
> error.

---

## 3. Getting it running in 10 minutes

### Prerequisites

- **Node.js 18+** (20 LTS recommended)
- **MongoDB** — either a local install or a free MongoDB Atlas cluster
- A free **data.gov.in** API key (for real mandi prices)
- *(optional)* A **CEDA** API key (for price history)

The app runs without the API keys — it falls back to a small sample
dataset and says so on screen.

### Step 1 — Backend

```bash
cd backend
npm install
cp .env.example .env     # then fill in the values (see §4)
npm run dev              # starts on http://localhost:5000
```

You should see:

```
🌐 CORS allows: http://localhost:5173, https://localhost, capacitor://localhost
✅ MongoDB connected successfully
🚀 Server running on http://localhost:5000
```

### Step 2 — Frontend

In a **second terminal**:

```bash
cd frontend
npm install
cp .env.example .env     # VITE_API_URL=http://localhost:5000/api
npm run dev              # starts on http://localhost:5173
```

Open <http://localhost:5173>. You can browse prices immediately — **no
login needed**. Sign in only for uploading receipts or the dashboard.

### Step 3 — Demo accounts

On first run the backend seeds two accounts from your `.env`:

- an **admin** (`DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD`)
- a **farmer** (`DEFAULT_FARMER_EMAIL` / `DEFAULT_FARMER_PASSWORD`)

> ⚠️ These credentials exist **only** in `backend/.env`, which is
> gitignored. They are never printed in the UI, in logs, or in this
> document. If you need them, read your own `.env`.

---

## 4. Environment variables — every one

### `backend/.env`

| Variable | Required? | Default | What it does |
|---|---|---|---|
| `PORT` | no | `5000` | Port the API listens on |
| `MONGO_URI` | **yes** | — | MongoDB connection string |
| `JWT_SECRET` | **yes** | — | Signs access tokens. Must be long and random |
| `JWT_EXPIRES_IN` | no | `15m` | Access-token lifetime |
| `REFRESH_TOKEN_DAYS` | no | `30` | Refresh-cookie lifetime |
| `CLIENT_URL` | **yes in prod** | `http://localhost:5173` | Comma-separated list of allowed website origins (CORS) |
| `NODE_ENV` | **yes in prod** | — | `production` turns on `secure` + `sameSite=none` cookies |
| `MANDI_API_KEY` | no | — | data.gov.in key. Without it, sample data is used |
| `MANDI_RESOURCE_ID` | no | — | Which data.gov.in dataset to query |
| `CEDA_API_KEY` | no | — | CEDA key for price history |
| `DEFAULT_ADMIN_EMAIL` / `_PASSWORD` | no | — | Seeds an admin on first run |
| `DEFAULT_FARMER_EMAIL` / `_PASSWORD` | no | — | Seeds a demo farmer |

### `frontend/.env`

| Variable | Required? | What it does |
|---|---|---|
| `VITE_API_URL` | **yes** | Base URL of the API. **Must end in `/api`** |

> **The `/api` suffix is not optional.** Every path in `api/api.js` is
> written relative to it (`/auth/login`, not `/api/auth/login`). Leaving
> it off produces a 404 on *every single request* — this has bitten this
> project twice.

**Vite loads env files by mode:**

| File | Used by | Typical value |
|---|---|---|
| `.env` | `npm run build` (production, and the Android app) | the deployed Render URL |
| `.env.development` | `npm run dev` | `http://localhost:5000/api` |

Both are gitignored (`.env.*`, with `!.env.example`). Vite bakes these
in **at build time**, so changing one requires a rebuild.

---

## 5. Repository layout

```
mandi-price-checker/
├── backend/                 Node + Express API
│   ├── config/              Startup helpers and static data tables
│   ├── controllers/         Request handlers (one per feature area)
│   ├── middleware/          auth guard, file upload
│   ├── models/              Mongoose schemas
│   ├── routes/              URL → controller wiring
│   ├── services/            Business logic and external APIs
│   ├── uploads/             Receipt images (gitignored except .gitkeep)
│   ├── eng.traineddata      Tesseract's English model (5 MB, committed)
│   └── server.js            App entry point
│
├── frontend/                React + Vite web app
│   ├── android/             Capacitor's generated Android project
│   ├── public/logo.svg      The brand mark, source of all app icons
│   └── src/
│       ├── api/             The single axios client
│       ├── components/      Reusable UI
│       ├── context/         React contexts (auth, language, theme)
│       ├── i18n/            All translations
│       ├── pages/           One file per route
│       └── styles/tokens.css  Generated design tokens
│
├── README.md                Product overview
└── DOCUMENTATION.md         This file
```

---

## 6. Backend: every file explained

### `server.js`

The entry point. In order, it: loads `.env`, checks for insecure
placeholder secrets, connects to MongoDB, seeds demo users, applies
`helmet`, configures **CORS**, parses JSON and cookies, applies rate
limiting, mounts every router, and starts listening.

Startup failures are **fatal** (`process.exit(1)`) — a server that
silently fails to bind its port is worse than one that stops loudly.

### `config/`

| File | Purpose |
|---|---|
| `db.js` | Connects Mongoose to `MONGO_URI` |
| `checkSecrets.js` | Warns loudly if `JWT_SECRET` is still placeholder text |
| `seedUsers.js` | Creates the demo admin/farmer if they don't exist |
| `cropCategories.js` | Maps crop names → category (vegetables, cereals…) |
| `ocrDictionaries.js` | Known crops, states, units and keywords for OCR |
| `placeMatching.js` | Matches place names **across scripts** — "इंदौर" ↔ "Indore" — by reducing both to a consonant skeleton |
| `spokenForms.js` | Converts numbers and dates into spoken words, per language, for the voice assistant |
| `stateCentres.js` | The geographic centre of each state — the last-resort fallback |
| `districtCoordinates.json` | **383** district positions, keyed `State\|\|\|District`. Built by `buildDistrictCoordinates.js`, and extended at runtime — see §6.2 |
| `voicePhrases.js` | Intent keywords and reply templates per language |

### `services/` — where the real work happens

| File | Responsibility |
|---|---|
| `mandiApiService.js` | Calls data.gov.in for crop prices. Records sync time |
| `mandiDirectoryService.js` | Builds the list of all mandis from a 10,000-row fetch. Heavily cached (§14) |
| `cedaService.js` | CEDA wrapper: rate-limit budget, retries, de-duplication, 24-hour price cache |
| `priceTrendService.js` | Builds price trends from our own receipts |
| `communityPriceService.js` | Averages farmer-reported prices |
| `locationService.js` | Haversine distance, district lookup (§6.2), pincode and address resolution, implausible-distance warnings |
| `ocrService.js` | The receipt reading pipeline (§6.1) |
| `fuzzyMatch.js` | Edit-distance matching for misread crop/mandi names |
| `priceQuality.js` | Drops impossible prices (₹0.10 for onion) before averaging |
| `voiceIntentService.js` | Works out what a spoken question is asking |
| `activityService.js` | Writes admin audit-log entries |
| `syncStatusService.js` | Records when each feed last returned data |
| `persistentCache.js` | Read/write helpers for the MongoDB-backed cache |

#### 6.1 How receipt OCR works

1. **`sharp`** builds up to three versions of the image: the original, a
   contrast-enhanced greyscale, and a hard black-and-white threshold.
   Width is clamped to **1800–2200px** — small scans are enlarged, phone
   photos are shrunk (this cut memory 362 MB → 280 MB).
2. **Tesseract** runs up to five passes across those versions with
   different page-segmentation modes, stopping early once a pass scores
   well enough.
3. Each pass is **scored** on how many fields it found; results are
   merged field by field, so the crop can come from one pass and the
   price from another.
4. `fuzzyMatch.js` maps misread names onto real ones.
5. Temporary image variants are always deleted in a `finally` block.

**Measured:** ~6 seconds and ~280 MB peak for a 3024×4032 phone photo,
6/6 fields extracted.

#### 6.2 How a mandi gets put on the map

The government feed gives **names only** — state, district, market — and
**no coordinates at all**. Everything the "near me" feature does rests on
turning those names into a latitude and longitude.

`findMandiLocation(state, district)` tries three things in order:

1. **Exact match** in `config/districtCoordinates.json`
   (`"Maharashtra|||Nagpur"`). Accurate to a few tens of km.
2. **District name under a different state spelling** — the feed is not
   consistent ("Chattisgarh" vs "Chhattisgarh").
3. **The centre of the state**, tagged `accuracy: "state"`.

> **⚠️ Why step 3 is dangerous, and what was done about it.**
>
> `districtCoordinates.json` is generated from **one day's** mandi feed.
> India has roughly 780 districts; a typical day's data mentions under
> 300. So the file has permanent holes — Maharashtra shipped with only
> **17 of its 36 districts**.
>
> A missing district landed on the state centre, which for Maharashtra is
> 384 km from Nagpur. Real measured examples:
>
> | District | reported as | actually |
> |---|---|---|
> | Wardha | 384 km | 61 km |
> | Bhandara | 384 km | 74 km |
> | Gondia | 384 km | 120 km |
> | Amravati | 384 km | 149 km |
>
> Every one of those was **excluded from a 150 km search** — the exact
> failure "near me" exists to prevent, and invisible, because the app
> confidently showed a wrong number rather than an error.

**The app now learns.** When `findMandiLocation` meets a district it does
not know, it returns the state centre for *that* request and queues
`learnDistrict()`:

- geocodes the district on **Nominatim** in the background,
- writes the result to MongoDB under the `learned-districts` cache key,
- uses it immediately in memory, and on every later request.

Three things keep this safe:

1. **Nobody waits.** The request that discovered the district has already
   been answered.
2. **One attempt per district per process**, so an ungeocodable name is
   not retried on every row of every request.
3. **Serialised at 1.1s intervals**, because Nominatim asks for at most
   one request per second.

`primeLearnedDistricts()` runs at startup and merges everything learned
on previous runs, so the knowledge survives restarts. You will see
`Loaded N learned district positions.` in the logs.

To refresh the shipped file manually (a one-off, ~7 minutes):

```bash
cd backend
node buildDistrictCoordinates.js   # merges; never discards what it has
```

### `controllers/`

| File | Handles |
|---|---|
| `authController.js` | signup, login, refresh, logout, `/me` |
| `receiptController.js` | scan, save, list receipts, dashboard stats |
| `mandiController.js` | prices, compare, mandi list, crop names, coverage |
| `nearbyController.js` | the "near me" search across three scopes |
| `cedaController.js` | CEDA crops, locations, price trends |
| `trendController.js` | receipt-based trends |
| `locationController.js` | resolving a pincode / address / town / coords |
| `voiceController.js` | the voice assistant's answers |
| `adminController.js` | admin stats, farmer list, activity log |

---

## 7. The API: every endpoint

Base path: `/api`

### Public — no login required

These serve government or aggregated data. A farmer should not need an
account to look up a price.

| Method | Path | Returns |
|---|---|---|
| `GET` | `/mandi/prices?crop=&date=` | Today's rates for a crop |
| `GET` | `/mandi/compare?crop=&state=&date=` | Government vs farmer prices, plus best/worst mandi |
| `GET` | `/mandi/list?search=&state=` | The mandi directory |
| `GET` | `/mandi/crops?mandi=&state=` | Every crop one mandi lists |
| `GET` | `/mandi/crop-names` | Crop names for dropdowns (~206) |
| `GET` | `/mandi/crop-coverage?limit=` | Most/least widely listed crops |
| `GET` | `/mandi/nearby?crop=&lat=&lon=&place=&radius=&mode=` | Best-paying mandis near a point **or a place name**. `radius` is **optional** — see §7.1 |
| `GET` | `/crops` | Every crop CEDA knows (~453) |
| `GET` | `/locations` | States and districts |
| `GET` | `/crops/:cropName/price-trend?level=&location=&from=&to=` | Price history |
| `GET` | `/prices/crops` | Crops we hold receipts for |
| `GET` | `/prices/trend?crop=&level=&location=` | Trend from receipts |
| `GET` | `/location/resolve?method=pincode\|address\|coords\|place` | Turns any of those into coordinates |
| `GET` | `/sync-status` | When each feed last returned data |
| `POST` | `/voice/query` | Ask a price question in words |

#### 7.1 Radius is a filter, not a precondition

`radius` is optional on **both** `/mandi/nearby` and `/mandi/compare`.
Omitting it, or sending it empty, means **no distance cap**.

| Request | Behaviour |
|---|---|
| no `radius` | Every locatable mandi, **sorted nearest-first** |
| `radius=150`, matches | Only those inside 150 km, sorted by price |
| `radius=150`, matches nothing | Falls back to **all**, nearest-first, and sets `radiusFilterEmpty: true` |

**Why it changed.** The radius used to default to 150 km (50 km on
Check Rates) whether or not anyone had asked for one. A location with no
mandi inside that ring returned an empty list — so "where is my nearest
mandi?" was answered with "nowhere", which is never true. Measured from
Nagpur: 0 results at 150 km, while a real nearest mandi sat 350 km away.

**Why the sort flips.** "Highest price first" is right *inside* a radius:
the farmer has already said how far they will drive, so the question
becomes which of those pays best. With no cap that logic breaks —
sorting 376 mandis nationwide by price just returns the national
maximum, which from Nagpur was a Tamil Nadu mandi 917 km away presented
as the top "nearby" result. So with no radius, and after a failed
radius, distance wins. An explicit `?sortBy=` still overrides.

**Extra response fields:** `radiusKm` (null when uncapped),
`radiusFilterEmpty`, `requestedRadiusKm`.

### Requires a logged-in user

| Method | Path | Returns |
|---|---|---|
| `POST` | `/receipts/scan` | OCR a receipt image (multipart) |
| `POST` | `/receipts` | Save a reviewed receipt |
| `GET` | `/receipts` | **Your** receipts |
| `GET` | `/receipts/image/:filename` | A stored receipt image |
| `GET` | `/receipts/dashboard-stats` | **Your** dashboard figures |
| `GET` | `/auth/me` | The current user |
| `POST` | `/auth/logout` / `/auth/logout-all` | End session(s) |

### Public auth endpoints

`POST /auth/signup`, `POST /auth/login`, `POST /auth/refresh`

### Admin only

`GET /admin/stats`, `/admin/farmers`, `/admin/farmers/:id`,
`/admin/activity`, and `PATCH /admin/farmers/:id/toggle-active`

---

## 8. Database models

| Model | Fields | Notes |
|---|---|---|
| **User** | name, email, password, role, phone, state, isActive, lastLoginAt | `role` is `farmer` or `admin`. Password is bcrypt-hashed |
| **Receipt** | uploadedBy, uploadedByName, imageName, rawOcrText, crop, mandiName, state, quantityInQuintal, pricePerQuintal, date, communityReportCount, verdict, dataSource, matchedMarketDate | `verdict` is Fair / Underpaid / Overpaid |
| **RefreshToken** | tokenHash, user, expiresAt, userAgent | Stores a **SHA-256 hash**, never the token. TTL index auto-deletes |
| **ActivityLog** | user, userName, userEmail, userRole, action, description, details | The admin audit trail |
| **SyncStatus** | source, lastSyncedAt, recordCount | One row per feed |
| **CachedPayload** | key, payload, fetchedAt, lifetime | Restart-proof cache. 24-hour TTL index |

---

## 9. Frontend: every file explained

### Entry and shell

| File | Purpose |
|---|---|
| `main.jsx` | Mounts React, calls `initNative()` and `warmUpBackend()` |
| `App.jsx` | **Only** routing — 17 routes and their guards |
| `native.js` | Everything that applies only in the Android app |
| `components/AppShell.jsx` | The frame: sidebar, top bar, content, footer, bottom tabs |
| `components/TopBar.jsx` | Slim header — brand, and one user control |
| `components/Sidebar.jsx` | Grouped navigation (Prices / My Records / Account) |
| `components/BottomTabBar.jsx` | 5 tabs, **Android only** |

### Pages (one per route)

`Home`, `CheckRates`, `NearbyMandis`, `Mandis`, `MandiDetail`,
`CropsList`, `CropTrend`, `Upload`, `Dashboard`, `Profile`, `Login`,
`Signup`, `AdminDashboard`, `AdminFarmers`, `AdminActivity`.

### Notable components

| Component | What it does |
|---|---|
| `CropSelect` | Crop dropdown grouped by category, from the live API |
| `PickList` | Generic dropdown (states, mandis, crops) with `<optgroup>` support |
| `LocationPicker` | Five ways to say where you are: GPS, town, pincode, address, lat/long. **Each works on its own** — see §9.1 |
| `ScopeComparisonCards` | Near-you / state / national comparison (Check Rates) |
| `BuySellScopeCards` | The same idea for Near Me, flipped by buy/sell mode |
| `DataFreshness` | "Data last updated: DD-MM-YYYY at HH:MM" |
| `CollapsibleSection` | A `<details>`-based folding section |
| `SignInPrompt` | Shown *in place of* a gated page — never a redirect |
| `VoiceAssistant` | Speech in/out in English, Hindi, Marathi |
| `icons.jsx` | **Every** icon in the app, one mapping onto lucide |
| `chartTheme.js` | Shared chart colours, read from CSS tokens at render time |

#### 9.0 "Has the user chosen a radius?"

Both Near Me and Check Rates track `radiusChosen` **separately from the
dropdown's value**. Until someone touches the control, no `radius` is
sent at all and the server returns the nearest result uncapped. The
dropdown's first option is **"Any distance"**, not a number.

Changing the radius re-queries using the **location already known** — it
never asks for the location again. When a radius matches nothing, a
banner says *"No mandis within X km — showing the nearest overall
instead"* rather than leaving a blank panel.

> **Implementation trap.** `setRadiusChosen(false)` has not applied by
> the time the search function reads it — setState is async. So
> "clear the radius" passes an explicit `null` sentinel rather than
> relying on the flag. The same applies to `sortBy`, which is `null`
> until chosen so the server can default by context.

#### 9.1 The five location methods, and why none of them needs a second button

`LocationPicker` has a small **Find** button. It used to be compulsory:
type a town → press Find → *then* press "Find Best Mandis". Miss the
middle step, with a big green button sitting right there, and you were
told *"type the town you are selling near"* while your town was already
in the box.

Each method now resolves itself when the search runs:

| Method | How the search gets a position |
|---|---|
| **My location** | Browser geolocation, as before |
| **Town** | The typed name goes up as `place=` — the backend geocodes it |
| **Address** | The four boxes are joined and sent as `place=` |
| **Pincode** | Auto-resolved via `/location/resolve` first, then searched |
| **Lat / Long** | Auto-resolved (validated as inside India), then searched |

Pincode and lat/long are *resolved* rather than passed as text because
they need **validating** — a six-digit code either exists or it does not,
and a coordinate either falls inside India or it does not. That costs a
second request, but the farmer presses one button.

The mechanism: `LocationPicker` reports keystrokes upward through a new
`onDraft` callback, so `NearbyMandis` knows what has been typed, not just
what has been resolved. The **Find** button still works; it is simply no
longer required.

### Contexts

| Context | Holds |
|---|---|
| `AuthContext` | Current user, login/logout, session restore |
| `LanguageContext` | Active language, `t()` and `tPlural()` |
| `ThemeContext` | The accent colour (green / earth) |

---

## 10. Authentication and who can see what

### The token design

- The **access token** is a 15-minute JWT held **in memory only** —
  never in `localStorage`, so an XSS bug cannot steal it.
- The **refresh token** is opaque and random, sent as an
  **HttpOnly, Secure, SameSite** cookie scoped to `/api/auth`. JavaScript
  cannot read it. The database stores only its SHA-256 hash.
- Refresh tokens **rotate**: using one invalidates it and issues a new
  one, so a stolen token is single-use.
- `localStorage` holds **only** UI preferences:
  `mandi_language`, `mandi_theme_accent`, `mandi_sidebar_collapsed`.

### Guest browsing

Since the guest-browsing change, **the app no longer has a login wall**.

| Area | Access |
|---|---|
| Home, Check Rates, Near Me, Mandis, Price Trends | **Public** |
| Upload Receipt, Dashboard, Profile | Account required |
| `/admin/*` | Admin role required |

A guest who opens `/upload` sees `SignInPrompt` **on that page**, with
the destination remembered — not a redirect that loses their place.

> **Note on Dashboard.** It is *not* national statistics; it shows the
> signed-in farmer's own receipts (`req.user._id`). Making it public
> would leak one farmer's sale history to everyone.

---

## 11. The design system

### Colour: CSS variables, not hex codes

`src/styles/tokens.css` is **generated** and holds ~127 CSS variables.
`tailwind.config.js` points every Tailwind colour at one of them:

```js
primary: { 600: "rgb(var(--primary-600) / <alpha-value>)" }
```

Colours are stored as **space-separated RGB channels** (`58 107 80`, not
`#3A6B50`) because that is what lets `bg-primary-600/50` keep working.

Theme is **one attribute on `<html>`**:

```html
<html data-accent="green">   <!-- or "earth" -->
```

Changing it swaps variable values; the browser repaints. No React
re-render, no props threaded through the tree.

Prefer **role names** over shades in new code: `bg-card`, `bg-muted`,
`border-border`, `text-negative-700`.

### Icons

Every icon comes from `components/icons.jsx`, which re-exports
lucide-react under the app's own vocabulary (`MandiIcon`, not
`Landmark`). Sizes are `ICON_SM` 14, `ICON_MD` 16, `ICON_LG` 20, stroke
`1.75`.

> **⚠️ The single most important rule in this codebase.** An icon is a
> **component**, not a string. It must be rendered as `<Icon />`, never
> as `{icon}`. Rendering it as a child throws *React error #31* — which
> unmounts the entire tree and produces a **blank white page with no
> console error**. This has happened twice. When a prop holds an icon,
> name it with a capital letter: `function Card({ icon: Icon })`.

### Typography

**Inter**, not Poppins — chosen for tabular figures (price columns line
up) and a taller x-height. Weights are deliberately restrained: most
text is `font-medium`, headings `font-semibold`.

### Geometry

Radii are 6–8px (`rounded-md` / `rounded-lg`). `rounded-2xl` was removed
throughout — 16px corners read as a consumer app.

---

## 12. Internationalisation (11 languages)

`src/i18n/translations.js` — **424 keys × 11 languages**:

English, हिन्दी, मराठी, ગુજરાતી, ਪੰਜਾਬੀ, বাংলা, தமிழ், తెలుగు,
ಕನ್ನಡ, മലയാളം, ଓଡ଼ିଆ.

```jsx
const { t } = useLanguage();
t("nav_home")                          // "Home"
t("cr_gap_note", { gap: 400 })         // with variables
```

Rules:

- **Never** hardcode user-facing English in a component.
- Add a new key to **all 11** languages, or that language silently falls
  back mid-sentence.
- The **admin panel is English only** — `canChangeLanguage` is false for
  admins, and admin labels are plain strings by design.

> **Known gap.** The ~19 newest keys (guest browsing, profile, data
> freshness) exist in English, Hindi and Marathi. The other eight fall
> back to English. These need a human translator, not machine output.

---

## 13. The Android app (Capacitor)

The Android app is the **same React build** wrapped in a WebView. There
is no second codebase.

```bash
cd frontend
npm run build          # Vite builds dist/
npx cap sync android   # copies dist/ into the Android project
npx cap open android   # opens Android Studio
```

Or build the APK without Android Studio:

```bash
cd frontend/android
./gradlew assembleDebug
# → app/build/outputs/apk/debug/app-debug.apk
```

### Native-only behaviour

Everything native is gated on `Capacitor.isNativePlatform()` (see
`src/native.js`) and marked with `data-native` on `<html>`, so CSS can
target it. **The website is never affected.**

| Feature | Native | Web |
|---|---|---|
| Bottom tab bar | ✅ 5 tabs | ✗ |
| Footer | hidden | ✅ |
| Status bar colour | brand green | n/a |
| Splash screen | logo on green | n/a |
| Safe-area insets | applied | 0px |
| `overscroll-behavior` | `none` | `auto` |
| Page transitions | 160ms fade | ✗ |
| Touch targets | ≥44px enforced | unchanged |
| Page padding (≤640px) | 16/20px | 24/40px |

### Java version — important

All Gradle modules must compile at **Java 17**. Capacitor plugins
disagree among themselves (`@capacitor/splash-screen` ships targeting
21), which fails with `invalid source release: 21`.

`android/build.gradle` forces every module to 17:

```gradle
subprojects { afterEvaluate { project ->
  if (project.hasProperty("android")) {
    project.android { compileOptions {
      sourceCompatibility JavaVersion.VERSION_17
      targetCompatibility JavaVersion.VERSION_17
    }}}}}
```

`android/gradle.properties` also pins the Gradle daemon via
`org.gradle.java.home`. **That path is machine-specific** — `android/`
is generated and not committed, but if that ever changes, the line must
move out of the repo.

### Backend CORS for the app

The app's origin is not your domain:

```js
const APP_ORIGINS = ["https://localhost", "capacitor://localhost"];
```

`https://localhost` is Android, `capacitor://localhost` is iOS. These
are constants in `server.js`, appended to whatever `CLIENT_URL` provides.

---

## 14. Performance and caching

### Three layers

```
in-memory cache  →  MongoDB (CachedPayload)  →  the external API
```

The in-memory layer is fastest but **dies with the process**. On a host
that sleeps, it is empty most of the time — so MongoDB is the second
line, and it survives restarts.

### Measured improvement

| Endpoint | Cold before | Cold after |
|---|---|---|
| `/api/mandi/list` | 4.1s | **0.22s** |
| `/api/crops` | 1.5s | **0.02s** |
| `/api/mandi/crop-names` | 0.31s | **0.10s** |
| `/api/mandi/crop-coverage` | 0.28s | **0.007s** |

`/api/mandi/list` is expensive because it downloads **10,000 rows** to
build the directory. Caching it persistently is what fixed it.

Look for `📦 Mandi directory served from the database` in the logs.

**Keys currently stored in `CachedPayload`:**

| Key | Holds | Lifetime |
|---|---|---|
| `mandi-directory` | The built mandi list | 6h (2min after a failure) |
| `ceda-crops` | CEDA's ~453 commodities | 24h |
| `ceda-geographies` | CEDA's states and districts | 24h |
| `learned-districts` | District positions geocoded at runtime (§6.2) | 30 days |

### Cold start

Render's free tier spins the service down after ~15 minutes idle.
**First request then takes ~22 seconds** and no code can change that.

Mitigations in place:

- `warmUpBackend()` fires the cheapest endpoint the moment the app
  loads, so the server wakes while the user reads the home page.
- **Not yet done:** an external pinger (UptimeRobot, cron-job.org) every
  10 minutes would keep it awake entirely. This is the real fix.

---

## 15. Deployment (Render)

Two separate services:

| Service | Type | Root | Build | Publish |
|---|---|---|---|---|
| Backend | Web Service | `backend` | `npm install` | — |
| Frontend | Static Site | `frontend` | `npm install && npm run build` | `dist` |

### Frontend settings

- Environment: `VITE_API_URL=https://<your-backend>.onrender.com/api`
- **Redirects/Rewrites:** source `/*`, destination `/index.html`, action
  **Rewrite** — without this, reloading `/check-rates` gives a 404,
  because it uses `BrowserRouter`.
- Vite bakes `VITE_API_URL` in at **build** time, so changing it
  requires a **redeploy**, not a restart.

### Backend settings

- `CLIENT_URL=https://<your-frontend>.onrender.com` — no trailing slash
- `NODE_ENV=production` — required for `secure` + `sameSite=none` cookies
- `MONGO_URI`, `JWT_SECRET`, `MANDI_API_KEY`, `MANDI_RESOURCE_ID`,
  `CEDA_API_KEY`

### MongoDB Atlas

Network Access must allow Render's IPs. Render's outbound IP is not
fixed on the free tier, so `0.0.0.0/0` is the usual answer.

---

## 16. How a request flows, end to end

Following **"Check Rates for Onion"**:

1. `pages/CheckRates.jsx` calls `compareMandiPrices()` from `api/api.js`.
2. The axios client attaches the in-memory access token (if any) and
   `withCredentials: true`.
3. Express applies `helmet` → CORS → rate limit → the router.
4. `mandiController.comparePrices()` runs:
   - `mandiApiService` fetches government prices (cached),
   - `communityPriceService` averages matching receipts from MongoDB,
   - `priceQuality.dropImpossiblePrices()` removes junk figures,
   - the best/worst mandi and price gap are computed.
5. JSON returns; React renders `ScopeComparisonCards` and the charts.
6. `DataFreshness` separately calls `/api/sync-status` (cached 60s in the
   browser) to show when the data arrived.

**If the access token has expired (401):** the axios interceptor calls
`/auth/refresh` once, retries the original request, and — if refresh also
fails — clears the session and notifies `AuthContext`. It does **not**
redirect. Public pages stay public; gated pages render `SignInPrompt`.

---

## 17. Known limitations and gotchas

### Data

- **Government data is incomplete, and more sparsely than you expect.**
  Not every mandi reports every crop every day. A real measurement taken
  while debugging a "near me" complaint:

  ```
  Onion, priced rows nationwide today : 376
  Tamil Nadu 270 · Punjab 18 · UP 17 · Haryana 17 · Kerala 10 …
  Maharashtra rows                    : 3   (all of them in Pune)
  ```

  So a farmer in Nagpur searching 150 km correctly saw nothing — no
  mandi near them reported onion that day. **`found = 0` is usually
  true, not a bug.** Before assuming the search is broken, check what
  the feed actually holds:
  `GET /api/mandi/nearby?crop=X&lat=&lon=&radius=2000` and compare
  `totalFound` against `scopes.national.mandiCount`.

- **Junk prices appear in the feed** — a ₹10 onion row was present on the
  day above. `priceQuality.js` filters these before averaging, but raw
  rows can still surface in lists.
- **CEDA data stops at 2025-10-30**, and its limit is **40 requests per
  hour** — which is why its lookups are cached hard.
- **Arrival quantity is unavailable** from data.gov.in.
- Mandi names in the feed are spelled unpredictably
  (`Bhindi(Ladies Finger)`), which is why every search is a dropdown.

### Infrastructure

- **Uploaded receipt images do not survive a restart.** Render's free
  tier has an ephemeral filesystem. This currently causes no visible
  breakage because the UI never displays stored images — but
  `/api/receipts/image/:filename` will 404 for anything older than the
  last restart. A real fix means Cloudinary/S3 or a paid disk.
- **OCR memory.** ~280 MB peak per scan against a 512 MB tier. Two
  simultaneous uploads could OOM the server.

### Code quality debt

These are known and **not yet fixed**:

- **Rupee formatting is duplicated 29 times.** `formatRupees()` exists in
  `chartTheme.js` but only two files import it.
- **The distance label exists in three copies**, one with the 12 km
  threshold hardcoded instead of using the named constant.
- **`ScopeComparisonCards` (353 lines) and `BuySellScopeCards` (229)**
  are near-duplicates that have already drifted apart.
- **Native `<select>` everywhere, no searchable combobox.** A 453-item
  dropdown is hard to use; type-ahead only jumps by first letter.
- Some free-text fields remain: Upload's crop/mandi/state, Signup's
  state, and LocationPicker's address boxes.

### Traps that have actually caused outages here

1. **`{icon}` instead of `<Icon />`** → React error #31 → blank page, no
   console error. See §11.
2. **`VITE_API_URL` without `/api`** → 404 on every request.
3. **Trailing slash in `CLIENT_URL`** → CORS rejects everything silently
   (the preflight still returns 204). The code now strips it.
4. **A regex sweep across source files** once pulled a line of code up
   into a comment, commenting out `const [status, setStatus]`. Because
   `status` is a real browser global (`window.status === ""`), there was
   **no error at all** — the voice assistant just stopped working. If you
   script a bulk edit, grep for `"const ` afterwards.

---

## 18. Glossary

| Term | Meaning |
|---|---|
| **Mandi** | A government-regulated wholesale agricultural market |
| **Agmarknet** | The Indian government's mandi price reporting system |
| **Quintal** | 100 kg. The unit mandi prices are quoted in |
| **Modal price** | The most commonly traded price that day — the headline figure |
| **CEDA** | Centre for Economic Data & Analysis, Ashoka University |
| **APMC** | Agricultural Produce Market Committee — runs a mandi |
| **Capacitor** | The tool that wraps this web app as a native app |
| **Verdict** | Our judgement on a receipt: Fair, Underpaid or Overpaid |

---

## Changelog

### 2026-09-21 (later)

- **Radius is now an optional filter across every location-dependent
  feature.** `/mandi/nearby` and `/mandi/compare` accept no radius and
  return the nearest mandi however far away it is; a radius that matches
  nothing falls back to the nearest overall and says so. Sorting flips to
  distance-first when there is no useful cap. (§7.1, §9.0)
- **Front ends track `radiusChosen` separately from the dropdown value**,
  so a default of 150 is never sent as if the farmer had asked for it.
  Both radius controls gained an "Any distance" option. (§9.0)
- **The voice assistant still uses a fixed `NEARBY_RADIUS_KM`** and was
  deliberately left alone — a spoken answer needs one short reply, not a
  mandi 900km away.

This file is updated **alongside every code change**, not afterwards. If
you change behaviour, add a line here and update the section it affects —
a document that lags the code is worse than no document, because it is
believed.

### 2026-09-21

- **District positions are now learned at runtime.** Unknown districts
  are geocoded in the background and cached in MongoDB for 30 days,
  instead of silently falling back to a state centre up to 400 km out.
  Rebuilt the shipped table too: 345 → 383 districts. (§6.2)
- **All five location methods work independently.** Town, Address,
  Pincode and Lat/Long no longer require pressing "Find" first. (§9.1)
- **Removed a fuzzy district-name match** added earlier the same day. The
  coordinate file is keyed by the *feed's* own spelling, so there was
  nothing to match against, and it cost a 383-entry scan per row on
  requests fetching up to 2000 rows.
- **Documented the real sparseness of the government feed** — 3 of 376
  onion rows nationwide were in Maharashtra on the day measured. (§17)
- **Consolidated the cache keys.** `learned-districts` was a local
  constant in `locationService.js` while the other three lived in
  `persistentCache.KEYS`; writing the doc is what exposed the
  inconsistency. All four are now in one place. (§14)

### Earlier in this cycle

- **Persistent cache** (`CachedPayload`): cold-start
  `/api/mandi/list` 4.1s → 0.22s, `/api/crops` 1.5s → 0.02s. (§14)
- **`warmUpBackend()`** on app load, so Render's ~22s cold start overlaps
  with the user reading the home page. (§14)
- **Guest browsing**: the app no longer redirects to `/login`. A 401 on
  the startup refresh means "not signed in", not "session ended". (§10)
- **Bottom tab bar, splash screen, status bar, safe areas** for the
  Android build; all gated behind `Capacitor.isNativePlatform()`. (§13)
- **Icons**: 470 emoji replaced with lucide-react. (§11)
- **`/api/sync-status`** and the "Data last updated" label. (§7)

---

## Where to start reading the code

1. `backend/server.js` — see how the app is assembled
2. `frontend/src/App.jsx` — see every route in one screen
3. `frontend/src/pages/CheckRates.jsx` — the clearest end-to-end feature
4. `backend/controllers/mandiController.js` — the other half of it
5. `frontend/src/components/icons.jsx` and `styles/tokens.css` — the
   design system in two files

Every file has a comment block at the top explaining **why** it is
written the way it is. Those comments are the real documentation; this
file is the map.
