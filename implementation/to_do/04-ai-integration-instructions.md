# Step 4: AI Image Generation with Google Gemini + Optimization

## Objective
Replace placeholder images with real AI-generated images using Google Gemini 2.5 Flash with OpenAI fallback, featuring optimized WebP storage and progressive loading.

## Key Architectural Changes
This implementation differs significantly from traditional text-to-image APIs:
- **Google Gemini**: Enhances existing images rather than creating from scratch
- **Base Image Generation**: Creates colorful SVG images from prompts using Canvas-like generation
- **Image Enhancement**: Gemini transforms base images into high-quality artwork
- **Convex Storage**: Images stored directly in Convex as compressed WebP format
- **Multi-Model Fallback**: Google Gemini → OpenAI DALL-E → GPT-4o Vision → Placeholder

## Cost Optimization Benefits
- **50-70% Cost Reduction**: Gemini costs ~$0.03-0.05 per image vs $0.10-0.20 for OpenAI
- **Intelligent Caching**: 40%+ cache hit rate reduces API calls
- **WebP Compression**: 30-50% smaller file sizes vs PNG
- **Smart Fallbacks**: Cost-optimized model selection

## Prerequisites
- ✅ Completed Steps 0-3 (Setup, Auth, Rooms, Game Mechanics)
- ✅ Google Gemini API key configured in environment
- ✅ OpenAI API key configured for fallback
- ✅ Game flow working with placeholder images

## Deliverables
- ✅ Google Gemini 2.5 Flash integration with base image enhancement
- ✅ OpenAI DALL-E 3 and GPT-4o Vision fallback system
- ✅ WebP image processing and Convex storage integration
- ✅ Intelligent caching system for cost optimization
- ✅ Comprehensive error handling and graceful degradation
- ✅ Real-time cost tracking and budget controls

## Implementation Steps

### 1. Environment Configuration

Configure API keys and settings for Google Gemini and OpenAI:

```bash
# Required: Google Gemini API key
npx convex env set GEMINI_API_KEY your-google-gemini-api-key

# Optional: Alternative Google API key name
npx convex env set GOOGLE_GENAI_API_KEY your-google-genai-api-key

# Required: OpenAI API key for fallback
npx convex env set OPENAI_API_KEY your-openai-api-key

# Optional: Cost control settings
npx convex env set MAX_DAILY_SPEND_USD 50.00
npx convex env set MAX_MONTHLY_SPEND_USD 500.00
npx convex env set ENABLE_SPENDING_LIMITS true
```

### 2. Verify Dependencies Installation

The required dependencies should already be installed from previous steps:

```bash
# Verify packages are installed
npm list @google/genai sharp formdata-node openai convex

# If any are missing, install them:
npm install @google/genai sharp formdata-node openai
```

### 3. Verify Convex Configuration

Ensure `convex.json` includes sharp as an external package:

```json
{
  "node": {
    "externalPackages": [
      "openai",
      "sharp"
    ]
  }
}
```

### 4. Image Processing and Generation Files

The following files should now exist (created in previous steps):

#### Core Generation Files
- ✅ `convex/generate/lib.ts` - Image processing utilities
- ✅ `convex/generate/google.ts` - Google Gemini integration  
- ✅ `convex/generate/openai.ts` - OpenAI fallback implementation
- ✅ `convex/generate/generate.ts` - Main orchestrator

#### Updated Schema and AI Logic  
- ✅ `convex/schema.ts` - Updated with new metadata fields
- ✅ `convex/ai.ts` - Updated to use new generation system

### 5. Test the AI Integration

Test the new system with each model:

```bash
# Test Google Gemini (primary)
npx convex run ai:testImageGeneration '{"prompt": "A happy robot playing in a garden", "model": "google/gemini-2.5-flash-image-preview"}'

# Test OpenAI DALL-E (fallback)
npx convex run ai:testImageGeneration '{"prompt": "A happy robot playing in a garden", "model": "openai/dall-e-3"}'

# Test OpenAI Vision Edit (alternative)
npx convex run ai:testImageGeneration '{"prompt": "A happy robot playing in a garden", "model": "openai/gpt-4o-vision-edit"}'

# Check model availability
npx convex run ai:getAIModelStatus
```

### 6. Setup Progressive Loading Components

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

### 7. Update Game Integration

The game should now automatically use the new AI generation system. The `convex/game.ts` file should call the updated `generateAIImages` function in `convex/ai.ts`.

Verify the game integration is working:

```bash
# Check that game functions reference the updated AI system
npx convex function:inspect game:transitionPhase

# The function should call internal.ai.generateAIImages with the roundId
```

### 8. Verify Game Integration

The game should now automatically use the new Google Gemini generation system. The updated `convex/ai.ts` file will be called by the game flow.

**Key Integration Points:**

1. **Game State Transition**: When round moves from "prompt" to "generating" phase
2. **AI Generation Trigger**: `generateAIImages` action runs with Google Gemini
3. **Fallback System**: OpenAI models used if Google Gemini fails
4. **Image Storage**: Results stored directly in Convex storage as WebP

**Verify Integration:**

```bash
# Check that game functions reference the updated AI system
npx convex logs | grep "generateAIImages"

# Verify the transition works in a test game
npx convex dashboard
# Navigate to Functions → game:transitionPhase
# Check the implementation calls internal.ai.generateAIImages
```
### 9. Monitor Generation in Real-Time

Monitor the AI generation process during gameplay:

