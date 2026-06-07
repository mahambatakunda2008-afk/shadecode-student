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
import { completeTour as completeTourAction }          from '@/lib/actions/onboarding';
import type { TourContextValue, TourRect }             from '@/types';

const TourContext = createContext<TourContextValue | null>(null);

interface TourProviderProps {
  children:            ReactNode;
  /**
   * Comes from the DB via the server component.
   * true  = user already finished the tour — never show again.
   * false = show tour once onboarding is confirmed complete.
   */
  tourCompleted:       boolean;
  /**
   * true once the onboarding server action has run successfully.
   * Triggers auto-start if tour hasn't been seen yet.
   */
  onboardingCompleted: boolean;
}

export function TourProvider({
  children,
  tourCompleted,
  onboardingCompleted,
}: TourProviderProps) {
  const [isActive,    setIsActive]    = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect,  setTargetRect]  = useState<TourRect | null>(null);
  const scrollTimer                   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── localStorage fast-path ─────────────────────────────────────────────────
  // Prevents the 700ms auto-start delay from flashing on a hard refresh
  // when the user has already completed the tour in a previous session.

  const isLocallyComplete = useCallback((): boolean => {
    try {
      const raw = localStorage.getItem(TOUR_STORAGE_KEY);
      if (!raw) return false;
      const { version, completed } = JSON.parse(raw) as {
        version: string; completed: boolean;
      };
      return completed && version === TOUR_VERSION;
    } catch { return false; }
  }, []);

  const markLocallyComplete = useCallback(() => {
    try {
      localStorage.setItem(
        TOUR_STORAGE_KEY,
        JSON.stringify({ completed: true, version: TOUR_VERSION, ts: Date.now() }),
      );
    } catch { /* private-mode browsers — safe to ignore */ }
  }, []);

  // ── Element targeting ──────────────────────────────────────────────────────

  const resolveRect = useCallback((stepIndex: number) => {
    const selector = TOUR_STEPS[stepIndex]?.targetSelector;
    if (!selector) { setTargetRect(null); return; }

    const el = document.querySelector<HTMLElement>(`[data-tour-target="${selector}"]`);
    if (!el)       { setTargetRect(null); return; }

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      const r = el.getBoundingClientRect();
      setTargetRect({ x: r.left, y: r.top, width: r.width, height: r.height });
    }, 320);
  }, []);

  useEffect(() => {
    if (!isActive) return;
    const refresh = () => resolveRect(currentStep);
    window.addEventListener('resize', refresh, { passive: true });
    window.addEventListener('scroll', refresh, { passive: true });
    return () => {
      window.removeEventListener('resize', refresh);
      window.removeEventListener('scroll', refresh);
    };
  }, [isActive, currentStep, resolveRect]);

  useEffect(() => {
    if (isActive) resolveRect(currentStep);
  }, [isActive, currentStep, resolveRect]);

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  const startTour = useCallback(() => {
    if (tourCompleted || isLocallyComplete()) return;
    setCurrentStep(0);
    setIsActive(true);
    document.body.style.overflow = 'hidden';
  }, [tourCompleted, isLocallyComplete]);

  const endTour = useCallback((persist: boolean) => {
    setIsActive(false);
    setTargetRect(null);
    document.body.style.overflow = '';
    if (persist) {
      markLocallyComplete();
      completeTourAction().catch(() => null); // best-effort DB write
    }
  }, [markLocallyComplete]);

  const nextStep = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      endTour(true);
    }
  }, [currentStep, endTour]);

  const prevStep  = useCallback(() => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  }, [currentStep]);

  const skipTour  = useCallback(() => endTour(true), [endTour]);

  // ── Auto-start: new user lands on dashboard for the first time ─────────────

  useEffect(() => {
    if (onboardingCompleted && !tourCompleted && !isLocallyComplete()) {
      const t = setTimeout(startTour, 700);
      return () => clearTimeout(t);
    }
  }, [onboardingCompleted, tourCompleted, isLocallyComplete, startTour]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!isActive) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape')     skipTour();
      if (e.key === 'ArrowRight') nextStep();
      if (e.key === 'ArrowLeft')  prevStep();
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [isActive, skipTour, nextStep, prevStep]);

  // ── Cleanup ────────────────────────────────────────────────────────────────

  useEffect(() => () => {
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    document.body.style.overflow = '';
  }, []);

  const value: TourContextValue = {
    isActive,
    currentStep,
    totalSteps:      TOUR_STEPS.length,
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
