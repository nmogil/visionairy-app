import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { ResendOTP } from "./ResendOTP";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [ResendOTP, Anonymous],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      // Check if this is an existing user
      const existingUser = args.existingUserId 
        ? await ctx.db.get(args.existingUserId)
        : null;
        
      if (existingUser) {
        // EXISTING USER - just update last active time
        await ctx.db.patch(existingUser._id, {
          lastActiveAt: Date.now(),
          isNewUser: false, // Ensure it's marked as not new
        });
        return existingUser._id;
      }
      
      // NEW USER - create with default values
      const userId = await ctx.db.insert("users", {
        ...args.profile,
        email: args.profile?.email,
        isAnonymous: args.provider?.id === "anonymous",
        lastActiveAt: Date.now(),
        onboardingCompleted: false,
        isNewUser: true, // Mark as new user
        gamesPlayed: 0,
        gamesWon: 0,
        totalScore: 0,
      });
      
      return userId;
    },
  },
});