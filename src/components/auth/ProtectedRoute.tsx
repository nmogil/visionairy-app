import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useAuthActions } from "@convex-dev/auth/react";
import { Loader2 } from "lucide-react";
import UsernameDialog from "./UsernameDialog";

interface ProtectedRouteProps {
  children: ReactNode;
  requireOnboarding?: boolean;
}

export function ProtectedRoute({ children, requireOnboarding = true }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated, needsOnboarding } = useAuth();
  const { signIn } = useAuthActions();
  const location = useLocation();
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Auto-sign in anonymous users when they try to access protected routes
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isSigningIn) {
      setIsSigningIn(true);
      signIn("anonymous")
        .then(() => {
          console.log("Anonymous sign-in successful");
        })
        .catch((error) => {
          console.error("Anonymous sign-in failed:", error);
          setIsSigningIn(false);
        });
    }
  }, [isLoading, isAuthenticated, isSigningIn, signIn]);

  // Show loading state while checking auth or signing in
  if (isLoading || isSigningIn) {
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

  // Show username dialog if user doesn't have a username
  if (requireOnboarding && user && !user.username) {
    return <UsernameDialog open={true} />;
  }

  return <>{children}</>;
}