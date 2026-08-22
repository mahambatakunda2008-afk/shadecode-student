"use client";

/**
 * src/components/ui/PageSkeleton.tsx
 *
 * A shared, properly-designed loading state -- built from the exact
 * shimmer pattern already used on the dashboard (DashboardReimagined.css's
 * .dashboard-skeleton), which was the one loading state on the app that
 * didn't look like an afterthought. Several other pages (tasks, exams)
 * were rendering literal unstyled "Loading..." text with no shape, no
 * animation, nothing hinting at what's about to appear -- exactly what
 * "poor design" meant in a direct owner report. This gives every page a
 * one-import way to match the dashboard's actual design quality instead
 * of reinventing (or not bothering to build) their own.
 */

import "./PageSkeleton.css";

interface PageSkeletonProps {
  /** Rough shape of the page being loaded, so the skeleton's proportions
   * hint at the real content instead of being a generic blob. */
  variant?: "list" | "form" | "cards" | "detail";
}

export default function PageSkeleton({ variant = "list" }: PageSkeletonProps) {
  return (
    <div className="page-skeleton-shell" role="status" aria-label="Loading">
      <div className="page-skeleton page-skeleton-title" />
      {variant === "list" && (
        <>
          <div className="page-skeleton page-skeleton-row" />
          <div className="page-skeleton page-skeleton-row" />
          <div className="page-skeleton page-skeleton-row" />
          <div className="page-skeleton page-skeleton-row" style={{ width: "70%" }} />
        </>
      )}
      {variant === "cards" && (
        <div className="page-skeleton-card-grid">
          <div className="page-skeleton page-skeleton-card" />
          <div className="page-skeleton page-skeleton-card" />
          <div className="page-skeleton page-skeleton-card" />
        </div>
      )}
      {variant === "form" && (
        <>
          <div className="page-skeleton page-skeleton-input" />
          <div className="page-skeleton page-skeleton-input" />
          <div className="page-skeleton page-skeleton-input" style={{ width: "55%" }} />
        </>
      )}
      {variant === "detail" && (
        <>
          <div className="page-skeleton page-skeleton-block" />
          <div className="page-skeleton page-skeleton-row" />
          <div className="page-skeleton page-skeleton-row" style={{ width: "80%" }} />
        </>
      )}
    </div>
  );
}
