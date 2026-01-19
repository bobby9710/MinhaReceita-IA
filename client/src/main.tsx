import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(registration => {
      console.log('SW registered: ', registration);
    }).catch(err => {
      console.error('SW registration failed: ', err);
    });
  });

  // Handle PWA installation prompt
  let deferredPrompt: any;
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    
    // You can show a custom install button here if you want
    console.log('PWA Install prompt available');
  });
}
