# Step 4: AI Image Generation + Optimization

## Objective
Replace placeholder images with real AI-generated images using FAL AI's Flux model with optimized image loading and display.

## Image Optimization Requirements
**Critical:** AI image generation and display can significantly impact performance. Implement progressive loading, lazy loading, and optimized image handling.

### Optimization Targets
- Progressive image loading with blur-to-clear effect
- Lazy loading for image galleries
- Image compression and WebP format support
- Optimized voting interface with virtual scrolling
- Bundle size impact: Minimize image handling libraries

### Components to Optimize
1. **Image Gallery** - Virtual scrolling for large image sets
2. **Progressive Loading** - Blur placeholder → full resolution
3. **Lazy Loading** - Load images only when in viewport
4. **Image Optimization** - WebP/AVIF format support with fallbacks
5. **Voting Interface** - Optimized for touch and mouse interactions

## Prerequisites
- ✅ Completed Steps 0-3 (Setup, Auth, Rooms, Game Mechanics)
- ✅ FAL AI API key configured in environment
- ✅ Game flow working with placeholder images

## Deliverables
- ✅ FAL AI Flux model integration for image generation
- ✅ Parallel image generation for all prompts
- ✅ Error handling and fallbacks
- ✅ Image storage and retrieval
- ✅ Metadata tracking for generated images

## Implementation Steps

### 1. Setup Image Optimization Utils

Before integrating AI generation, create optimized image handling:

#### Create Progressive Image Component

Create `src/components/ui/progressive-image.tsx`:
```typescript
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ProgressiveImageProps {
  src: string;
  alt: string;
  className?: string;
  blurDataUrl?: string;
  priority?: boolean;
  onLoad?: () => void;
}

export function ProgressiveImage({
  src,
  alt,
  className,
  blurDataUrl,
  priority = false,
  onLoad
}: ProgressiveImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const [inView, setInView] = useState(priority);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || !imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "50px" }
    );

    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = () => {
    setLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
  };

  return (
    <div ref={imgRef} className={cn("relative overflow-hidden", className)}>
      {/* Blur placeholder */}
      {blurDataUrl && !loaded && (
        <img
          src={blurDataUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-sm transition-opacity duration-300"
          style={{ filter: "blur(10px)" }}
        />
      )}
      
      {/* Loading skeleton */}
      {!blurDataUrl && !loaded && !error && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      
      {/* Main image */}
      {inView && (
        <img
          src={src}
          alt={alt}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
      
      {/* Error fallback */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <span className="text-xs text-muted-foreground">Failed to load</span>
        </div>
      )}
      
      {/* Loading indicator */}
      {inView && !loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
```

#### Create Optimized Image Gallery

