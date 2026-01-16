import { Sidebar } from "./Sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useLocation } from "wouter";

export function PageLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth"); // Redirect to custom login
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) return null; // Or a nice loading spinner

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      <Sidebar />
      <main className="flex-1 pb-20 lg:pb-0 lg:ml-64 p-4 sm:p-8 lg:p-12 overflow-y-auto w-full">
        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
