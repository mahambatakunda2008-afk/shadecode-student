import { useEffect, useState } from "react";

/**
 * Real network status, not naive navigator.onLine. Verifies "back online"
 * with an actual ping (existing behavior), and now also debounces "went
 * offline" by 1.5s -- a flaky low-end/weak-signal connection (the exact
 * Itel-A56-class scenario this was built to handle) can fire the browser's
 * `offline` event for a brief blip that recovers on its own; treating that
 * as a real offline transition caused visible flicker/disruption for no
 * reason. A genuine, sustained offline period is unaffected by a 1.5s delay.
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    let verificationTimeout: NodeJS.Timeout;
    let offlineDebounceTimeout: NodeJS.Timeout;

    const verifyNetwork = async () => {
      if (typeof navigator === "undefined" || !navigator.onLine) {
        setIsOnline(false);
        return;
      }

      setIsVerifying(true);

      try {
        // Ping the server to verify actual connectivity
        const response = await fetch("/api/ping", { 
          cache: "no-store",
          method: "GET",
        });
        
        if (response.ok) {
          setIsOnline(true);
        } else {
          // Distinguish between network errors and HTTP errors
          // HTTP errors (404, 500, etc.) don't mean we're offline
          // Only actual network failures should trigger offline mode
          // If we got a response (even an error one), we're online
          setIsOnline(true);
        }
      } catch (error) {
        // Only treat actual network errors (no connection) as offline
        // This catches TypeError for failed fetches, CORS issues, etc.
        if (error instanceof TypeError) {
          setIsOnline(false);
        } else {
          // Other errors might be server-side issues, not offline
          setIsOnline(true);
        }
      } finally {
        setIsVerifying(false);
      }
    };

    const updateStatus = () => {
      // When browser reports online, verify with actual network ping
      if (navigator.onLine) {
        // A recovery cancels any pending "went offline" debounce.
        clearTimeout(offlineDebounceTimeout);
        // Set to true immediately during verification to prevent banner flash
        setIsOnline(true);
        // Debounce verification to avoid rapid pings
        clearTimeout(verificationTimeout);
        verificationTimeout = setTimeout(verifyNetwork, 500);
      } else {
        // Browser reports offline -- debounce briefly rather than trusting
        // it instantly, so a momentary blip on a flaky connection doesn't
        // flip the whole app into offline mode and back within a second.
        clearTimeout(offlineDebounceTimeout);
        offlineDebounceTimeout = setTimeout(() => setIsOnline(false), 1500);
      }
    };

    // Initial check
    updateStatus();

    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      clearTimeout(verificationTimeout);
      clearTimeout(offlineDebounceTimeout);
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  return isOnline;
}
