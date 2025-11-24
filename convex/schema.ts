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
    name: v.optional(v.string()),
    
    // Custom fields for our app
    username: v.optional(v.string()),
    displayName: v.optional(v.string()),
    avatarId: v.optional(v.string()), // Temporarily string-based until proper avatar storage is implemented
    lastActiveAt: v.optional(v.float64()),
    onboardingCompleted: v.optional(v.boolean()),
    isNewUser: v.optional(v.boolean()), // Track if user just signed up
    isAnonymous: v.optional(v.boolean()), // Track if user is anonymous
    
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
  
  // Question cards for prompts
  questionCards: defineTable({
    text: v.string(),
    category: v.optional(v.string()),
    difficulty: v.optional(v.float64()),
    isActive: v.boolean(),
  })
    .index("by_active", ["isActive"])
    .index("by_category", ["category", "isActive"]),
  
  // Game rounds
  rounds: defineTable({
    roomId: v.id("rooms"),
    roundNumber: v.float64(),
    questionCardId: v.id("questionCards"),
    status: v.union(
      v.literal("prompt"),      // Players submitting prompts
      v.literal("generating"),  // AI generating images
      v.literal("voting"),      // Players voting
      v.literal("results"),     // Showing results
      v.literal("complete")     // Round finished
    ),
    startedAt: v.float64(),
    endedAt: v.optional(v.float64()),
    phaseEndTime: v.optional(v.float64()),
    // Add generation tracking
    generationStartedAt: v.optional(v.float64()),
    generationCompletedAt: v.optional(v.float64()),
    generationError: v.optional(v.string()),
    // Track scheduled phase transition for early progression
    scheduledTransitionId: v.optional(v.id("_scheduled_functions")),
    // Track generation progress for early completion
    generationExpectedCount: v.optional(v.float64()),   // Number of prompts to generate
    generationCompletedCount: v.optional(v.float64()),  // Number completed (success or error)
  })
    .index("by_room", ["roomId"])
    .index("by_room_and_number", ["roomId", "roundNumber"])
    .index("by_status", ["status"]),
  
  // Player prompts
  prompts: defineTable({
    roundId: v.id("rounds"),
    playerId: v.id("players"),
    text: v.string(),
    submittedAt: v.float64(),
  })
    .index("by_round", ["roundId"])
    .index("by_round_and_player", ["roundId", "playerId"]),
  
  // Generated images with Google Gemini and OpenAI support
  generatedImages: defineTable({
    promptId: v.id("prompts"),
    imageUrl: v.string(),
    storageId: v.optional(v.id("_storage")), // Convex storage ID for the WebP image
    metadata: v.optional(v.object({
      model: v.string(), // "google/gemini-3-pro-image-preview", "openai/dall-e-3", etc.
      timestamp: v.optional(v.float64()),
      generatedAt: v.optional(v.float64()),
      
      // Google Gemini specific fields
      promptTokenCount: v.optional(v.float64()),
      candidatesTokenCount: v.optional(v.float64()),
      totalTokenCount: v.optional(v.float64()),
      
      // OpenAI specific fields
      seed: v.optional(v.float64()),
      revisedPrompt: v.optional(v.string()),
      useImageEdit: v.optional(v.boolean()),
      inference_steps: v.optional(v.float64()),
      
      // Cost tracking
      estimatedCost: v.optional(v.float64()),
      costCurrency: v.optional(v.string()),
    })),
    generatedAt: v.float64(),
    error: v.optional(v.string()),
  })
    .index("by_prompt", ["promptId"])
    .index("by_model", ["metadata.model"])
    .index("by_generation_time", ["generatedAt"]),
  
  // Votes
  votes: defineTable({
    roundId: v.id("rounds"),
    voterId: v.id("players"),
    imageId: v.id("generatedImages"),
    submittedAt: v.float64(),
  })
    .index("by_round", ["roundId"])
    .index("by_voter", ["voterId"])
    .index("by_image", ["imageId"])
    .index("by_round_and_voter", ["roundId", "voterId"]),

  // User AI generation preferences
  userSettings: defineTable({
    userId: v.id("users"),
    imageModel: v.union(
      v.literal("google/gemini-3-pro-image-preview"),
      v.literal("openai/dall-e-3"),
      v.literal("openai/gpt-4o-vision-edit")
    ),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  })
    .index("by_user", ["userId"]),

  // Image generation cache (to avoid regenerating similar prompts)
  imageCache: defineTable({
    promptHash: v.string(), // Hash of sanitized prompt + question text
    imageUrl: v.string(),
    storageId: v.id("_storage"),
    model: v.string(),
    metadata: v.optional(v.object({
      originalPrompt: v.string(),
      questionText: v.string(),
      generationCount: v.float64(), // How many times this was reused
    })),
    createdAt: v.float64(),
    expiresAt: v.float64(), // Cache expiration time
    lastUsedAt: v.float64(),
  })
    .index("by_hash", ["promptHash"])
    .index("by_expiry", ["expiresAt"])
    .index("by_model", ["model"])
    .index("by_usage", ["lastUsedAt"]),
});