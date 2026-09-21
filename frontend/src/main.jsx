// main.jsx
// -----------------------------------------------------------------------
// This is the very first file that runs in the browser. It just finds
// the <div id="root"> from index.html and tells React to render our
// <App /> component inside it.
// -----------------------------------------------------------------------

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import { initNative } from "./native";
import { warmUpBackend } from "./api/api";

// Status bar colour and splash-screen dismissal, for the installed app.
// A no-op in a browser - see src/native.js - so the website is
// unaffected by this line.
initNative();

// Start the backend waking up now rather than when the first search
// happens - see warmUpBackend() for why that is worth 20 seconds.
warmUpBackend();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* BrowserRouter lets us have multiple "pages" (Home, Upload, Dashboard)
        without reloading the whole browser page each time. */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
