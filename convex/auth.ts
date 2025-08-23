import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { ResendOTP } from "./ResendOTP";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [ResendOTP, Anonymous],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      // For existing users, try to update them
      if (args.existingUserId) {
        const existingUser = await ctx.db.get(args.existingUserId);
        if (existingUser) {
          await ctx.db.patch(existingUser._id, {
            lastActiveAt: Date.now(),
          });
          return existingUser._id;
        }
        // If existingUserId is provided but user not found, create new user
      }
      
      // Create new user (or replace corrupted user)
      const userData = {
        ...args.profile,
        email: args.profile?.email,
        isAnonymous: args.provider?.id === "anonymous",
        lastActiveAt: Date.now(),
        onboardingCompleted: false,
        isNewUser: true,
        gamesPlayed: 0,
        gamesWon: 0,
        totalScore: 0,
      };
      
      const userId = await ctx.db.insert("users", userData);
      return userId;
    },
  },
});