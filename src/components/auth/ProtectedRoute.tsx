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

  // Auto-sign in anonymous users when they try to access protected routes
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isSigningIn) {
      setIsSigningIn(true);
      signIn("anonymous")
        .then(() => {
          // Don't immediately set isSigningIn to false - wait for auth state to be fully established
        })
        .catch((error) => {
          console.error("Anonymous sign-in failed:", error);
          setIsSigningIn(false);
        });
    }
  }, [isLoading, isAuthenticated, isSigningIn, signIn]);

  // Add authentication stabilization to prevent race conditions
  useEffect(() => {
    if (isAuthenticated && user !== undefined) {
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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