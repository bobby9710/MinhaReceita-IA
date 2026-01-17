import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  BookOpen, 
  PlusCircle, 
  Calendar, 
  ShoppingCart,
  ChefHat,
  LogOut,
  User
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface SidebarItemProps {
  icon: any;
  label: string;
  href: string;
}

function SidebarItem({ icon: Icon, label, href }: SidebarItemProps) {
  const [location] = useLocation();
  const active = location === href;

  return (
    <Link href={href}>
      <button className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
        active 
          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
          : "hover:bg-primary/10 text-muted-foreground hover:text-primary"
      )}>
        <Icon className={cn("w-5 h-5 transition-transform duration-200 group-hover:scale-110", active ? "text-primary-foreground" : "")} />
        <span className="font-medium">{label}</span>
      </button>
    </Link>
  );
}

export function Sidebar() {
  const { user, logoutMutation } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border hidden lg:flex flex-col z-50">
      <div className="p-6 flex items-center gap-3 border-b">
        <div className="bg-primary p-2 rounded-lg shadow-md">
          <ChefHat className="w-6 h-6 text-primary-foreground" />
        </div>
        <span className="font-display font-bold text-xl tracking-tight">MinhaReceita</span>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4">
        <nav className="space-y-2">
          <SidebarItem icon={LayoutDashboard} label="Painel" href="/" />
          <SidebarItem icon={BookOpen} label="Minhas Receitas" href="/recipes" />
          <SidebarItem icon={PlusCircle} label="Adicionar Receita" href="/recipes/new" />
          <SidebarItem icon={Calendar} label="Planejador" href="/meal-planner" />
          <SidebarItem icon={ShoppingCart} label="Lista de Compras" href="/shopping-list" />
        </nav>
      </div>

      <div className="p-4 border-t space-y-4 mt-auto">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5">
          <Avatar className="h-10 w-10 border border-primary/20">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {user?.firstName?.charAt(0) || user?.username.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate text-foreground">{user?.firstName || user?.username}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.username}</p>
          </div>
        </div>

        <button 
          onClick={() => logoutMutation.mutate()}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors font-medium group"
        >
          <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
          <span>Sair da Conta</span>
        </button>
      </div>
    </aside>
  );
}
