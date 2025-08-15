# Step 3: Core Game Mechanics Implementation

## Objective
Implement the core game flow including rounds, phases, prompt submission, and voting mechanics.

## Prerequisites
- ✅ Completed Steps 0-2 (Setup, Auth, Rooms)
- ✅ Rooms can be created and joined
- ✅ Real-time updates working

## Deliverables
- ✅ Game initialization and round management
- ✅ Phase transitions (prompt → generating → voting → results)
- ✅ Prompt submission system
- ✅ Voting mechanism
- ✅ Score calculation
- ✅ Real-time game state updates

## Implementation Steps

### 1. Add Game Tables to Schema

Update `convex/schema.ts` (add to existing schema):

```typescript
export default defineSchema({
  // ... existing tables ...
  
  // Question cards for prompts
  questionCards: defineTable({
    text: v.string(),
    category: v.optional(v.string()),
    difficulty: v.optional(v.number()),
    isActive: v.boolean(),
  })
    .index("by_active", ["isActive"])
    .index("by_category", ["category", "isActive"]),
  
  // Game rounds
  rounds: defineTable({
    roomId: v.id("rooms"),
    roundNumber: v.number(),
    questionCardId: v.id("questionCards"),
    status: v.union(
      v.literal("prompt"),      // Players submitting prompts
      v.literal("generating"),  // AI generating images
      v.literal("voting"),      // Players voting
      v.literal("results"),     // Showing results
      v.literal("complete")     // Round finished
    ),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    phaseEndTime: v.optional(v.number()),
  })
    .index("by_room", ["roomId"])
    .index("by_room_and_number", ["roomId", "roundNumber"]),
  
  // Player prompts
  prompts: defineTable({
    roundId: v.id("rounds"),
    playerId: v.id("players"),
    text: v.string(),
    submittedAt: v.number(),
  })
    .index("by_round", ["roundId"])
    .index("by_round_and_player", ["roundId", "playerId"]),
  
  // Generated images (placeholder for now, AI in next step)
  generatedImages: defineTable({
    promptId: v.id("prompts"),
    imageUrl: v.string(),
    storageId: v.optional(v.id("_storage")),
    metadata: v.optional(v.object({
      model: v.string(),
      seed: v.optional(v.number()),
      revisedPrompt: v.optional(v.string()),
    })),
    generatedAt: v.number(),
    error: v.optional(v.string()),
  })
    .index("by_prompt", ["promptId"]),
  
  // Votes
  votes: defineTable({
    roundId: v.id("rounds"),
    voterId: v.id("players"),
    imageId: v.id("generatedImages"),
    submittedAt: v.number(),
  })
    .index("by_round", ["roundId"])
    .index("by_voter", ["voterId"])
    .index("by_image", ["imageId"])
    .index("by_round_and_voter", ["roundId", "voterId"]),
});
```

### 2. Seed Question Cards

Create `convex/admin.ts`:

```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Seed initial question cards (run this once)
export const seedQuestionCards = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const existingCards = await ctx.db
      .query("questionCards")
      .collect();
    
    if (existingCards.length > 0) {
      console.log("Question cards already seeded");
      return null;
    }
    
    const cards = [
      // Creative prompts
      { text: "Draw a superhero who", category: "creative", difficulty: 1 },
      { text: "Design a creature that", category: "creative", difficulty: 1 },
      { text: "Imagine a world where", category: "creative", difficulty: 2 },
      { text: "Create a villain who", category: "creative", difficulty: 2 },
      
      // Funny prompts
      { text: "Show what happens when", category: "funny", difficulty: 1 },
      { text: "Illustrate the worst possible", category: "funny", difficulty: 1 },
      { text: "Draw your reaction when", category: "funny", difficulty: 1 },
      { text: "Visualize the most awkward", category: "funny", difficulty: 2 },
      
      // Conceptual prompts
      { text: "Represent the feeling of", category: "conceptual", difficulty: 2 },
      { text: "Show the concept of", category: "conceptual", difficulty: 3 },
      { text: "Illustrate what it means to", category: "conceptual", difficulty: 3 },
      
      // Action prompts
      { text: "Draw someone trying to", category: "action", difficulty: 1 },
      { text: "Show the moment when", category: "action", difficulty: 2 },
      { text: "Capture the scene where", category: "action", difficulty: 2 },
      
      // Object prompts
      { text: "Design a futuristic", category: "object", difficulty: 1 },
      { text: "Create a magical", category: "object", difficulty: 1 },
      { text: "Invent a useless", category: "object", difficulty: 1 },
      { text: "Draw an impossible", category: "object", difficulty: 2 },
    ];
    
    for (const card of cards) {
      await ctx.db.insert("questionCards", {
        ...card,
        isActive: true,
      });
    }
    
    console.log(`Seeded ${cards.length} question cards`);
    return null;
  },
});
```

