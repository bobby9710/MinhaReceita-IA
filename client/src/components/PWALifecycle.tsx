import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export function PWALifecycle() {
  const { toast } = useToast();

  useEffect(() => {
    // Only register Service Worker in production
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
          console.log('SW registered: ', registration);
        }).catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
      });
    }
  }, [toast]);

  return null;
}
