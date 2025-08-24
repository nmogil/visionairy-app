"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { fal } from "@fal-ai/client";
import { Id } from "./_generated/dataModel";

// Configure FAL AI
fal.config({
  credentials: process.env.FAL_API_KEY,
});

// Generate AI images using FAL AI
export const generateAIImages = internalAction({
  args: {
    roundId: v.id("rounds"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get round and question
    const round = await ctx.runQuery(internal.game.getRoundData, { 
      roundId: args.roundId 
    });
    if (!round) return null;
    
    // Get all prompts for this round
    const prompts = await ctx.runQuery(internal.game.getPromptsForRound, { 
      roundId: args.roundId 
    });
    
    if (prompts.length === 0) {
      console.log("No prompts to generate images for");
      return null;
    }
    
    // Generate images in parallel
    const imageGenerations = prompts.map(async (prompt) => {
      try {
        // Combine question and prompt for better context
        const fullPrompt = `${round.questionText} ${prompt.text}. Style: ${getRandomStyle()}`;
        
        console.log(`Generating image for prompt: ${fullPrompt}`);
        
        const result = await fal.subscribe("fal-ai/flux/dev", {
          input: {
            prompt: fullPrompt,
            image_size: "landscape_4_3",
            num_inference_steps: 28,
            guidance_scale: 3.5,
            num_images: 1,
            enable_safety_checker: process.env.FAL_ENABLE_SAFETY_CHECKER === "true",
          },
        });
        
        const imageUrl = result.images[0].url;
        if (!imageUrl) throw new Error("No image URL returned");
        
        console.log(`Generated image URL: ${imageUrl}`);
        
        // Store image URL and metadata
        await ctx.runMutation(internal.game.storeGeneratedImage, {
          promptId: prompt._id,
          imageUrl,
          metadata: {
            model: "flux-dev",
            seed: result.seed,
            inference_steps: 28,
          },
        });
      } catch (error) {
        console.error(`Failed to generate image for prompt ${prompt._id}:`, error);
        
        // Store error and use fallback
        await ctx.runMutation(internal.game.storeImageError, {
          promptId: prompt._id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
    
    // Wait for all generations to complete
    await Promise.all(imageGenerations);
    console.log(`Completed generating ${prompts.length} images`);
    
    return null;
  },
});

// Helper function to add variety to generated images
function getRandomStyle(): string {
  const styles = [
    "digital art",
    "oil painting",
    "watercolor",
    "cartoon style",
    "photorealistic",
    "concept art",
    "surreal art",
    "minimalist",
    "retro 80s style",
    "anime style",
  ];
  return styles[Math.floor(Math.random() * styles.length)];
}