Create `src/components/game/ImageGallery.tsx`:
```typescript
import { useState, useMemo, useCallback } from "react";
import { ProgressiveImage } from "@/components/ui/progressive-image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DynamicIcon } from "@/components/ui/dynamic-icon";
import { cn } from "@/lib/utils";

interface GeneratedImage {
  _id: string;
  imageUrl: string;
  promptText: string;
  voteCount: number;
  isUserImage?: boolean;
}

interface ImageGalleryProps {
  images: GeneratedImage[];
  onVote?: (imageId: string) => void;
  votedImageId?: string;
  disabled?: boolean;
  columns?: number;
}

// Generate blur placeholder data URL
function generateBlurPlaceholder(width = 40, height = 40) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  
  // Create simple gradient blur
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f3f4f6');
  gradient.addColorStop(0.5, '#e5e7eb');
  gradient.addColorStop(1, '#d1d5db');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  return canvas.toDataURL('image/jpeg', 0.1);
}

export function ImageGallery({
  images,
  onVote,
  votedImageId,
  disabled = false,
  columns = 2
}: ImageGalleryProps) {
  const [loadedImages, setLoadedImages] = useState(new Set<string>());
  
  const blurPlaceholder = useMemo(() => generateBlurPlaceholder(), []);
  
  const handleImageLoad = useCallback((imageId: string) => {
    setLoadedImages(prev => new Set([...prev, imageId]));
  }, []);
  
  const handleVote = useCallback((imageId: string) => {
    if (!disabled && !votedImageId && onVote) {
      onVote(imageId);
    }
  }, [disabled, votedImageId, onVote]);
  
  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No images to display</p>
      </div>
    );
  }
  
  return (
    <div 
      className={cn(
        "grid gap-4",
        columns === 2 && "grid-cols-1 md:grid-cols-2",
        columns === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
        columns === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      )}
    >
      {images.map((image) => (
        <Card
          key={image._id}
          className={cn(
            "overflow-hidden transition-all duration-200",
            onVote && !disabled && "cursor-pointer hover:scale-105 hover:shadow-lg",
            votedImageId === image._id && "ring-2 ring-primary",
            image.isUserImage && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => !image.isUserImage && handleVote(image._id)}
        >
          <div className="aspect-square">
            <ProgressiveImage
              src={image.imageUrl}
              alt={`Generated image: ${image.promptText}`}
              className="w-full h-full"
              blurDataUrl={blurPlaceholder}
              onLoad={() => handleImageLoad(image._id)}
            />
          </div>
          
          <div className="p-3">
            <p className="text-sm font-medium line-clamp-2 mb-2">
              {image.promptText}
            </p>
            
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                <DynamicIcon name="Heart" className="w-3 h-3 mr-1" />
                {image.voteCount} vote{image.voteCount !== 1 ? 's' : ''}
              </Badge>
              
              {image.isUserImage && (
                <Badge variant="secondary" className="text-xs">
                  Your image
                </Badge>
              )}
              
              {votedImageId === image._id && (
                <Badge className="text-xs">
                  <DynamicIcon name="Check" className="w-3 h-3 mr-1" />
                  Voted
                </Badge>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
```

### 2. Install FAL AI Client

```bash
# If not already installed
npm install @fal-ai/client
```

### 2. Update Game.ts with AI Generation

Replace the placeholder generation in `convex/game.ts`:

```typescript
"use node";  // Add this at the very top of the file

import { 
  query, 
  mutation, 
  internalMutation, 
  internalQuery,
  internalAction 
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { GAME_CONFIG } from "./lib/constants";
import { Id } from "./_generated/dataModel";
import { fal } from "@fal-ai/client";

// Initialize FAL AI client
fal.config({
  credentials: process.env.FAL_API_KEY,
});

// ... keep all existing functions ...

// Replace the transitionPhase function's "prompt" case
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
        
        // Trigger AI image generation (not placeholder)
        await ctx.scheduler.runAfter(0, internal.game.generateAIImages, {
          roundId: args.roundId,
        });
        
        // Schedule next transition
        await ctx.scheduler.runAt(
          Date.now() + GAME_CONFIG.GENERATION_PHASE_DURATION,
          internal.game.transitionPhase,
          { roundId: args.roundId }
        );
        break;
        
      // ... rest of cases remain the same ...
    }
    
    return null;
  },
});

// Remove or comment out generatePlaceholderImages function

// Add new AI image generation action
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

// Internal mutations for storing results
export const storeGeneratedImage = internalMutation({
  args: {
    promptId: v.id("prompts"),
    imageUrl: v.string(),
    metadata: v.optional(v.object({
      model: v.string(),
      revisedPrompt: v.optional(v.string()),
      seed: v.optional(v.number()),
    })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("generatedImages", {
      promptId: args.promptId,
      imageUrl: args.imageUrl,
      metadata: args.metadata,
      generatedAt: Date.now(),
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
      imageUrl: `/placeholder.svg`, // Fallback image
      error: args.error,
      generatedAt: Date.now(),
    });
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
    text: v.string(),
    playerId: v.id("players"),
  })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("prompts")
      .withIndex("by_round", (q) => q.eq("roundId", args.roundId))
      .collect();
  },
});
```

