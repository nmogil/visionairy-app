# Step 5: Real-time Presence & Updates

## Objective
Implement real-time presence tracking, connection status, and live updates across all game components.

## Prerequisites
- ✅ Completed Steps 0-4 (Setup through AI Integration)
- ✅ Game flow working with AI images
- ✅ Real-time subscriptions working

## Deliverables
- ✅ User presence tracking (online/idle/offline)
- ✅ Connection status in rooms
- ✅ Automatic reconnection handling
- ✅ Real-time typing indicators
- ✅ Live cursor tracking in voting
- ✅ Presence cleanup via cron jobs

## Implementation Steps

### 1. Add Presence Tables to Schema

Update `convex/schema.ts`:

```typescript
// Add to existing schema
presence: defineTable({
  userId: v.id("users"),
  roomId: v.optional(v.id("rooms")),
  status: v.union(
    v.literal("online"),
    v.literal("idle"),
    v.literal("offline")
  ),
  lastPing: v.number(),
  currentPage: v.optional(v.string()),
  currentActivity: v.optional(v.string()), // "typing", "voting", etc.
  metadata: v.optional(v.object({
    cursorPosition: v.optional(v.object({
      x: v.number(),
      y: v.number(),
    })),
    typingInField: v.optional(v.string()),
  })),
})
  .index("by_user", ["userId"])
  .index("by_room", ["roomId"])
  .index("by_status", ["status"])
  .index("by_last_ping", ["lastPing"]),

// Typing indicators for prompts
typingIndicators: defineTable({
  roomId: v.id("rooms"),
  playerId: v.id("players"),
  isTyping: v.boolean(),
  lastUpdate: v.number(),
})
  .index("by_room", ["roomId"])
  .index("by_room_and_player", ["roomId", "playerId"]),
```

### 2. Create Presence Management

Create `convex/presence.ts`:

