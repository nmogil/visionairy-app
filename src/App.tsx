import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Room from "./pages/Room";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { HelmetProvider } from "react-helmet-async";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import GameClient from "./pages/GameClient";
import Dashboard from "./pages/Dashboard";
import ImageGridDemo from "./pages/ImageGridDemo";
import InteractionsStyleGuide from "./components/interactions/InteractionsStyleGuide";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route 
        path="/" 
        element={isAuthenticated ? <Navigate to="/app/dashboard" replace /> : <Index />} 
      />
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/app/dashboard" replace /> : <Login />} 
      />
      <Route 
        path="/signup" 
        element={isAuthenticated ? <Navigate to="/app/dashboard" replace /> : <Signup />} 
      />
      
      {/* Demo routes (public for now) */}
      <Route path="/image-grid-demo" element={<ImageGridDemo />} />
      <Route path="/interactions-guide" element={<InteractionsStyleGuide />} />
      
      {/* Protected routes */}
      <Route 
        path="/app/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/room/:code" 
        element={
          <ProtectedRoute>
            <Room />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/play/:roomId" 
        element={
          <ProtectedRoute>
            <GameClient />
          </ProtectedRoute>
        } 
      />
      
      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <ThemeProvider>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </ThemeProvider>
);

export default App;
