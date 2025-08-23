import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  
  // Extended user profile
  users: defineTable({
    // Auth fields (managed by Convex Auth)
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.float64()),
    image: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    name: v.optional(v.string()),
    
    // Custom fields for our app
    username: v.optional(v.string()),
    displayName: v.optional(v.string()),
    avatarId: v.optional(v.string()), // Temporarily string-based until proper avatar storage is implemented
    lastActiveAt: v.optional(v.float64()),
    onboardingCompleted: v.optional(v.boolean()),
    isNewUser: v.optional(v.boolean()), // Track if user just signed up
    
    // Game statistics
    gamesPlayed: v.optional(v.float64()),
    gamesWon: v.optional(v.float64()),
    totalScore: v.optional(v.float64()),
  })
    .index("by_email", ["email"])
    .index("by_username", ["username"]),

  // Room management tables
  rooms: defineTable({
    code: v.string(),
    name: v.string(),
    hostId: v.id("users"),
    status: v.union(
      v.literal("waiting"),
      v.literal("starting"),
      v.literal("playing"),
      v.literal("finished")
    ),
    settings: v.object({
      maxPlayers: v.float64(),
      roundsPerGame: v.float64(),
      timePerRound: v.float64(),
      isPrivate: v.boolean(),
      allowLateJoin: v.boolean(),
    }),
    currentRound: v.optional(v.float64()),
    createdAt: v.float64(),
    startedAt: v.optional(v.float64()),
    finishedAt: v.optional(v.float64()),
  })
    .index("by_code", ["code"])
    .index("by_status", ["status"])
    .index("by_host", ["hostId"]),
  
  players: defineTable({
    roomId: v.id("rooms"),
    userId: v.id("users"),
    status: v.union(
      v.literal("connected"),
      v.literal("disconnected"),
      v.literal("kicked")
    ),
    isHost: v.boolean(),
    score: v.float64(),
    joinedAt: v.float64(),
    lastSeenAt: v.float64(),
  })
    .index("by_room", ["roomId"])
    .index("by_user", ["userId"])
    .index("by_room_and_user", ["roomId", "userId"]),
});