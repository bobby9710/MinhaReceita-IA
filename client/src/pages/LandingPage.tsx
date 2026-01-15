import { useAuth } from "@/hooks/use-auth";
import { ChefHat, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/dashboard");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading || user) return null;

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background">
      {/* Left Panel - Hero */}
      <div className="lg:w-1/2 relative overflow-hidden bg-primary text-white p-12 flex flex-col justify-between">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1495521821758-02d05715a60f?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        {/* Unsplash image: Fresh vegetables on dark background */}
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <ChefHat className="w-10 h-10" />
            <span className="font-display font-bold text-2xl">MinhaReceita</span>
          </div>
          
          <h1 className="font-display font-bold text-5xl lg:text-7xl leading-[1.1] mb-6">
            Cozinhe com <br/> confiança.
          </h1>
          <p className="text-white/80 text-xl font-light max-w-md leading-relaxed">
            Seu assistente culinário inteligente. Importe receitas com IA, planeje suas refeições e compre de forma mais inteligente.
          </p>
        </div>

        <div className="relative z-10 text-sm text-white/60 font-medium">
          © 2024 MinhaReceita Inc.
        </div>
      </div>

      {/* Right Panel - Auth */}
      <div className="lg:w-1/2 flex items-center justify-center p-8 bg-card">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="space-y-2">
            <h2 className="font-display font-bold text-3xl text-foreground">Bem-vindo de volta</h2>
            <p className="text-muted-foreground">Faça login para acessar seu livro de receitas e planos de refeições.</p>
          </div>

          <a href="/api/login">
            <button className="w-full group bg-primary text-primary-foreground py-4 px-6 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3">
              <span>Continuar com Replit</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </a>

          <div className="grid grid-cols-2 gap-4 mt-12">
            <div className="p-4 rounded-xl bg-accent/20 border border-accent/30 text-left">
              <span className="block text-2xl mb-1">✨</span>
              <p className="font-semibold text-sm text-foreground">Importação de Receitas com IA</p>
            </div>
            <div className="p-4 rounded-xl bg-accent/20 border border-accent/30 text-left">
              <span className="block text-2xl mb-1">📅</span>
              <p className="font-semibold text-sm text-foreground">Planejamento Inteligente</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
