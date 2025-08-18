# Step 7: Testing & Production Deployment

## Objective
Comprehensive testing of all features and deployment to production with monitoring and optimization.

## Prerequisites
- ✅ Completed Steps 0-6 (All features implemented)
- ✅ Local development working end-to-end
- ✅ All environment variables configured

## Deliverables
- ✅ Complete test coverage
- ✅ Performance optimization
- ✅ Production deployment
- ✅ Monitoring setup
- ✅ Error tracking
- ✅ Backup and recovery procedures

## Part 1: Comprehensive Testing

### 1. End-to-End Test Scenarios

Create `test/e2e-scenarios.md`:

```markdown
# E2E Test Scenarios

## Scenario 1: Complete Game Flow
1. User signs up with email
2. User completes onboarding (username selection)
3. User creates a room
4. 3 other users join the room
5. Host starts game
6. All players submit prompts
7. System generates images
8. All players vote
9. Results are shown
10. Game completes all rounds
11. Final scores are displayed
12. Stats are updated

## Scenario 2: Connection Recovery
1. User joins room
2. User loses connection (close tab)
3. User reconnects (reopen tab)
4. User continues from same state
5. Presence updates correctly

## Scenario 3: Edge Cases
1. Last-second prompt submission
2. Host leaves during game
3. All players except one disconnect
4. API rate limit hit during generation
5. Invalid/inappropriate prompt handling
```

### 2. Automated Test Suite

Create `convex/test/gameFlow.test.ts`:

```typescript
import { convexTest } from "convex-test";
import { expect, test, describe, beforeAll } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

describe("Game Flow Tests", () => {
  let t: ReturnType<typeof convexTest>;
  
  beforeAll(() => {
    t = convexTest(schema);
  });
  
  test("Complete game flow", async () => {
    // Create users
    const user1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "user1@test.com",
        username: "player1",
        displayName: "Player One",
        onboardingCompleted: true,
        gamesPlayed: 0,
        gamesWon: 0,
        totalScore: 0,
      });
    });
    
    const user2Id = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "user2@test.com",
        username: "player2",
        displayName: "Player Two",
        onboardingCompleted: true,
        gamesPlayed: 0,
        gamesWon: 0,
        totalScore: 0,
      });
    });
    
    // Create room
    const { roomId, code } = await t.mutation(api.rooms.createRoom, {
      name: "Test Room",
      settings: {
        maxPlayers: 4,
        roundsPerGame: 2,
        timePerRound: 60,
      },
    });
    
    expect(roomId).toBeDefined();
    expect(code).toHaveLength(6);
    
    // Join room
    const joinResult = await t.mutation(api.rooms.joinRoom, {
      code,
    });
    
    expect(joinResult.success).toBe(true);
    
    // Get room state
    const roomState = await t.query(api.rooms.getRoomState, {
      roomId,
    });
    
    expect(roomState?.players).toHaveLength(2);
    expect(roomState?.canStart).toBe(true);
    
    // Start game
    await t.mutation(api.game.startGame, {
      roomId,
    });
    
    // Submit prompts
    await t.mutation(api.game.submitPrompt, {
      roomId,
      prompt: "flying through space",
    });
    
    await t.mutation(api.game.submitPrompt, {
      roomId,
      prompt: "eating pizza",
    });
    
    // Get game state
    const gameState = await t.query(api.game.getGameState, {
      roomId,
    });
    
    expect(gameState?.round?.status).toBe("prompt");
    expect(gameState?.players).toHaveLength(2);
  });
  
  test("Room capacity limits", async () => {
    const { roomId, code } = await t.mutation(api.rooms.createRoom, {
      name: "Small Room",
      settings: {
        maxPlayers: 2,
      },
    });
    
    // First join should succeed
    await t.mutation(api.rooms.joinRoom, { code });
    
    // Third join should fail
    await expect(
      t.mutation(api.rooms.joinRoom, { code })
    ).rejects.toThrow("Room is full");
  });
  
  test("Prompt validation", async () => {
    const roomId = "test_room_id";
    
    // Too short prompt
    await expect(
      t.mutation(api.game.submitPrompt, {
        roomId,
        prompt: "ab",
      })
    ).rejects.toThrow("Prompt must be between 3 and 100 characters");
    
    // Too long prompt
    const longPrompt = "a".repeat(101);
    await expect(
      t.mutation(api.game.submitPrompt, {
        roomId,
        prompt: longPrompt,
      })
    ).rejects.toThrow("Prompt must be between 3 and 100 characters");
  });
});
```

### 3. Performance Testing

Create `test/performance.test.ts`:

