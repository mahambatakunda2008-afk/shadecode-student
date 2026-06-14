# False Offline Detection Investigation Report

**Date:** 2025-01-15  
**Issue:** Users see "You're offline" banner despite having active internet connection  
**Status:** Root cause identified

---

## Root Cause

**Exact Root Cause:** `OfflineShell.tsx` reads `navigator.onLine` directly on every render without using React state or event listeners.

**Affected File:** `src/components/OfflineShell.tsx:6`

**Problematic Code:**
```typescript
export default function OfflineShell() {
  const isOnline = typeof window !== "undefined" && navigator.onLine;

  if (isOnline) return null;
  // ... shows offline banner
}
```

**Why This Causes False Offline Detection:**

1. **No React State:** The component reads `navigator.onLine` directly in the component body instead of using `useState`
2. **No Event Listeners:** The component doesn't listen to `online` and `offline` events
3. **No Re-render Trigger:** When the network status changes, the component has no way to know it needs to re-render
4. **Stale Value:** The value of `navigator.onLine` is captured at render time and never updates until something else triggers a re-render

**Result:** If a user goes offline and then comes back online, the offline banner will persist indefinitely until:
- The user manually refreshes the page
- Some other component triggers a re-render of the entire app
- The user navigates to a different page

---

## Affected Files

### Primary Issue
- **`src/components/OfflineShell.tsx`** - The UI offline banner component (line 6)

### Secondary Issues (Same Pattern)
- **`src/contexts/BandwidthContext.tsx`** - Line 41 calls `bandwidthDetector.isOffline()` on every render without event listeners
- **`src/lib/bandwidth/detector.ts`** - Line 71-73, `isOffline()` method just checks `navigator.onLine` without event listeners

### Correct Implementation (For Reference)
- **`src/app/offline/page.tsx`** - Lines 10-13, correctly uses useState with online/offline event listeners
- **`src/app/(app)/learn/[lessonId]/page.tsx`** - Lines 106-117, correctly listens to `online` event for progress sync

---

## Service Worker Analysis

**File:** `public/sw.js`

**Finding:** The service worker does NOT control `navigator.onLine`. It only handles:
- Fetch events and caching strategies
- Background sync
- Push notifications

The service worker cannot set the browser's online/offline status. This is controlled solely by the browser's network stack.

**Conclusion:** Service worker is NOT the cause of the false offline detection.

---

## Reproduction Steps

1. Open the application with an active internet connection
2. Disconnect from the internet (turn off WiFi, unplug ethernet, or use browser DevTools to go offline)
3. Observe the "You're Offline" banner appears (correct behavior)
4. Reconnect to the internet
5. **Expected:** Offline banner should disappear
6. **Actual:** Offline banner persists indefinitely
7. Refresh the page - banner disappears (because component re-renders with fresh `navigator.onLine` value)

---

## Proposed Fix

### Fix for OfflineShell.tsx

Replace the direct `navigator.onLine` check with React state and event listeners:

```typescript
"use client";

import { useState, useEffect } from "react";
import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflineShell() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Initialize with current status
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Cleanup event listeners on unmount
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    // ... existing JSX unchanged ...
  );
}
```

### Additional Fix for BandwidthContext.tsx

Add online/offline event listeners to the BandwidthDetector or update the context to listen to events:

```typescript
// In BandwidthContext.tsx
useEffect(() => {
  // Subscribe to bandwidth changes
  const unsubscribe = bandwidthDetector.subscribe((info) => {
    setBandwidthInfo(info);
  });

  // NEW: Also listen to online/offline events
  const handleOnline = () => {
    setBandwidthInfo(bandwidthDetector.getInfo());
  };
  const handleOffline = () => {
    setBandwidthInfo(bandwidthDetector.getInfo());
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    unsubscribe();
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}, []);
```

---

## Implementation Effort

- **OfflineShell.tsx fix:** 15 minutes
- **BandwidthContext.tsx fix:** 15 minutes
- **Testing:** 30 minutes
- **Total:** 1 hour

---

## Testing Strategy

1. **Manual Testing:**
   - Go offline, verify banner appears
   - Go online, verify banner disappears automatically
   - Test on different browsers (Chrome, Firefox, Safari)
   - Test on mobile devices

2. **Edge Cases:**
   - Rapid online/offline toggling
   - Page load while offline
   - Page load while online
   - Tab switching while offline

---

## Summary

**Root Cause:** React component reading mutable browser API value without state management or event listeners

**Severity:** Medium (UX issue, not data loss)

**Impact:** Users see incorrect offline status, may think app is broken when it's actually working

**Fix Complexity:** Low (simple React pattern fix)

**Recommendation:** Implement fix immediately as it's a quick win that improves user experience significantly
