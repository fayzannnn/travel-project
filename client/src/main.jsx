import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import AdminApp from "./AdminApp.jsx";
import ReviewPage from "./ReviewPage.jsx";
import "./style.css";

const path = window.location.pathname;
const Root = path.startsWith("/admin") ? AdminApp : path.startsWith("/feedback") ? ReviewPage : App;

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
