-- The feedback forms now submit only through the server route.
-- Remove broad Data API table grants; server-side auth/rate-limit checks are authoritative.
revoke all privileges on table public.feedback from public, anon, authenticated;
grant all privileges on table public.feedback to service_role;
