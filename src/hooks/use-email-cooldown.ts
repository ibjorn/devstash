"use client";

import { useCallback, useEffect, useState } from "react";

import {
  EMAIL_COOLDOWN_SECONDS,
  formatCountdown,
} from "@/lib/auth/email-cooldown";

/**
 * The lockout on a button that emails a link. A second request inside the
 * server's cooldown is silently ignored, so offering the button back sooner
 * would only invite a click that does nothing — or, if it lands before the
 * first request's deferred send has finished, a duplicate email.
 */
export function useEmailCooldown() {
  const [sent, setSent] = useState(false);
  const [lockout, setLockout] = useState(0);

  // Re-armed each tick rather than run as one long interval — simpler to reason
  // about, and the timer is cleared on unmount either way
  useEffect(() => {
    if (lockout <= 0) return;
    const id = setTimeout(() => setLockout((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [lockout]);

  const markSent = useCallback(() => {
    setSent(true);
    setLockout(EMAIL_COOLDOWN_SECONDS);
  }, []);

  return {
    /** A link has gone out at least once. */
    sent,
    locked: lockout > 0,
    /** The time left as "m:ss", for the button label. */
    countdown: formatCountdown(lockout),
    markSent,
  };
}
