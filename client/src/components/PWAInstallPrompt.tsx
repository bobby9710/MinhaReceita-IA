import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

export function PWAInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Show iOS instructions once if not in standalone
    if (isIOSDevice && !(window.navigator as any).standalone) {
      const hasSeenPrompt = localStorage.getItem('pwa-ios-prompt-seen');
      if (!hasSeenPrompt) {
        setIsVisible(true);
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setIsVisible(false);
    }
  };

  const closePrompt = () => {
    setIsVisible(false);
    if (isIOS) {
      localStorage.setItem('pwa-ios-prompt-seen', 'true');
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[100] animate-in fade-in slide-in-from-bottom-10 duration-500">
      <div className="bg-card border shadow-2xl rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex gap-3">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-inner">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Instalar MinhaReceita</h3>
              <p className="text-sm text-muted-foreground">Adicione à sua tela de início para acesso rápido.</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={closePrompt}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {isIOS ? (
          <div className="text-sm bg-muted p-3 rounded-lg">
            <p>Toque no ícone de <strong>Compartilhar</strong> e selecione <strong>Adicionar à Tela de Início</strong>.</p>
          </div>
        ) : (
          <Button onClick={handleInstall} className="w-full font-bold py-6 rounded-xl">
            Instalar Agora
          </Button>
        )}
      </div>
    </div>
  );
}
