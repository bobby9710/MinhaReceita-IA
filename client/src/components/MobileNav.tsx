import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  BookOpen, 
  PlusCircle, 
  Calendar, 
  ShoppingCart,
  User,
  LogOut,
  ChevronUp
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function MobileNav() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const navItems = [
    { label: "Painel", icon: LayoutDashboard, href: "/" },
    { label: "Receitas", icon: BookOpen, href: "/recipes" },
    { label: "Plano", icon: Calendar, href: "/meal-planner" },
    { label: "Lista", icon: ShoppingCart, href: "/shopping-list" },
  ];

  const isActive = (href: string) => location === href;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
      {/* Central FAB */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-6">
        <Link href="/recipes/new">
          <button className="bg-primary text-primary-foreground p-4 rounded-full shadow-lg shadow-primary/40 active:scale-95 transition-transform">
            <PlusCircle className="w-6 h-6" />
          </button>
        </Link>
      </div>

      <nav className="bg-background border-t px-2 pb-safe pt-2 flex items-center justify-around h-16">
        {navItems.slice(0, 2).map((item) => (
          <Link key={item.href} href={item.href}>
            <button className={`flex flex-col items-center gap-1 min-w-[64px] ${isActive(item.href) ? "text-primary font-medium" : "text-muted-foreground"}`}>
              <item.icon className="w-6 h-6" />
              <span className="text-[10px]">{item.label}</span>
            </button>
          </Link>
        ))}

        <div className="w-12" /> {/* Spacer for FAB */}

        {navItems.slice(2).map((item) => (
          <Link key={item.href} href={item.href}>
            <button className={`flex flex-col items-center gap-1 min-w-[64px] ${isActive(item.href) ? "text-primary font-medium" : "text-muted-foreground"}`}>
              <item.icon className="w-6 h-6" />
              <span className="text-[10px]">{item.label}</span>
            </button>
          </Link>
        ))}
      </nav>
    </div>
  );
}
