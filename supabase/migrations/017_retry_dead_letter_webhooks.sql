-- Wave 4 patch: allow managers to manually requeue dead-letter webhook deliveries

CREATE OR REPLACE FUNCTION public.retry_webhook_dead_letter(
  p_org_id uuid,
  p_delivery_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery public.webhook_deliveries%ROWTYPE;
BEGIN
  IF NOT public.has_permission(p_org_id, 'webhooks.manage') THEN
    RAISE EXCEPTION 'Insufficient permission';
  END IF;

  SELECT *
  INTO v_delivery
  FROM public.webhook_deliveries
  WHERE id = p_delivery_id
    AND organization_id = p_org_id
  FOR UPDATE;

  IF v_delivery.id IS NULL THEN
    RAISE EXCEPTION 'Delivery not found';
  END IF;

  IF v_delivery.status <> 'dead_letter' THEN
    RAISE EXCEPTION 'Delivery is not in dead-letter';
  END IF;

  UPDATE public.webhook_deliveries
  SET status = 'pending',
      attempt_count = 0,
      next_retry_at = now(),
      last_attempt_at = NULL,
      delivered_at = NULL,
      dead_lettered_at = NULL,
      last_error = NULL,
      updated_at = now()
  WHERE id = v_delivery.id;

  RETURN 'pending';
END;
$$;

REVOKE ALL ON FUNCTION public.retry_webhook_dead_letter(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.retry_webhook_dead_letter(uuid, uuid) TO authenticated, service_role;
