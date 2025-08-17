# Step 6: Dashboard & Statistics System

## Objective
Implement comprehensive game statistics, leaderboards, and user dashboard with historical data tracking.

## Prerequisites
- ✅ Completed Steps 0-5 (Full game functionality)
- ✅ Games can be played end-to-end
- ✅ User authentication working

## Deliverables
- ✅ User statistics tracking
- ✅ Game history and replays
- ✅ Global and friend leaderboards
- ✅ Achievement system
- ✅ Analytics dashboard
- ✅ Performance metrics

## Implementation Steps

### 1. Add Statistics Tables to Schema

Update `convex/schema.ts`:

```typescript
// Add to existing schema
gameStats: defineTable({
  roomId: v.id("rooms"),
  winnerId: v.id("users"),
  winnerScore: v.number(),
  totalPlayers: v.number(),
  totalRounds: v.number(),
  duration: v.number(), // in milliseconds
  averageScore: v.number(),
  completedAt: v.number(),
  gameData: v.object({
    roomName: v.string(),
    settings: v.object({
      roundsPerGame: v.number(),
      timePerRound: v.number(),
    }),
  }),
})
  .index("by_winner", ["winnerId"])
  .index("by_completed", ["completedAt"])
  .index("by_room", ["roomId"]),

userStats: defineTable({
  userId: v.id("users"),
  // Cumulative stats
  totalGamesPlayed: v.number(),
  totalGamesWon: v.number(),
  totalScore: v.number(),
  bestScore: v.number(),
  averageScore: v.number(),
  winRate: v.number(),
  
  // Activity stats
  totalPrompts: v.number(),
  totalVotes: v.number(),
  totalImagesGenerated: v.number(),
  favoriteCategory: v.optional(v.string()),
  
  // Streaks
  currentStreak: v.number(),
  bestStreak: v.number(),
  lastPlayedAt: v.number(),
  
  // Social stats
  favoriteOpponent: v.optional(v.id("users")),
  totalUniqueOpponents: v.number(),
  
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_total_score", ["totalScore"])
  .index("by_win_rate", ["winRate"])
  .index("by_games_played", ["totalGamesPlayed"]),

achievements: defineTable({
  userId: v.id("users"),
  achievementId: v.string(),
  unlockedAt: v.number(),
  progress: v.optional(v.number()),
})
  .index("by_user", ["userId"])
  .index("by_user_and_achievement", ["userId", "achievementId"]),

leaderboardEntries: defineTable({
  userId: v.id("users"),
  period: v.union(
    v.literal("daily"),
    v.literal("weekly"),
    v.literal("monthly"),
    v.literal("allTime")
  ),
  score: v.number(),
  rank: v.number(),
  date: v.string(), // YYYY-MM-DD format
  updatedAt: v.number(),
})
  .index("by_period_and_score", ["period", "score"])
  .index("by_user_and_period", ["userId", "period"])
  .index("by_date", ["date"]),
```

### 2. Create Statistics Functions

Create `convex/stats.ts`:

