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

        {navItems.slice(2, 3).map((item) => (
          <Link key={item.href} href={item.href}>
            <button className={`flex flex-col items-center gap-1 min-w-[64px] ${isActive(item.href) ? "text-primary font-medium" : "text-muted-foreground"}`}>
              <item.icon className="w-6 h-6" />
              <span className="text-[10px]">{item.label}</span>
            </button>
          </Link>
        ))}

        {/* Profile / Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex flex-col items-center gap-1 min-w-[64px] text-muted-foreground">
              <Avatar className="w-6 h-6 border">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {user?.firstName?.charAt(0) || user?.username.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px]">Perfil</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="mb-2 w-48">
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              Olá, {user?.firstName || user?.username}
            </div>
            <DropdownMenuItem asChild>
              <Link href="/shopping-list" className="flex items-center gap-2 cursor-pointer">
                <ShoppingCart className="w-4 h-4" />
                <span>Lista de Compras</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive flex items-center gap-2 cursor-pointer"
              onClick={() => logoutMutation.mutate()}
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </div>
  );
}