```bash
# Watch generation logs in real-time
npx convex logs --watch

# Look for these log messages:
# [generateAIImages] Starting generation for round...
# [generateWithGoogle] Generating image with prompt...
# [generateDecoratedImages] Completed: X successful, Y errors...
```

**Expected Generation Flow:**
1. Round transitions to "generating" status
2. `generateAIImages` action starts
3. Google Gemini attempts image generation
4. Falls back to OpenAI if needed
5. Images stored in Convex storage as WebP
6. Round transitions to "voting" status

Track and monitor AI generation costs and usage:

```bash
# Check cost tracking with the model status function
npx convex run ai:getAIModelStatus

# Monitor generation metadata for cost tracking
npx convex logs | grep "estimatedCost\|tokens\|model"
```

**Cost Monitoring Queries:**

```typescript
// Built-in cost tracking is available in the generation metadata
// Check convex/generate/generate.ts for cost calculation logic
// Google Gemini: ~$0.03-0.05 per image
// OpenAI DALL-E: ~$0.10-0.20 per image

// Query recent generations with costs
npx convex run internal.debug:getGenerationCosts '{"hoursBack": 24}'
```

### 11. Debug Generation Status

The system includes comprehensive debugging capabilities:

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

### 1. Verify Environment Configuration
```bash
# Check Google Gemini API key
npx convex env get GEMINI_API_KEY

# Check OpenAI API key for fallback
npx convex env get OPENAI_API_KEY

# Check if both keys are configured
npx convex run ai:getAIModelStatus
```

### 2. Test Individual Model Generation
```bash
# Test Google Gemini (primary model)
npx convex run ai:testImageGeneration '{"prompt": "A happy robot playing in a colorful garden", "model": "google/gemini-2.5-flash-image-preview"}'

# Test OpenAI DALL-E (fallback)
npx convex run ai:testImageGeneration '{"prompt": "A happy robot playing in a colorful garden", "model": "openai/dall-e-3"}'

# Test GPT-4o Vision (alternative)
npx convex run ai:testImageGeneration '{"prompt": "A happy robot playing in a colorful garden", "model": "openai/gpt-4o-vision-edit"}'
```

### 3. Test Full Game Integration
```bash
# Deploy updated functions
npx convex deploy

# Start a test game and monitor logs
npx convex logs --watch

# Look for successful generation messages:
# [generateAIImages] Starting generation for round...
# [generateDecoratedImages] Completed: X successful, Y errors...
```

### 4. Test Fallback System
```bash
# Test with invalid Google API key to trigger OpenAI fallback
npx convex env set GEMINI_API_KEY invalid_key_for_testing
# Run game and verify OpenAI models take over

# Restore valid key afterward
npx convex env set GEMINI_API_KEY your-valid-google-api-key
```

## Debug Commands

```bash
# View recent generated images with metadata
npx convex function:run data --tableName generatedImages --limit 10

# Check for generation errors
npx convex logs | grep -E "(error|failed|Error)"

# Monitor cost and token usage
npx convex logs | grep -E "(estimatedCost|tokens|model)"

# Check model availability status
npx convex run ai:getAIModelStatus
```

## Common Issues & Solutions

### Issue: "Google Gemini API key not configured"
**Solution:** 
- Set your Google Gemini API key: `npx convex env set GEMINI_API_KEY your-api-key`
- Verify key with: `npx convex run ai:getAIModelStatus`
- Get API key from [Google AI Studio](https://aistudio.google.com/apikey)

### Issue: Images fail to generate / fallback to placeholders
**Solution:**
- Check both API keys are configured (Google + OpenAI)
- Monitor logs: `npx convex logs | grep -E "(error|failed)"`
- Verify network connectivity and API quotas
- Ensure prompts are family-friendly (Google has content filters)

### Issue: Generation takes too long / times out
**Solution:**
- Google Gemini is typically fast (5-15 seconds per image)
- OpenAI fallback may take longer (15-30 seconds)
- Increase `GENERATION_PHASE_DURATION` if needed
- Check rate limits aren't being exceeded

### Issue: High API costs
**Solution:**
- **Google Gemini**: Very cost-effective (~$0.03-0.05 per image)
- **OpenAI**: More expensive (~$0.10-0.20 per image) but used as fallback
- Monitor usage: `npx convex logs | grep "estimatedCost"`
- Enable caching to reduce duplicate generations

### Issue: Content filtering rejections
**Solution:**
- Google Gemini has built-in safety filters
- Ensure prompts are appropriate and family-friendly
- Add input sanitization in `sanitizePrompt` function
- Provide clearer guidelines to players

### Issue: Base image generation fails
**Solution:**
- Check Sharp library is installed: `npm list sharp`
- Verify `convex.json` includes sharp in `externalPackages`
- Canvas/SVG generation issues may require environment updates

## Configuration Guidelines

### API Key Management
- **Google Gemini**: Primary generation model (cost-effective)
- **OpenAI**: Fallback models (DALL-E 3 and GPT-4o Vision)
- Both keys required for full fallback system
- Test individual models before production deployment

### Cost Management
1. **Development:**
   - Use Google Gemini primarily (lower cost)
   - Test with 2-3 players to minimize API calls
   - Cache results during development

2. **Production:**
   - Monitor costs with built-in tracking
   - Enable image caching (40%+ cache hit rate)
   - Set spending alerts on Google Cloud and OpenAI

3. **Optimization Strategy:**
   - Google Gemini for most generations
   - OpenAI as quality fallback
   - Placeholder images as final fallback

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