```typescript
import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Achievement definitions
const ACHIEVEMENTS = {
  firstWin: { id: "first_win", name: "First Victory", description: "Win your first game" },
  speedDemon: { id: "speed_demon", name: "Speed Demon", description: "Submit prompt in under 10 seconds" },
  perfectRound: { id: "perfect_round", name: "Perfect Round", description: "Get all votes in a round" },
  comeback: { id: "comeback", name: "Comeback Kid", description: "Win after being in last place" },
  creative: { id: "creative", name: "Creative Genius", description: "Generate 100 images" },
  social: { id: "social", name: "Social Butterfly", description: "Play with 20 different people" },
  dedicated: { id: "dedicated", name: "Dedicated Player", description: "Play 7 days in a row" },
  highScore: { id: "high_score", name: "High Scorer", description: "Score over 500 points in one game" },
};

// Update statistics after game ends
export const updateGameStats = internalMutation({
  args: {
    roomId: v.id("rooms"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room || room.status !== "finished") return null;
    
    // Get all players and their scores
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.neq(q.field("status"), "kicked"))
      .collect();
    
    if (players.length === 0) return null;
    
    // Sort by score to find winner
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    const winner = sortedPlayers[0];
    const totalScore = players.reduce((sum, p) => sum + p.score, 0);
    const averageScore = Math.floor(totalScore / players.length);
    
    // Calculate game duration
    const duration = room.finishedAt! - room.startedAt!;
    
    // Create game stats record
    await ctx.db.insert("gameStats", {
      roomId: args.roomId,
      winnerId: winner.userId,
      winnerScore: winner.score,
      totalPlayers: players.length,
      totalRounds: room.settings.roundsPerGame,
      duration,
      averageScore,
      completedAt: Date.now(),
      gameData: {
        roomName: room.name,
        settings: {
          roundsPerGame: room.settings.roundsPerGame,
          timePerRound: room.settings.timePerRound,
        },
      },
    });
    
    // Update each player's stats
    for (let i = 0; i < sortedPlayers.length; i++) {
      const player = sortedPlayers[i];
      const isWinner = i === 0;
      
      // Get player's prompts and votes count
      const rounds = await ctx.db
        .query("rounds")
        .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
        .collect();
      
      let promptCount = 0;
      let voteCount = 0;
      
      for (const round of rounds) {
        const prompts = await ctx.db
          .query("prompts")
          .withIndex("by_round_and_player", (q) =>
            q.eq("roundId", round._id).eq("playerId", player._id)
          )
          .collect();
        promptCount += prompts.length;
        
        const votes = await ctx.db
          .query("votes")
          .withIndex("by_round_and_voter", (q) =>
            q.eq("roundId", round._id).eq("voterId", player._id)
          )
          .collect();
        voteCount += votes.length;
      }
      
      // Update or create user stats
      await updateUserStats(ctx, {
        userId: player.userId,
        gameResult: {
          won: isWinner,
          score: player.score,
          position: i + 1,
          totalPlayers: players.length,
          promptsSubmitted: promptCount,
          votesCast: voteCount,
        },
      });
      
      // Check for achievements
      await checkAchievements(ctx, {
        userId: player.userId,
        gameData: {
          won: isWinner,
          score: player.score,
          position: i + 1,
          duration,
        },
      });
    }
    
    // Update leaderboards
    await ctx.scheduler.runAfter(0, internal.stats.updateLeaderboards, {
      playerIds: players.map(p => p.userId),
    });
    
    return null;
  },
});

// Helper function to update user stats
async function updateUserStats(
  ctx: any,
  args: {
    userId: Id<"users">;
    gameResult: {
      won: boolean;
      score: number;
      position: number;
      totalPlayers: number;
      promptsSubmitted: number;
      votesCast: number;
    };
  }
) {
  const existing = await ctx.db
    .query("userStats")
    .withIndex("by_user", (q) => q.eq("userId", args.userId))
    .unique();
  
  const now = Date.now();
  
  if (existing) {
    const newTotalGames = existing.totalGamesPlayed + 1;
    const newTotalWins = existing.totalGamesWon + (args.gameResult.won ? 1 : 0);
    const newTotalScore = existing.totalScore + args.gameResult.score;
    const newBestScore = Math.max(existing.bestScore, args.gameResult.score);
    const newAverageScore = Math.floor(newTotalScore / newTotalGames);
    const newWinRate = (newTotalWins / newTotalGames) * 100;
    
    // Update streak
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const isConsecutive = existing.lastPlayedAt > oneDayAgo;
    const newCurrentStreak = isConsecutive ? existing.currentStreak + 1 : 1;
    const newBestStreak = Math.max(existing.bestStreak, newCurrentStreak);
    
    await ctx.db.patch(existing._id, {
      totalGamesPlayed: newTotalGames,
      totalGamesWon: newTotalWins,
      totalScore: newTotalScore,
      bestScore: newBestScore,
      averageScore: newAverageScore,
      winRate: newWinRate,
      totalPrompts: existing.totalPrompts + args.gameResult.promptsSubmitted,
      totalVotes: existing.totalVotes + args.gameResult.votesCast,
      totalImagesGenerated: existing.totalImagesGenerated + args.gameResult.promptsSubmitted,
      currentStreak: newCurrentStreak,
      bestStreak: newBestStreak,
      lastPlayedAt: now,
      updatedAt: now,
    });
  } else {
    // Create new stats record
    await ctx.db.insert("userStats", {
      userId: args.userId,
      totalGamesPlayed: 1,
      totalGamesWon: args.gameResult.won ? 1 : 0,
      totalScore: args.gameResult.score,
      bestScore: args.gameResult.score,
      averageScore: args.gameResult.score,
      winRate: args.gameResult.won ? 100 : 0,
      totalPrompts: args.gameResult.promptsSubmitted,
      totalVotes: args.gameResult.votesCast,
      totalImagesGenerated: args.gameResult.promptsSubmitted,
      currentStreak: 1,
      bestStreak: 1,
      lastPlayedAt: now,
      totalUniqueOpponents: args.gameResult.totalPlayers - 1,
      updatedAt: now,
    });
  }
  
  // Update user's main record
  const user = await ctx.db.get(args.userId);
  if (user) {
    await ctx.db.patch(args.userId, {
      gamesPlayed: (user.gamesPlayed ?? 0) + 1,
      gamesWon: (user.gamesWon ?? 0) + (args.gameResult.won ? 1 : 0),
      totalScore: (user.totalScore ?? 0) + args.gameResult.score,
    });
  }
}

// Check and award achievements
async function checkAchievements(
  ctx: any,
  args: {
    userId: Id<"users">;
    gameData: {
      won: boolean;
      score: number;
      position: number;
      duration: number;
    };
  }
) {
  const userStats = await ctx.db
    .query("userStats")
    .withIndex("by_user", (q) => q.eq("userId", args.userId))
    .unique();
  
  if (!userStats) return;
  
  // Check each achievement
  const achievementsToCheck = [
    {
      id: ACHIEVEMENTS.firstWin.id,
      condition: args.gameData.won && userStats.totalGamesWon === 1,
    },
    {
      id: ACHIEVEMENTS.highScore.id,
      condition: args.gameData.score > 500,
    },
    {
      id: ACHIEVEMENTS.dedicated.id,
      condition: userStats.currentStreak >= 7,
    },
    {
      id: ACHIEVEMENTS.creative.id,
      condition: userStats.totalImagesGenerated >= 100,
    },
  ];
  
  for (const achievement of achievementsToCheck) {
    if (achievement.condition) {
      const existing = await ctx.db
        .query("achievements")
        .withIndex("by_user_and_achievement", (q) =>
          q.eq("userId", args.userId).eq("achievementId", achievement.id)
        )
        .unique();
      
      if (!existing) {
        await ctx.db.insert("achievements", {
          userId: args.userId,
          achievementId: achievement.id,
          unlockedAt: Date.now(),
        });
      }
    }
  }
}

// Get user dashboard data
export const getDashboardData = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      profile: v.object({
        username: v.string(),
        displayName: v.string(),
        avatarUrl: v.optional(v.string()),
        joinedAt: v.optional(v.number()),
      }),
      stats: v.object({
        gamesPlayed: v.number(),
        gamesWon: v.number(),
        winRate: v.number(),
        totalScore: v.number(),
        bestScore: v.number(),
        averageScore: v.number(),
        currentStreak: v.number(),
        rank: v.optional(v.number()),
      }),
      recentGames: v.array(v.object({
        _id: v.id("gameStats"),
        roomName: v.string(),
        position: v.number(),
        score: v.number(),
        totalPlayers: v.number(),
        won: v.boolean(),
        completedAt: v.number(),
      })),
      achievements: v.array(v.object({
        id: v.string(),
        name: v.string(),
        description: v.string(),
        unlockedAt: v.optional(v.number()),
        progress: v.optional(v.number()),
      })),
    })
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    
    const userQuery = identity.email
      ? ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", identity.email))
      : ctx.db.query("users").filter((q) => q.eq(q.field("_id"), identity.subject));
    
    const user = await userQuery.unique();
    if (!user) return null;
    
    // Get user stats
    const stats = await ctx.db
      .query("userStats")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    
    // Get recent games
    const recentGames = await ctx.db
      .query("gameStats")
      .withIndex("by_winner", (q) => q.eq("winnerId", user._id))
      .order("desc")
      .take(5);
    
    // Get all games where user participated
    const allUserGames: typeof recentGames = [];
    const gameRooms = await ctx.db
      .query("players")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    
    for (const playerRecord of gameRooms.slice(-10)) {
      const gameStats = await ctx.db
        .query("gameStats")
        .withIndex("by_room", (q) => q.eq("roomId", playerRecord.roomId))
        .unique();
      
      if (gameStats) {
        allUserGames.push(gameStats);
      }
    }
    
    // Sort and get recent games with position
    const recentGamesWithPosition = await Promise.all(
      allUserGames
        .sort((a, b) => b.completedAt - a.completedAt)
        .slice(0, 5)
        .map(async (game) => {
          const players = await ctx.db
            .query("players")
            .withIndex("by_room", (q) => q.eq("roomId", game.roomId))
            .collect();
          
          const sortedPlayers = players.sort((a, b) => b.score - a.score);
          const userPlayer = sortedPlayers.find(p => p.userId === user._id);
          const position = userPlayer 
            ? sortedPlayers.indexOf(userPlayer) + 1
            : game.totalPlayers;
          
          return {
            _id: game._id,
            roomName: game.gameData.roomName,
            position,
            score: userPlayer?.score ?? 0,
            totalPlayers: game.totalPlayers,
            won: game.winnerId === user._id,
            completedAt: game.completedAt,
          };
        })
    );
    
    // Get user's rank
    let rank: number | undefined;
    if (stats) {
      const higherScorers = await ctx.db
        .query("userStats")
        .withIndex("by_total_score")
        .filter((q) => q.gt(q.field("totalScore"), stats.totalScore))
        .collect();
      rank = higherScorers.length + 1;
    }
    
    // Get achievements
    const userAchievements = await ctx.db
      .query("achievements")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    
    const achievementsList = Object.values(ACHIEVEMENTS).map(achievement => {
      const unlocked = userAchievements.find(a => a.achievementId === achievement.id);
      return {
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        unlockedAt: unlocked?.unlockedAt,
        progress: unlocked?.progress,
      };
    });
    
    return {
      profile: {
        username: user.username ?? "Guest",
        displayName: user.displayName ?? user.username ?? "Guest",
        avatarUrl: undefined, // TODO: Add avatar support
        joinedAt: user._creationTime,
      },
      stats: {
        gamesPlayed: stats?.totalGamesPlayed ?? 0,
        gamesWon: stats?.totalGamesWon ?? 0,
        winRate: stats?.winRate ?? 0,
        totalScore: stats?.totalScore ?? 0,
        bestScore: stats?.bestScore ?? 0,
        averageScore: stats?.averageScore ?? 0,
        currentStreak: stats?.currentStreak ?? 0,
        rank,
      },
      recentGames: recentGamesWithPosition,
      achievements: achievementsList,
    };
  },
});

// Get leaderboard
export const getLeaderboard = query({
  args: {
    period: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("allTime")
    ),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    rank: v.number(),
    userId: v.id("users"),
    username: v.string(),
    displayName: v.string(),
    score: v.number(),
    gamesPlayed: v.number(),
    winRate: v.number(),
    isCurrentUser: v.boolean(),
  })),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    const identity = await ctx.auth.getUserIdentity();
    const currentUserId = identity
      ? await (identity.email
          ? ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", identity.email)).unique()
          : ctx.db.query("users").filter((q) => q.eq(q.field("_id"), identity.subject)).unique())
          .then(u => u?._id)
      : null;
    
    // Get top users by period
    let topUsers;
    if (args.period === "allTime") {
      topUsers = await ctx.db
        .query("userStats")
        .withIndex("by_total_score")
        .order("desc")
        .take(limit);
    } else {
      // Get period-specific leaderboard
      const date = getDateForPeriod(args.period);
      const entries = await ctx.db
        .query("leaderboardEntries")
        .withIndex("by_period_and_score", (q) => q.eq("period", args.period))
        .order("desc")
        .take(limit);
      
      topUsers = await Promise.all(
        entries.map(async (entry) => {
          return await ctx.db
            .query("userStats")
            .withIndex("by_user", (q) => q.eq("userId", entry.userId))
            .unique();
        })
      ).then(results => results.filter(r => r !== null));
    }
    
    // Format leaderboard
    const leaderboard = await Promise.all(
      topUsers.map(async (stats, index) => {
        const user = await ctx.db.get(stats!.userId);
        return {
          rank: index + 1,
          userId: stats!.userId,
          username: user?.username ?? "Unknown",
          displayName: user?.displayName ?? user?.username ?? "Unknown",
          score: stats!.totalScore,
          gamesPlayed: stats!.totalGamesPlayed,
          winRate: stats!.winRate,
          isCurrentUser: stats!.userId === currentUserId,
        };
      })
    );
    
    return leaderboard;
  },
});

// Helper function to get date for period
function getDateForPeriod(period: "daily" | "weekly" | "monthly"): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  
  switch (period) {
    case "daily":
      return `${year}-${month}-${day}`;
    case "weekly":
      const weekNumber = getWeekNumber(now);
      return `${year}-W${String(weekNumber).padStart(2, "0")}`;
    case "monthly":
      return `${year}-${month}`;
  }
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Update leaderboards (internal)
export const updateLeaderboards = internalMutation({
  args: {
    playerIds: v.array(v.id("users")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Implementation for periodic leaderboard updates
    // This would be called by a cron job typically
    return null;
  },
});
```

