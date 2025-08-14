import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/room/:code" element={<Room />} />
              <Route path="/play/:roomId" element={<GameClient />} />
              <Route path="/app/dashboard" element={<Dashboard />} />
              <Route path="/image-grid-demo" element={<ImageGridDemo />} />
              <Route path="/interactions-guide" element={<InteractionsStyleGuide />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </ThemeProvider>
);

export default App;
