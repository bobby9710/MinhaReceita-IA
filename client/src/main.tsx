import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(registration => {
      console.log('SW registered: ', registration);
      
      // Request permission for notifications if you want to be extra thorough
      // but not strictly required for installability.
    }).catch(err => {
      console.error('SW registration failed: ', err);
    });
  });
}
