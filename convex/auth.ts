import { convexAuth } from "@convex-dev/auth/server";
import { ResendOTP } from "./ResendOTP";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [ResendOTP], // Only email authentication
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      if (args.existingUserId) {
        const existingUser = await ctx.db.get(args.existingUserId);
        if (existingUser) {
          await ctx.db.patch(existingUser._id, {
            lastActiveAt: Date.now(),
          });
          return existingUser._id;
        }
      }

      // All users are email users now
      const userData = {
        ...args.profile,
        email: args.profile?.email,
        lastActiveAt: Date.now(),
        onboardingCompleted: false, // All users need username setup
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