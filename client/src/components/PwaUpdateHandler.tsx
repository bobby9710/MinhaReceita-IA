import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function PwaUpdateHandler() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;
        setRegistration(reg);

        const checkUpdate = () => {
          if (reg.waiting) {
            setNeedRefresh(true);
          }
        };

        // Check for updates every time the app is opened/focused
        window.addEventListener("focus", checkUpdate);
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                setNeedRefresh(true);
              }
            });
          }
        });

        // Initial check
        checkUpdate();

        return () => window.removeEventListener("focus", checkUpdate);
      });
    }
  }, []);

  useEffect(() => {
    if (needRefresh) {
      toast({
        title: "Atualização Disponível",
        description: "Uma nova versão do MinhaReceita está pronta.",
        action: (
          <Button 
            size="sm" 
            onClick={updateApp}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        ),
        duration: Infinity,
      });
    }
  }, [needRefresh, toast]);

  const updateApp = () => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
    
    // Listen for the controlling service worker changing and reload
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });

    // Fallback: reload if controllerchange doesn't fire (some edge cases)
    setTimeout(() => window.location.reload(), 2000);
  };

  return null;
}
