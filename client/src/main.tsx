import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Determinar o caminho do SW
    const swPath = '/sw.js';
    navigator.serviceWorker.register(swPath).then(registration => {
      console.log('SW registered: ', registration);
      
      // Forçar atualização do SW se houver uma nova versão
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker) {
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('Nova versão instalada.');
              }
            }
          };
        }
      };
    }).catch(err => {
      console.error('SW registration failed: ', err);
    });
  });

  // Handle PWA installation prompt
  let deferredPrompt: any;
  window.addEventListener('beforeinstallprompt', (e) => {
    // Impedir o prompt automático
    e.preventDefault();
    deferredPrompt = e;
    console.log('PWA prompt capturado');
  });
}
