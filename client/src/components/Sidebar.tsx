import { Link, useLocation } from "wouter";
import { ChefHat, Home, Book, Calendar, ShoppingCart, LogOut, PlusCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [location] = useLocation();
  const { logout, user } = useAuth();

  const navItems = [
    { href: "/", icon: Home, label: "Dashboard" },
    { href: "/recipes", icon: Book, label: "My Recipes" },
    { href: "/meal-planner", icon: Calendar, label: "Meal Planner" },
    { href: "/shopping-list", icon: ShoppingCart, label: "Shopping List" },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border flex flex-col z-50">
      <div className="p-8 pb-4">
        <div className="flex items-center gap-3 text-primary mb-8">
          <ChefHat className="w-8 h-8" />
          <span className="font-display font-bold text-xl tracking-tight text-foreground">MinhaReceita</span>
        </div>

        <Link href="/recipes/new">
          <button className="w-full bg-primary text-primary-foreground rounded-xl py-3 px-4 flex items-center justify-center gap-2 font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:translate-y-[-2px] transition-all duration-300 active:translate-y-0">
            <PlusCircle className="w-5 h-5" />
            <span>New Recipe</span>
          </button>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group font-medium",
              isActive 
                ? "bg-accent text-foreground shadow-sm" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}>
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
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
