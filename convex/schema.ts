import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  
  // Extended user profile
  users: defineTable({
    // Auth fields (managed by Convex Auth)
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    image: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    name: v.optional(v.string()),
    
    // Custom fields for our app
    username: v.optional(v.string()),
    displayName: v.optional(v.string()),
    avatarId: v.optional(v.id("_storage")),
    lastActiveAt: v.optional(v.number()),
    onboardingCompleted: v.optional(v.boolean()),
    isNewUser: v.optional(v.boolean()), // Track if user just signed up
    
    // Game statistics
    gamesPlayed: v.optional(v.number()),
    gamesWon: v.optional(v.number()),
    totalScore: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_username", ["username"]),
});