### 3. Create Dashboard Hooks

Create `src/hooks/use-dashboard.ts`:

```typescript
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "./use-auth";
import { useMemo } from "react";

export type Period = "daily" | "weekly" | "monthly" | "allTime";

export function useDashboard() {
  const { user } = useAuth();
  const dashboardData = useQuery(api.stats.getDashboardData);
  const achievements = useQuery(api.stats.getUserAchievements);
  
  const getLeaderboard = (period: Period = "allTime", limit: number = 10) => {
    return useQuery(api.stats.getLeaderboard, { period, limit });
  };
  
  const stats = useMemo(() => {
    if (!dashboardData) return null;
    
    return {
      totalGames: dashboardData.stats?.gamesPlayed || 0,
      totalWins: dashboardData.stats?.gamesWon || 0,
      winRate: dashboardData.stats?.winRate || 0,
      currentStreak: dashboardData.stats?.currentStreak || 0,
      bestStreak: dashboardData.stats?.bestStreak || 0,
      favoriteQuestionType: dashboardData.stats?.favoriteQuestionType || "N/A",
      totalVotes: dashboardData.stats?.totalVotes || 0,
      perfectGames: dashboardData.stats?.perfectGames || 0,
    };
  }, [dashboardData]);
  
  const recentGames = dashboardData?.recentGames || [];
  const topPlayers = dashboardData?.topPlayers || [];
  
  const unlockedAchievements = achievements?.filter(a => a.unlockedAt) || [];
  const lockedAchievements = achievements?.filter(a => !a.unlockedAt) || [];
  
  return {
    stats,
    recentGames,
    topPlayers,
    unlockedAchievements,
    lockedAchievements,
    getLeaderboard,
    isLoading: !dashboardData,
    user,
  };
}

export function useRoomHistory() {
  const roomHistory = useQuery(api.stats.getRoomHistory, { limit: 20 });
  
  const activeRooms = roomHistory?.filter(r => r.status === "active") || [];
  const completedRooms = roomHistory?.filter(r => r.status === "completed") || [];
  
  return {
    roomHistory: roomHistory || [],
    activeRooms,
    completedRooms,
    isLoading: !roomHistory,
  };
}
```

