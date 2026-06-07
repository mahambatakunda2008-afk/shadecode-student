'use client';

import type { TourRect } from '@/types';

interface Props {
  targetRect:      TourRect | null;
  onOverlayClick:  () => void;
}

const PAD    = 10;
const RADIUS = 12;

export function TourSpotlight({ targetRect, onOverlayClick }: Props) {
  if (!targetRect) {
    return (
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[9998]"
        style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(1px)' }}
        onClick={onOverlayClick}
      />
    );
  }

  const rx = targetRect.x - PAD;
  const ry = targetRect.y - PAD;
  const rw = targetRect.width  + PAD * 2;
  const rh = targetRect.height + PAD * 2;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[9998]"
      onClick={onOverlayClick}
    >
      <svg
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block' }}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect x={rx} y={ry} width={rw} height={rh} rx={RADIUS} ry={RADIUS} fill="black" />
          </mask>
        </defs>

        {/* Dim layer */}
        <rect
          width="100%" height="100%"
          fill="rgba(0,0,0,0.78)"
          mask="url(#tour-spotlight-mask)"
        />

        {/* Animated violet ring */}
        <rect
          x={rx - 1.5} y={ry - 1.5}
          width={rw + 3} height={rh + 3}
          rx={RADIUS + 2} ry={RADIUS + 2}
          fill="none"
          stroke="rgba(124,58,237,0.7)"
          strokeWidth="2"
        >
          <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
        </rect>

        {/* Inner edge */}
        <rect
          x={rx} y={ry} width={rw} height={rh}
          rx={RADIUS} ry={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}
