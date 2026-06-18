import { useEffect, useState } from "react";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    let verificationTimeout: NodeJS.Timeout;

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
        // Set to true immediately during verification to prevent banner flash
        setIsOnline(true);
        // Debounce verification to avoid rapid pings
        clearTimeout(verificationTimeout);
        verificationTimeout = setTimeout(verifyNetwork, 500);
      } else {
        // Browser reports offline - trust it immediately
        setIsOnline(false);
      }
    };

    // Initial check
    updateStatus();

    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      clearTimeout(verificationTimeout);
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  return isOnline;
}
