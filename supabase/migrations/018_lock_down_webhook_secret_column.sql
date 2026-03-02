-- Wave 4 patch: prevent direct authenticated reads of webhook secrets

REVOKE ALL ON TABLE public.organization_webhooks FROM authenticated;
REVOKE ALL ON TABLE public.organization_webhooks FROM anon;

GRANT SELECT (
  id,
  organization_id,
  name,
  target_url,
  event_types,
  status,
  timeout_ms,
  max_retries,
  headers,
  created_by,
  created_at,
  updated_at
) ON TABLE public.organization_webhooks TO authenticated;

GRANT INSERT (
  organization_id,
  name,
  target_url,
  event_types,
  secret,
  status,
  timeout_ms,
  max_retries,
  headers,
  created_by
) ON TABLE public.organization_webhooks TO authenticated;

GRANT UPDATE (
  name,
  target_url,
  event_types,
  secret,
  status,
  timeout_ms,
  max_retries,
  headers,
  updated_at
) ON TABLE public.organization_webhooks TO authenticated;

GRANT DELETE ON TABLE public.organization_webhooks TO authenticated;
GRANT ALL ON TABLE public.organization_webhooks TO service_role;
