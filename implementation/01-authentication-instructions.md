# Step 1: Authentication System Implementation

## Objective
Implement a simple authentication system using Convex Auth with OTP (One-Time Password) via Resend email and anonymous guest support.

## Prerequisites
- ✅ Completed Step 0 (Setup & Configuration)
- ✅ Convex dev server running
- ✅ Resend account created (https://resend.com)
- ✅ Resend API key obtained

## Deliverables
- ✅ OTP authentication via email (using Resend)
- ✅ Anonymous guest support
- ✅ User profile management
- ✅ Username selection during onboarding
- ✅ Protected routes and auth state management
- ✅ Automatic new vs existing user detection

## Implementation Steps

### 1. Install Required Dependencies

```bash
npm install @convex-dev/auth resend @oslojs/crypto
```

### 2. Configure Resend API Key

Sign up for Resend at https://resend.com and get your API key, then:

```bash
npx convex env set AUTH_RESEND_KEY your_resend_api_key_here
```

### 3. Define User Schema

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
    isNewUser: v.optional(v.boolean()), // Track if user just signed up
    
    // Game statistics
    gamesPlayed: v.optional(v.number()),
    gamesWon: v.optional(v.number()),
    totalScore: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_username", ["username"]),
});
```

### 4. Create OTP Provider with Resend

Create `convex/ResendOTP.ts`:

```typescript
import { Email } from "@convex-dev/auth/providers/Email";
import { Resend as ResendAPI } from "resend";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";

export const ResendOTP = Email({
  id: "resend-otp",
  apiKey: process.env.AUTH_RESEND_KEY,
  maxAge: 60 * 10, // 10 minutes
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes) {
        crypto.getRandomValues(bytes);
      },
    };
    
    // Generate 6-digit code
    const alphabet = "0123456789";
    return generateRandomString(random, alphabet, 6);
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    const resend = new ResendAPI(provider.apiKey);
    
    const { error } = await resend.emails.send({
      // Use 'onboarding@resend.dev' for testing, replace with your domain in production
      from: "prompty <onboarding@resend.dev>",
      to: [email],
      subject: `Your prompty login code: ${token}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
          <div style="max-width: 500px; margin: 0 auto; background-color: white; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 30px;">
            <h1 style="color: #18181b; font-size: 24px; margin-bottom: 10px;">Your login code</h1>
            <p style="color: #71717a; margin-bottom: 30px;">Enter this code to sign in to prompty:</p>
            
            <div style="background-color: #f4f4f5; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 30px;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #18181b; font-family: monospace;">
                ${token}
              </span>
            </div>
            
            <p style="color: #71717a; font-size: 14px; margin-bottom: 10px;">
              This code will expire in 10 minutes.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 30px 0;">
            
            <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
              If you didn't request this code, you can safely ignore this email.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `Your prompty login code: ${token}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, you can safely ignore this email.`,
    });
    
    if (error) {
      throw new Error(JSON.stringify(error));
    }
  },
});
```

### 5. Configure Authentication with OTP

Create `convex/auth.ts`:

```typescript
import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { ResendOTP } from "./ResendOTP";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [ResendOTP, Anonymous],
  
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      // Check if this is an existing user
      const existingUser = args.existingUserId 
        ? await ctx.db.get(args.existingUserId)
        : null;
        
      if (existingUser) {
        // EXISTING USER - just update last active time
        await ctx.db.patch(existingUser._id, {
          lastActiveAt: Date.now(),
          isNewUser: false, // Ensure it's marked as not new
        });
        return existingUser._id;
      }
      
      // NEW USER - create with default values
      const userId = await ctx.db.insert("users", {
        ...args.profile,
        email: args.profile?.email,
        isAnonymous: args.provider === "anonymous",
        lastActiveAt: Date.now(),
        onboardingCompleted: false,
        isNewUser: true, // Mark as new user
        gamesPlayed: 0,
        gamesWon: 0,
        totalScore: 0,
      });
      
      return userId;
    },
  },
});
```

### 6. Set Up HTTP Routes

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

### 7. Create User Management Functions

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
      isNewUser: v.optional(v.boolean()),
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
      isNewUser: false, // No longer a new user after onboarding
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

### 8. Update Frontend Auth Provider

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

### 9. Create Auth Hook

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
    isNewUser: user?.isNewUser === true,
    needsOnboarding: user && !user.onboardingCompleted,
  };
}
```

### 10. Create Simple OTP Login Component

Update `src/pages/Login.tsx`:

```tsx
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { ArrowLeft, Mail, KeyRound, User } from "lucide-react";

