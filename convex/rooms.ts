import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { GAME_CONFIG, ROOM_CODE_LENGTH, ROOM_CODE_CHARS } from "./lib/constants";

// Helper function to generate unique room codes
function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

// Create a new room
export const createRoom = mutation({
  args: {
    name: v.string(),
    settings: v.optional(v.object({
      maxPlayers: v.optional(v.number()),
      roundsPerGame: v.optional(v.number()),
      timePerRound: v.optional(v.number()),
      isPrivate: v.optional(v.boolean()),
    })),
  },
  returns: v.object({
    roomId: v.id("rooms"),
    code: v.string(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    // Get current user
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();
    if (!user) throw new Error("User not found");
    
    if (!user.onboardingCompleted) {
      throw new Error("Please complete onboarding first");
    }
    
    // Generate unique room code (max 10 attempts)
    let code: string = "";
    let attempts = 0;
    while (attempts < 10) {
      code = generateRoomCode();
      const existing = await ctx.db
        .query("rooms")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique();
      if (!existing) break;
      attempts++;
    }
    
    if (attempts >= 10) {
      throw new Error("Could not generate unique room code");
    }
    
    // Create room with settings
    const roomId = await ctx.db.insert("rooms", {
      code,
      name: args.name,
      hostId: user._id,
      status: "waiting",
      settings: {
        maxPlayers: args.settings?.maxPlayers ?? GAME_CONFIG.DEFAULT_MAX_PLAYERS,
        roundsPerGame: args.settings?.roundsPerGame ?? GAME_CONFIG.DEFAULT_ROUNDS_PER_GAME,
        timePerRound: args.settings?.timePerRound ?? GAME_CONFIG.DEFAULT_TIME_PER_ROUND,
        isPrivate: args.settings?.isPrivate ?? false,
        allowLateJoin: true,
      },
      createdAt: Date.now(),
    });
    
    // Add host as first player
    await ctx.db.insert("players", {
      roomId,
      userId: user._id,
      status: "connected",
      isHost: true,
      score: 0,
      joinedAt: Date.now(),
      lastSeenAt: Date.now(),
    });
    
    return { roomId, code };
  },
});