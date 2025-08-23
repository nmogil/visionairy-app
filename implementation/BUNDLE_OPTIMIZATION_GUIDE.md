# Bundle Optimization Guide

## Overview

This guide provides comprehensive bundle optimization strategies for the Visionairy app, addressing the 826KB → 450KB optimization target (45% reduction).

## Current State Analysis

### Baseline Bundle (Before Optimization)
- **Total Size:** 826KB (65% over 500KB warning)
- **Main Issues:**
  - All routes loaded synchronously
  - 22 Radix UI components bundled upfront
  - 61 lucide-react icon imports
  - Heavy dependencies: framer-motion, date-fns bundled immediately
  - No code splitting implemented

### Target State (After Optimization)
- **Total Initial Bundle:** 400-450KB
- **Route Chunks:** <200KB each
- **Game Phase Chunks:** <100KB each
- **Performance:** First paint <1.5s, TTI <3s on 3G

## Optimization Strategy

### 1. Route-Based Code Splitting

#### Implementation
```typescript
// src/App.tsx - Optimized routing
import { lazy, Suspense } from "react";

// Lazy load non-critical routes
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Room = lazy(() => import("./pages/Room"));
const GameClient = lazy(() => import("./pages/GameClient"));

// Keep auth routes synchronous for fast login
import Login from "./pages/Login";
import Signup from "./pages/Signup";
```

#### Expected Impact
- **Initial Bundle Reduction:** 200-300KB
- **Route Isolation:** Each page loads independently
- **Improved Caching:** Individual route updates don't invalidate entire bundle

### 2. Component-Level Code Splitting

#### Game Phase Optimization
```typescript
// src/utils/gamePhases.ts
import { lazy, ComponentType } from "react";

// Split each game phase into separate chunks
export const PromptPhase = lazy(() => import("../features/game/phases/PromptPhase"));
export const VotingPhase = lazy(() => import("../features/game/phases/VotingPhase"));
export const ResultsPhase = lazy(() => import("../features/game/phases/ResultsPhase"));
```

#### Heavy Component Splitting
```typescript
// Split dashboard components
const StatsCharts = lazy(() => import("./StatsCharts"));
const LeaderboardTable = lazy(() => import("./LeaderboardTable"));
const GameHistoryList = lazy(() => import("./GameHistoryList"));
```

#### Expected Impact
- **Game Phase Chunks:** <100KB each
- **Dashboard Chunks:** <200KB each
- **Improved User Experience:** Only loads what's needed

### 3. Icon Optimization Strategy

#### Problem
- 61 lucide-react icon imports
- Each icon import adds ~2-3KB
- Total icon overhead: ~120-180KB

#### Solution: Dynamic Icon Loading
```typescript
// src/components/ui/dynamic-icon.tsx
interface DynamicIconProps extends LucideProps {
  name: string;
  fallback?: FC<LucideProps>;
}

export function DynamicIcon({ name, ...props }: DynamicIconProps) {
  const [IconComponent, setIconComponent] = useState<FC<LucideProps> | null>(null);
  
  useEffect(() => {
    const loadIcon = async () => {
      const iconModule = await import("lucide-react");
      const Icon = iconModule[name as keyof typeof iconModule];
      setIconComponent(() => Icon);
    };
    
    loadIcon();
  }, [name]);
  
  return IconComponent ? <IconComponent {...props} /> : <div className="w-4 h-4" />;
}
```

#### Migration Strategy
```typescript
// Before (bundled immediately)
import { Heart, Check, ArrowLeft } from "lucide-react";

// After (loaded dynamically)
import { DynamicIcon } from "@/components/ui/dynamic-icon";

<DynamicIcon name="Heart" className="w-4 h-4" />
```

#### Expected Impact
- **Initial Bundle Reduction:** 100-150KB
- **On-demand Loading:** Icons load only when needed
- **Better Performance:** Faster initial page load

### 4. Library Optimization

#### Framer Motion Optimization
```typescript
// src/utils/animations.ts - Lazy load motion library
let motionImport: Promise<typeof import("framer-motion")> | null = null;

export async function loadMotion() {
  if (!motionImport) {
    motionImport = import("framer-motion");
  }
  return motionImport;
}

// Use dynamic motion components
export async function createMotionDiv() {
  const { motion } = await loadMotion();
  return motion.div;
}
```

#### Radix UI Optimization
```typescript
// Before: All components bundled
import {
  Dialog, DropdownMenu, Select, Tabs,
  // ... 18 more components
} from "@radix-ui/react-*";

// After: Lazy load heavy components
const AdvancedDialog = lazy(() => import("./AdvancedDialog"));
const SettingsDropdown = lazy(() => import("./SettingsDropdown"));
```

#### Expected Impact
- **Animation Library:** Loaded only when animations needed
- **UI Components:** Lazy load non-critical components
- **Bundle Reduction:** 50-100KB

### 5. Image Optimization

#### Progressive Loading Implementation
```typescript
// src/components/ui/progressive-image.tsx
export function ProgressiveImage({ src, alt, blurDataUrl, ...props }) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  
  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "50px" }
    );
    
    // Observer setup...
  }, []);
  
  return (
    <div className="relative">
      {/* Blur placeholder */}
      {blurDataUrl && !loaded && (
        <img src={blurDataUrl} className="blur-sm" />
      )}
      
      {/* Main image */}
      {inView && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          className={loaded ? "opacity-100" : "opacity-0"}
        />
      )}
    </div>
  );
}
```