```typescript
import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Update user presence
export const updatePresence = mutation({
  args: {
    roomId: v.optional(v.id("rooms")),
    currentPage: v.optional(v.string()),
    currentActivity: v.optional(v.string()),
    metadata: v.optional(v.object({
      cursorPosition: v.optional(v.object({
        x: v.number(),
        y: v.number(),
      })),
      typingInField: v.optional(v.string()),
    })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    
    const userQuery = identity.email
      ? ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", identity.email))
      : ctx.db.query("users").filter((q) => q.eq(q.field("_id"), identity.subject));
    
    const user = await userQuery.unique();
    if (!user) return null;
    
    // Find or create presence record
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
      
    const now = Date.now();
    const presenceData = {
      roomId: args.roomId,
      status: "online" as const,
      lastPing: now,
      currentPage: args.currentPage,
      currentActivity: args.currentActivity,
      metadata: args.metadata,
    };
    
    if (existing) {
      await ctx.db.patch(existing._id, presenceData);
    } else {
      await ctx.db.insert("presence", {
        userId: user._id,
        ...presenceData,
      });
    }
    
    // Update player connection status if in room
    if (args.roomId) {
      const player = await ctx.db
        .query("players")
        .withIndex("by_room_and_user", (q) =>
          q.eq("roomId", args.roomId).eq("userId", user._id)
        )
        .unique();
        
      if (player && player.status === "disconnected") {
        await ctx.db.patch(player._id, {
          status: "connected",
          lastSeenAt: now,
        });
      }
    }
    
    // Update user's last active time
    await ctx.db.patch(user._id, {
      lastActiveAt: now,
    });
    
    return null;
  },
});

// Update typing indicator
export const updateTypingIndicator = mutation({
  args: {
    roomId: v.id("rooms"),
    isTyping: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    
    const userQuery = identity.email
      ? ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", identity.email))
      : ctx.db.query("users").filter((q) => q.eq(q.field("_id"), identity.subject));
    
    const user = await userQuery.unique();
    if (!user) return null;
    
    const player = await ctx.db
      .query("players")
      .withIndex("by_room_and_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", user._id)
      )
      .unique();
      
    if (!player) return null;
    
    const existing = await ctx.db
      .query("typingIndicators")
      .withIndex("by_room_and_player", (q) =>
        q.eq("roomId", args.roomId).eq("playerId", player._id)
      )
      .unique();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        isTyping: args.isTyping,
        lastUpdate: Date.now(),
      });
    } else {
      await ctx.db.insert("typingIndicators", {
        roomId: args.roomId,
        playerId: player._id,
        isTyping: args.isTyping,
        lastUpdate: Date.now(),
      });
    }
    
    return null;
  },
});

// Get room presence
export const getRoomPresence = query({
  args: {
    roomId: v.id("rooms"),
  },
  returns: v.array(v.object({
    userId: v.id("users"),
    username: v.string(),
    displayName: v.string(),
    status: v.string(),
    lastSeen: v.number(),
    currentActivity: v.optional(v.string()),
    isTyping: v.boolean(),
    cursorPosition: v.optional(v.object({
      x: v.number(),
      y: v.number(),
    })),
  })),
  handler: async (ctx, args) => {
    const now = Date.now();
    const ACTIVE_THRESHOLD = 30000; // 30 seconds
    const IDLE_THRESHOLD = 120000; // 2 minutes
    
    // Get all players in room
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.neq(q.field("status"), "kicked"))
      .collect();
    
    const presenceInfo = await Promise.all(
      players.map(async (player) => {
        const user = await ctx.db.get(player.userId);
        if (!user) return null;
        
        const presence = await ctx.db
          .query("presence")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .unique();
        
        const typingIndicator = await ctx.db
          .query("typingIndicators")
          .withIndex("by_room_and_player", (q) =>
            q.eq("roomId", args.roomId).eq("playerId", player._id)
          )
          .unique();
        
        // Determine status based on last ping
        let status = "offline";
        if (presence) {
          const timeSinceLastPing = now - presence.lastPing;
          if (timeSinceLastPing < ACTIVE_THRESHOLD) {
            status = "online";
          } else if (timeSinceLastPing < IDLE_THRESHOLD) {
            status = "idle";
          }
        }
        
        return {
          userId: user._id,
          username: user.username ?? "Guest",
          displayName: user.displayName ?? user.username ?? "Guest",
          status,
          lastSeen: presence?.lastPing ?? player.lastSeenAt,
          currentActivity: presence?.currentActivity,
          isTyping: typingIndicator?.isTyping && 
                   (now - typingIndicator.lastUpdate < 5000), // Typing expires after 5s
          cursorPosition: presence?.metadata?.cursorPosition,
        };
      })
    );
    
    return presenceInfo.filter(p => p !== null) as any;
  },
});

// Get global online users
export const getOnlineUsers = query({
  args: {},
  returns: v.array(v.object({
    userId: v.id("users"),
    username: v.string(),
    displayName: v.string(),
    currentPage: v.optional(v.string()),
    inRoom: v.optional(v.id("rooms")),
  })),
  handler: async (ctx) => {
    const now = Date.now();
    const ONLINE_THRESHOLD = 60000; // 1 minute
    
    const recentPresence = await ctx.db
      .query("presence")
      .withIndex("by_last_ping")
      .filter((q) => q.gte(q.field("lastPing"), now - ONLINE_THRESHOLD))
      .collect();
    
    const onlineUsers = await Promise.all(
      recentPresence.map(async (presence) => {
        const user = await ctx.db.get(presence.userId);
        if (!user) return null;
        
        return {
          userId: user._id,
          username: user.username ?? "Guest",
          displayName: user.displayName ?? user.username ?? "Guest",
          currentPage: presence.currentPage,
          inRoom: presence.roomId,
        };
      })
    );
    
    return onlineUsers.filter(u => u !== null) as any;
  },
});

// Clean up stale presence (internal)
export const cleanupStalePresence = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const STALE_THRESHOLD = 300000; // 5 minutes
    const OFFLINE_THRESHOLD = 120000; // 2 minutes
    
    // Find stale presence records
    const allPresence = await ctx.db
      .query("presence")
      .collect();
    
    for (const presence of allPresence) {
      const timeSinceLastPing = now - presence.lastPing;
      
      if (timeSinceLastPing > STALE_THRESHOLD) {
        // Delete very old presence records
        await ctx.db.delete(presence._id);
        
        // Disconnect player if in room
        if (presence.roomId) {
          const player = await ctx.db
            .query("players")
            .withIndex("by_room_and_user", (q) =>
              q.eq("roomId", presence.roomId).eq("userId", presence.userId)
            )
            .unique();
            
          if (player && player.status === "connected") {
            await ctx.db.patch(player._id, {
              status: "disconnected",
            });
          }
        }
      } else if (timeSinceLastPing > OFFLINE_THRESHOLD && presence.status !== "offline") {
        // Mark as offline
        await ctx.db.patch(presence._id, {
          status: "offline",
        });
      }
    }
    
    // Clean up old typing indicators
    const oldTypingIndicators = await ctx.db
      .query("typingIndicators")
      .filter((q) => q.lt(q.field("lastUpdate"), now - 10000)) // 10 seconds old
      .collect();
    
    for (const indicator of oldTypingIndicators) {
      await ctx.db.delete(indicator._id);
    }
    
    return null;
  },
});
```

