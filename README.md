# 🌾 Mandi Price Checker

A MERN-stack (MongoDB, Express, React, Node.js) web app inspired by
**Gramhal Foundation's Bolbhav** idea: help farmers know whether they
got a fair price for their crop, by comparing their mandi (market)
sale receipt against **live government mandi price data**.

This project is written to be **fresher-friendly**: every file has
comments explaining *why* the code is written the way it is, not just
*what* it does, so you can confidently read it, modify it, and extend
it even without help.

---

> ### 📘 Looking for the full technical reference?
>
> **[DOCUMENTATION.md](DOCUMENTATION.md)** is the complete, up-to-date
> guide for anyone joining the project: every folder and file, every
> dependency, every API endpoint, every environment variable, the design
> system, the 11-language setup, the Android build, caching and
> performance numbers, deployment, and the traps that have actually
> broken this app before.
>
> This README stays as the friendly overview of the product idea.

---

## 🧠 The idea, in one paragraph

This app gives a farmer **two things they can do**, and **two data
sources** backing every price shown:

1. **📤 Upload a receipt** (`/upload`) - after selling, upload a photo
   of the mandi receipt. OCR reads it, the farmer confirms/edits the
   details, and it's saved. This receipt immediately becomes part of
   the **shared community data pool** other farmers benefit from too.
2. **🔍 Check rates before selling** (`/check-rates`) - before selling
   anything, search a crop (and optionally a state) to see prices from
   BOTH data sources side by side, and decide where/when to sell.

