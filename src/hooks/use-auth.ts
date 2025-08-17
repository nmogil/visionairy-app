import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useAuth() {
  const { signIn, signOut } = useAuthActions();
  const user = useQuery(api.users.getCurrentUser);
  
  return {
    user,
    signIn,
    signOut,
    isAuthenticated: !!user,
    isLoading: user === undefined,
    isNewUser: user?.isNewUser === true,
    needsOnboarding: user && !user.onboardingCompleted,
  };
}