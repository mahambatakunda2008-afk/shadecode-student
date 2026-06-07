'use client';

import type { TourRect } from '@/types/tour';

interface TourSpotlightProps {
  targetRect: TourRect | null;
  /** Clicking the dim overlay skips the tour */
  onOverlayClick: () => void;
}

const PAD = 10;       // px padding around the highlighted element
const RADIUS = 12;    // border-radius of the spotlight cutout

export function TourSpotlight({ targetRect, onOverlayClick }: TourSpotlightProps) {
  // No target — full-screen dim with no cutout
  if (!targetRect) {
    return (
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[9998] bg-black/75 backdrop-blur-[1px]"
        onClick={onOverlayClick}
      />
    );
  }

  const rx = targetRect.x - PAD;
  const ry = targetRect.y - PAD;
  const rw = targetRect.width + PAD * 2;
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
          {/* Mask that cuts a hole where the element lives */}
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={rx}
              y={ry}
              width={rw}
              height={rh}
              rx={RADIUS}
              ry={RADIUS}
              fill="black"
            />
          </mask>
        </defs>

        {/* Dim overlay */}
        <rect
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.78)"
          mask="url(#tour-mask)"
        />

        {/* Violet glow ring around the highlighted element */}
        <rect
          x={rx - 1.5}
          y={ry - 1.5}
          width={rw + 3}
          height={rh + 3}
          rx={RADIUS + 2}
          ry={RADIUS + 2}
          fill="none"
          stroke="rgba(124, 58, 237, 0.65)"
          strokeWidth="2"
        >
          <animate
            attributeName="opacity"
            values="0.5;1;0.5"
            dur="2s"
            repeatCount="indefinite"
          />
        </rect>

        {/* Subtle inner edge highlight */}
        <rect
          x={rx}
          y={ry}
          width={rw}
          height={rh}
          rx={RADIUS}
          ry={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}