The **two data sources**, always shown together:
- **Government data** - the official data.gov.in Agmarknet mandi price
  dataset (the same one Gramhal's Bolbhav was built around).
- **Community data** - what OTHER FARMERS using this app actually
  reported being paid recently, for the same crop, pulled straight
  from everyone's uploaded receipts (see `communityPriceService.js`).

Every price comparison - whether checking rates or reviewing an
uploaded receipt - blends BOTH sources into one number, so an official
rate and real farmer experience both get a say.

---

## 🔐 Logging in (role-based access)

The app now has real accounts with **two roles**, and you must log in
before you can see *any* page.

### Accounts

Signing up on the website always creates a **farmer**. Admin accounts are
never created that way - the signup route hard-codes `role: "farmer"`, so
nobody can make themselves an admin by editing a request.

The admin account is therefore seeded once on server startup from
`backend/.env` (see `backend/config/seedUsers.js`):

```
DEFAULT_ADMIN_EMAIL=...
DEFAULT_ADMIN_PASSWORD=...
DEFAULT_FARMER_EMAIL=...
DEFAULT_FARMER_PASSWORD=...
```

**Set your own values there before running the app.** Open `.env` to see
the current ones - they are deliberately not repeated in this file, not
printed to the server console, and not shown on the login page.

> An earlier version displayed the admin email and password in a "demo
> accounts" box on the login screen. That was removed: a working admin
> password on a public page hands full access to anyone who visits it.

To change a password later, edit `.env` and delete that user from MongoDB
so the seeder recreates them - changing `.env` alone does **not** update
an account that already exists.

### There is only ONE login form

There's deliberately **no separate "admin login" button** anywhere on the
farmer site. You type your email and password into the same form, and:

1. The backend checks them and replies with your **role**, read from MongoDB.
2. `frontend/src/pages/Login.jsx` looks at that role and redirects:
   - `admin` → `/admin` (the admin site)
   - `farmer` → the farmer site

A farmer who types `/admin` by hand gets bounced to their own dashboard,
and every admin API call they attempt returns **403** from the backend.

### Anyone signing up is a farmer

`POST /api/auth/signup` hard-codes `role: "farmer"`. It never reads a role
from the request body - otherwise anyone could make themselves an admin by
editing the request in their browser. Admin accounts only come from the
`.env` seed.

---

## 🛡️ How the security actually works

There are two layers, and it's worth being clear about which one matters:

| Layer | File | What it does | Is it security? |
|---|---|---|---|
| Frontend guard | `frontend/src/components/ProtectedRoute.jsx` | Redirects you away from pages you shouldn't see | **No** - convenience only. It runs in the user's own browser. |
| Backend guard | `backend/middleware/auth.js` | Verifies your login token and role on every request | **Yes** - this is the real one. |

Even if someone edited their browser storage to claim `role: "admin"`,
they'd see an empty admin shell and a wall of 403 errors, because the
server re-reads the real role from MongoDB on every single request.

### What's protected

```
PUBLIC   /api/auth/signup, /api/auth/login
LOGGED IN  /api/receipts/*   (router.use(protect))
           /api/mandi/*      (router.use(protect))
ADMIN ONLY /api/admin/*      (router.use(protect, adminOnly))
```

### Security measures added

- **Passwords are bcrypt-hashed** (`backend/models/User.js`), never stored as text.
- **JWT tokens** signed with `JWT_SECRET`, expiring after `JWT_EXPIRES_IN`.
- **helmet()** sets protective HTTP headers - CSP, `X-Frame-Options`,
  `X-Content-Type-Options`, HSTS and more. See the long comment in `server.js`.
- **CORS is locked** to `CLIENT_URL` instead of allowing every website.
- **Rate limiting** - 10 login attempts per IP per 15 min (stops password
  guessing), plus 500 general API requests per IP per 15 min.
- **Body size limit** of 2 MB, so nobody can crash the server with a huge POST.
- **Generic login errors** - "Incorrect email or password" for both a wrong
  password and a non-existent email, so the form can't be used to discover
  which emails are registered.
- **Stack traces hidden** in production by the error handler in `server.js`.

---

## 👑 What the admin can see

Log in as `admin@mandi.com` and you get a separate, navy-coloured site:

| Page | Route | Shows |
|---|---|---|
| Dashboard | `/admin` | Total farmers enrolled, joined this week, active in last 30 days, total receipts, underpaid count, total farmer loss, signups/uploads over 14 days, verdict pie, top crops, top mandis, farmers by state, live activity preview |
| Farmers | `/admin/farmers` | Searchable, paginated table of every farmer - when they enrolled, last login, receipt count. Click a row to expand their receipts and activity. Block/unblock accounts. |
| Activity | `/admin/activity` | Every login, signup, rate check, mandi search and upload, newest first, filterable by type |

Activity is recorded by `backend/services/activityService.js`, which the
controllers call whenever something noteworthy happens.

**Deactivating vs deleting:** an admin blocks a farmer rather than deleting
them, so their receipts stay in the shared community price pool that other
farmers' comparisons depend on.

---

## 🌐 Languages

The **farmer** side is available in **11 languages**: English, हिन्दी,
मराठी, ગુજરાતી, ਪੰਜਾਬੀ, বাংলা, தமிழ், తెలుగు, ಕನ್ನಡ, മലയാളം and ଓଡ଼ିଆ.

- **English is the default.** A farmer who never touches the picker sees
  English.
- The picker is a **dropdown** in the navbar, listing each language in its
  own script (a Tamil speaker looks for "தமிழ்", not the word "Tamil").
- The choice is saved in `localStorage`, so it survives a refresh.

All the words live in `frontend/src/i18n/translations.js`. To add a
language: add one entry to `LANGUAGES` and one object with the same keys -
the dropdown builds itself from that list, so nothing else needs editing.
If a key is missing from a translation, `t()` falls back to English rather
than showing the raw key, so a half-finished translation still gives a
usable page.

### The admin panel is English only

There is no language picker on the admin side, and the admin always reads
English **even if a farmer set another language on the same browser**.

That last part is the reason `LanguageProvider` sits *inside*
`AuthProvider` in `App.jsx`: it has to know who is logged in before it can
decide what language to show them. Without it, an admin logging in after a
Marathi-speaking farmer would inherit their language and get a half-Marathi
screen, since the admin pages are written in plain English anyway.

---

## ✨ Animations and carousels

Hand-written CSS animations live at the bottom of `frontend/src/index.css`,
each exposed as a class you use like any Tailwind utility:

| Class | Effect |
|---|---|
| `animate-fadeIn` / `fadeInUp` / `fadeInDown` | fade in, optionally drifting |
| `animate-fadeInLeft` / `fadeInRight` | slide in from a side |
| `animate-popIn` | scale up gently into place |
| `animate-float` | slow endless drift, used on icons |
| `animate-kenBurns` | slow photo zoom, used in the hero |
| `animate-marquee` | endless sideways scroll |
| `animate-pulseRing` | soft pulsing ring |
| `hover-lift` / `hover-zoom` | lift a card / zoom a photo on hover |
| `stagger-1` … `stagger-6` | delay, so a row arrives one by one |

Three carousels:

- **`HeroCarousel.jsx`** - the banner. Cross-fades, slowly zooms the active
  photo, shows a progress bar for the next slide, and pauses on hover.
- **`CropTicker.jsx`** - an endlessly scrolling strip of crops. Clicking one
  opens Check Rates already searching for it. It renders the crop list
  **twice** and slides left by exactly 50%, so the loop point is invisible.
- **`MandiGallery.jsx`** - photos of the journey from field to sale.

Two deliberate choices worth knowing:

- **The crop ticker uses emoji, not photographs.** A stock photo library
  will happily return a tomato when asked for "wheat", and a card labelled
  "Wheat" over a picture of tomatoes is worse than no picture. Emoji are
  always correct, load instantly and work offline.
- **Every photo has an emoji-and-gradient fallback.** The images come from
  an external site; a farmer on a weak rural connection may never receive
  them. A coloured panel is a fine substitute, a broken-image icon is not.

Anyone who has switched on "reduce motion" in their operating system gets
the page with the movement turned off - that is handled by the
`prefers-reduced-motion` block in `index.css`. It is not optional polish:
an animation someone physically cannot look at makes the page unusable.


---

## 🏛️ The Mandi Directory

A new section (`/mandis`) built on the same government dataset:

- **Total mandis registered** - how many are currently reporting prices
- **Search** by mandi name, district or state, plus a state dropdown
- **Click a mandi** → `/mandis/view` shows **every crop sold there**, with
  the government price AND what our own farmers reported paying, plus the
  **difference** between the two per crop

### How the mandi list is built (worth understanding)

The government API has no "list all mandis" endpoint. So
`backend/services/mandiDirectoryService.js` downloads a large batch of price
records and collects the distinct market names out of them.

That download is slow, so it's done **once and cached in memory for 6 hours**.
The first page load takes a few seconds; every search after that is instant
because the filtering happens on our server over data already in memory.

> **Honest limitation:** the dataset is a *current daily* snapshot (about
> 6,600 records), so it only contains mandis that reported **today**. A mandi
> you know exists may genuinely not appear until it next reports. That's the
> data, not a bug.

---

## 📍 Best-paying mandis near you

Check Rates tells a farmer which mandi in the whole country pays most.
That is only half an answer: a mandi 900 km away paying ₹300 more is no
use to anyone. This page (`/nearby`) adds the missing half — **distance**.

The farmer gives their location either way:

- **"Use my location"** — the browser's GPS, so nothing has to be looked up.
- **Typing a town or district** — geocoded once, then cached.

They then get every mandi within a chosen radius (50–500 km) that has a
price for their crop, ranked by **highest paying** (or by nearest, with a
toggle). Two headline cards answer the real question directly:

- 💰 **Best price near you**
- 📍 **Closest to you**

…and when those are different mandis, the page works out the trade-off
for them: *"the best-paying mandi gives you ₹420 more per quintal, but
it's 63 km further — on 10 quintals that's ₹4,200 extra."* That is the
arithmetic a farmer would otherwise be doing on a phone screen at the
edge of a field.

### The hard part: the dataset has no coordinates

data.gov.in gives names only — state, district, market. Nothing can be
sorted by distance until those become points on a map.

So the lookup happens **once, offline**:

```bash
cd backend
node buildDistrictCoordinates.js     # ~7 minutes, only needed to refresh
```

It reads every distinct district in the dataset, looks each one up on
OpenStreetMap's free Nominatim service, and writes
`config/districtCoordinates.json`. The running app just reads that file:
no API key, no network call, and nothing for a farmer to wait on.

Doing it live was never an option — Nominatim asks for at most one request
per second, which is fine for a one-off build and hopeless inside a web
request.

### When a district can't be found

Some districts have names no map service recognises — recently renamed or
split ones, and entries written like `Dr.B.R.A.Konaseema`. Those fall back
to the centre of the **state** (`config/stateCentres.js`).

A state centre can be 200 km from the real mandi, so those rows are marked
`accuracy: "state"` and the page prints **"approx."** under the distance
rather than showing a rough number as though it were exact.

### Files

| File | What it does |
|---|---|
| `backend/config/stateCentres.js` | centre of each state, the fallback |
| `backend/config/districtCoordinates.json` | the built lookup (generated) |
| `backend/buildDistrictCoordinates.js` | one-time tool that builds it |
| `backend/services/locationService.js` | distance maths + place lookup |
| `backend/controllers/nearbyController.js` | the endpoint's logic |
| `frontend/src/pages/NearbyMandis.jsx` | the page |

`GET /api/mandi/nearby?crop=Onion&lat=19.99&lon=73.78` — or `&place=Nashik`.
Optional: `&radius=250`, `&sortBy=distance`, `&date=2026-09-16`.

### Two honest limitations

- **Distances are straight-line, not road distance.** A mandi 40 km away
  across a river can be a 90 km drive. The page says so, so nobody plans a
  trip believing otherwise.
- **Precision is district-level.** Every mandi in one district shares a
  single point on the map, so five Ludhiana mandis all measured as
  "0 km" - which looked broken and was untrue, since they are 20-40 km
  apart. Anything inside ~12 km is therefore shown as **"in your area"**
  rather than a falsely precise number. Sorting still uses the real figure;
  only the display changes.
- **The government feed contains some junk prices** (₹12/quintal for
  onion, ₹0.02 for potato). Those are in the source data, not introduced
  here, and they are shown as-is rather than silently filtered.
- **`navigator.geolocation` needs HTTPS** (or `localhost`, which is why it
  works in development). On a plain `http://` address the GPS button will
  fail — the typed-place box is the way in, and the page says which problem
  occurred rather than just doing nothing.


---

## 📈 Where should I sell? (highest vs lowest mandi)

The "Check Rates" page now answers the question that actually makes a farmer
money. After comparing prices it shows:

- 📈 the mandi paying the **highest** price right now
- 📉 the mandi paying the **lowest**
- the **gap** between them per quintal, and what that's worth on 10 quintals
- a full **ranked list** of every mandi, best price first

Each entry is labelled 🏛️ Government-listed or 🧑‍🌾 farmer-reported, so you
always know which source a number came from. The ranking is worked out by
`findBestAndWorstMandis()` in `backend/controllers/mandiController.js`, which
merges both data sources into one list before sorting.


---

## 🗂 Project structure

```
mandi-price-checker/
|-- backend/                 -> Node.js + Express + MongoDB API
|   |-- server.js             -> app entry point + ALL security setup (start here!)
|   |-- config/
|   |   |-- db.js             -> connects to MongoDB
|   |   `-- seedUsers.js      -> creates the default admin + demo farmer on startup
|   |-- middleware/auth.js    -> "must be logged in" / "must be admin" guards
|   |-- models/
|   |   |-- Receipt.js        -> shape of a saved receipt
|   |   |-- User.js           -> a farmer or admin account (bcrypt-hashed password)
|   |   `-- ActivityLog.js    -> one row per thing a user did
|   |-- services/             -> talks to OUTSIDE things (OCR engine, mandi API, community data)
|   |   |-- ocrService.js           -> reads receipt photos
|   |   |-- mandiApiService.js      -> DATA SOURCE 1: government prices
|   |   |-- mandiDirectoryService.js -> the mandi LIST/search + crops per mandi (cached 6h)
|   |   |-- activityService.js       -> writes the admin activity log
|   |   `-- communityPriceService.js -> DATA SOURCE 2: other farmers' reported prices
|   |-- controllers/          -> the actual step-by-step logic per feature
|   |-- routes/               -> maps a URL -> a controller function
|   |-- middleware/upload.js  -> handles receipt image uploads
|   `-- uploads/              -> uploaded receipt images are saved here
|
`-- frontend/                -> React (Vite) + Tailwind + Recharts
    `-- src/
        |-- pages/             -> Home, Upload, CheckRates, Dashboard, Mandis,
        |                         MandiDetail, Login, Signup, and the three
        |                         Admin* pages (admin site)
        |-- components/ProtectedRoute.jsx -> the frontend route guard
        |-- components/        -> small reusable pieces (Navbar, charts, cards)
        |-- api/api.js         -> every network call to the backend lives here
        `-- App.jsx            -> sets up page routing
```

**Why this structure?** This is the standard MVC-ish pattern used in
most real Node/Express + React projects:
`routes -> controllers -> services/models`. Once you recognise this
pattern here, you'll recognise it in almost every other MERN project
you look at.

---

## ⚙️ How each requested feature is implemented

| Your requirement | Where it lives |
|---|---|
| MERN full stack | `backend/` (Node+Express+MongoDB) + `frontend/` (React) |
| Live government mandi data API | `backend/services/mandiApiService.js` calls data.gov.in's official Agmarknet dataset, matched to the sale date (falls back to realistic mock data only if you haven't added an API key yet, or the API has nothing for that crop) |
| Crowdsourced "other farmers" data | `backend/services/communityPriceService.js` reads everyone's saved receipts and averages what they reported being paid, per mandi |
| Two ways in: upload OR search first | `frontend/src/pages/Upload.jsx` (upload a receipt) and `frontend/src/pages/CheckRates.jsx` (search rates before selling) |
| Upload receipt/slip -> auto-extract details | `backend/services/ocrService.js` (Tesseract.js OCR, with image pre-processing) + `frontend/src/pages/Upload.jsx` |
| Compare price against BOTH data sources | `backend/controllers/receiptController.js` -> `comparePriceWithMarket()` blends the government and community averages |
| Beautiful frontend | React + TailwindCSS, see `frontend/src/pages` and `components` |
| Dashboard with graphs | `frontend/src/pages/Dashboard.jsx` using **Recharts** (bar charts + pie chart), each showing government vs community numbers |
| Fresher-readable code | Every file has explanatory comments; logic is split into small, single-purpose functions/files |

---

## 🚀 How to run it locally

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or newer) installed
- [MongoDB](https://www.mongodb.com/try/download/community) running locally, **or** a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster

### 2. Backend setup
```bash
cd backend
npm install
cp .env.example .env      # then open .env and fill in your MongoDB URI
npm run dev                # starts the API on http://localhost:5000
```

On startup you'll see the default accounts printed in the terminal:

```
MongoDB connected successfully
Admin account created -> admin@mandi.com (password taken from .env)
Demo farmer account created -> farmer@mandi.com (password taken from .env)
Server running on http://localhost:5000
```

> **No mandi API key yet?** That's fine - leave `MANDI_API_KEY` blank
> in `.env` and the app will automatically use built-in sample mandi
> data, so everything (including the graphs) still works while you
> learn the code. Get a free key any time at https://data.gov.in.

### 3. Frontend setup (in a new terminal)
```bash
cd frontend
npm install
npm run dev                # starts the app on http://localhost:5173
```

Open **http://localhost:5173** in your browser. 🎉

---

## 🧭 How a request flows through the app (read this to really understand it)

**Uploading a receipt:**
1. `Upload.jsx` sends the image to `POST /api/receipts/scan`
2. `receiptRoutes.js` routes it to `receiptController.scanReceipt`
3. That calls `ocrService.extractReceiptDetails()` which runs Tesseract OCR and guesses the crop/price/quantity/mandi with simple regex rules
4. The guessed fields are sent back and shown in an **editable form** so you can fix any OCR mistakes
5. When you click "Save & Compare", `Upload.jsx` sends the confirmed data (including the **sale date**) to `POST /api/receipts`
6. `receiptController.createReceipt` calls `mandiApiService.fetchMandiPrices(crop, date)` AND `communityPriceService.getCommunityPriceStats(crop, state)` at the same time:
   - Government lookup: first it asks data.gov.in for records on the **exact sale date**.
   - If none exist (common - not every mandi reports every day), it fetches a wider batch for that crop and picks the **closest available date** instead of blending days together.
   - Only if the real API has nothing at all does it fall back to mock data.
   - Community lookup: it reads OTHER farmers' already-saved receipts for the same crop (last 90 days) and averages what they reported being paid, grouped by mandi.
   - `comparePriceWithMarket()` then **blends** the government average and the community average into one number the verdict is based on, and returns `dataSource`/`matchedDate` so the app can always be honest about where the numbers came from.
7. The comparison result (government avg, community avg, blended avg, verdict) is saved on the `Receipt` document, and shown immediately (look for the green "✅ Real government data" / amber "⚠️ Sample/mock data" note, plus the government-vs-farmer breakdown under the verdict)

**Viewing the dashboard:**
1. `Dashboard.jsx` calls `GET /api/receipts/dashboard-stats` and `GET /api/receipts`
2. `receiptController.getDashboardStats` reads all saved receipts from MongoDB and crunches numbers/chart-ready arrays
3. Recharts components (`PriceComparisonChart`, `VerdictPieChart`) turn those arrays straight into graphs

**Checking rates before selling (no upload needed):**
1. `CheckRates.jsx` sends the crop (+ optional state/date) to `GET /api/mandi/compare`
2. `mandiRoutes.js` routes it to `mandiController.comparePrices`
3. That calls BOTH `mandiApiService.fetchMandiPrices()` (government) and `communityPriceService.getCommunityPriceStats()` (other farmers' receipts) at the same time with `Promise.all`
4. Both results come back together and are rendered side by side - a government-prices chart (`MandiTrendChart`) and a "what other farmers got paid" chart (`CommunityPriceChart`)

---

## 📷 How receipt scanning works

Upload a photo of a mandi receipt or tax invoice and the app fills in all
six fields for you: **crop, quantity, price per quintal, mandi name,
state and date**. You then check and correct them before saving.

The scanner lives in `backend/services/ocrService.js`. It is more than a
few regexes, because real OCR output is messy. Here is genuine text
Tesseract produced from a test invoice:

```
1 JOMANIYA MTP (CORIANDUR) 09052150 150.00 13.400.00 KO0IG0 S40 107213400
Total 350 13,400 Told 1,072,134.00
State | Rapsthan    Soe Code 08
```

Every field is a problem: the crop name is misspelt, so is the state, the
weight has no unit printed, the rate column is destroyed, and the only
clean number is a grand total. Four ideas solve it.

### 1. Several image versions, several OCR passes

No single contrast setting suits every photo. The scanner builds a few
versions of the image (gently enhanced, hard black-and-white, untouched)
and runs Tesseract over them in different page-layout modes.

It then lets those passes **vote** on each field rather than crowning a
single winner. Different passes make different mistakes but tend to agree
on the truth, so the value two passes agree on beats one pass's guess.

### 2. The lines are kept

The old scanner flattened the whole receipt into one long string, which
destroyed the table layout - and on an invoice the layout *is* the
meaning ("this number is in the Weight column"). Parsing is now line by
line.

### 3. Fuzzy matching (`backend/services/fuzzyMatch.js`)

"CORIANDUR" is one letter away from "CORIANDER", and "Rapsthan" is two
from "Rajasthan". The scanner measures **edit distance** - how many
single-letter changes separate two words - and accepts close matches,
allowing more slack for longer words. That one change turned two
permanently-blank fields into two correct ones.

`backend/config/ocrDictionaries.js` holds the vocabulary, including the
names crops are *actually* printed under: DHANIYA (Coriander), KANDA
(Onion), GEHU (Wheat), KAPAS (Cotton) and so on.

> One rule when adding aliases: never use a word that is also an ordinary
> English word. We first listed "us" as an alias for Sugarcane (it is the
> Hindi name) and the scanner then reported Sugarcane on every invoice
> containing the word "us".

### 4. The price is worked out, not just found

Since `total ÷ quantity = rate per quintal`, any two of those three give
you the third. So the scanner collects **every** plausible quantity and
**every** plausible total, tries each combination, and keeps the one
whose implied rate looks like a real crop price.

On the test invoice, pairing the 150 kg packing weight with the ₹10 lakh
total implies ₹7,14,756 per quintal - obviously wrong, so it loses. The
13,400 kg pairing implies **₹8,001**, exactly the rate printed on the
invoice.

Every number is range-checked before being accepted. That is what stops
the old bug where a ₹11,42,400 invoice total was reported as the price
per quintal.

### Units it understands

Quantity is stored in quintals, and the scanner converts from whatever
unit the receipt used:

| Printed as | Converted |
|---|---|
| quintal, qtl, qntl | as-is |
| kg, kilo, kilogram | ÷ 100 |
| gram, gm | ÷ 100,000 |
| tonne, ton, MT | × 10 |
| bag, bori, katta | × 0.5 *(assumes 50 kg)* |
| maund | × 0.4 *(assumes 40 kg)* |
| crate, box, peti | × 0.2 *(assumes 20 kg)* |
| *no unit, weight column* | assumed kg |

Rates are handled the same way - "₹45 per kg" becomes ₹4,500 per quintal.

Anything the scanner had to **assume** (a bag weight, a missing unit, a
calculated price) is shown on the review screen as a plain sentence, so
the farmer knows which field to check rather than being asked to
re-verify everything.

### Testing the rules without an image

Scanning an image takes ~10 seconds, far too slow for tweaking rules. But
only the OCR is slow - the parsing is instant. So `backend/testOcr.js`
feeds text straight into the parser:

```bash
cd backend
node testOcr.js
```

It covers quintals, kilograms, bags, tonnes, Hindi and Marathi crop
names, OCR-mangled words, and the "grand total must not become the rate"
case. **Add a case whenever you find a receipt it gets wrong** - copy the
text out of the "View raw text OCR extracted" box on the upload screen.

### Honest limitations

- **It cannot beat an unreadable photo.** On our test screenshot every
  pass read the invoice date `25/11/2023` as `26/11/2023` - the digit
  genuinely is ambiguous at that resolution. Good light and a straight,
  close photo matter more than any code here.
- **Bag weights vary.** A bag of wheat and a bag of onions differ; 50 kg
  is an assumption, and it is flagged as one.
- **A totals row can be ambiguous.** On `Total 350 13,400` with no column
  headers, nothing in the text says which figure is bags and which is
  kilos. The scanner uses the price cross-check to decide, and is usually
  right, but not always.
- **Non-farm documents confuse it.** Hand it a motorcycle invoice and it
  will still try to find a crop. That is why the review step exists.

Scanning takes roughly 10-20 seconds, since several OCR passes are run
and compared.


---

## 🛠 Easy ways to practice modifying this project

- Add a new crop to `KNOWN_CROPS` (or a new state to `KNOWN_STATES`) in `ocrService.js` and see OCR recognise it
- Widen/narrow the "closest date" search window in `mandiApiService.js` (currently pulls up to 300 recent records per crop)
- Change how long community reports stay "recent" by editing `RECENT_DAYS_WINDOW` in `communityPriceService.js` (currently 90 days)
- Change how the two averages are blended in `comparePriceWithMarket()` - right now it's a simple 50/50 average; try weighting government data more heavily, for example
- Change the "fair price" threshold (currently +/-5%) in `comparePriceWithMarket()` inside `receiptController.js`
- Add a new stat card to the dashboard (copy the pattern in `Dashboard.jsx` + `StatCard.jsx`)
- Add a "Delete receipt" button (you'll need a new DELETE route + controller function + a button in `ReceiptTable.jsx`)
- Swap Tailwind's `brand` colours in `tailwind.config.js` to re-theme the whole app instantly

---

## 📌 Notes & honest limitations (good to know as you extend this)

- OCR text extraction from photographed receipts is **never 100% accurate** - that's exactly why the app always shows an editable review step before saving, the same "human-in-the-loop" idea Gramhal used in their own admin portal. To make scanning as reliable as possible, `ocrService.js` now pre-processes the image (greyscale + contrast boost + upscale via `sharp`) and retries on the original photo if the first pass looks weak, before handing the guesses to you for review.
- The `MANDI_RESOURCE_ID` in `.env.example` points to the real, public "Current Daily Price of Various Commodities from Various Markets (Mandi)" dataset on data.gov.in.
- **Real data, matched by date:** once you set `MANDI_API_KEY`, every comparison is built from that dataset - matched to the exact sale date first, then the closest available date if the exact date has no reports. Mock data is only ever used as a last-resort fallback (no key set, or the API has genuinely nothing for that crop), and every receipt honestly records which situation happened (`dataSource` + `matchedMarketDate`), shown on both the Upload result screen and the Dashboard table.
- Not every mandi reports prices for every crop every single day - that's a real limitation of the underlying government data, not a bug in this app.
- This is a learning/starter project, not production-hardened: there's no user login yet, and the upload folder isn't cleaned up automatically. Both are great next features to add yourself!