### 3. Set Up Cron Jobs

Create `convex/crons.ts`:

```typescript
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up stale presence every minute
crons.interval(
  "cleanup presence",
  { minutes: 1 },
  internal.presence.cleanupStalePresence,
  {}
);

// Clean up finished games every hour
crons.interval(
  "cleanup finished games",
  { hours: 1 },
  internal.maintenance.cleanupFinishedGames,
  {}
);

export default crons;
```

### 4. Create Maintenance Functions

Create `convex/maintenance.ts`:

```typescript
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Clean up old finished games
export const cleanupFinishedGames = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;
    
    // Find games finished more than 1 day ago
    const oldGames = await ctx.db
      .query("rooms")
      .withIndex("by_status", (q) => q.eq("status", "finished"))
      .filter((q) => q.lt(q.field("finishedAt"), now - ONE_DAY))
      .collect();
    
    for (const room of oldGames) {
      // Delete associated data
      const players = await ctx.db
        .query("players")
        .withIndex("by_room", (q) => q.eq("roomId", room._id))
        .collect();
      
      for (const player of players) {
        await ctx.db.delete(player._id);
      }
      
      const rounds = await ctx.db
        .query("rounds")
        .withIndex("by_room", (q) => q.eq("roomId", room._id))
        .collect();
      
      for (const round of rounds) {
        // Delete prompts
        const prompts = await ctx.db
          .query("prompts")
          .withIndex("by_round", (q) => q.eq("roundId", round._id))
          .collect();
        
        for (const prompt of prompts) {
          // Delete images
          const images = await ctx.db
            .query("generatedImages")
            .withIndex("by_prompt", (q) => q.eq("promptId", prompt._id))
            .collect();
          
          for (const image of images) {
            await ctx.db.delete(image._id);
          }
          
          await ctx.db.delete(prompt._id);
        }
        
        // Delete votes
        const votes = await ctx.db
          .query("votes")
          .withIndex("by_round", (q) => q.eq("roundId", round._id))
          .collect();
        
        for (const vote of votes) {
          await ctx.db.delete(vote._id);
        }
        
        await ctx.db.delete(round._id);
      }
      
      // Finally delete the room
      await ctx.db.delete(room._id);
    }
    
    console.log(`Cleaned up ${oldGames.length} old games`);
    return null;
  },
});
```

### 5. Create React Hooks

Create `src/hooks/usePresence.ts`:

```typescript
import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface UsePresenceOptions {
  roomId?: Id<"rooms">;
  updateInterval?: number;
}

export function usePresence(options: UsePresenceOptions = {}) {
  const { roomId, updateInterval = 20000 } = options;
  const updatePresence = useMutation(api.presence.updatePresence);
  const intervalRef = useRef<NodeJS.Timeout>();
  
  useEffect(() => {
    const updatePresenceData = () => {
      updatePresence({
        roomId,
        currentPage: window.location.pathname,
      }).catch(console.error);
    };
    
    // Initial update
    updatePresenceData();
    
    // Set up interval
    intervalRef.current = setInterval(updatePresenceData, updateInterval);
    
    // Update on visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updatePresenceData();
      }
    };
    
    // Update on focus
    const handleFocus = () => {
      updatePresenceData();
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    
    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [roomId, updateInterval, updatePresence]);
  
  return {
    updateActivity: (activity: string, metadata?: any) => {
      updatePresence({
        roomId,
        currentPage: window.location.pathname,
        currentActivity: activity,
        metadata,
      }).catch(console.error);
    },
  };
}
```

