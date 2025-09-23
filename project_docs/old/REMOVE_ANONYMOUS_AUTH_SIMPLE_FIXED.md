# Remove Anonymous Authentication - Simplified Implementation

## Overview
Remove anonymous authentication entirely and require email authentication for all users.

**Estimated Time**: 1 hour
**Complexity**: Very Low
**Risk**: Minimal

## Step 1: Clear Existing Data (5 minutes)

Go to [Convex Dashboard](https://dashboard.convex.dev/d/judicious-spaniel-983) → Data → users table → Delete all rows

## Step 2: Update Backend (15 minutes)

### 2.1 Update Auth Configuration
**File**: `convex/auth.ts`
**Action**: Replace entire file content

```typescript
import { convexAuth } from "@convex-dev/auth/server";
import { ResendOTP } from "./ResendOTP";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [ResendOTP], // Only email authentication
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      if (args.existingUserId) {
        const existingUser = await ctx.db.get(args.existingUserId);
        if (existingUser) {
          await ctx.db.patch(existingUser._id, {
            lastActiveAt: Date.now(),
          });
          return existingUser._id;
        }
      }

      // All users are email users now
      const userData = {
        ...args.profile,
        email: args.profile?.email,
        lastActiveAt: Date.now(),
        onboardingCompleted: false, // All users need username setup
        isNewUser: true,
        gamesPlayed: 0,
        gamesWon: 0,
        totalScore: 0,
      };

      const userId = await ctx.db.insert("users", userData);
      return userId;
    },
  },
});
```

### 2.2 Update Schema
**File**: `convex/schema.ts`
**Line 14**: Remove this line completely

```typescript
isAnonymous: v.optional(v.boolean()),
```

## Step 3: Update Frontend (30 minutes)

### 3.1 Remove Guest Login from Login Page
**File**: `src/pages/Login.tsx`
**Lines 86-99**: Delete the `handleGuestLogin` function
**Lines 188-209**: Delete the guest login section (OR section + button)

### 3.2 Update CreateRoomButton
**File**: `src/components/landing/CreateRoomButton.tsx`
**Lines 64-79**: Replace with redirect to login

```typescript
const handleCreateRoom = useCallback(async () => {
  if (!isAuthenticated) {
    navigate("/login");
    return;
  }

  if (isAuthenticated && user && !user.username) {
    setShowNameModal(true);
    return;
  }

  if (isAuthenticated && user?.username) {
    createAndNavigateToRoom();
  }
}, [isAuthenticated, user, navigate, createAndNavigateToRoom]);
```

### 3.3 Update JoinRoomForm
**File**: `src/components/landing/JoinRoomForm.tsx`
**Lines 79-92**: Replace with redirect to login

```typescript
// If not authenticated, redirect to login
if (!isAuthenticated) {
  navigate("/login");
  return;
}
```

### 3.4 Update ProtectedRoute
**File**: `src/components/auth/ProtectedRoute.tsx`
**Lines 22-49**: Replace auto-anonymous signin with redirect

```typescript
// Just redirect to login if not authenticated - no auto signin
useEffect(() => {
  if (!isLoading && !isAuthenticated) {
    // Redirect happens automatically by the component return
  }
}, [isLoading, isAuthenticated]);
```

### 3.5 Update useAuth Hook
**File**: `src/hooks/use-auth.ts**
**Line 20**: Remove the isAnonymous comment

## Step 4: Clean Up (10 minutes)

### 4.1 Remove All Anonymous References
```bash
# Search and remove any remaining references
grep -r "anonymous" src/ --exclude-dir=node_modules
grep -r "isAnonymous" src/ --exclude-dir=node_modules
grep -r "guest" src/ --exclude-dir=node_modules -i

# Remove or comment out any remaining anonymous code
```

### 4.2 Test
```bash
npm run dev

# Test:
# 1. Go to homepage - should redirect to login for create/join
# 2. Only email login should be available
# 3. After email login, username setup should work
# 4. Room creation should work after authentication
```

## Result

After this implementation:
- ✅ No anonymous/guest authentication
- ✅ All users must use email authentication
- ✅ All users go through username setup
- ✅ Clean, simple authentication flow
- ✅ No complex username provider needed

**Total time**: ~1 hour vs 2-3 hours for the complex approach

This approach removes all the complexity of custom authentication providers and just uses email authentication for everyone.