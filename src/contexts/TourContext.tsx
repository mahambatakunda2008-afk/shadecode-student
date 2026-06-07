'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { TOUR_STEPS, TOUR_STORAGE_KEY, TOUR_VERSION } from '@/lib/tour-steps';
import type { TourContextValue, TourRect } from '@/types/tour';

const TourContext = createContext<TourContextValue | null>(null);

interface TourProviderProps {
  children: ReactNode;
  /** Pass `true` if the DB flag shows tour already completed — skips showing entirely */
  hasCompletedTour?: boolean;
  /** Set true once onboarding is done to auto-trigger the tour */
  onboardingComplete?: boolean;
}

export function TourProvider({
  children,
  hasCompletedTour = false,
  onboardingComplete = false,
}: TourProviderProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<TourRect | null>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Persistence helpers ───────────────────────────────────────────────────

  const isStoredComplete = useCallback((): boolean => {
    try {
      const raw = localStorage.getItem(TOUR_STORAGE_KEY);
      if (!raw) return false;
      const { version, completed } = JSON.parse(raw) as {
        version: string;
        completed: boolean;
      };
      return completed && version === TOUR_VERSION;
    } catch {
      return false;
    }
  }, []);

  const persistComplete = useCallback(async () => {
    try {
      localStorage.setItem(
        TOUR_STORAGE_KEY,
        JSON.stringify({ completed: true, version: TOUR_VERSION, ts: Date.now() }),
      );
      // Best-effort DB write — fail silently on the client
      await fetch('/api/user/complete-tour', { method: 'POST' }).catch(() => null);
    } catch {
      // localStorage unavailable (private mode edge case) — still safe
    }
  }, []);

  // ─── Element targeting ─────────────────────────────────────────────────────

  const resolveTargetRect = useCallback((stepIndex: number) => {
    const step = TOUR_STEPS[stepIndex];
    if (!step?.targetSelector) {
      setTargetRect(null);
      return;
    }

    const el = document.querySelector<HTMLElement>(
      `[data-tour-target="${step.targetSelector}"]`,
    );

    if (!el) {
      setTargetRect(null);
      return;
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Wait for scroll to settle before measuring
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      const r = el.getBoundingClientRect();
      setTargetRect({ x: r.left, y: r.top, width: r.width, height: r.height });
    }, 320);
  }, []);

  // Re-measure on window resize / scroll
  useEffect(() => {
    if (!isActive) return;
    const refresh = () => resolveTargetRect(currentStep);
    window.addEventListener('resize', refresh, { passive: true });
    window.addEventListener('scroll', refresh, { passive: true });
    return () => {
      window.removeEventListener('resize', refresh);
      window.removeEventListener('scroll', refresh);
    };
  }, [isActive, currentStep, resolveTargetRect]);

  // Resolve target whenever step changes
  useEffect(() => {
    if (isActive) resolveTargetRect(currentStep);
  }, [isActive, currentStep, resolveTargetRect]);

  // ─── Tour lifecycle ────────────────────────────────────────────────────────

  const startTour = useCallback(() => {
    if (hasCompletedTour || isStoredComplete()) return;
    setCurrentStep(0);
    setIsActive(true);
    document.body.style.overflow = 'hidden';
  }, [hasCompletedTour, isStoredComplete]);

  const endTour = useCallback(
    (persist: boolean) => {
      setIsActive(false);
      setTargetRect(null);
      document.body.style.overflow = '';
      if (persist) persistComplete();
    },
    [persistComplete],
  );

  const nextStep = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      endTour(true);
    }
  }, [currentStep, endTour]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  const skipTour = useCallback(() => endTour(true), [endTour]);

  // Auto-start once onboarding completes (only if not already done)
  useEffect(() => {
    if (onboardingComplete && !hasCompletedTour && !isStoredComplete()) {
      const t = setTimeout(startTour, 600); // small delay feels natural
      return () => clearTimeout(t);
    }
  }, [onboardingComplete, hasCompletedTour, isStoredComplete, startTour]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skipTour();
      if (e.key === 'ArrowRight') nextStep();
      if (e.key === 'ArrowLeft') prevStep();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isActive, skipTour, nextStep, prevStep]);

  // Cleanup timer on unmount
  useEffect(
    () => () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      document.body.style.overflow = '';
    },
    [],
  );

  const value: TourContextValue = {
    isActive,
    currentStep,
    totalSteps: TOUR_STEPS.length,
    currentStepData: TOUR_STEPS[currentStep],
    targetRect,
    startTour,
    nextStep,
    prevStep,
    skipTour,
  };

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used inside <TourProvider>');
  return ctx;
}
