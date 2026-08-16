-- Security hardening: get_traction_metrics is an admin-only SECURITY DEFINER RPC.
-- Anonymous callers must not be able to invoke the function at all.
REVOKE EXECUTE ON FUNCTION public.get_traction_metrics() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_traction_metrics() FROM public;

-- Keep the intended authenticated-admin execution path explicit.
GRANT EXECUTE ON FUNCTION public.get_traction_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_traction_metrics() TO service_role;
