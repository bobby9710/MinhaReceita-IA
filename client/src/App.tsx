import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/use-auth";
import { PWALifecycle } from "@/components/PWALifecycle";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import NotFound from "@/pages/not-found";

import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Dashboard";
import RecipesPage from "@/pages/RecipesPage";
import RecipeDetailPage from "@/pages/RecipeDetailPage";
import RecipeFormPage from "@/pages/RecipeFormPage";
import MealPlannerPage from "@/pages/MealPlannerPage";
import ShoppingListPage from "@/pages/ShoppingListPage";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/" component={Dashboard} />
      <Route path="/recipes" component={RecipesPage} />
      <Route path="/recipes/new" component={RecipeFormPage} />
      <Route path="/recipes/:id" component={RecipeDetailPage} />
      <Route path="/recipes/:id/edit" component={RecipeFormPage} />
      <Route path="/meal-planner" component={MealPlannerPage} />
      <Route path="/shopping-list" component={ShoppingListPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <PWALifecycle />
          <PWAInstallPrompt />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
