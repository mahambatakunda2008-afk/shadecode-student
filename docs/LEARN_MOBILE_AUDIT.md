# Learn Mobile UX Audit Report

## Root Cause Analysis
The primary issues stem from a "desktop-first" design approach using hardcoded inline styles that do not adapt to smaller viewports. The code uses React inline styles instead of Tailwind CSS classes, preventing responsive breakpoints.

1. **Fixed Two-Column Layout:** Line 243 in `LearnPageClient.tsx` uses `gridTemplateColumns: "1fr 340px"` which forces a sidebar layout even on mobile screens (iPhone SE is 320px wide).
2. **Multi-Column Grids on Mobile:** Stats bar (line 265) and quick links (line 431) use `repeat(3, 1fr)` which creates cramped 3-column layouts on narrow screens.
3. **Subject Card Minimum Width:** Line 540 uses `minmax(200px, 1fr)` which may not fit on small screens, causing horizontal overflow.
4. **Sticky Sidebar on Mobile:** Line 592 has `position: "sticky"` with fixed `width: 340`, which will overflow viewport and interfere with natural scrolling.
5. **Excessive Padding:** Line 240 uses `padding: "32px 24px"` which consumes too much screen real estate on mobile.
6. **No Responsive Breakpoints:** All layouts are hardcoded with no responsive variants for mobile (<768px).
7. **CurriculumProgressCard Vertical Footprint:** Designed as a sidebar widget with 20px padding and 2x2 stat grid, taking excessive vertical space when stacked on mobile.
8. **Subject Chips Container:** While flex-wrap is used, the container may not constrain width properly on mobile.

## Files Affected
1. `src/app/(app)/learn/LearnPageClient.tsx` - Main layout, grids, and generation UI.
2. `src/components/CurriculumProgressCard.tsx` - Card layout, padding, and stat grid.

## Proposed Fixes

### 1. LearnPageClient.tsx Layout Refactoring
- **Main container padding:** Reduce from `32px 24px` to `16px` on mobile
- **Two-column layout:** Change from `gridTemplateColumns: "1fr 340px"` to single column on mobile, two-column on desktop (media query or conditional)
- **Stats bar:** Change from 3 columns to single column on mobile, 3 columns on desktop
- **Quick links:** Change from 3 columns to single column on mobile  
- **Subject cards:** Reduce `minmax(200px, 1fr)` to `minmax(150px, 1fr)` or use single column on mobile
- **Sidebar:** Remove `sticky` positioning and fixed width on mobile; stack below main content at full width
- **Add bottom padding:** Ensure content doesn't overlap with bottom navigation (already handled by layout.tsx `pb-[80px]`)

### 2. CurriculumProgressCard.tsx Optimization
- **Reduce padding:** Change from 20px to 16px on mobile
- **Compact stat grid:** Keep 2x2 but reduce gap and padding within stat items
- **Reduce vertical footprint:** Optimize spacing between elements

### 3. Implementation Approach
Since the code uses inline styles instead of Tailwind, I will:
- Add CSS-in-JS media queries within the `<style>` tag
- Use conditional rendering based on window width (useEffect + useState)
- Or convert critical layouts to use Tailwind classes where possible

## Verification Plan
1. Test at 320px (iPhone SE), 375px (iPhone 13), and 768px (tablet)
2. Verify no horizontal scrollbars
3. Ensure bottom navigation remains visible and unobstructed
4. Verify all interactive elements have minimum 44px touch targets
5. Confirm subject chips wrap without overflow
6. Verify grids collapse to single column on mobile
