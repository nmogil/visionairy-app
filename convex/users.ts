import { query, mutation, MutationCtx } from "./_generated/server";
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

// Helper function for reliable user authentication with better error handling
const getAuthenticatedUser = async (ctx: MutationCtx) => {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("AUTHENTICATION_REQUIRED");
  }
  
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }
  
  return { userId, user };
};

// Update username (onboarding step) with enhanced error handling
export const updateUsername = mutation({
  args: {
    username: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      const { userId, user } = await getAuthenticatedUser(ctx);
      
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
    } catch (error: unknown) {
      // Convert internal errors to user-friendly messages
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage === "AUTHENTICATION_REQUIRED") {
        throw new Error("Authentication required. Please refresh the page and try again.");
      }
      if (errorMessage === "USER_NOT_FOUND") {
        throw new Error("User account not found. Please refresh the page and try again.");
      }
      // Re-throw other errors as-is
      throw error;
    }
  },
});

// Complete onboarding with all user details
export const completeOnboarding = mutation({
  args: {
    username: v.string(),
    displayName: v.optional(v.string()),
    avatarId: v.optional(v.id("_storage")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      const { userId, user } = await getAuthenticatedUser(ctx);
      
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
        
      if (existing && existing._id !== userId) {
        throw new Error("Username already taken");
      }
      
      // Use provided display name or fallback to username
      const displayName = args.displayName || args.username;
      
      // Complete onboarding with all details
      await ctx.db.patch(userId, {
        username: args.username,
        displayName: displayName,
        avatarId: args.avatarId,
        onboardingCompleted: true,
        isNewUser: false,
      });
      
      return null;
    } catch (error: unknown) {
      // Convert internal errors to user-friendly messages
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage === "AUTHENTICATION_REQUIRED") {
        throw new Error("Authentication required. Please refresh the page and try again.");
      }
      if (errorMessage === "USER_NOT_FOUND") {
        throw new Error("User account not found. Please refresh the page and try again.");
      }
      // Re-throw other errors as-is
      throw error;
    }
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