```typescript
import { performance } from "perf_hooks";

describe("Performance Tests", () => {
  test("Image generation within time limit", async () => {
    const start = performance.now();
    
    // Simulate image generation for 8 players
    const prompts = Array(8).fill(null).map((_, i) => ({
      id: `prompt_${i}`,
      text: `test prompt ${i}`,
    }));
    
    // Test parallel generation
    await Promise.all(
      prompts.map(async (prompt) => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
      })
    );
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
  });
  
  test("Query subscription performance", async () => {
    // Test that subscriptions don't cause memory leaks
    const subscriptions = [];
    
    for (let i = 0; i < 100; i++) {
      subscriptions.push(
        convex.onUpdate(api.rooms.getRoomState, 
          { roomId: "test" },
          () => {}
        )
      );
    }
    
    // Check memory usage
    const memUsage = process.memoryUsage();
    expect(memUsage.heapUsed).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    
    // Cleanup
    subscriptions.forEach(unsub => unsub());
  });
});
```

### 4. Load Testing Script

Create `scripts/loadTest.ts`:

```typescript
import { ConvexClient } from "convex/browser";

async function loadTest() {
  const CONCURRENT_USERS = 20;
  const CONVEX_URL = process.env.VITE_CONVEX_URL!;
  
  console.log(`Starting load test with ${CONCURRENT_USERS} users...`);
  
  const clients = Array(CONCURRENT_USERS).fill(null).map(() => 
    new ConvexClient(CONVEX_URL)
  );
  
  // Simulate concurrent room creation
  const roomCreations = clients.map(async (client, i) => {
    const start = Date.now();
    
    try {
      const result = await client.mutation(api.rooms.createRoom, {
        name: `Load Test Room ${i}`,
      });
      
      const duration = Date.now() - start;
      console.log(`Room ${i} created in ${duration}ms`);
      
      return { success: true, duration };
    } catch (error) {
      console.error(`Room ${i} creation failed:`, error);
      return { success: false, error };
    }
  });
  
  const results = await Promise.all(roomCreations);
  
  // Calculate statistics
  const successful = results.filter(r => r.success);
  const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
  
  console.log(`
    Load Test Results:
    - Success rate: ${(successful.length / CONCURRENT_USERS * 100).toFixed(1)}%
    - Average duration: ${avgDuration.toFixed(0)}ms
    - Failures: ${CONCURRENT_USERS - successful.length}
  `);
}

loadTest().catch(console.error);
```

## Part 2: Production Deployment

### 1. Pre-Deployment Checklist

```markdown
## Pre-Deployment Checklist

### Code Quality
- [ ] All TypeScript errors resolved
- [ ] ESLint warnings addressed
- [ ] No console.log statements in production code
- [ ] Sensitive data removed from code

### Environment Variables
- [ ] Production Convex URL set
- [ ] OpenAI API key configured
- [ ] JWT secret generated
- [ ] SITE_URL points to production domain

### Security
- [ ] Authentication required for all protected routes
- [ ] Input validation on all user inputs
- [ ] Rate limiting configured
- [ ] CORS settings appropriate

### Performance
- [ ] Images optimized
- [ ] Bundle size < 500KB
- [ ] Lazy loading implemented
- [ ] Database indexes created

### Testing
- [ ] All tests passing
- [ ] Load testing completed
- [ ] Edge cases handled
- [ ] Error boundaries in place
```

### 2. Deploy to Production

```bash
# Step 1: Build the frontend
npm run build

# Step 2: Deploy Convex backend to production
npx convex deploy --prod

# Step 3: Set production environment variables
npx convex env set OPENAI_API_KEY your_production_key --prod
npx convex env set SITE_URL https://yourdomain.com --prod
npx convex env set JWT_PRIVATE_KEY "$(openssl ecparam -name secp256k1 -genkey -noout | openssl ec -outform DER | tail -c +8 | head -c 32 | xxd -p -c 32)" --prod

# Step 4: Run production migrations if needed
npx convex run admin:seedQuestionCards --prod

# Step 5: Deploy frontend to Vercel/Netlify
vercel --prod
# or
netlify deploy --prod
```

### 3. Production Configuration

Create `.env.production`:

```env
VITE_CONVEX_URL=https://your-app.convex.cloud
VITE_PUBLIC_URL=https://yourdomain.com
VITE_SENTRY_DSN=your_sentry_dsn
```

Update `vite.config.ts` for production:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    visualizer({ open: true, gzipSize: true })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'convex-vendor': ['convex', '@convex-dev/auth'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        }
      }
    },
    chunkSizeWarningLimit: 600,
  },
  define: {
    'process.env': process.env
  }
})
```

### 4. Monitoring Setup

Create `convex/monitoring.ts`:

```typescript
import { httpAction } from "./_generated/server";
import { query } from "./_generated/server";
import { v } from "convex/values";