export function Login() {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append("email", email);
      await signIn("resend-otp", formData);
      setStep("code");
    } catch (err) {
      setError("Failed to send code. Please check your email and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("code", code);
      await signIn("resend-otp", formData);
      navigate("/dashboard");
    } catch (err) {
      setError("Invalid or expired code. Please try again.");
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
      setError("Guest login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep("email");
    setCode("");
    setError(null);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to prompty</CardTitle>
          <CardDescription>
            {step === "email" 
              ? "Enter your email to get started" 
              : `We sent a code to ${email}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "email" ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>
              
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send Login Code"}
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or
                  </span>
                </div>
              </div>
              
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGuestLogin}
                disabled={loading}
              >
                <User className="mr-2 h-4 w-4" />
                Continue as Guest
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="pl-10 text-center text-2xl tracking-widest"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>
              
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
              
              <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
                {loading ? "Verifying..." : "Sign In"}
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={handleBack}
                disabled={loading}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Use Different Email
              </Button>
              
              <p className="text-center text-sm text-muted-foreground">
                Didn't receive the code?{" "}
                <button
                  type="button"
                  onClick={() => handleSendCode(new Event("submit") as any)}
                  className="underline hover:text-primary"
                  disabled={loading}
                >
                  Resend
                </button>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### 11. Keep Username Dialog (unchanged)

The `src/components/auth/UsernameDialog.tsx` component remains the same as it works for both OTP and password auth.

## How New vs Existing Users Work

### Detection Logic
The system automatically detects new vs existing users:

1. **New User**: When `args.existingUserId` is `null` in the `createOrUpdateUser` callback
   - Sets `isNewUser: true` flag
   - Sets `onboardingCompleted: false`
   - User sees username selection dialog

2. **Existing User**: When `args.existingUserId` is present
   - Updates `lastActiveAt` timestamp
   - Sets `isNewUser: false` 
   - User goes directly to dashboard

### Usage in Components
```typescript
// In your App.tsx or routing logic
const { user, isNewUser, needsOnboarding } = useAuth();

if (isNewUser || needsOnboarding) {
  // Show username selection dialog
  return <UsernameDialog open={true} />;
}
```

## Testing Instructions

### 1. Test OTP Send
```typescript
// In browser console
const formData = new FormData();
formData.append("email", "test@example.com");
await signIn("resend-otp", formData);
// Check email for code
```

### 2. Test OTP Verification
```typescript
const formData = new FormData();
formData.append("email", "test@example.com");
formData.append("code", "123456"); // Use actual code from email
await signIn("resend-otp", formData);
```

### 3. Test New vs Existing User
```typescript
// Check current user
const user = await convex.query(api.users.getCurrentUser);
console.log("Is new user?", user?.isNewUser);
console.log("Needs onboarding?", !user?.onboardingCompleted);
```

### 4. Test Guest Login
```typescript
await signIn("anonymous");
```

## Environment Variables

Required in your Convex dashboard:
```
AUTH_RESEND_KEY=re_xxxxxxxxxxxxx
```

## Common Issues & Solutions

### Issue: "Failed to send code"
**Solution:** 
- Check AUTH_RESEND_KEY is set correctly
- Verify Resend account is active
- For testing, use "onboarding@resend.dev" as sender

### Issue: Code not received
**Solution:** 
- Check spam folder
- Verify email address is correct
- Resend has rate limits for free tier

### Issue: Code expired
**Solution:** Code expires in 10 minutes, request a new one

## Success Criteria
- [ ] Users can sign in with email OTP
- [ ] OTP codes are received via email
- [ ] Guest login works without email
- [ ] New users see username selection
- [ ] Existing users skip onboarding
- [ ] Protected routes redirect to login

## Benefits of OTP over Password

1. **No Password Management** - Users don't forget passwords
2. **Enhanced Security** - No password leaks, time-limited codes
3. **Simpler Implementation** - No reset flows, validation, or storage
4. **Better UX** - Familiar pattern (Slack, WhatsApp)
5. **Less Support** - No "forgot password" tickets

## Next Steps
Once authentication is working:
1. Test with multiple email addresses
2. Verify new vs existing user detection
3. Confirm username uniqueness
4. Proceed to **02-room-management-instructions.md**