Create `src/hooks/useTypingIndicator.ts`:

```typescript
import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export function useTypingIndicator(roomId: Id<"rooms">) {
  const [isTyping, setIsTyping] = useState(false);
  const updateTyping = useMutation(api.presence.updateTypingIndicator);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      updateTyping({ roomId, isTyping: true }).catch(console.error);
    }
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set new timeout to stop typing
    timeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      updateTyping({ roomId, isTyping: false }).catch(console.error);
    }, 2000);
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (isTyping) {
        updateTyping({ roomId, isTyping: false }).catch(console.error);
      }
    };
  }, []);
  
  return { handleTyping, isTyping };
}
```

### 6. Update UI Components with Presence

Update `src/features/game/phases/PromptPhase.tsx`:

```tsx
import { useTypingIndicator } from "../../../hooks/useTypingIndicator";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export function PromptPhase({ roomId, question }: PromptPhaseProps) {
  const { handleTyping } = useTypingIndicator(roomId);
  const presence = useQuery(api.presence.getRoomPresence, { roomId });
  
  const typingPlayers = presence?.filter(p => p.isTyping) ?? [];
  
  return (
    <div>
      <h2>{question}</h2>
      
      <textarea
        onChange={(e) => {
          handleTyping();
          // ... handle prompt text
        }}
        placeholder="Enter your creative prompt..."
      />
      
      {typingPlayers.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {typingPlayers.map(p => p.displayName).join(", ")} 
          {typingPlayers.length === 1 ? " is" : " are"} typing...
        </div>
      )}
    </div>
  );
}
```

### 7. Add Connection Status Indicator

Create `src/components/ConnectionStatus.tsx`:

```tsx
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Badge } from "./ui/badge";
import { Wifi, WifiOff, Circle } from "lucide-react";

export function ConnectionStatus() {
  const onlineUsers = useQuery(api.presence.getOnlineUsers);
  const isConnected = onlineUsers !== undefined;
  
  return (
    <div className="flex items-center gap-2">
      {isConnected ? (
        <>
          <Wifi className="h-4 w-4 text-green-500" />
          <span className="text-sm">
            {onlineUsers?.length ?? 0} online
          </span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-red-500" />
          <span className="text-sm">Connecting...</span>
        </>
      )}
    </div>
  );
}
```

## Testing Instructions

### 1. Test Presence Updates
```typescript
// Monitor presence in console
const presence = await convex.query(api.presence.getRoomPresence, {
  roomId: "..."
});
console.log("Room presence:", presence);
```

### 2. Test Typing Indicators
```typescript
// Simulate typing
await convex.mutation(api.presence.updateTypingIndicator, {
  roomId: "...",
  isTyping: true
});
```

### 3. Test Connection Recovery
- Open app in two tabs
- Close one tab
- Check player shows as disconnected
- Reopen tab
- Verify reconnection

## Debug Commands

```bash
# View presence data
mcp_convex_data --deploymentSelector dev --tableName presence --order desc

# Check typing indicators
mcp_convex_data --deploymentSelector dev --tableName typingIndicators --order desc

# Monitor cron jobs
mcp_convex_functionSpec --deploymentSelector dev | grep cron
```

## Common Issues & Solutions

### Issue: Presence not updating
**Solution:** Check usePresence hook is mounted, verify intervals

### Issue: Players stuck as "online"
**Solution:** Ensure cron job is running, check cleanup function

### Issue: Typing indicator lag
**Solution:** Reduce debounce time, optimize query subscriptions

## Success Criteria
- [ ] Players show online/offline status correctly
- [ ] Typing indicators appear in real-time
- [ ] Connection recovery works smoothly
- [ ] Stale presence is cleaned up
- [ ] No memory leaks from intervals
- [ ] Performance remains smooth with presence

## Next Steps
Once presence system works:
1. Test with multiple concurrent users
2. Monitor performance impact
3. Proceed to **06-dashboard-stats-instructions.md**
