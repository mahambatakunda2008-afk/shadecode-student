'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { ChevronLeft, ChevronRight, X, Lightbulb } from 'lucide-react';
import type { TourStep, TourRect, TourPosition } from '@/types';

interface Props {
  step:        TourStep;
  currentStep: number;
  totalSteps:  number;
  targetRect:  TourRect | null;
  onNext:      () => void;
  onPrev:      () => void;
  onSkip:      () => void;
  isLastStep:  boolean;
}

const CARD_W        = 336;
const CARD_H_EST    = 260;
const ARROW_GAP     = 18;
const EDGE_MARGIN   = 16;

function clamp(v: number, min: number, max: number) { return Math.min(Math.max(v, min), max); }

function calcStyle(rect: TourRect | null, pos: TourPosition): CSSProperties {
  const base: CSSProperties = { position: 'fixed', width: CARD_W };
  if (!rect) return { ...base, left: '50%', top: '50%', transform: 'translate(-50%,-50%)' };

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cx = rect.x + rect.width  / 2;
  const cy = rect.y + rect.height / 2;

  switch (pos) {
    case 'bottom': return { ...base,
      left: clamp(cx - CARD_W / 2, EDGE_MARGIN, vw - CARD_W - EDGE_MARGIN),
      top:  rect.y + rect.height + ARROW_GAP,
    };
    case 'top': return { ...base,
      left:   clamp(cx - CARD_W / 2, EDGE_MARGIN, vw - CARD_W - EDGE_MARGIN),
      bottom: vh - rect.y + ARROW_GAP,
    };
    case 'right': return { ...base,
      left: Math.min(rect.x + rect.width + ARROW_GAP, vw - CARD_W - EDGE_MARGIN),
      top:  clamp(cy - CARD_H_EST / 2, EDGE_MARGIN, vh - CARD_H_EST - EDGE_MARGIN),
    };
    case 'left': return { ...base,
      right: Math.min(vw - rect.x + ARROW_GAP, vw - CARD_W - EDGE_MARGIN),
      top:   clamp(cy - CARD_H_EST / 2, EDGE_MARGIN, vh - CARD_H_EST - EDGE_MARGIN),
    };
    default: return { ...base, left: '50%', top: '50%', transform: 'translate(-50%,-50%)' };
  }
}

export function TourCard({ step, currentStep, totalSteps, targetRect, onNext, onPrev, onSkip, isLastStep }: Props) {
  const [style,   setStyle]   = useState<CSSProperties>({});
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => {
      setStyle(calcStyle(targetRect, step.position));
      setVisible(true);
    }, 80);
    return () => clearTimeout(t);
  }, [targetRect, step.position, currentStep]);

  useEffect(() => {
    const refresh = () => setStyle(calcStyle(targetRect, step.position));
    window.addEventListener('resize', refresh, { passive: true });
    return () => window.removeEventListener('resize', refresh);
  }, [targetRect, step.position]);

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={`Tour step ${currentStep + 1} of ${totalSteps}: ${step.title}`}
      onClick={e => e.stopPropagation()}
      style={{
        ...style,
        zIndex:              10000,
        borderRadius:        16,
        padding:             20,
        boxSizing:           'border-box',
        background:          'rgba(10,10,15,0.97)',
        border:              '1px solid rgba(255,255,255,0.07)',
        boxShadow:           '0 24px 64px rgba(0,0,0,0.7)',
        backdropFilter:      'blur(24px)',
        WebkitBackdropFilter:'blur(24px)',
        opacity:             visible ? 1 : 0,
        transform:           `${style.transform ?? ''} translateY(${visible ? 0 : 6}px)`,
        transition:          'opacity 200ms ease, transform 200ms ease',
        maxWidth:            CARD_W,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 18, lineHeight: 1, width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 10, background: 'rgba(124,58,237,0.15)',
          }}>
            {step.icon}
          </span>
          {step.badge && (
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
              padding: '2px 8px', borderRadius: 999,
              background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)',
              color: 'rgb(167,139,250)',
            }}>
              {step.badge}
            </span>
          )}
        </div>
        <button
          onClick={onSkip}
          aria-label="Skip tour"
          style={{
            width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.3)', transition: 'color 150ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
        >
          <X size={12} strokeWidth={2.5} />
        </button>
      </div>

      {/* Body */}
      <h3 style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.92)', marginBottom: 6, lineHeight: 1.4 }}>
        {step.title}
      </h3>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.48)', lineHeight: 1.65, marginBottom: step.tip ? 12 : 16 }}>
        {step.description}
      </p>

      {/* Tip */}
      {step.tip && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          padding: '8px 12px', borderRadius: 10, marginBottom: 16,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <Lightbulb size={11} style={{ marginTop: 1, flexShrink: 0, color: 'rgb(251,191,36)' }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', lineHeight: 1.5 }}>{step.tip}</span>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} style={{
              height: 6, borderRadius: 999,
              width:      i === currentStep ? 16 : 6,
              background: i === currentStep ? 'rgb(124,58,237)' : i < currentStep ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.1)',
              transition: 'all 300ms ease',
            }} />
          ))}
        </div>

        {/* Nav */}
        <div style={{ display: 'flex', gap: 6 }}>
          {currentStep > 0 && (
            <button
              onClick={onPrev}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 12, padding: '6px 10px', borderRadius: 8,
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.38)', transition: 'all 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.38)'; e.currentTarget.style.background = 'transparent'; }}
            >
              <ChevronLeft size={12} /> Back
            </button>
          )}
          <button
            onClick={onNext}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 8,
              background: 'rgb(124,58,237)', border: 'none', cursor: 'pointer',
              color: 'white', transition: 'background 150ms, box-shadow 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgb(109,40,217)'; e.currentTarget.style.boxShadow = '0 0 16px rgba(124,58,237,0.45)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgb(124,58,237)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            {isLastStep ? <>Done &nbsp;🎉</> : <>Next <ChevronRight size={12} /></>}
          </button>
        </div>
      </div>

      {/* Keyboard hint */}
      <div style={{
        marginTop: 12, paddingTop: 12,
        borderTop: '1px solid rgba(255,255,255,0.05)',
        fontSize: 10, color: 'rgba(255,255,255,0.18)',
      }}>
        {currentStep + 1}/{totalSteps} · Arrow keys to navigate · Esc to skip
      </div>
    </div>
  );
}
