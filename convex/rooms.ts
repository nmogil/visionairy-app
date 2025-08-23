import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
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
      maxPlayers: v.optional(v.float64()),
      roundsPerGame: v.optional(v.float64()),
      timePerRound: v.optional(v.float64()),
      isPrivate: v.optional(v.boolean()),
    })),
  },
  returns: v.object({
    roomId: v.id("rooms"),
    code: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    // Get current user
    const user = await ctx.db.get(userId);
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

// Join a room by code
export const joinRoom = mutation({
  args: {
    code: v.string(),
  },
  returns: v.object({
    roomId: v.id("rooms"),
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    // Get current user
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    
    if (!user.onboardingCompleted) {
      throw new Error("Please complete onboarding first");
    }
    
    // Find room by code (case-insensitive)
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .unique();
      
    if (!room) {
      throw new Error("Room not found");
    }
    
    // Check room status
    if (room.status !== "waiting" && !room.settings.allowLateJoin) {
      throw new Error("Game already started");
    }
    
    if (room.status === "finished") {
      throw new Error("Game has ended");
    }
    
    // Check if already in room
    const existingPlayer = await ctx.db
      .query("players")
      .withIndex("by_room_and_user", (q) => 
        q.eq("roomId", room._id).eq("userId", user._id)
      )
      .unique();
      
    if (existingPlayer) {
      if (existingPlayer.status === "kicked") {
        throw new Error("You have been kicked from this room");
      }
      
      // Reconnect existing player
      await ctx.db.patch(existingPlayer._id, {
        status: "connected",
        lastSeenAt: Date.now(),
      });
    } else {
      // Check room capacity
      const activePlayers = await ctx.db
        .query("players")
        .withIndex("by_room", (q) => q.eq("roomId", room._id))
        .filter((q) => q.neq(q.field("status"), "kicked"))
        .collect();
        
      if (activePlayers.length >= room.settings.maxPlayers) {
        throw new Error("Room is full");
      }
      
      // Add as new player
      await ctx.db.insert("players", {
        roomId: room._id,
        userId: user._id,
        status: "connected",
        isHost: false,
        score: 0,
        joinedAt: Date.now(),
        lastSeenAt: Date.now(),
      });
    }
    
    return { roomId: room._id, success: true };
  },
});

// Get room state (real-time subscription)
export const getRoomState = query({
  args: {
    roomId: v.id("rooms"),
  },
  returns: v.union(
    v.null(),
    v.object({
      room: v.object({
        _id: v.id("rooms"),
        code: v.string(),
        name: v.string(),
        status: v.string(),
        settings: v.object({
          maxPlayers: v.float64(),
          roundsPerGame: v.float64(),
          timePerRound: v.float64(),
          isPrivate: v.boolean(),
          allowLateJoin: v.boolean(),
        }),
        currentRound: v.optional(v.float64()),
      }),
      players: v.array(v.object({
        _id: v.id("players"),
        userId: v.id("users"),
        username: v.string(),
        displayName: v.string(),
        status: v.string(),
        isHost: v.boolean(),
        score: v.float64(),
      })),
      isHost: v.boolean(),
      canStart: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) return null;
    
    const userId = await getAuthUserId(ctx);
    const currentUser = userId ? await ctx.db.get(userId) : null;
    
    // Get all players with user info (excluding kicked players)
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.neq(q.field("status"), "kicked"))
      .collect();
      
    const playersWithInfo = await Promise.all(
      players.map(async (player) => {
        const user = await ctx.db.get(player.userId);
        return {
          _id: player._id,
          userId: player.userId,
          username: user?.username ?? "Guest",
          displayName: user?.displayName ?? user?.username ?? "Guest",
          status: player.status,
          isHost: player.isHost,
          score: player.score,
        };
      })
    );
    
    const connectedPlayers = playersWithInfo.filter(p => p.status === "connected");
    
    return {
      room: {
        _id: room._id,
        code: room.code,
        name: room.name,
        status: room.status,
        settings: room.settings,
        currentRound: room.currentRound,
      },
      players: playersWithInfo,
      isHost: currentUser?._id === room.hostId,
      canStart: room.status === "waiting" && connectedPlayers.length >= 2,
    };
  },
});

// Leave a room
export const leaveRoom = mutation({
  args: {
    roomId: v.id("rooms"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    
    const player = await ctx.db
      .query("players")
      .withIndex("by_room_and_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", user._id)
      )
      .unique();
      
    if (!player) throw new Error("Not in this room");
    
    // If host is leaving and game hasn't started, transfer host or close room
    if (player.isHost && room.status === "waiting") {
      const otherPlayers = await ctx.db
        .query("players")
        .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
        .filter((q) => 
          q.and(
            q.neq(q.field("userId"), user._id),
            q.eq(q.field("status"), "connected")
          )
        )
        .collect();
      
      if (otherPlayers.length > 0) {
        // Transfer host to next player
        await ctx.db.patch(otherPlayers[0]._id, { isHost: true });
        await ctx.db.patch(room._id, { hostId: otherPlayers[0].userId });
      } else {
        // Close room if no other players
        await ctx.db.patch(room._id, { status: "finished", finishedAt: Date.now() });
      }
    }
    
    // Remove or disconnect player
    if (room.status === "waiting") {
      await ctx.db.delete(player._id);
    } else {
      await ctx.db.patch(player._id, { status: "disconnected" });
    }
    
    return null;
  },
});

// Kick a player (host only)
export const kickPlayer = mutation({
  args: {
    roomId: v.id("rooms"),
    playerId: v.id("players"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    
    const user = await ctx.db.get(userId);
    if (!user || user._id !== room.hostId) {
      throw new Error("Only the host can kick players");
    }
    
    const targetPlayer = await ctx.db.get(args.playerId);
    if (!targetPlayer) throw new Error("Player not found");
    
    if (targetPlayer.isHost) {
      throw new Error("Cannot kick the host");
    }
    
    await ctx.db.patch(args.playerId, {
      status: "kicked",
    });
    
    return null;
  },
});

// Update room settings (host only)
export const updateRoomSettings = mutation({
  args: {
    roomId: v.id("rooms"),
    settings: v.object({
      maxPlayers: v.optional(v.float64()),
      roundsPerGame: v.optional(v.float64()),
      timePerRound: v.optional(v.float64()),
      isPrivate: v.optional(v.boolean()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    
    if (room.status !== "waiting") {
      throw new Error("Cannot change settings after game starts");
    }
    
    const user = await ctx.db.get(userId);
    if (!user || user._id !== room.hostId) {
      throw new Error("Only the host can update settings");
    }
    
    // Validate settings
    const newSettings = { ...room.settings };
    
    if (args.settings.maxPlayers !== undefined) {
      if (args.settings.maxPlayers < 2 || args.settings.maxPlayers > 12) {
        throw new Error("Max players must be between 2 and 12");
      }
      newSettings.maxPlayers = args.settings.maxPlayers;
    }
    
    if (args.settings.roundsPerGame !== undefined) {
      if (args.settings.roundsPerGame < 1 || args.settings.roundsPerGame > 10) {
        throw new Error("Rounds must be between 1 and 10");
      }
      newSettings.roundsPerGame = args.settings.roundsPerGame;
    }
    
    if (args.settings.timePerRound !== undefined) {
      if (args.settings.timePerRound < 30 || args.settings.timePerRound > 300) {
        throw new Error("Time per round must be between 30 and 300 seconds");
      }
      newSettings.timePerRound = args.settings.timePerRound;
    }
    
    if (args.settings.isPrivate !== undefined) {
      newSettings.isPrivate = args.settings.isPrivate;
    }
    
    await ctx.db.patch(args.roomId, { settings: newSettings });
    
    return null;
  },
});

// Get list of public rooms
export const getPublicRooms = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("rooms"),
    code: v.string(),
    name: v.string(),
    hostName: v.string(),
    playerCount: v.float64(),
    maxPlayers: v.float64(),
    status: v.string(),
  })),
  handler: async (ctx) => {
    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .collect();
    
    const publicRooms = rooms.filter(r => !r.settings.isPrivate);
    
    const roomsWithInfo = await Promise.all(
      publicRooms.slice(0, 20).map(async (room) => {
        const host = await ctx.db.get(room.hostId);
        const players = await ctx.db
          .query("players")
          .withIndex("by_room", (q) => q.eq("roomId", room._id))
          .filter((q) => q.eq(q.field("status"), "connected"))
          .collect();
        
        return {
          _id: room._id,
          code: room.code,
          name: room.name,
          hostName: host?.displayName ?? "Unknown",
          playerCount: players.length,
          maxPlayers: room.settings.maxPlayers,
          status: room.status,
        };
      })
    );
    
    return roomsWithInfo;
  },
});