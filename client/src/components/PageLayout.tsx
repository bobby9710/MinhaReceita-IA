import { Sidebar } from "./Sidebar";
import MobileNav from "./MobileNav";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PageLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth"); // Redirect to custom login
    }
  }, [user, isLoading, setLocation]);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    }
  };

  if (isLoading) return null; // Or a nice loading spinner

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row overflow-hidden">
      <Sidebar />
      <main className="flex-1 pb-20 lg:pb-0 lg:ml-64 overflow-y-auto">
        {showInstallBanner && (
          <div className="bg-primary text-primary-foreground p-3 flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-500">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Download className="w-4 h-4" />
              <span>Instale o MinhaReceita no seu celular</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={handleInstall}>
                Instalar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowInstallBanner(false)}>
                Agora não
              </Button>
            </div>
          </div>
        )}
        <div className="max-w-6xl mx-auto p-4 sm:p-8 lg:p-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
