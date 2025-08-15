# Step 1: Authentication System Implementation

## Objective
Implement a complete authentication system using Convex Auth with email/password and anonymous guest support.

## Prerequisites
- ✅ Completed Step 0 (Setup & Configuration)
- ✅ Convex dev server running
- ✅ Environment variables configured

## Deliverables
- ✅ User authentication with email/password
- ✅ Anonymous guest support
- ✅ User profile management
- ✅ Username selection during onboarding
- ✅ Protected routes and auth state management

## Implementation Steps

### 1. Define User Schema

Create/Update `convex/schema.ts`:

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  
  // Extended user profile
  users: defineTable({
    // Auth fields (managed by Convex Auth)
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    image: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    name: v.optional(v.string()),
    
    // Custom fields for our app
    username: v.optional(v.string()),
    displayName: v.optional(v.string()),
    avatarId: v.optional(v.id("_storage")),
    lastActiveAt: v.optional(v.number()),
    onboardingCompleted: v.optional(v.boolean()),
    
    // Game statistics
    gamesPlayed: v.optional(v.number()),
    gamesWon: v.optional(v.number()),
    totalScore: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_username", ["username"]),
});
```

### 2. Configure Authentication Providers

Create `convex/auth.ts`:

```typescript
import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    // Password authentication with email
    Password({
      // Custom password validation
      validatePasswordRequirements: (password: string) => {
        if (password.length < 8) {
          throw new Error("Password must be at least 8 characters");
        }
        if (!/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
          throw new Error("Password must contain letters and numbers");
        }
      },
      
      // Custom profile handling
      profile(params) {
        return {
          email: params.email as string,
          name: params.name as string,
        };
      },
    }),
    
    // Anonymous authentication for guests
    Anonymous,
  ],
  
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      // Check if user exists
      const existingUser = args.existingUserId 
        ? await ctx.db.get(args.existingUserId)
        : null;
        
      if (existingUser) {
        // Update last active timestamp
        await ctx.db.patch(existingUser._id, {
          lastActiveAt: Date.now(),
        });
        return existingUser._id;
      }
      
      // Create new user with default values
      return await ctx.db.insert("users", {
        ...args.profile,
        lastActiveAt: Date.now(),
        onboardingCompleted: false,
        gamesPlayed: 0,
        gamesWon: 0,
        totalScore: 0,
      });
    },
  },
});
```

### 3. Set Up HTTP Routes

Create `convex/http.ts`:

```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";

const http = httpRouter();

// Add authentication routes
auth.addHttpRoutes(http);

// Health check endpoint
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response("OK", { status: 200 });
  }),
});

export default http;
```

### 4. Create User Management Functions

Create `convex/users.ts`:

```typescript
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get current authenticated user
export const getCurrentUser = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("users"),
      email: v.optional(v.string()),
      username: v.optional(v.string()),
      displayName: v.optional(v.string()),
      avatarId: v.optional(v.id("_storage")),
      onboardingCompleted: v.optional(v.boolean()),
      gamesPlayed: v.optional(v.number()),
      gamesWon: v.optional(v.number()),
      totalScore: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
    })
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    
    // For anonymous users, use subject ID
    const query = identity.email 
      ? ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", identity.email))
      : ctx.db.query("users").filter((q) => q.eq(q.field("_id"), identity.subject));
    
    const user = await query.unique();
    return user;
  },
});

// Update username (onboarding step)
export const updateUsername = mutation({
  args: {
    username: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    // Validate username format
    if (args.username.length < 3 || args.username.length > 20) {
      throw new Error("Username must be 3-20 characters");
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(args.username)) {
      throw new Error("Username can only contain letters, numbers, and underscores");
    }
    
    // Check if username is already taken
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();
      
    if (existing) {
      throw new Error("Username already taken");
    }
    
    // Get current user
    const query = identity.email
      ? ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", identity.email))
      : ctx.db.query("users").filter((q) => q.eq(q.field("_id"), identity.subject));
    
    const user = await query.unique();
    if (!user) throw new Error("User not found");
    
    // Update user profile
    await ctx.db.patch(user._id, {
      username: args.username,
      displayName: args.username,
      onboardingCompleted: true,
    });
    
    return null;
  },
});

