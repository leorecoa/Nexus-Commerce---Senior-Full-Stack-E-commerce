-- Wave 4: async analytics exports + outbound webhooks with HMAC, retry and DLQ

-- Enable pgcrypto extension for HMAC signature generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.analytics_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'canceled')),
  format text NOT NULL DEFAULT 'csv' CHECK (format IN ('csv')),
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  storage_path text,
  download_url text,
  row_count integer,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  target_url text NOT NULL,
  event_types text[] NOT NULL DEFAULT ARRAY[]::text[],
  secret text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'disabled')),
  timeout_ms integer NOT NULL DEFAULT 10000 CHECK (timeout_ms >= 1000 AND timeout_ms <= 60000),
  max_retries integer NOT NULL DEFAULT 8 CHECK (max_retries >= 0 AND max_retries <= 20),
  headers jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  webhook_id uuid REFERENCES public.organization_webhooks(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  signature text,
  idempotency_key text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'retrying', 'delivered', 'failed', 'dead_letter')),
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 8 CHECK (max_attempts >= 0 AND max_attempts <= 20),
  next_retry_at timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz,
  delivered_at timestamptz,
  dead_lettered_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webhook_delivery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES public.webhook_deliveries(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  webhook_id uuid REFERENCES public.organization_webhooks(id) ON DELETE SET NULL,
  attempt_number integer NOT NULL,
  request_url text,
  request_headers jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_body jsonb,
  response_status integer,
  response_body text,
  duration_ms integer,
  succeeded boolean NOT NULL,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_exports_org_status_created
  ON public.analytics_exports (organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_org_webhooks_org_status
  ON public.organization_webhooks (organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_queue
  ON public.webhook_deliveries (status, next_retry_at, created_at)
  WHERE status IN ('pending', 'retrying');

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_org_status_created
  ON public.webhook_deliveries (organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_attempts_delivery_created
  ON public.webhook_delivery_attempts (delivery_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_webhook_delivery_idempotency
  ON public.webhook_deliveries (webhook_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.analytics_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_delivery_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view analytics exports" ON public.analytics_exports;
DROP POLICY IF EXISTS "Analytics managers can request exports" ON public.analytics_exports;
DROP POLICY IF EXISTS "Service role manages analytics exports" ON public.analytics_exports;

DROP POLICY IF EXISTS "Webhook managers can view webhooks" ON public.organization_webhooks;
DROP POLICY IF EXISTS "Webhook managers can manage webhooks" ON public.organization_webhooks;

DROP POLICY IF EXISTS "Org members can view webhook deliveries" ON public.webhook_deliveries;
DROP POLICY IF EXISTS "Service role manages webhook deliveries" ON public.webhook_deliveries;

DROP POLICY IF EXISTS "Org members can view webhook attempts" ON public.webhook_delivery_attempts;
DROP POLICY IF EXISTS "Service role manages webhook attempts" ON public.webhook_delivery_attempts;

CREATE POLICY "Org members can view analytics exports"
ON public.analytics_exports
FOR SELECT
USING (public.is_org_member(organization_id));

CREATE POLICY "Analytics managers can request exports"
ON public.analytics_exports
FOR INSERT
WITH CHECK (public.has_permission(organization_id, 'analytics.export'));

CREATE POLICY "Service role manages analytics exports"
ON public.analytics_exports
FOR ALL
USING (current_setting('request.jwt.claim.role', true) = 'service_role')
WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');

CREATE POLICY "Webhook managers can view webhooks"
ON public.organization_webhooks
FOR SELECT
USING (public.has_permission(organization_id, 'webhooks.manage'));

CREATE POLICY "Webhook managers can manage webhooks"
ON public.organization_webhooks
FOR ALL
USING (public.has_permission(organization_id, 'webhooks.manage'))
WITH CHECK (public.has_permission(organization_id, 'webhooks.manage'));

CREATE POLICY "Org members can view webhook deliveries"
ON public.webhook_deliveries
FOR SELECT
USING (public.is_org_member(organization_id));

CREATE POLICY "Service role manages webhook deliveries"
ON public.webhook_deliveries
FOR ALL
USING (current_setting('request.jwt.claim.role', true) = 'service_role')
WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');

CREATE POLICY "Org members can view webhook attempts"
ON public.webhook_delivery_attempts
FOR SELECT
USING (public.is_org_member(organization_id));

CREATE POLICY "Service role manages webhook attempts"
ON public.webhook_delivery_attempts
FOR ALL
USING (current_setting('request.jwt.claim.role', true) = 'service_role')
WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');

CREATE OR REPLACE FUNCTION public.compute_webhook_signature(
  p_secret text,
  p_payload jsonb,
  p_timestamp timestamptz DEFAULT now()
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message text;
BEGIN
  v_message := extract(epoch FROM p_timestamp)::bigint::text || '.' || coalesce(p_payload, '{}'::jsonb)::text;
  RETURN 't=' || extract(epoch FROM p_timestamp)::bigint::text || ',v1=' || encode(hmac(v_message::bytea, coalesce(p_secret, '')::bytea, 'sha256'::text), 'hex');
END;
$$;

CREATE OR REPLACE FUNCTION public.request_analytics_export(
  p_org_id uuid,
  p_filters jsonb DEFAULT '{}'::jsonb,
  p_format text DEFAULT 'csv'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_export_id uuid;
BEGIN
  IF NOT public.has_permission(p_org_id, 'analytics.export') THEN
    RAISE EXCEPTION 'Insufficient permission';
  END IF;

  INSERT INTO public.analytics_exports (
    organization_id,
    requested_by,
    status,
    format,
    filters
  )
  VALUES (
    p_org_id,
    auth.uid(),
    'pending',
    coalesce(nullif(trim(p_format), ''), 'csv'),
    coalesce(p_filters, '{}'::jsonb)
  )
  RETURNING id INTO v_export_id;

  RETURN v_export_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.queue_outbound_webhook(
  p_org_id uuid,
  p_event_type text,
  p_payload jsonb,
  p_idempotency_key text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer := 0;
  v_webhook record;
  v_signature text;
  v_jwt_role text := current_setting('request.jwt.claim.role', true);
BEGIN
  IF v_jwt_role <> 'service_role' AND NOT public.has_permission(p_org_id, 'webhooks.manage') THEN
    RAISE EXCEPTION 'Insufficient permission';
  END IF;

  FOR v_webhook IN
    SELECT ow.*
    FROM public.organization_webhooks ow
    WHERE ow.organization_id = p_org_id
      AND ow.status = 'active'
      AND (
        coalesce(array_length(ow.event_types, 1), 0) = 0
        OR p_event_type = ANY(ow.event_types)
        OR '*' = ANY(ow.event_types)
      )
    ORDER BY ow.created_at ASC
  LOOP
    v_signature := public.compute_webhook_signature(v_webhook.secret, coalesce(p_payload, '{}'::jsonb), now());

    INSERT INTO public.webhook_deliveries (
      organization_id,
      webhook_id,
      event_type,
      payload,
      signature,
      idempotency_key,
      status,
      attempt_count,
      max_attempts,
      next_retry_at
    )
    VALUES (
      p_org_id,
      v_webhook.id,
      p_event_type,
      coalesce(p_payload, '{}'::jsonb),
      v_signature,
      p_idempotency_key,
      'pending',
      0,
      v_webhook.max_retries,
      now()
    )
    ON CONFLICT (webhook_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;

    IF FOUND THEN
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;

  RETURN v_inserted;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_webhook_deliveries(
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  delivery_id uuid,
  organization_id uuid,
  webhook_id uuid,
  target_url text,
  timeout_ms integer,
  headers jsonb,
  event_type text,
  payload jsonb,
  signature text,
  attempt_count integer,
  max_attempts integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'Only service role can claim deliveries';
  END IF;

  RETURN QUERY
  WITH candidate AS (
    SELECT wd.id
    FROM public.webhook_deliveries wd
    WHERE wd.status IN ('pending', 'retrying')
      AND wd.next_retry_at <= now()
    ORDER BY wd.created_at ASC
    LIMIT GREATEST(1, LEAST(coalesce(p_limit, 50), 500))
    FOR UPDATE SKIP LOCKED
  ),
  claimed AS (
    UPDATE public.webhook_deliveries wd
    SET status = 'processing',
        updated_at = now()
    FROM candidate c
    WHERE wd.id = c.id
    RETURNING wd.*
  )
  SELECT
    c.id AS delivery_id,
    c.organization_id,
    c.webhook_id,
    ow.target_url,
    ow.timeout_ms,
    ow.headers,
    c.event_type,
    c.payload,
    c.signature,
    c.attempt_count,
    c.max_attempts
  FROM claimed c
  JOIN public.organization_webhooks ow ON ow.id = c.webhook_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_webhook_delivery_attempt(
  p_delivery_id uuid,
  p_succeeded boolean,
  p_response_status integer DEFAULT NULL,
  p_response_body text DEFAULT NULL,
  p_duration_ms integer DEFAULT NULL,
  p_error text DEFAULT NULL,
  p_response_headers jsonb DEFAULT '{}'::jsonb
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery public.webhook_deliveries%ROWTYPE;
  v_webhook public.organization_webhooks%ROWTYPE;
  v_next_attempt integer;
  v_backoff_minutes integer;
  v_new_status text;
BEGIN
  IF current_setting('request.jwt.claim.role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'Only service role can complete deliveries';
  END IF;

  SELECT *
  INTO v_delivery
  FROM public.webhook_deliveries
  WHERE id = p_delivery_id
  FOR UPDATE;

  IF v_delivery.id IS NULL THEN
    RAISE EXCEPTION 'Delivery not found';
  END IF;

  SELECT *
  INTO v_webhook
  FROM public.organization_webhooks
  WHERE id = v_delivery.webhook_id;

  v_next_attempt := v_delivery.attempt_count + 1;

  INSERT INTO public.webhook_delivery_attempts (
    delivery_id,
    organization_id,
    webhook_id,
    attempt_number,
    request_url,
    request_headers,
    request_body,
    response_status,
    response_body,
    duration_ms,
    succeeded,
    error
  )
  VALUES (
    v_delivery.id,
    v_delivery.organization_id,
    v_delivery.webhook_id,
    v_next_attempt,
    v_webhook.target_url,
    coalesce(v_webhook.headers, '{}'::jsonb) || jsonb_build_object('x-nexus-signature', coalesce(v_delivery.signature, '')),
    v_delivery.payload,
    p_response_status,
    p_response_body,
    p_duration_ms,
    p_succeeded,
    p_error
  );

  IF p_succeeded THEN
    v_new_status := 'delivered';

    UPDATE public.webhook_deliveries
    SET status = v_new_status,
        attempt_count = v_next_attempt,
        last_attempt_at = now(),
        delivered_at = now(),
        dead_lettered_at = NULL,
        last_error = NULL,
        updated_at = now()
    WHERE id = v_delivery.id;

    UPDATE public.organization_webhooks
    SET updated_at = now()
    WHERE id = v_delivery.webhook_id;

    RETURN v_new_status;
  END IF;

  IF v_next_attempt > v_delivery.max_attempts THEN
    v_new_status := 'dead_letter';

    UPDATE public.webhook_deliveries
    SET status = v_new_status,
        attempt_count = v_next_attempt,
        last_attempt_at = now(),
        dead_lettered_at = now(),
        last_error = p_error,
        updated_at = now()
    WHERE id = v_delivery.id;

    RETURN v_new_status;
  END IF;

  v_backoff_minutes := LEAST(360, GREATEST(1, power(2, LEAST(12, v_next_attempt - 1))::integer));
  v_new_status := 'retrying';

  UPDATE public.webhook_deliveries
  SET status = v_new_status,
      attempt_count = v_next_attempt,
      last_attempt_at = now(),
      next_retry_at = now() + make_interval(mins => v_backoff_minutes),
      last_error = p_error,
      updated_at = now()
  WHERE id = v_delivery.id;

  RETURN v_new_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_webhook_dead_letters(
  p_org_id uuid,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  webhook_id uuid,
  event_type text,
  payload jsonb,
  attempt_count integer,
  max_attempts integer,
  last_error text,
  dead_lettered_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    wd.id,
    wd.webhook_id,
    wd.event_type,
    wd.payload,
    wd.attempt_count,
    wd.max_attempts,
    wd.last_error,
    wd.dead_lettered_at,
    wd.created_at
  FROM public.webhook_deliveries wd
  WHERE wd.organization_id = p_org_id
    AND wd.status = 'dead_letter'
    AND public.has_permission(p_org_id, 'webhooks.manage')
  ORDER BY wd.dead_lettered_at DESC NULLS LAST, wd.created_at DESC
  LIMIT GREATEST(1, LEAST(coalesce(p_limit, 100), 500));
$$;

REVOKE ALL ON FUNCTION public.compute_webhook_signature(text, jsonb, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_analytics_export(uuid, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.queue_outbound_webhook(uuid, text, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_webhook_deliveries(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_webhook_delivery_attempt(uuid, boolean, integer, text, integer, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_webhook_dead_letters(uuid, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.compute_webhook_signature(text, jsonb, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.request_analytics_export(uuid, jsonb, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.queue_outbound_webhook(uuid, text, jsonb, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_webhook_deliveries(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_webhook_delivery_attempt(uuid, boolean, integer, text, integer, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_webhook_dead_letters(uuid, integer) TO authenticated, service_role;
