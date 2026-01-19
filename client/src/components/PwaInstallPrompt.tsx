import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export function PwaInstallPrompt() {
  const { canInstall, showInstallPrompt, isStandalone } = usePwaInstall();
  const [visible, setVisible] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Show prompt after a short delay if it's available and not already standalone
    if (canInstall && !isStandalone) {
      const timer = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [canInstall, isStandalone]);

  const handleInstall = async () => {
    setVisible(false);
    await showInstallPrompt();
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  // Manual instructions for iOS since they don't support beforeinstallprompt
  useEffect(() => {
    if (isIOS && !isStandalone) {
      const hasShownIOSPrompt = localStorage.getItem('pwa-ios-prompt-shown');
      if (!hasShownIOSPrompt) {
        const timer = setTimeout(() => {
          toast({
            title: "Instalar Aplicativo",
            description: "No Safari, toque no ícone de compartilhar e depois em 'Adicionar à Tela de Início' para instalar.",
            duration: 10000,
          });
          localStorage.setItem('pwa-ios-prompt-shown', 'true');
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [isIOS, isStandalone, toast]);

  if (!visible || isIOS) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 sm:left-auto sm:right-4 sm:w-80">
      <div className="bg-card border rounded-lg p-4 shadow-lg flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-full">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">Instalar MinhaReceita</p>
            <p className="text-xs text-muted-foreground">Acesse offline e mais rápido.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleInstall}>
            Instalar
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setVisible(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
