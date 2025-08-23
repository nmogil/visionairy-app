# Step 2: Room Management System + Optimization

## Objective
Implement a complete room management system for creating, joining, and managing game rooms with real-time updates.

## Bundle Optimization Requirements
**Critical:** This step adds room-related components that can significantly impact bundle size. You must implement lazy loading and code splitting to prevent bundle bloat.

### Optimization Targets
- Lazy load all room-related components
- Split room settings into separate chunk
- Optimize icon imports
- Bundle size checkpoint: Target reduction of 50-100KB

### Components to Optimize
1. **Room Creation Dialog** - Lazy load with dynamic import
2. **Room Settings Panel** - Separate chunk for configuration
3. **Join Room Form** - Split from main room component
4. **Room List/Browser** - Virtualize for large room lists
5. **Real-time presence indicators** - Optimize subscription overhead

## Prerequisites
- ✅ Completed Step 0 (Setup) and Step 1 (Authentication)
- ✅ Users can authenticate and have usernames
- ✅ Convex dev server running

## Deliverables
- ✅ Room creation with unique codes
- ✅ Join rooms by code
- ✅ Real-time player list updates
- ✅ Host controls (start game, kick players)
- ✅ Room settings configuration
- ✅ Player status tracking (connected/disconnected)

## Implementation Steps

### 1. Extend Schema for Rooms

Update `convex/schema.ts` (add to existing schema):

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  // ... existing tables (users, auth tables) ...
  
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
      maxPlayers: v.number(),
      roundsPerGame: v.number(),
      timePerRound: v.number(),
      isPrivate: v.boolean(),
      allowLateJoin: v.boolean(),
    }),
    currentRound: v.optional(v.number()),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
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
    score: v.number(),
    joinedAt: v.number(),
    lastSeenAt: v.number(),
  })
    .index("by_room", ["roomId"])
    .index("by_user", ["userId"])
    .index("by_room_and_user", ["roomId", "userId"]),
});
```

### 2. Create Room Management Functions

Create `convex/rooms.ts`:

```typescript
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    // Get current user
    const userQuery = identity.email
      ? ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", identity.email))
      : ctx.db.query("users").filter((q) => q.eq(q.field("_id"), identity.subject));
    
    const user = await userQuery.unique();
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

// Leave a room
export const leaveRoom = mutation({
  args: {
    roomId: v.id("rooms"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userQuery = identity.email
      ? ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", identity.email))
      : ctx.db.query("users").filter((q) => q.eq(q.field("_id"), identity.subject));
    
    const user = await userQuery.unique();
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
          maxPlayers: v.number(),
          roundsPerGame: v.number(),
          timePerRound: v.number(),
          isPrivate: v.boolean(),
          allowLateJoin: v.boolean(),
        }),
        currentRound: v.optional(v.number()),
      }),
      players: v.array(v.object({
        _id: v.id("players"),
        userId: v.id("users"),
        username: v.string(),
        displayName: v.string(),
        status: v.string(),
        isHost: v.boolean(),
        score: v.number(),
      })),
      isHost: v.boolean(),
      canStart: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) return null;
    
    const identity = await ctx.auth.getUserIdentity();
    const currentUser = identity
      ? await (identity.email
          ? ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", identity.email)).unique()
          : ctx.db.query("users").filter((q) => q.eq(q.field("_id"), identity.subject)).unique())
      : null;
    
    // Get all players with user info
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

