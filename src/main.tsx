import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register Service Worker for PWA Offline-First experience (skip in native Android WebView or file://)
if (
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  window.location.protocol.startsWith("http") &&
  !(window as unknown as { MetaSchoolNative?: unknown }).MetaSchoolNative &&
  process.env.NODE_ENV === "production"
) {
  window.addEventListener("load", () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`.replace(/\/\//g, "/");
    navigator.serviceWorker.register(swUrl, { scope: import.meta.env.BASE_URL }).catch(() => {
      // SW registration ignored in restricted sandboxes
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