### 3. Core Game Logic

Create `convex/game.ts`:

```typescript
import { 
  query, 
  mutation, 
  internalMutation, 
  internalQuery 
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { GAME_CONFIG } from "./lib/constants";
import { Id } from "./_generated/dataModel";

// Start the game (called by host)
export const startGame = mutation({
  args: {
    roomId: v.id("rooms"),
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
      throw new Error("Only the host can start the game");
    }
    
    if (room.status !== "waiting") {
      throw new Error("Game already started");
    }
    
    // Check minimum players
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("status"), "connected"))
      .collect();
    
    if (players.length < 2) {
      throw new Error("Need at least 2 players to start");
    }
    
    // Update room status
    await ctx.db.patch(args.roomId, {
      status: "starting",
      startedAt: Date.now(),
      currentRound: 1,
    });
    
    // Schedule game initialization
    await ctx.scheduler.runAfter(0, internal.game.initializeGame, {
      roomId: args.roomId,
    });
    
    return null;
  },
});

// Initialize the game (internal)
export const initializeGame = internalMutation({
  args: {
    roomId: v.id("rooms"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    
    // Get random question card
    const questionCards = await ctx.db
      .query("questionCards")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
      
    if (questionCards.length === 0) {
      throw new Error("No question cards available");
    }
    
    const randomCard = questionCards[Math.floor(Math.random() * questionCards.length)];
    
    // Create first round
    const roundId = await ctx.db.insert("rounds", {
      roomId: args.roomId,
      roundNumber: 1,
      questionCardId: randomCard._id,
      status: "prompt",
      startedAt: Date.now(),
      phaseEndTime: Date.now() + GAME_CONFIG.PROMPT_PHASE_DURATION,
    });
    
    // Update room status
    await ctx.db.patch(args.roomId, {
      status: "playing",
    });
    
    // Schedule phase transition
    await ctx.scheduler.runAt(
      Date.now() + GAME_CONFIG.PROMPT_PHASE_DURATION,
      internal.game.transitionPhase,
      { roundId }
    );
    
    return null;
  },
});

// Submit a prompt
export const submitPrompt = mutation({
  args: {
    roomId: v.id("rooms"),
    prompt: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    // Validate prompt
    if (args.prompt.length < 3 || args.prompt.length > 100) {
      throw new Error("Prompt must be between 3 and 100 characters");
    }
    
    const userQuery = identity.email
      ? ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", identity.email))
      : ctx.db.query("users").filter((q) => q.eq(q.field("_id"), identity.subject));
    
    const user = await userQuery.unique();
    if (!user) throw new Error("User not found");
    
    // Get current round
    const room = await ctx.db.get(args.roomId);
    if (!room || !room.currentRound) {
      throw new Error("No active round");
    }
    
    const round = await ctx.db
      .query("rounds")
      .withIndex("by_room_and_number", (q) => 
        q.eq("roomId", args.roomId).eq("roundNumber", room.currentRound)
      )
      .unique();
      
    if (!round || round.status !== "prompt") {
      throw new Error("Not in prompt phase");
    }
    
    // Get player
    const player = await ctx.db
      .query("players")
      .withIndex("by_room_and_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", user._id)
      )
      .unique();
      
    if (!player) throw new Error("Player not in room");
    
    // Check if already submitted
    const existing = await ctx.db
      .query("prompts")
      .withIndex("by_round_and_player", (q) =>
        q.eq("roundId", round._id).eq("playerId", player._id)
      )
      .unique();
      
    if (existing) {
      // Update existing prompt
      await ctx.db.patch(existing._id, {
        text: args.prompt,
        submittedAt: Date.now(),
      });
    } else {
      // Create new prompt
      await ctx.db.insert("prompts", {
        roundId: round._id,
        playerId: player._id,
        text: args.prompt,
        submittedAt: Date.now(),
      });
    }
    
    return null;
  },
});

// Transition game phases
export const transitionPhase = internalMutation({
  args: {
    roundId: v.id("rounds"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const round = await ctx.db.get(args.roundId);
    if (!round) return null;
    
    switch (round.status) {
      case "prompt":
        // Move to generating phase
        await ctx.db.patch(args.roundId, {
          status: "generating",
          phaseEndTime: Date.now() + GAME_CONFIG.GENERATION_PHASE_DURATION,
        });
        
        // For now, create placeholder images (AI integration in next step)
        await ctx.scheduler.runAfter(0, internal.game.generatePlaceholderImages, {
          roundId: args.roundId,
        });
        
        // Schedule next transition
        await ctx.scheduler.runAt(
          Date.now() + GAME_CONFIG.GENERATION_PHASE_DURATION,
          internal.game.transitionPhase,
          { roundId: args.roundId }
        );
        break;
        
      case "generating":
        // Move to voting phase
        await ctx.db.patch(args.roundId, {
          status: "voting",
          phaseEndTime: Date.now() + GAME_CONFIG.VOTING_PHASE_DURATION,
        });
        
        // Schedule next transition
        await ctx.scheduler.runAt(
          Date.now() + GAME_CONFIG.VOTING_PHASE_DURATION,
          internal.game.transitionPhase,
          { roundId: args.roundId }
        );
        break;
        
      case "voting":
        // Move to results phase
        await ctx.db.patch(args.roundId, {
          status: "results",
          phaseEndTime: Date.now() + GAME_CONFIG.RESULTS_PHASE_DURATION,
        });
        
        // Calculate scores
        await ctx.scheduler.runAfter(0, internal.game.calculateScores, {
          roundId: args.roundId,
        });
        
        // Schedule next transition
        await ctx.scheduler.runAt(
          Date.now() + GAME_CONFIG.RESULTS_PHASE_DURATION,
          internal.game.transitionPhase,
          { roundId: args.roundId }
        );
        break;
        
      case "results":
        // Mark round as complete
        await ctx.db.patch(args.roundId, {
          status: "complete",
          endedAt: Date.now(),
        });
        
        // Check if more rounds or end game
        const room = await ctx.db.get(round.roomId);
        if (room && room.currentRound && room.currentRound < room.settings.roundsPerGame) {
          // Start next round
          await ctx.scheduler.runAfter(2000, internal.game.startNextRound, {
            roomId: round.roomId,
          });
        } else {
          // End game
          await ctx.scheduler.runAfter(0, internal.game.endGame, {
            roomId: round.roomId,
          });
        }
        break;
    }
    
    return null;
  },
});

// Generate placeholder images (will be replaced with AI)
export const generatePlaceholderImages = internalMutation({
  args: {
    roundId: v.id("rounds"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const prompts = await ctx.db
      .query("prompts")
      .withIndex("by_round", (q) => q.eq("roundId", args.roundId))
      .collect();
    
    // Create placeholder image for each prompt
    for (const prompt of prompts) {
      await ctx.db.insert("generatedImages", {
        promptId: prompt._id,
        imageUrl: `/placeholder.svg?text=${encodeURIComponent(prompt.text.substring(0, 20))}`,
        generatedAt: Date.now(),
      });
    }
    
    return null;
  },
});

// Submit a vote
export const submitVote = mutation({
  args: {
    roomId: v.id("rooms"),
    imageId: v.id("generatedImages"),
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
    
    // Get player
    const player = await ctx.db
      .query("players")
      .withIndex("by_room_and_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", user._id)
      )
      .unique();
    if (!player) throw new Error("Player not in room");
    
    // Get current round
    const room = await ctx.db.get(args.roomId);
    if (!room || !room.currentRound) {
      throw new Error("No active round");
    }
    
    const round = await ctx.db
      .query("rounds")
      .withIndex("by_room_and_number", (q) =>
        q.eq("roomId", args.roomId).eq("roundNumber", room.currentRound)
      )
      .unique();
      
    if (!round || round.status !== "voting") {
      throw new Error("Not in voting phase");
    }
    
    // Verify image belongs to this round
    const image = await ctx.db.get(args.imageId);
    if (!image) throw new Error("Image not found");
    
    const prompt = await ctx.db.get(image.promptId);
    if (!prompt || prompt.roundId !== round._id) {
      throw new Error("Invalid image for this round");
    }
    
    // Can't vote for own image
    if (prompt.playerId === player._id) {
      throw new Error("Cannot vote for your own image");
    }
    
    // Check if already voted
    const existingVote = await ctx.db
      .query("votes")
      .withIndex("by_round_and_voter", (q) =>
        q.eq("roundId", round._id).eq("voterId", player._id)
      )
      .unique();
      
    if (existingVote) {
      // Update vote
      await ctx.db.patch(existingVote._id, {
        imageId: args.imageId,
        submittedAt: Date.now(),
      });
    } else {
      // Create new vote
      await ctx.db.insert("votes", {
        roundId: round._id,
        voterId: player._id,
        imageId: args.imageId,
        submittedAt: Date.now(),
      });
    }
    
    return null;
  },
});

// Calculate scores after voting
export const calculateScores = internalMutation({
  args: {
    roundId: v.id("rounds"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const round = await ctx.db.get(args.roundId);
    if (!round) return null;
    
    // Get all votes for this round
    const votes = await ctx.db
      .query("votes")
      .withIndex("by_round", (q) => q.eq("roundId", args.roundId))
      .collect();
    
    // Count votes per image
    const voteCounts = new Map<string, number>();
    for (const vote of votes) {
      const count = voteCounts.get(vote.imageId) || 0;
      voteCounts.set(vote.imageId, count + 1);
    }
    
    // Find winning image(s)
    const maxVotes = Math.max(...voteCounts.values(), 0);
    if (maxVotes === 0) return null; // No votes cast
    
    const winningImages = Array.from(voteCounts.entries())
      .filter(([_, count]) => count === maxVotes)
      .map(([imageId]) => imageId);
    
    // Award points to winners
    for (const imageId of winningImages) {
      const image = await ctx.db.get(imageId as Id<"generatedImages">);
      if (!image) continue;
      
      const prompt = await ctx.db.get(image.promptId);
      if (!prompt) continue;
      
      const player = await ctx.db.get(prompt.playerId);
      if (!player) continue;
      
      // Award points (split if tie)
      const points = Math.floor(GAME_CONFIG.POINTS_PER_WIN / winningImages.length);
      await ctx.db.patch(player._id, {
        score: player.score + points,
      });
    }
    
    // Award participation points to voters
    for (const vote of votes) {
      const voter = await ctx.db.get(vote.voterId);
      if (voter) {
        await ctx.db.patch(vote.voterId, {
          score: voter.score + GAME_CONFIG.POINTS_PER_VOTE,
        });
      }
    }
    
    return null;
  },
});

// Start next round
export const startNextRound = internalMutation({
  args: {
    roomId: v.id("rooms"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room || !room.currentRound) return null;
    
    const nextRoundNumber = room.currentRound + 1;
    
    // Get a different question card
    const previousRounds = await ctx.db
      .query("rounds")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    
    const usedCardIds = previousRounds.map(r => r.questionCardId);
    
    const availableCards = await ctx.db
      .query("questionCards")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .filter((q) => !usedCardIds.includes(q._id))
      .collect();
    
    const questionCard = availableCards.length > 0
      ? availableCards[Math.floor(Math.random() * availableCards.length)]
      : (await ctx.db.query("questionCards").withIndex("by_active", (q) => q.eq("isActive", true)).collect())[0];
    
    if (!questionCard) {
      throw new Error("No question cards available");
    }
    
    // Create new round
    const roundId = await ctx.db.insert("rounds", {
      roomId: args.roomId,
      roundNumber: nextRoundNumber,
      questionCardId: questionCard._id,
      status: "prompt",
      startedAt: Date.now(),
      phaseEndTime: Date.now() + GAME_CONFIG.PROMPT_PHASE_DURATION,
    });
    
    // Update room
    await ctx.db.patch(args.roomId, {
      currentRound: nextRoundNumber,
    });
    
    // Schedule phase transition
    await ctx.scheduler.runAt(
      Date.now() + GAME_CONFIG.PROMPT_PHASE_DURATION,
      internal.game.transitionPhase,
      { roundId }
    );
    
    return null;
  },
});

// End the game
export const endGame = internalMutation({
  args: {
    roomId: v.id("rooms"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) return null;
    
    // Update room status
    await ctx.db.patch(args.roomId, {
      status: "finished",
      finishedAt: Date.now(),
    });
    
    // Update player statistics (will implement in stats step)
    // await ctx.scheduler.runAfter(0, internal.stats.updateUserStats, {
    //   roomId: args.roomId,
    // });
    
    return null;
  },
});

// Get current game state
export const getGameState = query({
  args: {
    roomId: v.id("rooms"),
  },
  returns: v.union(
    v.null(),
    v.object({
      room: v.object({
        status: v.string(),
        currentRound: v.optional(v.number()),
        totalRounds: v.number(),
      }),
      round: v.optional(v.object({
        _id: v.id("rounds"),
        status: v.string(),
        phaseEndTime: v.optional(v.number()),
        question: v.string(),
      })),
      players: v.array(v.object({
        _id: v.id("players"),
        displayName: v.string(),
        score: v.number(),
        hasSubmitted: v.boolean(),
        hasVoted: v.boolean(),
      })),
      images: v.array(v.object({
        _id: v.id("generatedImages"),
        promptId: v.id("prompts"),
        imageUrl: v.string(),
        promptText: v.string(),
        voteCount: v.number(),
        isWinner: v.boolean(),
        isOwn: v.boolean(),
      })),
      myPrompt: v.optional(v.string()),
      myVote: v.optional(v.id("generatedImages")),
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
      
    const currentPlayer = currentUser
      ? await ctx.db
          .query("players")
          .withIndex("by_room_and_user", (q) =>
            q.eq("roomId", args.roomId).eq("userId", currentUser._id)
          )
          .unique()
      : null;
    
    // Get current round
    let round = null;
    let question = null;
    if (room.currentRound) {
      const roundData = await ctx.db
        .query("rounds")
        .withIndex("by_room_and_number", (q) =>
          q.eq("roomId", args.roomId).eq("roundNumber", room.currentRound)
        )
        .unique();
        
      if (roundData) {
        const card = await ctx.db.get(roundData.questionCardId);
        round = {
          _id: roundData._id,
          status: roundData.status,
          phaseEndTime: roundData.phaseEndTime,
          question: card?.text ?? "Unknown question",
        };
      }
    }
    
    // Get players with submission/voting status
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.neq(q.field("status"), "kicked"))
      .collect();
      
    const playersWithInfo = await Promise.all(
      players.map(async (player) => {
        const user = await ctx.db.get(player.userId);
        
        const hasSubmitted = round
          ? !!(await ctx.db
              .query("prompts")
              .withIndex("by_round_and_player", (q) =>
                q.eq("roundId", round._id).eq("playerId", player._id)
              )
              .unique())
          : false;
          
        const hasVoted = round
          ? !!(await ctx.db
              .query("votes")
              .withIndex("by_round_and_voter", (q) =>
                q.eq("roundId", round._id).eq("voterId", player._id)
              )
              .unique())
          : false;
          
        return {
          _id: player._id,
          displayName: user?.displayName ?? "Unknown",
          score: player.score,
          hasSubmitted,
          hasVoted,
        };
      })
    );
    
    // Get images with vote counts for current round
    let images: any[] = [];
    if (round && (round.status === "voting" || round.status === "results")) {
      const prompts = await ctx.db
        .query("prompts")
        .withIndex("by_round", (q) => q.eq("roundId", round._id))
        .collect();
      
      const votes = await ctx.db
        .query("votes")
        .withIndex("by_round", (q) => q.eq("roundId", round._id))
        .collect();
      
      // Count votes per image
      const voteCounts = new Map<string, number>();
      for (const vote of votes) {
        voteCounts.set(vote.imageId, (voteCounts.get(vote.imageId) || 0) + 1);
      }
      
      const maxVotes = Math.max(...voteCounts.values(), 0);
      
      images = await Promise.all(
        prompts.map(async (prompt) => {
          const generatedImages = await ctx.db
            .query("generatedImages")
            .withIndex("by_prompt", (q) => q.eq("promptId", prompt._id))
            .collect();
          
          return generatedImages.map(img => ({
            _id: img._id,
            promptId: prompt._id,
            imageUrl: img.imageUrl,
            promptText: prompt.text,
            voteCount: voteCounts.get(img._id) || 0,
            isWinner: round.status === "results" && (voteCounts.get(img._id) || 0) === maxVotes && maxVotes > 0,
            isOwn: currentPlayer?.\_id === prompt.playerId,
          }));
        })
      ).then(results => results.flat());
    }
    
    // Get current player's prompt and vote
    const myPrompt = round && currentPlayer
      ? await ctx.db
          .query("prompts")
          .withIndex("by_round_and_player", (q) =>
            q.eq("roundId", round._id).eq("playerId", currentPlayer._id)
          )
          .unique()
      : null;
      
    const myVote = round && currentPlayer
      ? await ctx.db
          .query("votes")
          .withIndex("by_round_and_voter", (q) =>
            q.eq("roundId", round._id).eq("voterId", currentPlayer._id)
          )
          .unique()
      : null;
    
    return {
      room: {
        status: room.status,
        currentRound: room.currentRound,
        totalRounds: room.settings.roundsPerGame,
      },
      round,
      players: playersWithInfo,
      images,
      myPrompt: myPrompt?.text,
      myVote: myVote?.imageId,
    };
  },
});
```

