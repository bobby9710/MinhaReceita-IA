import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import LandingPage from "@/pages/LandingPage";
import Dashboard from "@/pages/Dashboard";
import RecipesPage from "@/pages/RecipesPage";
import RecipeDetailPage from "@/pages/RecipeDetailPage";
import RecipeFormPage from "@/pages/RecipeFormPage";
import MealPlannerPage from "@/pages/MealPlannerPage";
import ShoppingListPage from "@/pages/ShoppingListPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/dashboard" component={Dashboard} />
      
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
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