// Check if username is available
export const checkUsernameAvailable = query({
  args: {
    username: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();
    
    return !existing;
  },
});
```

### 5. Update Frontend Auth Provider

Update `src/main.tsx`:

```tsx
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import React from "react";
import ReactDOM from "react-dom/client";
import { ConvexReactClient } from "convex/react";
import App from "./App.tsx";
import "./index.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConvexAuthProvider client={convex}>
      <App />
    </ConvexAuthProvider>
  </React.StrictMode>,
);
```

### 6. Create Auth Hook

Create `src/hooks/use-auth.ts`:

```typescript
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useAuth() {
  const { signIn, signOut } = useAuthActions();
  const user = useQuery(api.users.getCurrentUser);
  
  return {
    user,
    signIn,
    signOut,
    isAuthenticated: !!user,
    isLoading: user === undefined,
    needsOnboarding: user && !user.onboardingCompleted,
  };
}
```

### 7. Update Login Component

Update `src/pages/Login.tsx`:

```tsx
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

export function Login() {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    formData.append("flow", isSignUp ? "signUp" : "signIn");
    
    try {
      await signIn("password", formData);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await signIn("anonymous");
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Guest login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isSignUp ? "Create Account" : "Sign In"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                disabled={loading}
              />
            </div>
            
            {isSignUp && (
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  disabled={loading}
                />
              </div>
            )}
            
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                disabled={loading}
                minLength={8}
              />
            </div>
            
            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Loading..." : (isSignUp ? "Sign Up" : "Sign In")}
            </Button>
          </form>
          
          <div className="mt-4 space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsSignUp(!isSignUp)}
              disabled={loading}
            >
              {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
            </Button>
            
            <Button
              variant="ghost"
              className="w-full"
              onClick={handleGuestLogin}
              disabled={loading}
            >
              Continue as Guest
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 8. Create Username Selection Component

Create `src/components/auth/UsernameDialog.tsx`:

```tsx
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";

export function UsernameDialog({ open }: { open: boolean }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  
  const updateUsername = useMutation(api.users.updateUsername);
  const isAvailable = useQuery(
    api.users.checkUsernameAvailable,
    username.length >= 3 ? { username } : "skip"
  );
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      await updateUsername({ username });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update username");
    }
  };
  
  useEffect(() => {
    if (username.length >= 3) {
      setChecking(true);
      const timer = setTimeout(() => setChecking(false), 300);
      return () => clearTimeout(timer);
    }
  }, [username]);
  
  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Choose Your Username</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_]+"
              required
            />
            {username.length >= 3 && !checking && (
              <p className={`text-sm mt-1 ${isAvailable ? "text-green-500" : "text-red-500"}`}>
                {isAvailable ? "Username available" : "Username taken"}
              </p>
            )}
          </div>
          
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
          
          <Button 
            type="submit" 
            disabled={!isAvailable || username.length < 3}
            className="w-full"
          >
            Continue
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

## Testing Instructions

### 1. Test User Registration
```typescript
// In browser console
const formData = new FormData();
formData.append("email", "test@example.com");
formData.append("password", "testpass123");
formData.append("name", "Test User");
formData.append("flow", "signUp");

await convex.mutation(api.auth.signIn, {
  provider: "password",
  params: Object.fromEntries(formData)
});
```

### 2. Test Current User Query
```typescript
const user = await convex.query(api.users.getCurrentUser);
console.log("Current user:", user);
```

### 3. Test Username Update
```typescript
await convex.mutation(api.users.updateUsername, {
  username: "testuser123"
});
```

### 4. Test Guest Login
```typescript
await convex.mutation(api.auth.signIn, {
  provider: "anonymous"
});
```

## Debug Commands

```bash
# View users table
mcp_convex_data --deploymentSelector dev --tableName users --order asc

# Check auth tables
mcp_convex_tables --deploymentSelector dev

# Test auth functions
mcp_convex_functionSpec --deploymentSelector dev | grep auth
```

## Common Issues & Solutions

### Issue: "User not found" after sign-in
**Solution:** Check that email index is properly set in schema

### Issue: Password validation errors
**Solution:** Ensure password meets requirements (8+ chars, letters and numbers)

### Issue: Username already taken
**Solution:** The checkUsernameAvailable query helps prevent this in UI

## Success Criteria
- [ ] Users can sign up with email/password
- [ ] Users can sign in with existing credentials
- [ ] Guest login works without credentials
- [ ] Username selection appears for new users
- [ ] Current user data is accessible
- [ ] Protected routes redirect to login

## Next Steps
Once authentication is working:
1. Test with multiple user accounts
2. Verify username uniqueness
3. Proceed to **02-room-management-instructions.md**
