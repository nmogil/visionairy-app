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
import { getAuthUserId } from "@convex-dev/auth/server";

// Start the game (called by host)
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

// Internal function to ensure question cards exist
export const ensureQuestionCards = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const existingCards = await ctx.db
      .query("questionCards")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
    
    if (existingCards.length > 0) {
      console.log(`Found ${existingCards.length} existing question cards`);
      return null;
    }
    
    console.log("No question cards found, auto-seeding...");
    
    // Call the existing seed function
    await ctx.runMutation(internal.admin.seedQuestionCardsInternal, {});
    
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
    
    // Ensure question cards exist before proceeding
    await ctx.runMutation(internal.game.ensureQuestionCards, {});
    
    // Get random question card (now guaranteed to exist)
    const questionCards = await ctx.db
      .query("questionCards")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
      
    // This should never happen now, but keep as safety check
    if (questionCards.length === 0) {
      throw new Error("Failed to seed question cards");
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
    console.log(`[submitPrompt] ===== STARTING PROMPT SUBMISSION =====`);
    console.log(`[submitPrompt] Room ID: ${args.roomId}`);
    console.log(`[submitPrompt] Raw prompt: "${args.prompt}"`);

    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    console.log(`[submitPrompt] User ID: ${userId}`);

    // Validate prompt with better error messages and consistent limits
    const trimmedPrompt = args.prompt.trim();
    console.log(`[submitPrompt] Trimmed prompt: "${trimmedPrompt}" (length: ${trimmedPrompt.length})`);

    if (trimmedPrompt.length < 3) {
      throw new Error("Prompt must be at least 3 characters long");
    }
    if (trimmedPrompt.length > 200) { // Increase limit to match UI
      throw new Error("Prompt must be less than 200 characters");
    }

    // Use trimmed prompt for consistency
    const promptToUse = trimmedPrompt;
    
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    console.log(`[submitPrompt] User found: ${user.displayName || user.name || 'Unknown'}`);

    // Get current round
    const room = await ctx.db.get(args.roomId);
    if (!room || !room.currentRound) {
      throw new Error("No active round");
    }

    console.log(`[submitPrompt] Room found: ${room.name}, Current round: ${room.currentRound}`);

    const round = await ctx.db
      .query("rounds")
      .withIndex("by_room_and_number", (q) =>
        q.eq("roomId", args.roomId).eq("roundNumber", room.currentRound)
      )
      .unique();

    if (!round || round.status !== "prompt") {
      throw new Error("Not in prompt phase");
    }

    console.log(`[submitPrompt] Round found: ${round._id}, Status: ${round.status}`);

    // Get player
    const player = await ctx.db
      .query("players")
      .withIndex("by_room_and_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", user._id)
      )
      .unique();

    if (!player) throw new Error("Player not in room");

    console.log(`[submitPrompt] Player found: ${player._id}`);
    
    // Check if already submitted
    console.log(`[submitPrompt] Checking for existing prompt with roundId: ${round._id}, playerId: ${player._id}`);
    const existing = await ctx.db
      .query("prompts")
      .withIndex("by_round_and_player", (q) =>
        q.eq("roundId", round._id).eq("playerId", player._id)
      )
      .unique();

    if (existing) {
      // Update existing prompt
      console.log(`[submitPrompt] Updating existing prompt: ${existing._id}`);
      await ctx.db.patch(existing._id, {
        text: promptToUse, // Use trimmed prompt
        submittedAt: Date.now(),
      });
      console.log(`[submitPrompt] Successfully updated prompt ${existing._id} with text: "${promptToUse}"`);
    } else {
      // Create new prompt
      console.log(`[submitPrompt] Creating new prompt for round ${round._id}, player ${player._id}`);
      const newPromptId = await ctx.db.insert("prompts", {
        roundId: round._id,
        playerId: player._id,
        text: promptToUse, // Use trimmed prompt
        submittedAt: Date.now(),
      });
      console.log(`[submitPrompt] Successfully created new prompt ${newPromptId} with text: "${promptToUse}"`);
    }

    console.log(`[submitPrompt] ===== PROMPT SUBMISSION COMPLETE =====`);
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
          generationStartedAt: Date.now(), // Track when generation started
        });
        
        console.log(`[transitionPhase] Transitioning round ${args.roundId} to generating phase`);
        
        // Use verification mechanism to ensure prompts exist before generation
        console.log(`[transitionPhase] Triggering AI generation verification for round ${args.roundId} with 1-second delay`);
        await ctx.scheduler.runAfter(1000, internal.game.verifyAndTriggerGeneration, {
          roundId: args.roundId,
          retryCount: 0,
        });
        console.log(`[transitionPhase] AI generation verification scheduled for round ${args.roundId} (delayed 1 second)`);
        
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
        
      case "results": {
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
    }
    
    return null;
  },
});


