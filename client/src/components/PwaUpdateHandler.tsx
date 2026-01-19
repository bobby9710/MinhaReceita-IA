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
      // Manual registration if Vite plugin is not available
      navigator.serviceWorker.register('/sw.js').then(reg => {
        setRegistration(reg);

        const checkUpdate = () => {
          if (reg.waiting) {
            setNeedRefresh(true);
          }
        };

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

        checkUpdate();
        return () => window.removeEventListener("focus", checkUpdate);
      });
    }
  }, []);

  useEffect(() => {
    if (needRefresh) {
      toast({
        title: "Atualização Disponível",
        description: "Uma nova versão do aplicativo está pronta.",
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
    
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });

    setTimeout(() => window.location.reload(), 2000);
  };

  return null;
}
