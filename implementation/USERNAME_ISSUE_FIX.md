# Username Update Issue - Authentication Error

## Problem Summary

While the core OTP authentication flow is working correctly, there's an issue with the `updateUsername` mutation that throws "Not authenticated" errors even when the user is properly authenticated.

## Current Status

### ✅ Working:
- OTP email sending and verification
- Authentication token storage in localStorage
- Authentication state persistence across page refreshes
- User recognition as authenticated (can access protected routes)
- Username dialog appears correctly for new users

### ❌ Not Working:
- `updateUsername` mutation fails with "Not authenticated" error
- Username onboarding cannot be completed

## Technical Analysis

### Error Details:
```
[CONVEX M(users:updateUsername)] Server Error
Uncaught Error: Not authenticated at handler (../convex/users.ts:41:28)
```

### Root Cause:
The issue appears to be in how the `updateUsername` mutation is checking authentication state. The current implementation uses:

```typescript
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Not authenticated");
```

But this is failing even though:
1. Auth tokens exist in localStorage
2. The user can access protected routes
3. Session refresh is happening successfully (visible in logs)

## Potential Solutions to Investigate

### 1. Check Convex Auth Documentation
- Review the official Convex Auth documentation for the correct way to check authentication in mutations
- Verify if there's a difference between checking auth in queries vs mutations
- Look for examples of authenticated mutations in the docs

### 2. Compare with Query Implementation
The `getCurrentUser` query works correctly and uses the same auth check pattern:
```typescript
const identity = await ctx.auth.getUserIdentity();
if (!identity) return null;
```

Investigate why the query succeeds but the mutation fails.

### 3. Debugging Steps
- Add more detailed logging to the `updateUsername` mutation to see what `ctx.auth.getUserIdentity()` returns
- Check if the auth context is different between queries and mutations
- Verify if the mutation is being called with the correct authentication headers

### 4. Alternative Auth Patterns
Research if Convex Auth provides different methods for checking authentication:
- Look for mutation-specific auth helpers
- Check if there's a different pattern for authenticated mutations
- Investigate if the auth callback configuration affects mutation auth

### 5. User Creation Flow
The issue might be related to the user creation process:
- Verify if the user record is properly created during the OTP flow
- Check if the `createOrUpdateUser` callback is working correctly
- Ensure the user ID in the auth token matches the user record ID

## Files to Review

### Backend Files:
- `convex/auth.ts` - Auth configuration and callbacks
- `convex/users.ts` - User-related queries and mutations
- `convex/schema.ts` - User table schema

### Frontend Files:
- `src/hooks/use-auth.ts` - Authentication state management
- `src/components/auth/UsernameDialog.tsx` - Username form component

## Investigation Priority

1. **High Priority**: Review Convex Auth documentation for authenticated mutations
2. **Medium Priority**: Add debugging logs to understand the auth context in mutations
3. **Low Priority**: Consider alternative auth patterns if the current approach is incorrect

## Expected Outcome

Once fixed, users should be able to:
1. Complete the OTP authentication flow
2. See the username dialog for new users
3. Successfully save their username
4. Proceed to the main application

## Notes

- The core authentication functionality is working correctly
- This is specifically a mutation authorization issue
- The fix should be relatively straightforward once the correct auth pattern is identified