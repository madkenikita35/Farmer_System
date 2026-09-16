// config/stateCentres.js
// -----------------------------------------------------------------------
// Roughly the geographic centre of each Indian state and union territory.
//
// WHAT THIS IS FOR
// The "nearest mandi" feature needs a latitude and longitude for every
// mandi. We get those from config/districtCoordinates.json, which is
// built by buildDistrictCoordinates.js.
//
// But a handful of districts in the government dataset have names that no
// map service recognises - districts that were recently renamed or split,
// or oddly-written entries like "Dr.B.R.A.Konaseema". For those we use the
// centre of the STATE instead, so the mandi still appears in the results
// rather than silently vanishing.
//
// A state centre can easily be 200 km from the real mandi, so anything
// using it is marked `accuracy: "state"` and the app SAYS SO on screen
// rather than showing an approximate distance as if it were exact.
//
// The numbers are decimal degrees: latitude (north), longitude (east).
// -----------------------------------------------------------------------

const STATE_CENTRES = {
  "Andaman and Nicobar": { lat: 11.7401, lon: 92.6586 },
  "Andhra Pradesh": { lat: 15.9129, lon: 79.74 },
  "Arunachal Pradesh": { lat: 28.218, lon: 94.7278 },
  Assam: { lat: 26.2006, lon: 92.9376 },
  Bihar: { lat: 25.0961, lon: 85.3131 },
  Chandigarh: { lat: 30.7333, lon: 76.7794 },
  Chattisgarh: { lat: 21.2787, lon: 81.8661 },
  Chhattisgarh: { lat: 21.2787, lon: 81.8661 },
  "Dadra and Nagar Haveli": { lat: 20.1809, lon: 73.0169 },
  Goa: { lat: 15.2993, lon: 74.124 },
  Gujarat: { lat: 22.2587, lon: 71.1924 },
  Haryana: { lat: 29.0588, lon: 76.0856 },
  "Himachal Pradesh": { lat: 31.1048, lon: 77.1734 },
  "Jammu and Kashmir": { lat: 33.7782, lon: 76.5762 },
  Jharkhand: { lat: 23.6102, lon: 85.2799 },
  Karnataka: { lat: 15.3173, lon: 75.7139 },
  Kerala: { lat: 10.8505, lon: 76.2711 },
  // The government dataset writes Kerala as "Keralam", so both are listed.
  Keralam: { lat: 10.8505, lon: 76.2711 },
  Ladakh: { lat: 34.2268, lon: 77.5619 },
  Lakshadweep: { lat: 10.5667, lon: 72.6417 },
  "Madhya Pradesh": { lat: 22.9734, lon: 78.6569 },
  Maharashtra: { lat: 19.7515, lon: 75.7139 },
  Manipur: { lat: 24.6637, lon: 93.9063 },
  Meghalaya: { lat: 25.467, lon: 91.3662 },
  Mizoram: { lat: 23.1645, lon: 92.9376 },
  Nagaland: { lat: 26.1584, lon: 94.5624 },
  "NCT of Delhi": { lat: 28.7041, lon: 77.1025 },
  Delhi: { lat: 28.7041, lon: 77.1025 },
  Odisha: { lat: 20.9517, lon: 85.0985 },
  Puducherry: { lat: 11.9416, lon: 79.8083 },
  Punjab: { lat: 31.1471, lon: 75.3412 },
  Rajasthan: { lat: 27.0238, lon: 74.2179 },
  Sikkim: { lat: 27.533, lon: 88.5122 },
  "Tamil Nadu": { lat: 11.1271, lon: 78.6569 },
  Telangana: { lat: 18.1124, lon: 79.0193 },
  Tripura: { lat: 23.9408, lon: 91.9882 },
  "Uttar Pradesh": { lat: 26.8467, lon: 80.9462 },
  Uttarakhand: { lat: 30.0668, lon: 79.0193 },
  Uttrakhand: { lat: 30.0668, lon: 79.0193 },
  "West Bengal": { lat: 22.9868, lon: 87.855 },
};

module.exports = { STATE_CENTRES };