// Kick a player (host only)
export const kickPlayer = mutation({
  args: {
    roomId: v.id("rooms"),
    playerId: v.id("players"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    
    const userQuery = identity.email
      ? ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", identity.email))
      : ctx.db.query("users").filter((q) => q.eq(q.field("_id"), identity.subject));
    
    const user = await userQuery.unique();
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
      maxPlayers: v.optional(v.number()),
      roundsPerGame: v.optional(v.number()),
      timePerRound: v.optional(v.number()),
      isPrivate: v.optional(v.boolean()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    
    if (room.status !== "waiting") {
      throw new Error("Cannot change settings after game starts");
    }
    
    const userQuery = identity.email
      ? ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", identity.email))
      : ctx.db.query("users").filter((q) => q.eq(q.field("_id"), identity.subject));
    
    const user = await userQuery.unique();
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
    playerCount: v.number(),
    maxPlayers: v.number(),
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
```

### 3. Create Room Hooks

Create `src/hooks/use-room.ts`:

```typescript
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useAuth } from "./use-auth";
import { useNavigate } from "react-router-dom";
import { useCallback, useEffect } from "react";

export function useRoom(roomId: string | undefined) {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const roomState = useQuery(
    api.rooms.getRoomState,
    roomId ? { roomId: roomId as Id<"rooms"> } : "skip"
  );
  
  const leaveRoom = useMutation(api.rooms.leaveRoom);
  const kickPlayer = useMutation(api.rooms.kickPlayer);
  const updateSettings = useMutation(api.rooms.updateRoomSettings);
  const startGame = useMutation(api.game.startGame);
  
  const handleLeaveRoom = useCallback(async () => {
    if (!roomId) return;
    
    try {
      await leaveRoom({ roomId: roomId as Id<"rooms"> });
      navigate("/dashboard");
    } catch (error) {
      console.error("Failed to leave room:", error);
    }
  }, [roomId, leaveRoom, navigate]);
  
  const handleKickPlayer = useCallback(async (playerId: Id<"players">) => {
    if (!roomId) return;
    
    try {
      await kickPlayer({ 
        roomId: roomId as Id<"rooms">,
        playerId 
      });
    } catch (error) {
      console.error("Failed to kick player:", error);
    }
  }, [roomId, kickPlayer]);
  
  const handleUpdateSettings = useCallback(async (settings: any) => {
    if (!roomId) return;
    
    try {
      await updateSettings({
        roomId: roomId as Id<"rooms">,
        settings
      });
    } catch (error) {
      console.error("Failed to update settings:", error);
      throw error;
    }
  }, [roomId, updateSettings]);
  
  const handleStartGame = useCallback(async () => {
    if (!roomId) return;
    
    try {
      await startGame({ roomId: roomId as Id<"rooms"> });
      // Game will automatically redirect when it starts
    } catch (error) {
      console.error("Failed to start game:", error);
      throw error;
    }
  }, [roomId, startGame]);
  
  // Auto-redirect when game starts
  useEffect(() => {
    if (roomState?.room?.status === "playing" && roomId) {
      navigate(`/play/${roomId}`);
    }
  }, [roomState?.room?.status, roomId, navigate]);
  
  const isHost = roomState?.currentPlayer?.isHost ?? false;
  const currentPlayer = roomState?.currentPlayer;
  const canStartGame = isHost && (roomState?.players?.length ?? 0) >= 2;
  
  return {
    roomState,
    isHost,
    currentPlayer,
    canStartGame,
    handleLeaveRoom,
    handleKickPlayer,
    handleUpdateSettings,
    handleStartGame,
    isLoading: roomState === undefined,
  };
}

export function useJoinRoom() {
  const joinRoom = useMutation(api.rooms.joinRoom);
  const navigate = useNavigate();
  
  const handleJoinRoom = useCallback(async (code: string) => {
    try {
      const result = await joinRoom({ code: code.toUpperCase() });
      if (result.roomId) {
        navigate(`/room/${result.roomId}`);
        return { success: true };
      }
      return { success: false, error: "Room not found" };
    } catch (error: any) {
      console.error("Failed to join room:", error);
      return { 
        success: false, 
        error: error.message || "Failed to join room" 
      };
    }
  }, [joinRoom, navigate]);
  
  return { handleJoinRoom };
}

export function useCreateRoom() {
  const createRoom = useMutation(api.rooms.createRoom);
  const navigate = useNavigate();
  
  const handleCreateRoom = useCallback(async (name?: string, settings?: any) => {
    try {
      const result = await createRoom({
        name: name || "New Game Room",
        settings: settings || {
          maxPlayers: 8,
          roundsPerGame: 5,
          promptTime: 60,
          votingTime: 30,
          isPublic: false,
        }
      });
      
      if (result.roomId) {
        navigate(`/room/${result.roomId}`);
        return { success: true, roomId: result.roomId, code: result.code };
      }
      return { success: false, error: "Failed to create room" };
    } catch (error: any) {
      console.error("Failed to create room:", error);
      return { 
        success: false, 
        error: error.message || "Failed to create room" 
      };
    }
  }, [createRoom, navigate]);
  
  return { handleCreateRoom };
}
```

### 4. Bundle Optimization Setup

Before creating UI components, set up optimization strategies:

#### Create Lazy Loading Utils

Create `src/utils/lazy.ts`:
```typescript
import { lazy, ComponentType } from "react";
import { LoadingSpinner } from "../components/ui/loading";

// Enhanced lazy loading with better error handling
export function createLazyComponent<T extends ComponentType<any>>(
  importFunction: () => Promise<{ default: T }>,
  fallback = <LoadingSpinner />
) {
  const LazyComponent = lazy(importFunction);
  
  return (props: React.ComponentProps<T>) => (
    <React.Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </React.Suspense>
  );
}

// Icon lazy loader to replace lucide-react imports
export async function loadIcon(iconName: string) {
  try {
    const iconModule = await import("lucide-react");
    return iconModule[iconName as keyof typeof iconModule];
  } catch (error) {
    console.warn(`Failed to load icon: ${iconName}`);
    return null;
  }
}
```

#### Create Dynamic Icon Component

Create `src/components/ui/dynamic-icon.tsx`:
```typescript
import { useState, useEffect, FC } from "react";
import { LucideProps } from "lucide-react";

interface DynamicIconProps extends LucideProps {
  name: string;
  fallback?: FC<LucideProps>;
}

export function DynamicIcon({ name, fallback: Fallback, ...props }: DynamicIconProps) {
  const [IconComponent, setIconComponent] = useState<FC<LucideProps> | null>(null);
  
  useEffect(() => {
    const loadIcon = async () => {
      try {
        const iconModule = await import("lucide-react");
        const Icon = iconModule[name as keyof typeof iconModule] as FC<LucideProps>;
        setIconComponent(() => Icon);
      } catch (error) {
        console.warn(`Failed to load icon: ${name}`);
        if (Fallback) {
          setIconComponent(() => Fallback);
        }
      }
    };
    
    loadIcon();
  }, [name, Fallback]);
  
  if (!IconComponent) {
    return <div className="w-4 h-4" {...props} />; // Placeholder
  }
  
  return <IconComponent {...props} />;
}
```

### 5. Create Optimized Room UI Components

Update `src/pages/Room.tsx` with lazy loading optimization:

```tsx
import { useParams } from "react-router-dom";
import { useRoom } from "../hooks/use-room";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Copy, LogOut, Play, Settings, UserX, Loader2, Users, Clock } from "lucide-react";
import { useState } from "react";
import { RoomSettings } from "../components/room/RoomSettings";
import { toast } from "../hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export function Room() {
  const { roomId } = useParams();
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const {
    roomState,
    isHost,
    currentPlayer,
    canStartGame,
    handleLeaveRoom,
    handleKickPlayer,
    handleUpdateSettings,
    handleStartGame,
    isLoading
  } = useRoom(roomId);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!roomState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">Room Not Found</h2>
          <p className="text-muted-foreground mb-4">This room doesn't exist or has been deleted.</p>
          <Button onClick={() => window.location.href = "/dashboard"}>
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }
  
  const { room, players } = roomState;
  
  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    toast({
      title: "Room code copied!",
      description: `Share code ${room.code} with friends`,
    });
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl">{room.name}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge 
                    variant="outline" 
                    className="text-lg px-4 py-2 font-mono cursor-pointer"
                    onClick={handleCopyCode}
                  >
                    {room.code}
                  </Badge>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleCopyCode}
                  >
                    <Copy className={`h-4 w-4 ${copied ? "scale-125" : ""}`} />
                  </Button>
                </div>
              </div>
              
              <div className="flex gap-2">
                {isHost && (
                  <Button
                    variant="outline"
                    onClick={() => setShowSettings(true)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={handleLeaveRoom}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Leave
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Room Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-secondary rounded-lg">
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className="mt-1">{room.status}</Badge>
              </div>
              <div className="text-center p-3 bg-secondary rounded-lg">
                <p className="text-sm text-muted-foreground">Players</p>
                <p className="text-2xl font-bold mt-1">
                  {players.length}/{room.settings.maxPlayers}
                </p>
              </div>
              <div className="text-center p-3 bg-secondary rounded-lg">
                <p className="text-sm text-muted-foreground">Rounds</p>
                <p className="text-2xl font-bold mt-1">
                  {room.settings.roundsPerGame}
                </p>
              </div>
            </div>
            
            {/* Players List */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Players
              </h3>
              <div className="space-y-2">
                {roomState.players.map((player) => (
                  <div
                    key={player._id}
                    className="flex items-center justify-between p-2 rounded-lg bg-secondary"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{player.displayName}</span>
                      {player.isHost && <Badge>Host</Badge>}
                      {player.status === "disconnected" && (
                        <Badge variant="outline">Disconnected</Badge>
                      )}
                    </div>
                    
                    {roomState.isHost && !player.isHost && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleKickPlayer(player._id)}
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Game Settings</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Rounds: {roomState.room.settings.roundsPerGame}</div>
                <div>Time per round: {roomState.room.settings.timePerRound}s</div>
                <div>Max players: {roomState.room.settings.maxPlayers}</div>
                <div>Private: {roomState.room.settings.isPrivate ? "Yes" : "No"}</div>
              </div>
            </div>
            
            {roomState.isHost && roomState.room.status === "waiting" && (
              <Button
                className="w-full"
                size="lg"
                onClick={handleStartGame}
                disabled={!roomState.canStart}
              >
                <Play className="mr-2 h-4 w-4" />
                {roomState.canStart 
                  ? "Start Game" 
                  : "Need at least 2 players to start"}
              </Button>
            )}
            
            {!roomState.isHost && roomState.room.status === "waiting" && (
              <div className="text-center text-muted-foreground">
                Waiting for host to start the game...
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {showSettings && roomState.isHost && (
        <RoomSettings
          roomId={roomId as Id<"rooms">}
          currentSettings={roomState.room.settings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
```

### 4. Create Room Settings Component

Create `src/components/room/RoomSettings.tsx`:

```tsx
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";

interface RoomSettingsProps {
  roomId: Id<"rooms">;
  currentSettings: {
    maxPlayers: number;
    roundsPerGame: number;
    timePerRound: number;
    isPrivate: boolean;
  };
  onClose: () => void;
}

export function RoomSettings({ roomId, currentSettings, onClose }: RoomSettingsProps) {
  const [settings, setSettings] = useState(currentSettings);
  const updateSettings = useMutation(api.rooms.updateRoomSettings);
  
  const handleSave = async () => {
    await updateSettings({ roomId, settings });
    onClose();
  };
  
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Room Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="maxPlayers">Max Players (2-12)</Label>
            <Input
              id="maxPlayers"
              type="number"
              min={2}
              max={12}
              value={settings.maxPlayers}
              onChange={(e) => setSettings({
                ...settings,
                maxPlayers: parseInt(e.target.value)
              })}
            />
          </div>
          
          <div>
            <Label htmlFor="rounds">Rounds (1-10)</Label>
            <Input
              id="rounds"
              type="number"
              min={1}
              max={10}
              value={settings.roundsPerGame}
              onChange={(e) => setSettings({
                ...settings,
                roundsPerGame: parseInt(e.target.value)
              })}
            />
          </div>
          
          <div>
            <Label htmlFor="timePerRound">Time per Round (30-300 seconds)</Label>
            <Input
              id="timePerRound"
              type="number"
              min={30}
              max={300}
              step={15}
              value={settings.timePerRound}
              onChange={(e) => setSettings({
                ...settings,
                timePerRound: parseInt(e.target.value)
              })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="isPrivate">Private Room</Label>
            <Switch
              id="isPrivate"
              checked={settings.isPrivate}
              onCheckedChange={(checked) => setSettings({
                ...settings,
                isPrivate: checked
              })}
            />
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1">
              Save Settings
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 5. Create Join Room Component

Update `src/components/landing/JoinRoomForm.tsx`:

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export function JoinRoomForm() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const joinRoom = useMutation(api.rooms.joinRoom);
  const navigate = useNavigate();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const { roomId } = await joinRoom({ code: code.toUpperCase() });
      navigate(`/room/${roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join room");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Join a Room</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder="Enter room code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              disabled={loading}
              className="text-center text-2xl font-mono"
            />
          </div>
          
          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}
          
          <Button
            type="submit"
            className="w-full"
            disabled={code.length !== 6 || loading}
          >
            {loading ? "Joining..." : "Join Room"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

## Testing Instructions

### 1. Test Room Creation
```typescript
const { roomId, code } = await convex.mutation(api.rooms.createRoom, {
  name: "Test Room",
  settings: {
    maxPlayers: 4,
    roundsPerGame: 3
  }
});
console.log(`Created room ${code} with ID ${roomId}`);
```

### 2. Test Joining Room
```typescript
const { roomId } = await convex.mutation(api.rooms.joinRoom, {
  code: "ABC123" // Use actual room code
});
console.log(`Joined room ${roomId}`);
```

### 3. Test Room State Subscription
```typescript
// Subscribe to room updates
const unsubscribe = convex.onUpdate(api.rooms.getRoomState, 
  { roomId: "..." }, 
  (state) => console.log("Room state:", state)
);
```

## Debug Commands

```bash
# View all rooms
mcp_convex_data --deploymentSelector dev --tableName rooms --order desc

# View players in rooms
mcp_convex_data --deploymentSelector dev --tableName players --order asc

# Test room functions
mcp_convex_run --deploymentSelector dev --functionName "rooms:getPublicRooms" --args '{}'
```

## Bundle Optimization Verification

After implementing room management, verify optimization goals are met:

### 1. Bundle Size Check
```bash
# Build and analyze bundle
npm run build

# Check chunk sizes
ls -lh dist/assets/*.js

# Expected improvements:
# - Room components in separate chunks (<150KB each)
# - Dynamic icon loading reduces initial bundle
# - Total size reduction of 75-100KB
```

### 2. Performance Testing
```typescript
// Test lazy loading performance
1. Open DevTools → Network tab  
2. Navigate to room page
3. Verify room components load on-demand
4. Check dynamic icon loading works
5. Measure time-to-interactive
```

### 3. Optimization Checklist
- [ ] Room page uses lazy-loaded components
- [ ] Icons use DynamicIcon component (no direct lucide imports)
- [ ] RoomSettings loads in separate chunk
- [ ] Loading states work properly during code splitting
- [ ] No console errors during lazy loading
- [ ] Bundle analyzer shows proper separation

## Common Issues & Solutions

### Issue: "Room not found" when joining
**Solution:** Ensure code is uppercase and matches exactly

### Issue: Cannot start game
**Solution:** Need at least 2 connected players

### Issue: Players show as disconnected
**Solution:** Implement presence system (coming in later step)

### Issue: Lazy loading components fail
**Solution:** Check dynamic imports and Suspense boundaries

### Issue: Icons not loading
**Solution:** Verify DynamicIcon component and lucide-react dynamic import

## Success Criteria

### Functional Requirements
- [ ] Can create rooms with unique codes
- [ ] Can join rooms by code
- [ ] Real-time player list updates
- [ ] Host can kick players
- [ ] Host can update settings
- [ ] Room shows correct player count and status
- [ ] Can leave and rejoin rooms

### Optimization Requirements
- [ ] Bundle size reduced by 75-100KB from lazy loading
- [ ] Room components split into separate chunks
- [ ] Dynamic icon loading implemented
- [ ] Loading states work during code splitting
- [ ] No performance regression on navigation
- [ ] Bundle analysis shows proper separation

## Next Steps
Once room management is working AND optimization verified:
1. Run `npm run build` and verify bundle size improvements
2. Test lazy loading in browser DevTools
3. Test with multiple users joining same room
4. Verify real-time updates work
5. **Document bundle size improvements achieved**
6. Proceed to **03-game-mechanics-instructions.md**