// Health check endpoint
export const healthCheck = httpAction(async (ctx) => {
  try {
    // Check database connection
    const testQuery = await ctx.runQuery(internal.monitoring.checkDatabase);
    
    // Check OpenAI API
    const apiStatus = process.env.OPENAI_API_KEY ? "configured" : "missing";
    
    return new Response(
      JSON.stringify({
        status: "healthy",
        timestamp: Date.now(),
        database: testQuery ? "connected" : "error",
        openai: apiStatus,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: "unhealthy",
        error: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

// System metrics
export const getSystemMetrics = query({
  args: {},
  returns: v.object({
    totalUsers: v.number(),
    activeGames: v.number(),
    completedGames: v.number(),
    totalImages: v.number(),
    averageResponseTime: v.number(),
    errorRate: v.number(),
  }),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const activeRooms = await ctx.db
      .query("rooms")
      .withIndex("by_status", (q) => q.eq("status", "playing"))
      .collect();
    const completedGames = await ctx.db
      .query("gameStats")
      .collect();
    const images = await ctx.db
      .query("generatedImages")
      .collect();
    
    return {
      totalUsers: users.length,
      activeGames: activeRooms.length,
      completedGames: completedGames.length,
      totalImages: images.length,
      averageResponseTime: 0, // Would need APM integration
      errorRate: 0, // Would need error tracking
    };
  },
});
```

### 5. Error Tracking Setup

Install and configure Sentry:

```bash
npm install @sentry/react
```

Update `src/main.tsx`:

```tsx
import * as Sentry from "@sentry/react";

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

// Wrap app with Sentry error boundary
const SentryRoutes = Sentry.withSentryRouting(Routes);
```

### 6. Backup and Recovery

Create `scripts/backup.ts`:

```typescript
import { ConvexHttpClient } from "convex/browser";
import fs from "fs";

async function backupData() {
  const client = new ConvexHttpClient(process.env.CONVEX_URL!);
  
  const tables = [
    "users",
    "rooms",
    "gameStats",
    "userStats",
    "questionCards",
  ];
  
  const backup: Record<string, any[]> = {};
  
  for (const table of tables) {
    console.log(`Backing up ${table}...`);
    const data = await client.query(api.admin.exportTable, { table });
    backup[table] = data;
  }
  
  const timestamp = new Date().toISOString().replace(/:/g, "-");
  const filename = `backup-${timestamp}.json`;
  
  fs.writeFileSync(filename, JSON.stringify(backup, null, 2));
  console.log(`Backup saved to ${filename}`);
}

backupData().catch(console.error);
```

## Part 3: Post-Deployment

### 1. Monitoring Dashboard

Create a monitoring dashboard to track:
- Active users
- Game completion rate
- Image generation success rate
- API costs
- Error rates
- Performance metrics

### 2. Alerting Rules

Set up alerts for:
- High error rate (> 1%)
- Slow response times (> 3s)
- Failed image generations
- Low game completion rate
- High API costs

### 3. Scaling Considerations

```markdown
## Scaling Strategy

### Current Limits
- Max 100 concurrent games
- Max 1000 active users
- 50 images/minute generation rate

### Scale Triggers
- CPU > 80% for 5 minutes
- Memory > 90%
- Request queue > 100
- Response time > 2s p95

### Scaling Actions
1. Increase Convex compute units
2. Upgrade OpenAI API tier
3. Implement image caching CDN
4. Add request queuing
5. Implement progressive loading
```

## Testing Commands Reference

```bash
# Run all tests
npm test

# Run specific test suite
npm test gameFlow

# Run load tests
npm run test:load

# Check bundle size
npm run build -- --analyze

# Test production build locally
npm run preview

# Check for security vulnerabilities
npm audit

# Verify environment variables
npx convex env list --prod
```

## Debug Production Issues

```bash
# View production logs
npx convex logs --prod

# Check production data
mcp_convex_status --deploymentSelector prod
mcp_convex_data --deploymentSelector prod --tableName rooms --limit 10

# Run production function
mcp_convex_run --deploymentSelector prod --functionName "monitoring:getSystemMetrics" --args '{}'

# Check health endpoint
curl https://your-app.convex.site/health
```

## Success Criteria
- [ ] All tests pass (unit, integration, e2e)
- [ ] Load test handles 100+ concurrent users
- [ ] Production deployment successful
- [ ] Monitoring dashboard operational
- [ ] Error tracking configured
- [ ] Backup system tested
- [ ] Documentation complete

## Maintenance Schedule

### Daily
- Check error logs
- Monitor API usage
- Review performance metrics

### Weekly
- Run full test suite
- Check for dependency updates
- Review user feedback
- Backup production data

### Monthly
- Security audit
- Performance optimization review
- Cost analysis
- Feature usage analytics

## Congratulations! 🎉

Your prompty app is now fully deployed and operational. Remember to:
1. Monitor user feedback
2. Track performance metrics
3. Iterate based on usage patterns
4. Keep dependencies updated
5. Maintain good documentation

For support, consult the Convex documentation or reach out to the community.