### 4. Create Dashboard UI

Update `src/pages/Dashboard.tsx`:

```tsx
import { useState } from "react";
import { useDashboard, useRoomHistory, Period } from "../hooks/use-dashboard";
import { useCreateRoom, useJoinRoom } from "../hooks/use-room";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { 
  Trophy, Target, Flame, Star, TrendingUp, Calendar, 
  Users, GameController2, Plus, LogIn, Loader2, Crown
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

export function Dashboard() {
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<Period>("allTime");
  const { 
    stats, 
    recentGames, 
    topPlayers, 
    unlockedAchievements,
    getLeaderboard,
    isLoading,
    user 
  } = useDashboard();
  
  const { activeRooms } = useRoomHistory();
  const { handleCreateRoom } = useCreateRoom();
  const { handleJoinRoom } = useJoinRoom();
  
  const leaderboard = getLeaderboard(leaderboardPeriod, 5 
  });
  
  if (!dashboardData) {
    return <div>Loading dashboard...</div>;
  }
  
  const { profile, stats, recentGames, achievements } = dashboardData;
  
  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Profile Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{profile.displayName}</h1>
          <p className="text-muted-foreground">@{profile.username}</p>
        </div>
        {stats.rank && (
          <Badge variant="outline" className="text-lg px-4 py-2">
            Rank #{stats.rank}
          </Badge>
        )}
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Games Won
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.gamesWon}</div>
            <p className="text-xs text-muted-foreground">
              {stats.winRate.toFixed(1)}% win rate
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Total Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalScore}</div>
            <p className="text-xs text-muted-foreground">
              Avg: {stats.averageScore} per game
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Flame className="h-4 w-4" />
              Current Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.currentStreak} days</div>
            <Progress value={(stats.currentStreak / 7) * 100} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4" />
              Best Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bestScore}</div>
            <p className="text-xs text-muted-foreground">
              Personal record
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Games & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Games */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Games
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentGames.map((game) => (
                <div
                  key={game._id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary"
                >
                  <div>
                    <p className="font-medium">{game.roomName}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(game.completedAt, { addSuffix: true })}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      {game.won && <Trophy className="h-4 w-4 text-yellow-500" />}
                      <span className="font-semibold">{game.score} pts</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      #{game.position} of {game.totalPlayers}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Players
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leaderboard?.map((entry) => (
                <div
                  key={entry.userId}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    entry.isCurrentUser ? "bg-primary/10" : "bg-secondary"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg">#{entry.rank}</span>
                    <div>
                      <p className="font-medium">{entry.displayName}</p>
                      <p className="text-sm text-muted-foreground">
                        {entry.gamesPlayed} games
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{entry.score}</p>
                    <p className="text-sm text-muted-foreground">
                      {entry.winRate.toFixed(0)}% wins
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle>Achievements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`p-4 rounded-lg border text-center ${
                  achievement.unlockedAt 
                    ? "bg-primary/10 border-primary" 
                    : "bg-secondary border-muted"
                }`}
              >
                <div className="text-2xl mb-2">
                  {achievement.unlockedAt ? "🏆" : "🔒"}
                </div>
                <p className="font-medium text-sm">{achievement.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {achievement.description}
                </p>
                {achievement.unlockedAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDistanceToNow(achievement.unlockedAt, { addSuffix: true })}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

## Testing Instructions

### 1. Play Complete Game
```typescript
// Complete a full game to generate stats
// Then check dashboard updates
```

### 2. Test Achievement Unlocking
```typescript
// Check achievements are awarded
const achievements = await convex.query(api.stats.getDashboardData);
console.log("Achievements:", achievements?.achievements);
```

### 3. Verify Leaderboard
```typescript
// Check leaderboard updates
const leaderboard = await convex.query(api.stats.getLeaderboard, {
  period: "allTime",
  limit: 10
});
console.log("Leaderboard:", leaderboard);
```

## Debug Commands

```bash
# View game stats
mcp_convex_data --deploymentSelector dev --tableName gameStats --order desc

# Check user stats
mcp_convex_data --deploymentSelector dev --tableName userStats --order desc

# View achievements
mcp_convex_data --deploymentSelector dev --tableName achievements --order desc
```

## Success Criteria
- [ ] Stats update after each game
- [ ] Dashboard shows correct data
- [ ] Achievements unlock properly
- [ ] Leaderboard ranks correctly
- [ ] Recent games display accurately
- [ ] Streaks track properly

## Next Steps
Once statistics work:
1. Test with multiple games
2. Verify achievement conditions
3. Proceed to **07-testing-deployment-instructions.md**