// Internal mutations for storing results
export const storeGeneratedImage = internalMutation({
  args: {
    promptId: v.id("prompts"),
    imageUrl: v.string(),
    generatedAt: v.optional(v.number()),
    metadata: v.optional(v.object({
      model: v.string(),
      seed: v.optional(v.number()),
      inference_steps: v.optional(v.number()),
      generatedAt: v.optional(v.number()),
      timestamp: v.optional(v.number()),
    })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("generatedImages", {
      promptId: args.promptId,
      imageUrl: args.imageUrl,
      metadata: args.metadata,
      generatedAt: args.generatedAt || Date.now(),
    });
    return null;
  },
});

export const storeImageError = internalMutation({
  args: {
    promptId: v.id("prompts"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Use a fallback image with error message
    await ctx.db.insert("generatedImages", {
      promptId: args.promptId,
      imageUrl: `/placeholder.svg?text=${encodeURIComponent("Error: " + args.error.substring(0, 20))}`,
      error: args.error,
      generatedAt: Date.now(),
    });
    return null;
  },
});

// Add these new internal mutations after storeImageError function

export const markGenerationComplete = internalMutation({
  args: {
    roundId: v.id("rounds"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.roundId, {
      generationCompletedAt: Date.now(),
    });
    console.log(`[markGenerationComplete] Marked round ${args.roundId} generation as complete`);
    return null;
  },
});

export const markGenerationFailed = internalMutation({
  args: {
    roundId: v.id("rounds"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.roundId, {
      generationError: args.error,
      generationCompletedAt: Date.now(),
    });
    console.error(`[markGenerationFailed] Marked round ${args.roundId} generation as failed: ${args.error}`);
    return null;
  },
});

// Internal queries for the action
export const getRoundData = internalQuery({
  args: { 
    roundId: v.id("rounds") 
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("rounds"),
      questionCardId: v.id("questionCards"),
      questionText: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const round = await ctx.db.get(args.roundId);
    if (!round) return null;
    
    const questionCard = await ctx.db.get(round.questionCardId);
    if (!questionCard) return null;
    
    return {
      _id: round._id,
      questionCardId: round.questionCardId,
      questionText: questionCard.text,
    };
  },
});

export const getPromptsForRound = internalQuery({
  args: { 
    roundId: v.id("rounds") 
  },
  returns: v.array(v.object({
    _id: v.id("prompts"),
    _creationTime: v.number(),
    text: v.string(),
    playerId: v.id("players"),
    roundId: v.id("rounds"),
    submittedAt: v.number(),
  })),
  handler: async (ctx, args) => {
    console.log(`[getPromptsForRound] ===== RETRIEVING PROMPTS =====`);
    console.log(`[getPromptsForRound] Round ID: ${args.roundId}`);

    const prompts = await ctx.db
      .query("prompts")
      .withIndex("by_round", (q) => q.eq("roundId", args.roundId))
      .collect();

    console.log(`[getPromptsForRound] Found ${prompts.length} prompts for round ${args.roundId}`);

    // Log each prompt for debugging
    prompts.forEach((prompt, index) => {
      console.log(`[getPromptsForRound] Prompt ${index + 1}: ID=${prompt._id}, Text="${prompt.text}", PlayerId=${prompt.playerId}`);
    });

    console.log(`[getPromptsForRound] ===== PROMPT RETRIEVAL COMPLETE =====`);
    return prompts;
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
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    const user = await ctx.db.get(userId);
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
    
    let questionCard = availableCards.length > 0
      ? availableCards[Math.floor(Math.random() * availableCards.length)]
      : (await ctx.db.query("questionCards").withIndex("by_active", (q) => q.eq("isActive", true)).collect())[0];
    
    // Fallback seeding if we somehow run out of cards
    if (!questionCard) {
      console.log("No question cards available for next round, auto-seeding...");
      await ctx.runMutation(internal.game.ensureQuestionCards, {});
      
      const fallbackCards = await ctx.db
        .query("questionCards")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .collect();
        
      if (fallbackCards.length === 0) {
        throw new Error("Failed to seed question cards for next round");
      }
      
      questionCard = fallbackCards[Math.floor(Math.random() * fallbackCards.length)];
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

// Verify prompts exist and trigger AI generation with retry mechanism
export const verifyAndTriggerGeneration = internalMutation({
  args: {
    roundId: v.id("rounds"),
    retryCount: v.optional(v.number()), // Track retry attempts
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const retryCount = args.retryCount || 0;
    const maxRetries = 3;

    console.log(`[verifyAndTriggerGeneration] Attempt ${retryCount + 1}/${maxRetries} for round ${args.roundId}`);

    // Check if prompts exist using the same query as AI generation
    const prompts = await ctx.runQuery(internal.game.getPromptsForRound, {
      roundId: args.roundId,
    });

    if (prompts.length > 0) {
      // Prompts found! Trigger AI generation
      console.log(`[verifyAndTriggerGeneration] Found ${prompts.length} prompts, triggering AI generation`);
      await ctx.scheduler.runAfter(0, internal.ai.generateAIImages, {
        roundId: args.roundId,
      });
      console.log(`[verifyAndTriggerGeneration] AI generation scheduled successfully`);
    } else if (retryCount < maxRetries) {
      // No prompts found, retry after delay
      const delayMs = (retryCount + 1) * 1000; // Increasing delay: 1s, 2s, 3s
      console.log(`[verifyAndTriggerGeneration] No prompts found, retrying in ${delayMs}ms (attempt ${retryCount + 1}/${maxRetries})`);

      await ctx.scheduler.runAfter(delayMs, internal.game.verifyAndTriggerGeneration, {
        roundId: args.roundId,
        retryCount: retryCount + 1,
      });
    } else {
      // Max retries reached, mark generation as failed
      console.error(`[verifyAndTriggerGeneration] Failed to find prompts after ${maxRetries} attempts for round ${args.roundId}`);

      // Mark the round as having a generation error
      await ctx.db.patch(args.roundId, {
        generationError: `No prompts found after ${maxRetries} retry attempts`,
        generationCompletedAt: Date.now(),
      });

      // Transition to voting phase anyway with placeholder message
      await ctx.scheduler.runAfter(2000, internal.game.transitionPhase, {
        roundId: args.roundId,
      });
    }

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
        currentRound: v.optional(v.float64()),
        totalRounds: v.float64(),
      }),
      round: v.optional(v.object({
        _id: v.id("rounds"),
        status: v.string(),
        phaseEndTime: v.optional(v.float64()),
        question: v.string(),
      })),
      players: v.array(v.object({
        _id: v.id("players"),
        displayName: v.string(),
        score: v.float64(),
        hasSubmitted: v.boolean(),
        hasVoted: v.boolean(),
      })),
      images: v.array(v.object({
        _id: v.id("generatedImages"),
        promptId: v.id("prompts"),
        imageUrl: v.string(),
        promptText: v.string(),
        voteCount: v.float64(),
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
    
    const userId = await getAuthUserId(ctx);
    const currentUser = userId ? await ctx.db.get(userId) : null;
      
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
    let images: Array<{
      _id: Id<"generatedImages">;
      promptId: Id<"prompts">;
      imageUrl: string;
      promptText: string;
      voteCount: number;
      isWinner: boolean;
      isOwn: boolean;
    }> = [];
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
            isOwn: currentPlayer?._id === prompt.playerId,
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