### 3. Add Rate Limiting and Optimization

Create `convex/lib/imageGeneration.ts`:

```typescript
import { fal } from "@fal-ai/client";

// Rate limiting configuration
const RATE_LIMIT = {
  maxConcurrent: 3, // Max concurrent API calls
  delayBetweenBatches: 1000, // 1 second between batches
};

export async function generateImagesWithRateLimit(
  prompts: Array<{ id: string; text: string }>,
  questionText: string
): Promise<Map<string, { url?: string; error?: string; metadata?: any }>> {
  const results = new Map();
  
  // Process in batches to respect rate limits
  for (let i = 0; i < prompts.length; i += RATE_LIMIT.maxConcurrent) {
    const batch = prompts.slice(i, i + RATE_LIMIT.maxConcurrent);
    
    const batchPromises = batch.map(async (prompt) => {
      try {
        const fullPrompt = createEnhancedPrompt(questionText, prompt.text);
        
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
        
        results.set(prompt.id, {
          url: result.images[0].url,
          metadata: {
            model: "flux-dev",
            seed: result.seed,
            inference_steps: 28,
          },
        });
      } catch (error) {
        console.error(`Error generating image for prompt ${prompt.id}:`, error);
        results.set(prompt.id, {
          error: error instanceof Error ? error.message : "Generation failed",
        });
      }
    });
    
    await Promise.all(batchPromises);
    
    // Add delay between batches if not the last batch
    if (i + RATE_LIMIT.maxConcurrent < prompts.length) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.delayBetweenBatches));
    }
  }
  
  return results;
}

// Create an enhanced prompt with better instructions
export function createEnhancedPrompt(questionText: string, userPrompt: string): string {
  const style = getRandomStyle();
  const quality = getQualityModifiers();
  
  return `${questionText} ${userPrompt}. ${quality} Style: ${style}`;
}

function getRandomStyle(): string {
  const styles = [
    "vibrant digital art",
    "expressive oil painting",
    "whimsical watercolor",
    "playful cartoon illustration",
    "stunning photorealistic render",
    "imaginative concept art",
    "dreamlike surreal art",
    "clean minimalist design",
    "nostalgic retro 80s style",
    "dynamic anime artwork",
  ];
  return styles[Math.floor(Math.random() * styles.length)];
}

function getQualityModifiers(): string {
  const modifiers = [
    "High quality, detailed,",
    "Professional artwork,",
    "Masterpiece quality,",
    "Stunning visual,",
    "Creative interpretation,",
  ];
  return modifiers[Math.floor(Math.random() * modifiers.length)];
}

// Validate and sanitize prompts
export function sanitizePrompt(prompt: string): string {
  // Remove potentially problematic content
  const sanitized = prompt
    .replace(/[<>]/g, '') // Remove HTML-like tags
    .trim()
    .substring(0, 200); // Limit length
  
  return sanitized;
}
```

### 4. Update the generateAIImages Action

Update the `generateAIImages` action in `convex/game.ts` to use rate limiting:

