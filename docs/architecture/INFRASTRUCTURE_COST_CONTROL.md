# Infrastructure Cost Control

## Principle

Eliminate cloud compute before replacing one cloud provider with another.

Bad migration: Vercel AI -> another cloud AI.

Desired migration: cloud request -> local decision -> local generation -> optional peer -> cloud only when necessary.

## Vercel

Use Vercel primarily for delivery and lightweight control-plane work. Every new server-side feature must justify why it cannot execute in the browser or through a lighter coordination service.

## Supabase

Supabase remains the shared source of truth for account state and synchronization. Its current free plan includes 500 MB database size, 50,000 MAU and 5 GB egress. Free projects can pause after one week of inactivity. See current pricing before making quota assumptions.

## Optional edge coordination

Cloudflare Workers is a candidate for lightweight coordination if needed. Its current free plan provides 100,000 requests/day, but only 10 ms CPU per request. It should coordinate or route work, not perform heavy inference.

## Budget architecture

  Static app/CDN -> Browser Cortex -> Local model -> optional peer -> small coordinator -> cloud model fallback

## Measurement

Track generation requests per active learner, local-resolution percentage, cloud-resolution percentage, generated tokens, retries, failure rate, cache hits, offline continuation and provider failures.

The goal is minimum cloud dependency consistent with good learning quality, not zero cloud at any cost.