'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { ChevronLeft, ChevronRight, X, Lightbulb } from 'lucide-react';
import type { TourStep, TourRect, TourPosition } from '@/types/tour';

interface TourCardProps {
  step: TourStep;
  currentStep: number;
  totalSteps: number;
  targetRect: TourRect | null;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  isLastStep: boolean;
}

const CARD_W = 336;
const CARD_H_ESTIMATE = 240;
const ARROW_OFFSET = 18;
const EDGE_MARGIN = 16;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getCardStyle(
  rect: TourRect | null,
  position: TourPosition,
): CSSProperties {
  const base: CSSProperties = { position: 'fixed', width: CARD_W };

  if (!rect) {
    return {
      ...base,
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 900;

  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;

  switch (position) {
    case 'bottom':
      return {
        ...base,
        left: clamp(cx - CARD_W / 2, EDGE_MARGIN, vw - CARD_W - EDGE_MARGIN),
        top: rect.y + rect.height + ARROW_OFFSET,
      };
    case 'top':
      return {
        ...base,
        left: clamp(cx - CARD_W / 2, EDGE_MARGIN, vw - CARD_W - EDGE_MARGIN),
        bottom: vh - rect.y + ARROW_OFFSET,
      };
    case 'right':
      return {
        ...base,
        left: Math.min(rect.x + rect.width + ARROW_OFFSET, vw - CARD_W - EDGE_MARGIN),
        top: clamp(cy - CARD_H_ESTIMATE / 2, EDGE_MARGIN, vh - CARD_H_ESTIMATE - EDGE_MARGIN),
      };
    case 'left':
      return {
        ...base,
        right: Math.min(vw - rect.x + ARROW_OFFSET, vw - CARD_W - EDGE_MARGIN),
        top: clamp(cy - CARD_H_ESTIMATE / 2, EDGE_MARGIN, vh - CARD_H_ESTIMATE - EDGE_MARGIN),
      };
    default:
      return { ...base, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
  }
}

export function TourCard({
  step,
  currentStep,
  totalSteps,
  targetRect,
  onNext,
  onPrev,
  onSkip,
  isLastStep,
}: TourCardProps) {
  const [style, setStyle] = useState<CSSProperties>({});
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => {
      setStyle(getCardStyle(targetRect, step.position));
      setVisible(true);
    }, 80);
    return () => clearTimeout(t);
  }, [targetRect, step.position, currentStep]);

  useEffect(() => {
    const refresh = () =>
      setStyle(getCardStyle(targetRect, step.position));
    window.addEventListener('resize', refresh, { passive: true });
    return () => window.removeEventListener('resize', refresh);
  }, [targetRect, step.position]);

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={`Tour step ${currentStep + 1} of ${totalSteps}: ${step.title}`}
      className="z-[10000] rounded-2xl border border-white/[0.07] shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
      style={{
        ...style,
        background: 'rgba(13,13,17,0.97)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        opacity: visible ? 1 : 0,
        transform: style.transform ?? (visible ? 'translateY(0)' : 'translateY(6px)'),
        transition: 'opacity 200ms ease, transform 200ms ease',
        padding: '20px',
        boxSizing: 'border-box',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span
            className="text-xl leading-none w-8 h-8 flex items-center justify-center rounded-xl"
            style={{ background: 'rgba(124,58,237,0.15)' }}
          >
            {step.icon}
          </span>
          {step.badge && (
            <span
              className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full border"
              style={{
                background: 'rgba(124,58,237,0.12)',
                borderColor: 'rgba(124,58,237,0.3)',
                color: 'rgb(167,139,250)',
              }}
            >
              {step.badge}
            </span>
          )}
        </div>
        <button
          onClick={onSkip}
          aria-label="Skip tour"
          className="w-6 h-6 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: 'rgba(255,255,255,0.3)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
        >
          <X size={12} strokeWidth={2.5} />
        </button>
      </div>

      {/* Content */}
      <div className="mb-4">
        <h3
          className="font-semibold text-sm mb-1.5 leading-snug"
          style={{ color: 'rgba(255,255,255,0.92)' }}
        >
          {step.title}
        </h3>
        <p
          className="text-xs leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.48)', lineHeight: '1.65' }}
        >
          {step.description}
        </p>
      </div>

      {/* Tip pill */}
      {step.tip && (
        <div
          className="flex items-start gap-2 rounded-xl px-3 py-2 mb-4"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <Lightbulb
            size={12}
            className="mt-0.5 flex-shrink-0"
            style={{ color: 'rgb(251,191,36)' }}
          />
          <span
            className="text-[11px] leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            {step.tip}
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        {/* Step dots */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === currentStep ? 16 : 6,
                height: 6,
                background:
                  i === currentStep
                    ? 'rgb(124,58,237)'
                    : i < currentStep
                      ? 'rgba(124,58,237,0.4)'
                      : 'rgba(255,255,255,0.1)',
              }}
            />
          ))}
        </div>

        {/* Nav buttons */}
        <div className="flex items-center gap-2">
          {currentStep > 0 && (
            <button
              onClick={onPrev}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-all"
              style={{ color: 'rgba(255,255,255,0.4)', background: 'transparent' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <ChevronLeft size={12} />
              Back
            </button>
          )}
          <button
            onClick={onNext}
            className="flex items-center gap-1 text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-all"
            style={{
              background: 'rgb(124,58,237)',
              color: 'white',
              boxShadow: '0 0 0 0 rgba(124,58,237,0)',
              transition: 'background 150ms, box-shadow 150ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgb(109,40,217)';
              e.currentTarget.style.boxShadow = '0 0 16px rgba(124,58,237,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgb(124,58,237)';
              e.currentTarget.style.boxShadow = '0 0 0 0 rgba(124,58,237,0)';
            }}
          >
            {isLastStep ? (
              <>Done &nbsp;🎉</>
            ) : (
              <>
                Next
                <ChevronRight size={12} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Keyboard hint */}
      <div
        className="mt-3 pt-3 text-[10px]"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.05)',
          color: 'rgba(255,255,255,0.2)',
        }}
      >
        {currentStep + 1}/{totalSteps} · Arrow keys to navigate · Esc to skip
      </div>
    </div>
  );
}
