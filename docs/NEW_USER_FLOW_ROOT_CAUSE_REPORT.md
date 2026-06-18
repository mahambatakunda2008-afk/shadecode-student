# Shadecode Student New User Flow Root Cause Report

**Report Date:** June 17, 2026  
**Auditor:** Cascade AI  
**Platform:** Shadecode Student  
**Issue:** New students shown "You're offline" followed by 404 page despite active internet connection

---

## Executive Summary

Critical issue identified where new students experience false offline detection leading to a 404 error. The root cause is a race condition between the service worker's offline fallback response and the useOnlineStatus hook's network verification, combined with middleware routing logic that can redirect users to non-existent routes.

**Severity:** CRITICAL  
**Status:** Root Cause Identified  
**Affected Files:** 7  
**Affected Routes:** Multiple

---

## Issue Description

New students registering or logging in sometimes see:
1. "You're offline" message (from OfflineShell component)
2. Followed by a 404 page

This occurs despite having an active internet connection, preventing new students from accessing the platform.

---

## Root Cause Analysis

### Root Cause #1: Service Worker 503 Response Triggers False Offline Detection

**Location:** `public/sw.js` (lines 142-149)  
**Severity:** CRITICAL  
**Description:**

The service worker's `networkFirstStrategy` returns a 503 response with "Offline - No cached content available" when network requests fail:

```javascript
// Return offline shell if no cache
return new Response('Offline - No cached content available', {
  status: 503,
  statusText: 'Service Unavailable',
  headers: new Headers({
    'Content-Type': 'text/plain',
  }),
});
```

**Problem:**
- When `/api/ping` fails (for any reason), the service worker returns a 503
- The useOnlineStatus hook treats non-OK responses as offline
- This triggers OfflineShell to display "You're offline"
- For new users, `/api/ping` might fail due to timing, auth issues, or other transient errors

**Impact:** False offline detection for users with active internet connection

---

### Root Cause #2: useOnlineStatus Hook Treats Any Non-OK Response as Offline

**Location:** `src/hooks/useOnlineStatus.ts` (lines 25-29)  
**Severity:** CRITICAL  
**Description:**

The useOnlineStatus hook treats any non-OK response from `/api/ping` as offline:

```typescript
if (response.ok) {
  setIsOnline(true);
} else {
  setIsOnline(false);
}
```

