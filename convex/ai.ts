"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Generate AI images using Google Gemini and OpenAI
export const generateAIImages = internalAction({
  args: {
    roundId: v.id("rounds"),
    model: v.optional(v.union(
      v.literal("google/gemini-2.5-flash-image-preview"),
      v.literal("openai/dall-e-3"),
      v.literal("openai/gpt-4o-vision-edit")
    )),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log(`[generateAIImages] Starting generation for round ${args.roundId} with model ${args.model || 'default'}`);
    
    // Get the user's preferred model or use default
    let selectedModel = args.model || "google/gemini-2.5-flash-image-preview";
    
    // If no specific model requested, check user settings
    if (!args.model) {
      try {
        // For now, we'll use the default. In the future, we could look up user preferences
        // based on the round's host or some other logic
        selectedModel = "google/gemini-2.5-flash-image-preview";
      } catch (error) {
        console.warn(`[generateAIImages] Could not determine user preference, using default: ${error}`);
      }
    }
    
    console.log(`[generateAIImages] Using model: ${selectedModel}`);
    
    try {
      // Delegate to the main generation orchestrator
      await ctx.runAction(internal.generate.generate.generateDecoratedImages, {
        roundId: args.roundId,
        model: selectedModel,
      });
      
      console.log(`[generateAIImages] Successfully completed generation for round ${args.roundId}`);
    } catch (error) {
      console.error(`[generateAIImages] Error in generation for round ${args.roundId}:`, error);
      
      // The generation orchestrator already handles errors and stores them,
      // so we don't need to do additional error handling here
    }
    
    return null;
  },
});

// Test image generation with a specific model
export const testImageGeneration = internalAction({
  args: {
    prompt: v.string(),
    model: v.optional(v.union(
      v.literal("google/gemini-2.5-flash-image-preview"),
      v.literal("openai/dall-e-3"),
      v.literal("openai/gpt-4o-vision-edit")
    )),
  },
  returns: v.object({
    success: v.boolean(),
    imageUrl: v.optional(v.string()),
    error: v.optional(v.string()),
    model: v.string(),
  }),
  handler: async (ctx, { prompt, model = "google/gemini-2.5-flash-image-preview" }) => {
    console.log(`[testImageGeneration] Testing ${model} with prompt: ${prompt}`);
    
    try {
      const result = await ctx.runAction(internal.generate.generate.testGeneration, {
        prompt,
        model,
      });
      
      return {
        success: result.success,
        imageUrl: result.imageUrl,
        error: result.error,
        model,
      };
    } catch (error) {
      console.error(`[testImageGeneration] Test failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        model,
      };
    }
  },
});

// Get the status of available AI models
export const getAIModelStatus = internalAction({
  args: {},
  returns: v.object({
    models: v.array(v.object({
      id: v.string(),
      name: v.string(),
      available: v.boolean(),
      error: v.optional(v.string()),
    })),
    defaultModel: v.string(),
  }),
  handler: async (ctx) => {
    try {
      return await ctx.runAction(internal.generate.generate.getGenerationStatus, {});
    } catch (error) {
      console.error(`[getAIModelStatus] Error checking model status:`, error);
      return {
        models: [],
        defaultModel: "google/gemini-2.5-flash-image-preview",
      };
    }
  },
});