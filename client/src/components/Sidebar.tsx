import { Link, useLocation } from "wouter";
import { ChefHat, Home, Book, Calendar, ShoppingCart, LogOut, PlusCircle, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function Sidebar() {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { href: "/", icon: Home, label: "Painel" },
    { href: "/recipes", icon: Book, label: "Minhas Receitas" },
    { href: "/meal-planner", icon: Calendar, label: "Planejador" },
    { href: "/shopping-list", icon: ShoppingCart, label: "Lista de Compras" },
  ];

  const sidebarContent = (
    <>
      <div className="p-8 pb-4">
        <div className="flex items-center gap-3 text-primary mb-8">
          <ChefHat className="w-8 h-8" />
          <span className="font-display font-bold text-xl tracking-tight text-foreground">MinhaReceita</span>
        </div>

        <Link href="/recipes/new">
          <button 
            onClick={() => setIsOpen(false)}
            className="w-full bg-primary text-primary-foreground rounded-xl py-3 px-4 flex items-center justify-center gap-2 font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:translate-y-[-2px] transition-all duration-300 active:translate-y-0"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Nova Receita</span>
          </button>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              onClick={() => setIsOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group font-medium",
                isActive 
                  ? "bg-accent text-foreground shadow-sm" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border mt-auto">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          {user?.profileImageUrl ? (
            <img src={user.profileImageUrl} alt="User" className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {user?.firstName?.[0] || "U"}
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold truncate text-foreground">{user?.firstName}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <button 
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-destructive transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-[72px] bg-card/80 backdrop-blur-xl border-t border-border/50 flex items-center justify-around px-2 z-[100] pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0,05)]">
        {navItems.slice(0, 2).map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex flex-col items-center justify-center gap-1.5 p-2 min-w-[72px] transition-all relative",
              isActive ? "text-primary" : "text-muted-foreground/60"
            )}>
              <item.icon className={cn("w-6 h-6 transition-transform", isActive && "scale-110")} />
              <span className="text-[11px] font-semibold tracking-tight">{item.label}</span>
              {isActive && (
                <span className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
        
        {/* Main Action Button */}
        <div className="relative -top-6 px-2">
          <Link href="/recipes/new">
            <button className="bg-primary text-primary-foreground rounded-2xl w-14 h-14 flex items-center justify-center shadow-[0_8px_20px_-4px_rgba(var(--primary),0.4)] border-4 border-background active:scale-90 transition-all duration-200">
              <PlusCircle className="w-8 h-8" />
            </button>
          </Link>
        </div>

        {navItems.slice(2).map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex flex-col items-center justify-center gap-1.5 p-2 min-w-[72px] transition-all relative",
              isActive ? "text-primary" : "text-muted-foreground/60"
            )}>
              <item.icon className={cn("w-6 h-6 transition-transform", isActive && "scale-110")} />
              <span className="text-[11px] font-semibold tracking-tight">{item.label}</span>
              {isActive && (
                <span className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Sidebar Desktop */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border hidden lg:flex flex-col z-50">
        {sidebarContent}
      </aside>
    </>
  );
}
