import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Start a game (host only)
export const startGame = mutation({
  args: {
    roomId: v.id("rooms"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    
    const user = await ctx.db.get(userId);
    if (!user || user._id !== room.hostId) {
      throw new Error("Only the host can start the game");
    }
    
    if (room.status !== "waiting") {
      throw new Error("Game has already started or finished");
    }
    
    // Check if we have enough players
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("status"), "connected"))
      .collect();
      
    if (players.length < 2) {
      throw new Error("Need at least 2 players to start");
    }
    
    // Update room status to starting
    await ctx.db.patch(args.roomId, {
      status: "starting",
      startedAt: Date.now(),
    });
    
    // TODO: Initialize first round and game state when game mechanics are implemented
    // This is a basic implementation that just changes the room status
    
    return null;
  },
});