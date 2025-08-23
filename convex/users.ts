import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get current authenticated user using Convex Auth pattern
export const getCurrentUser = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      image: v.optional(v.string()),
      isAnonymous: v.optional(v.boolean()),
      name: v.optional(v.string()),
      username: v.optional(v.string()),
      displayName: v.optional(v.string()),
      avatarId: v.optional(v.id("_storage")),
      lastActiveAt: v.optional(v.number()),
      onboardingCompleted: v.optional(v.boolean()),
      isNewUser: v.optional(v.boolean()),
      gamesPlayed: v.optional(v.number()),
      gamesWon: v.optional(v.number()),
      totalScore: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    // Use getAuthUserId for consistent authentication - works for both authenticated and anonymous users
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    
    // Get the user from the database directly by userId
    const user = await ctx.db.get(userId);
    return user;
  },
});

// Update username (onboarding step)
export const updateUsername = mutation({
  args: {
    username: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Use the same authentication pattern as room creation - getAuthUserId works for both authenticated and anonymous users
    const userId = await getAuthUserId(ctx);
    
    if (!userId) {
      throw new Error("Authentication required. Please refresh the page and try again.");
    }
    
    // Verify the user exists in the database
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User account not found. Please refresh the page and try again.");
    }
    
    // Validate username format
    if (args.username.length < 3 || args.username.length > 20) {
      throw new Error("Username must be 3-20 characters");
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(args.username)) {
      throw new Error("Username can only contain letters, numbers, and underscores");
    }
    
    // Check if username is already taken
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();
      
    if (existing) {
      throw new Error("Username already taken");
    }
    
    // Update user profile
    await ctx.db.patch(userId, {
      username: args.username,
      displayName: args.username,
      onboardingCompleted: true,
      isNewUser: false, // No longer a new user after onboarding
    });
    
    return null;
  },
});

// Check if username is available
export const checkUsernameAvailable = query({
  args: {
    username: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();
    
    return !existing;
  },
});