**Problem:**
- If `/api/ping` returns 404, 500, 503, or any non-OK status, it sets isOnline to false
- This is overly aggressive - network errors should be distinguished from HTTP errors
- A 503 from the service worker (when content isn't cached) is treated as offline even when network is available

**Impact:** False offline detection when API endpoints return non-OK responses

---

### Root Cause #3: Middleware Redirects to /onboarding Without Verifying Route Exists

**Location:** `middleware.ts` (lines 74-78)  
**Severity:** HIGH  
**Description:**

The middleware redirects users to `/onboarding` if they don't have the onboarding_complete cookie:

```typescript
// Authenticated but onboarding pending → force into /onboarding
if (!onboardingComplete && !onOnboarding) {
  const url = req.nextUrl.clone();
  url.pathname = '/onboarding';
  return NextResponse.redirect(url);
}
```

**Problem:**
- If `/onboarding` route doesn't exist or fails to load, user gets a 404
- No verification that the redirect target exists before redirecting
- No error handling if the redirect fails

**Impact:** Users can be redirected to non-existent or failing routes, resulting in 404 errors

---

### Root Cause #4: Signup Page Redirects to /onboarding Without Setting Cookie

**Location:** `src/app/(public)/auth/signup/page.tsx` (lines 29-38)  
**Severity:** HIGH  
**Description:**

The signup page creates a profile and redirects to `/onboarding` without setting the onboarding_complete cookie:

```typescript
if (data.user) {
  await supabase.from("profiles").insert({
    id: data.user.id,
    username,
    level: 1,
    xp: 0,
    streak: 0,
  });
  router.push("/onboarding");
}
```

**Problem:**
- User is redirected to `/onboarding` without the onboarding_complete cookie
- Middleware sees authenticated user without onboarding_complete cookie
- Middleware redirects to `/onboarding` (already there)
- If `/onboarding` fails to load (due to offline detection or other issues), user sees 404

**Impact:** New users can get stuck in redirect loops or see 404 errors if onboarding page fails

---

### Root Cause #5: Login Page Redirects to /dashboard Without Verifying Onboarding Status

**Location:** `src/app/(public)/auth/login/page.tsx` (lines 16-29)  
**Severity:** MEDIUM  
**Description:**

The login page redirects to `/dashboard` without checking onboarding status:

```typescript
const handleLogin = async () => {
  setLoading(true);
  setError("");

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    setError(error.message);
    setLoading(false);
    return;
  }

  router.push("/dashboard");
  setLoading(false);
};
```

**Problem:**
- If user hasn't completed onboarding, middleware will redirect them to `/onboarding`
- This creates an unnecessary redirect chain: login → dashboard → onboarding
- If any step fails, user can see 404 or get stuck

**Impact:** Inefficient routing and potential for redirect loops or 404 errors

---

### Root Cause #6: No Error Handling in useOnlineStatus for Network Failures vs HTTP Errors

**Location:** `src/hooks/useOnlineStatus.ts` (lines 30-32)  
**Severity:** HIGH  
**Description:**

The useOnlineStatus hook treats all errors the same way:

```typescript
} catch (error) {
  // If ping fails, treat as offline
  setIsOnline(false);
}
```

**Problem:**
- Network errors (no connection) are treated the same as HTTP errors (404, 500, etc.)
- A 404 on `/api/ping` (route doesn't exist) is treated as offline
- A 500 error (server error) is treated as offline
- Only actual network failures should trigger offline mode

**Impact:** False offline detection for various HTTP errors

---

### Root Cause #7: Service Worker Caches Can Return Stale 503 Responses

**Location:** `public/sw.js` (lines 106-151)  
**Severity:** MEDIUM  
**Description:**

The service worker's networkFirstStrategy can return cached 503 responses:

```javascript
const cachedResponse = await cache.match(request);

if (cachedResponse) {
  return cachedResponse;
}
```

**Problem:**
- If a 503 response was cached (from a previous offline state), it might be served
- This can cause false offline detection even when network is available
- No cache invalidation for 503 responses

**Impact:** Stale offline responses can be served when network is available

---

## Affected Files

1. **public/sw.js** - Service worker returns 503 for network failures
2. **src/hooks/useOnlineStatus.ts** - Treats all non-OK responses as offline
3. **middleware.ts** - Redirects to /onboarding without verification
4. **src/app/(public)/auth/signup/page.tsx** - Redirects without setting cookie
5. **src/app/(public)/auth/login/page.tsx** - Redirects without checking onboarding
6. **src/components/OfflineShell.tsx** - Displays offline message based on hook
7. **src/contexts/BandwidthContext.tsx** - Additional offline detection

---

## Affected Routes

1. **/onboarding** - Can fail to load, causing 404
2. **/dashboard** - Can be redirected to if onboarding not complete
3. **/api/ping** - Used for network verification, can fail
4. **/api/onboarding/complete** - Sets onboarding_complete cookie
5. **All protected routes** - Subject to middleware redirects

---

## Reproduction Path

### Scenario 1: New User Registration

1. User registers at `/auth/signup`
2. Profile created in database
3. User redirected to `/onboarding`
4. `useOnlineStatus` hook mounts, calls `/api/ping`
5. Service worker returns 503 (network failure or cached 503)
6. `useOnlineStatus` sets `isOnline = false`
7. `OfflineShell` displays "You're offline"
8. User refreshes or navigates
9. Middleware redirects to `/onboarding`
10. `/onboarding` fails to load (due to offline state or other issue)
11. User sees 404 page

### Scenario 2: New User Login

1. User logs in at `/auth/login`
2. User redirected to `/dashboard`
3. Middleware sees no `onboarding_complete` cookie
4. Middleware redirects to `/onboarding`
5. `useOnlineStatus` hook fails to verify network
6. `OfflineShell` displays "You're offline"
7. `/onboarding` fails to load
8. User sees 404 page

### Scenario 3: Onboarding Completion

1. User completes onboarding
2. `/api/onboarding/complete` sets `onboarding_complete` cookie
3. User redirected to `/dashboard`
4. If `/api/ping` fails during this transition, offline state triggers
5. User sees "You're offline" followed by 404

---

## Severity Assessment

### Critical Issues (2)
1. Service worker 503 response triggers false offline detection
2. useOnlineStatus treats any non-OK response as offline

### High Issues (3)
1. Middleware redirects without verifying route exists
2. Signup redirects without setting cookie
3. No error handling for network vs HTTP errors

### Medium Issues (2)
1. Login redirects without checking onboarding status
2. Service worker caches can return stale 503 responses

---

## Recommended Fixes

### Fix #1: Improve useOnlineStatus to Distinguish Network Errors from HTTP Errors

**File:** `src/hooks/useOnlineStatus.ts`  
**Priority:** CRITICAL  
**Implementation:**
- Check for specific HTTP status codes
- Only treat network errors (no connection) as offline
- Treat HTTP errors (404, 500, etc.) as online but with degraded service
- Add retry logic for transient failures

### Fix #2: Remove or Modify Service Worker 503 Response

**File:** `public/sw.js`  
**Priority:** CRITICAL  
**Implementation:**
- Remove the 503 response fallback
- Let network errors fail naturally
- Don't return custom offline responses that can be confused with actual offline state
- Or change the response to not include "Offline" in the body

### Fix #3: Add Route Verification Before Middleware Redirects

**File:** `middleware.ts`  
**Priority:** HIGH  
**Implementation:**
- Verify redirect targets exist before redirecting
- Add try-catch around redirects
- Provide fallback routes if primary redirect fails
- Add logging for redirect failures

### Fix #4: Set onboarding_complete Cookie After Profile Creation

**File:** `src/app/(public)/auth/signup/page.tsx`  
**Priority:** HIGH  
**Implementation:**
- Set a temporary flag or cookie after profile creation
- Ensure middleware knows user is in onboarding flow
- Prevent redirect loops

### Fix #5: Check Onboarding Status Before Login Redirect

**File:** `src/app/(public)/auth/login/page.tsx`  
**Priority:** MEDIUM  
**Implementation:**
- Check if user has completed onboarding before redirecting
- Redirect to appropriate destination based on status
- Reduce unnecessary redirect chains

### Fix #6: Add Error Handling and Logging

**Files:** Multiple  
**Priority:** HIGH  
**Implementation:**
- Add comprehensive error logging
- Add user-friendly error messages
- Add graceful recovery paths
- Add loading states during transitions

---

## Next Steps

1. Implement Fix #1 and Fix #2 (Critical)
2. Implement Fix #3 and Fix #4 (High)
3. Implement Fix #5 and Fix #6 (Medium)
4. Test all new user flows
5. Verify no false offline states
6. Verify no 404 errors

---

**Report Status:** Root Cause Identified  
**Next Phase:** Implementation
