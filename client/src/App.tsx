import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import type { User } from "@shared/schema";

function Router() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Restore user session from localStorage if available
    const savedUser = localStorage.getItem('atlas_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('atlas_user');
      }
    }
  }, []);

  const handleLogin = (user: User) => {
    setUser(user);
    localStorage.setItem('atlas_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('atlas_user');
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen">      
      <Switch>
        <Route path="/" component={() => <Dashboard user={user} onLogout={handleLogout} />} />
        <Route path="/dashboard" component={() => <Dashboard user={user} onLogout={handleLogout} />} />
        <Route component={NotFound} />
      </Switch>
    </div>
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
