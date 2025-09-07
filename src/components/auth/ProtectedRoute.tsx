import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useAuthActions } from "@convex-dev/auth/react";
import { Loader2 } from "lucide-react";
import { OnboardingWizard } from "./OnboardingWizard";

interface ProtectedRouteProps {
  children: ReactNode;
  requireOnboarding?: boolean;
}

export function ProtectedRoute({ children, requireOnboarding = true }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated, needsOnboarding } = useAuth();
  const { signIn } = useAuthActions();
  const location = useLocation();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authStable, setAuthStable] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  // Auto-sign in anonymous users when they try to access protected routes
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isSigningIn && retryCount < 3) {
      console.log(`[ProtectedRoute] Attempting anonymous sign-in (attempt ${retryCount + 1})`);
      setIsSigningIn(true);
      setLastError(null);
      
      signIn("anonymous")
        .then(() => {
          console.log("[ProtectedRoute] Anonymous sign-in successful");
          setRetryCount(0);
          // Don't immediately set isSigningIn to false - wait for auth state to be fully established
        })
        .catch((error) => {
          console.error("[ProtectedRoute] Anonymous sign-in failed:", error);
          setLastError(error.message || "Authentication failed");
          setIsSigningIn(false);
          setRetryCount(prev => prev + 1);
          
          // Retry after a delay
          if (retryCount < 2) {
            setTimeout(() => {
              // This will trigger the effect again
            }, 1000 * (retryCount + 1));
          }
        });
    }
  }, [isLoading, isAuthenticated, isSigningIn, signIn, retryCount]);

  // Add authentication stabilization to prevent race conditions
  useEffect(() => {
    if (isAuthenticated && user !== undefined) {
      console.log("[ProtectedRoute] Auth state stabilized", { user: user?.displayName || user?.username || "Anonymous" });
      // Add small delay to ensure authentication context is fully established
      const timer = setTimeout(() => {
        setAuthStable(true);
        setIsSigningIn(false);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setAuthStable(false);
    }
  }, [isAuthenticated, user]);

  // Show loading state while checking auth, signing in, or stabilizing
  if (isLoading || isSigningIn || (isAuthenticated && !authStable)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <div className="text-sm text-muted-foreground">
            {isLoading && "Loading..."}
            {isSigningIn && `Signing in${retryCount > 0 ? ` (attempt ${retryCount + 1})` : ""}...`}
            {isAuthenticated && !authStable && "Setting up session..."}
          </div>
          {lastError && retryCount > 0 && (
            <div className="text-xs text-destructive">
              Retrying after error: {lastError}
            </div>
          )}
        </div>
      </div>
    );
  }

  // If still not authenticated after trying anonymous sign-in, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Show onboarding wizard if user needs to complete onboarding
  if (requireOnboarding && user && (!user.username || !user.onboardingCompleted)) {
    return <OnboardingWizard open={true} />;
  }

  return <>{children}</>;
}