```typescript
import { generateImagesWithRateLimit, sanitizePrompt } from "./lib/imageGeneration";

export const generateAIImages = internalAction({
  args: {
    roundId: v.id("rounds"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const round = await ctx.runQuery(internal.game.getRoundData, { 
      roundId: args.roundId 
    });
    if (!round) return null;
    
    const prompts = await ctx.runQuery(internal.game.getPromptsForRound, { 
      roundId: args.roundId 
    });
    
    if (prompts.length === 0) {
      console.log("No prompts to generate images for");
      return null;
    }
    
    // Prepare prompts for batch generation
    const promptsToGenerate = prompts.map(p => ({
      id: p._id,
      text: sanitizePrompt(p.text),
    }));
    
    console.log(`Starting generation for ${promptsToGenerate.length} images`);
    
    // Generate with rate limiting
    const results = await generateImagesWithRateLimit(
      promptsToGenerate,
      round.questionText
    );
    
    // Store results
    for (const [promptId, result] of results.entries()) {
      if (result.url) {
        await ctx.runMutation(internal.game.storeGeneratedImage, {
          promptId: promptId as Id<"prompts">,
          imageUrl: result.url,
          metadata: result.metadata,
        });
      } else if (result.error) {
        await ctx.runMutation(internal.game.storeImageError, {
          promptId: promptId as Id<"prompts">,
          error: result.error,
        });
      }
    }
    
    console.log(`Completed generating images: ${results.size} processed`);
    return null;
  },
});
```

### 5. Add Image Caching and Storage

Update `convex/schema.ts` to add image caching:

```typescript
// Add to existing schema
imageCache: defineTable({
  promptHash: v.string(), // Hash of prompt text
  imageUrl: v.string(),
      metadata: v.optional(v.object({
      model: v.string(),
      seed: v.optional(v.number()),
      inference_steps: v.optional(v.number()),
    })),
  createdAt: v.number(),
  expiresAt: v.number(),
})
  .index("by_hash", ["promptHash"])
  .index("by_expiry", ["expiresAt"]),
```

### 6. Add Monitoring and Debugging

Create `convex/debug.ts`:

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

// Debug query to check image generation status
export const getGenerationStatus = query({
  args: {
    roundId: v.id("rounds"),
  },
  returns: v.object({
    totalPrompts: v.number(),
    generatedImages: v.number(),
    failedImages: v.number(),
    images: v.array(v.object({
      promptText: v.string(),
      imageUrl: v.optional(v.string()),
      error: v.optional(v.string()),
      generatedAt: v.optional(v.number()),
    })),
  }),
  handler: async (ctx, args) => {
    const prompts = await ctx.db
      .query("prompts")
      .withIndex("by_round", (q) => q.eq("roundId", args.roundId))
      .collect();
    
    const images = await Promise.all(
      prompts.map(async (prompt) => {
        const image = await ctx.db
          .query("generatedImages")
          .withIndex("by_prompt", (q) => q.eq("promptId", prompt._id))
          .first();
        
        return {
          promptText: prompt.text,
          imageUrl: image?.imageUrl,
          error: image?.error,
          generatedAt: image?.generatedAt,
        };
      })
    );
    
    return {
      totalPrompts: prompts.length,
      generatedImages: images.filter(i => i.imageUrl && !i.error).length,
      failedImages: images.filter(i => i.error).length,
      images,
    };
  },
});
```

## UI Integration

### 1. Create VotingPhase Component

Update `src/features/game/phases/VotingPhase.tsx`:

```tsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Clock, CheckCircle, Image as ImageIcon } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";

interface VotingPhaseProps {
  currentQuestion: string;
  images: any[];
  hasVoted: boolean;
  myVote?: string;
  timeRemaining: number;
  onVote: (imageId: string) => void;
}