## Testing Instructions

### 1. Seed Question Cards
```bash
# Run once to populate question cards
mcp_convex_run --deploymentSelector dev --functionName "admin:seedQuestionCards" --args '{}'
```

### 2. Test Game Start
```typescript
// Start game as host
await convex.mutation(api.game.startGame, {
  roomId: "..." // Use actual room ID
});
```

### 3. Test Prompt Submission
```typescript
await convex.mutation(api.game.submitPrompt, {
  roomId: "...",
  prompt: "flies through space with pizza"
});
```

### 4. Test Voting
```typescript
await convex.mutation(api.game.submitVote, {
  roomId: "...",
  imageId: "..." // Use actual image ID
});
```

### 5. Monitor Game State
```typescript
// Subscribe to game updates
convex.onUpdate(api.game.getGameState, 
  { roomId: "..." },
  (state) => console.log("Game state:", state)
);
```

## Debug Commands

```bash
# View rounds
mcp_convex_data --deploymentSelector dev --tableName rounds --order desc

# View prompts
mcp_convex_data --deploymentSelector dev --tableName prompts --order desc

# View votes
mcp_convex_data --deploymentSelector dev --tableName votes --order desc

# Check game state
mcp_convex_run --deploymentSelector dev --functionName "game:getGameState" --args '{"roomId":"..."}'
```

## Common Issues & Solutions

### Issue: "No question cards available"
**Solution:** Run the seedQuestionCards mutation

### Issue: Phase doesn't transition
**Solution:** Check scheduler is running, verify timer logic

### Issue: Can't vote for images
**Solution:** Ensure in voting phase, can't vote for own image

### Issue: Scores not updating
**Solution:** Check calculateScores runs after voting phase

## Success Criteria
- [ ] Game starts and creates first round
- [ ] Players can submit prompts
- [ ] Phase transitions work automatically
- [ ] Voting system works
- [ ] Scores calculate correctly
- [ ] Multiple rounds progress properly
- [ ] Game ends after all rounds

## Next Steps
Once core mechanics work:
1. Test full game flow with multiple players
2. Verify scoring system
3. Proceed to **04-ai-integration-instructions.md**