#### Expected Impact
- **Bundle Size:** Minimal impact (<25KB)
- **Loading Performance:** Progressive loading improves perceived performance
- **Network Efficiency:** Images load only when needed

## Build Configuration Optimization

### Vite Configuration
```typescript
// vite.config.ts - Optimized build setup
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'convex-vendor': ['convex', '@convex-dev/auth'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs'
          ],
          'animation-vendor': ['framer-motion'],
          'utils-vendor': ['date-fns', 'clsx', 'tailwind-merge']
        }
      }
    },
    chunkSizeWarningLimit: 500,
    sourcemap: true
  },
})
```

### Expected Chunk Sizes
- **react-vendor:** ~150KB
- **convex-vendor:** ~80KB
- **ui-vendor:** ~120KB
- **animation-vendor:** ~100KB (lazy loaded)
- **utils-vendor:** ~50KB

## Implementation Phases

### Phase 1: Route Splitting (Expected: -200KB)
1. Implement lazy loading for main routes
2. Add Suspense boundaries with loading states
3. Test navigation performance

### Phase 2: Component Splitting (Expected: -150KB)
1. Split game phases into separate chunks
2. Lazy load dashboard components
3. Split heavy UI components

### Phase 3: Icon Optimization (Expected: -120KB)
1. Create DynamicIcon component
2. Replace all lucide-react imports
3. Test icon loading performance

### Phase 4: Library Optimization (Expected: -80KB)
1. Implement dynamic framer-motion loading
2. Lazy load heavy Radix UI components
3. Optimize utility libraries

### Phase 5: Image Optimization (Expected: -30KB bundle impact)
1. Implement progressive image loading
2. Add lazy loading for image galleries
3. Optimize image display components

## Performance Monitoring

### Bundle Analysis Commands
```bash
# Build and analyze
npm run build

# Check chunk sizes
ls -lah dist/assets/*.js | sort -k5 -h

# Use bundle analyzer (if configured)
npm run build -- --analyze
```

### Performance Testing
```bash
# Automated performance test
node test/performance.js

# DevTools testing
# 1. Open DevTools → Network tab
# 2. Navigate through app
# 3. Verify chunks load on-demand
# 4. Test lazy loading behavior
```

### Key Metrics to Monitor
- **Total Bundle Size:** <450KB
- **Largest Chunk:** <200KB
- **First Paint:** <1.5s on 3G
- **Time to Interactive:** <3s on 3G
- **Lazy Loading Success Rate:** >95%

## Troubleshooting

### Common Issues

#### Bundle Size Still Too Large
```bash
# Check for duplicate dependencies
npm ls --depth=0

# Analyze specific chunk contents
npx webpack-bundle-analyzer dist/assets/*.js
```

#### Lazy Loading Failures
```typescript
// Add error boundaries for lazy loading
function LazyComponentWrapper({ children }) {
  return (
    <ErrorBoundary fallback={<div>Failed to load component</div>}>
      <Suspense fallback={<LoadingSpinner />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}
```

#### Icons Not Loading
```typescript
// Add fallback for dynamic icons
<DynamicIcon 
  name="Heart" 
  fallback={({ className }) => <div className={cn("w-4 h-4 bg-muted", className)} />}
/>
```

### Performance Regression Checklist
- [ ] Check for new large dependencies
- [ ] Verify lazy loading still working
- [ ] Test dynamic imports
- [ ] Monitor chunk sizes after updates
- [ ] Validate loading states work properly

## Success Criteria

### Bundle Size Targets (Mandatory)
- [ ] Total initial bundle <450KB (down from 826KB)
- [ ] No single chunk >200KB
- [ ] Route chunks properly separated
- [ ] Game phase chunks <100KB each

### Performance Targets (Mandatory)
- [ ] First paint <1.5s on 3G simulation
- [ ] Time to interactive <3s on 3G simulation
- [ ] Smooth navigation between routes
- [ ] No console errors during lazy loading

### User Experience Targets (Recommended)
- [ ] Loading states provide good UX
- [ ] Images load progressively
- [ ] Animations smooth at 60fps
- [ ] Mobile performance optimized

## Maintenance

### Regular Tasks
- **Weekly:** Check bundle size after major changes
- **Monthly:** Audit dependencies for new optimizations
- **Quarterly:** Review and update lazy loading patterns

### Dependency Updates
When updating dependencies, verify:
1. Bundle size impact
2. Lazy loading still works
3. Performance targets maintained
4. No new console errors

## Conclusion

This optimization strategy targets a 45% bundle size reduction (826KB → 450KB) through systematic code splitting, lazy loading, and library optimization. The approach prioritizes user experience while maintaining development velocity.

Key success factors:
1. **Progressive Implementation:** Implement optimizations in phases
2. **Continuous Monitoring:** Track metrics throughout development
3. **User-Focused:** Prioritize perceived performance improvements
4. **Maintainable:** Ensure optimizations don't hurt developer experience

Expected timeline: 2-3 weeks for full implementation across all features.