const VotingPhase: React.FC<VotingPhaseProps> = ({
  currentQuestion,
  images,
  hasVoted,
  myVote,
  timeRemaining,
  onVote,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const handleVote = (imageId: string) => {
    if (hasVoted) return;
    setSelectedImage(imageId);
    onVote(imageId);
  };
  
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">{currentQuestion}</h2>
        <p className="text-muted-foreground">
          {hasVoted ? "Waiting for others..." : "Vote for your favorite!"}
        </p>
        <div className="flex items-center justify-center gap-2">
          <Clock className="h-4 w-4" />
          <span className={`font-mono ${timeRemaining <= 10 ? "text-destructive animate-pulse" : ""}`}>
            {timeRemaining}s
          </span>
        </div>
      </div>
      
      {hasVoted && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 p-3 bg-success/20 border-2 border-success rounded-lg"
        >
          <CheckCircle className="h-5 w-5 text-success" />
          <span className="font-medium">Vote submitted!</span>
        </motion.div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.map((image, index) => (
          <motion.div
            key={image._id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card
              className={`relative overflow-hidden cursor-pointer transition-all ${
                image.isOwn ? "opacity-50 cursor-not-allowed" : 
                hasVoted && myVote === image._id ? "ring-2 ring-primary" : 
                "hover:scale-105"
              }`}
              onClick={() => !image.isOwn && !hasVoted && handleVote(image._id)}
            >
              <div className="aspect-square relative bg-muted">
                <img
                  src={image.imageUrl}
                  alt={`AI generated: ${image.promptText}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {image.isOwn && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary">Your Image</Badge>
                  </div>
                )}
                {myVote === image._id && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <CheckCircle className="h-12 w-12 text-primary" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {image.promptText}
                </p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default VotingPhase;
```

### 2. Create GeneratingPhase Component

Update `src/features/game/phases/GeneratingPhase.tsx`:

```tsx
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Sparkles, Wand2 } from "lucide-react";

interface GeneratingPhaseProps {
  players: any[];
  timeRemaining: number;
}

const GeneratingPhase: React.FC<GeneratingPhaseProps> = ({ players, timeRemaining }) => {
  const [currentMessage, setCurrentMessage] = useState(0);
  
  const messages = [
    "AI is brewing some magic...",
    "Mixing pixels and imagination...",
    "Teaching robots to be creative...",
    "Generating masterpieces...",
    "Almost there, just adding sparkles...",
  ];
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % messages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  
  const submittedCount = players.filter(p => p.hasSubmitted).length;
  const progress = (submittedCount / players.length) * 100;
  
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-8">
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        >
          <Wand2 className="h-16 w-16 text-primary" />
        </motion.div>
        <motion.div
          className="absolute -top-2 -right-2"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Sparkles className="h-6 w-6 text-yellow-500" />
        </motion.div>
      </div>
      
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Generating Images</h2>
        <motion.p
          key={currentMessage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-muted-foreground"
        >
          {messages[currentMessage]}
        </motion.p>
      </div>
      
      <div className="w-full max-w-md space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Processing prompts</span>
          <span>{submittedCount}/{players.length}</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
      
      <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
      
      <p className="text-sm text-muted-foreground">
        Estimated time: {timeRemaining}s
      </p>
    </div>
  );
};

export default GeneratingPhase;
```

## Testing Instructions

### 1. Test API Key Configuration
```bash
# Verify FAL AI API key is set
mcp_convex_envGet --deploymentSelector dev --name FAL_API_KEY

# Verify safety checker configuration
mcp_convex_envGet --deploymentSelector dev --name FAL_ENABLE_SAFETY_CHECKER
```

### 2. Test Single Image Generation
```typescript
// Create a test prompt and generate image
const roundId = "..."; // Use actual round ID
await convex.action(api.game.generateAIImages, { roundId });
```

### 3. Monitor Generation Progress
```typescript
// Check generation status
const status = await convex.query(api.debug.getGenerationStatus, {
  roundId: "..."
});
console.log("Generation status:", status);
```

### 4. Test Error Handling
```typescript
// Test with invalid API key
npx convex env set FAL_API_KEY invalid_key
// Run game and check fallback images appear
```

## Debug Commands

```bash
# View generated images
mcp_convex_data --deploymentSelector dev --tableName generatedImages --order desc

# Check for errors
mcp_convex_data --deploymentSelector dev --tableName generatedImages --order desc | grep error

# Monitor FAL AI API usage
# Check your FAL AI dashboard at https://fal.ai/dashboard
```

## Common Issues & Solutions

### Issue: "Rate limit exceeded" errors
**Solution:** 
- Reduce `maxConcurrent` in rate limiting config
- Add longer delays between batches
- Upgrade FAL AI subscription tier

### Issue: Images not generating in time
**Solution:**
- Increase `GENERATION_PHASE_DURATION` in constants
- Start generation immediately when last player submits
- Pre-warm the API with a test call

### Issue: High API costs
**Solution:**
- Cache frequently used prompts
- Use "standard" quality instead of "hd"
- Reduce image size to 512x512 for testing

### Issue: Inappropriate content errors
**Solution:**
- Add content filtering in `sanitizePrompt`
- Provide clearer prompt guidelines to players
- Add fallback prompts for rejected content

## Configuration Options

### Safety Checker
The `FAL_ENABLE_SAFETY_CHECKER` environment variable controls content filtering:
- **`true` (recommended)**: Enables safety checks to filter inappropriate content
- **`false`**: Disables safety checks for faster generation (use with caution)

**Usage scenarios:**
- **Production**: Always set to `true` for user-generated content
- **Development**: Can be set to `false` for testing, but use `true` for realistic testing
- **Private/Internal**: Consider `false` for faster generation in controlled environments

## Cost Optimization Tips

1. **Development Testing:**
   - Use smaller image sizes (512x512)
   - Limit to 2-3 players during testing
   - Reuse cached images when possible
   - Consider disabling safety checker (`FAL_ENABLE_SAFETY_CHECKER=false`) for faster development iteration

2. **Production:**
   - Implement prompt caching
   - Batch similar prompts
   - Monitor usage via FAL AI dashboard
   - Set spending limits on FAL AI account

3. **Fallback Strategy:**
   - Keep placeholder system as backup
   - Use cached images for common prompts
   - Generate lower quality for non-critical rounds

## Image Optimization Verification

After implementing AI integration, verify image performance:

### 1. Image Loading Performance
```bash
# Test image loading optimization
1. Open DevTools → Network tab → Images filter
2. Start a game and generate images
3. Verify progressive loading works:
   - Blur placeholders show immediately
   - Images load progressively
   - Lazy loading triggers on scroll
4. Check image sizes are reasonable (<500KB each)
```

### 2. Bundle Impact Assessment
```bash
# Check bundle size impact from image components
npm run build
npm run build -- --analyze

# Expected results:
# - Image components in separate chunks
# - Progressive image utilities minimal impact
# - No large image processing libraries bundled
```

### 3. Image Performance Checklist
- [ ] Progressive loading works (blur → full resolution)
- [ ] Lazy loading prevents unnecessary image requests
- [ ] Image gallery handles 8+ images smoothly
- [ ] Voting interface responsive on mobile
- [ ] Error states display properly
- [ ] Loading states provide good UX
- [ ] Bundle size impact minimal (<25KB added)

### 4. Performance Metrics
Target achievements:
- **Image Loading:** First image visible <500ms
- **Gallery Scroll:** Smooth at 60fps
- **Bundle Impact:** <25KB increase from image components
- **Memory Usage:** No memory leaks during image loading

## Success Criteria

### Functional Requirements
- [ ] Images generate within 30 seconds
- [ ] All prompts get images (or fallbacks)
- [ ] Error handling prevents game interruption
- [ ] Rate limiting prevents API errors
- [ ] Images display correctly in voting phase
- [ ] Metadata is properly stored

### Optimization Requirements
- [ ] Progressive image loading implemented
- [ ] Lazy loading prevents unnecessary requests
- [ ] Image gallery smooth with 8+ images
- [ ] Bundle size impact under 25KB
- [ ] First image loads under 500ms
- [ ] No memory leaks during image operations

## Next Steps
Once AI integration works AND image optimization verified:
1. Test image loading performance in browser DevTools
2. Verify bundle size impact is minimal
3. Test with full game (4+ players)
4. Monitor API costs and image loading metrics
5. Optimize prompt quality
6. **Document image performance improvements**
7. Proceed to **05-realtime-presence-instructions.md**
