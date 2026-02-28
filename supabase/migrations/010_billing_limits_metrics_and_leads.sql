-- Billing, plan limits, metrics, leads and webhook audit foundation

CREATE TABLE IF NOT EXISTS public.billing_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  price_monthly_cents integer NOT NULL DEFAULT 0,
  trial_days integer NOT NULL DEFAULT 14,
  limits jsonb NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES public.billing_plans(id),
  status text NOT NULL CHECK (status IN ('trialing', 'active', 'past_due', 'canceled')),
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.checkout_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('checkout_started', 'checkout_completed')),
  session_id text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saas_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  company text,
  message text,
  source text NOT NULL DEFAULT 'pricing',
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'won', 'lost')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'failed')),
  retry_count integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.billing_webhook_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_event_id uuid NOT NULL REFERENCES public.billing_webhook_events(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL,
  succeeded boolean NOT NULL,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_subscriptions_org_status
  ON public.organization_subscriptions (organization_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkout_events_org_created
  ON public.checkout_events (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkout_events_org_type_created
  ON public.checkout_events (organization_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status_created
  ON public.saas_leads (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status_created
  ON public.billing_webhook_events (status, created_at DESC);

ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_webhook_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active billing plans" ON public.billing_plans;
DROP POLICY IF EXISTS "Org members can view subscriptions" ON public.organization_subscriptions;
DROP POLICY IF EXISTS "Org admins can manage subscriptions" ON public.organization_subscriptions;
DROP POLICY IF EXISTS "Org members can insert checkout events" ON public.checkout_events;
DROP POLICY IF EXISTS "Org members can view checkout events" ON public.checkout_events;
DROP POLICY IF EXISTS "Public can create leads" ON public.saas_leads;

CREATE POLICY "Public can view active billing plans"
ON public.billing_plans
FOR SELECT
USING (is_active = true);

CREATE POLICY "Org members can view subscriptions"
ON public.organization_subscriptions
FOR SELECT
USING (public.is_org_member(organization_id));

CREATE POLICY "Org admins can manage subscriptions"
ON public.organization_subscriptions
FOR ALL
USING (public.is_org_admin(organization_id))
WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "Org members can insert checkout events"
ON public.checkout_events
FOR INSERT
WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Org members can view checkout events"
ON public.checkout_events
FOR SELECT
USING (public.is_org_member(organization_id));

CREATE POLICY "Public can create leads"
ON public.saas_leads
FOR INSERT
WITH CHECK (true);

INSERT INTO public.billing_plans (id, name, description, price_monthly_cents, trial_days, limits)
VALUES
  ('starter', 'Starter', 'Ideal para iniciar e validar oferta.', 3900, 14, '{"stores":1,"scenes":12,"products":60,"members":3}'::jsonb),
  ('growth', 'Growth', 'Escala comercial com mais capacidade.', 9900, 14, '{"stores":3,"scenes":40,"products":300,"members":12}'::jsonb),
  ('scale', 'Scale', 'Operacao enterprise com limite amplo.', 19900, 14, '{"stores":10,"scenes":200,"products":2000,"members":60}'::jsonb)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_monthly_cents = EXCLUDED.price_monthly_cents,
    trial_days = EXCLUDED.trial_days,
    limits = EXCLUDED.limits,
    is_active = true,
    updated_at = now();

CREATE OR REPLACE FUNCTION public.ensure_default_subscription(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_subscriptions os
    WHERE os.organization_id = p_org_id
      AND os.status IN ('trialing', 'active', 'past_due')
  ) THEN
    INSERT INTO public.organization_subscriptions (
      organization_id,
      plan_id,
      status,
      trial_ends_at,
      current_period_end
    )
    VALUES (
      p_org_id,
      'starter',
      'trialing',
      now() + interval '14 days',
      now() + interval '1 month'
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_default_subscription(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_default_subscription(uuid) TO authenticated, service_role;

DO $$
DECLARE
  v_org record;
BEGIN
  FOR v_org IN SELECT id FROM public.organizations LOOP
    PERFORM public.ensure_default_subscription(v_org.id);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.on_organization_created_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_default_subscription(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_org_default_subscription ON public.organizations;
CREATE TRIGGER trg_org_default_subscription
AFTER INSERT ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.on_organization_created_subscription();

CREATE OR REPLACE FUNCTION public.get_org_plan_snapshot(p_org_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH active_sub AS (
    SELECT os.organization_id, os.plan_id, os.status, os.trial_ends_at, os.current_period_end
    FROM public.organization_subscriptions os
    WHERE os.organization_id = p_org_id
    ORDER BY os.updated_at DESC
    LIMIT 1
  ),
  plan AS (
    SELECT bp.id, bp.name, bp.price_monthly_cents, bp.limits
    FROM public.billing_plans bp
    JOIN active_sub s ON s.plan_id = bp.id
  )
  SELECT jsonb_build_object(
    'plan_id', p.id,
    'plan_name', p.name,
    'price_monthly_cents', p.price_monthly_cents,
    'status', s.status,
    'trial_ends_at', s.trial_ends_at,
    'current_period_end', s.current_period_end,
    'limits', p.limits,
    'usage', jsonb_build_object(
      'stores', (SELECT count(*) FROM public.stores st WHERE st.organization_id = p_org_id),
      'scenes', (SELECT count(*) FROM public.story_scenes ss JOIN public.stores st ON st.id = ss.store_id WHERE st.organization_id = p_org_id),
      'products', (SELECT count(*) FROM public.products pr WHERE pr.organization_id = p_org_id),
      'members', (SELECT count(*) FROM public.organization_members om WHERE om.organization_id = p_org_id)
    )
  )
  FROM active_sub s
  JOIN plan p ON true;
$$;

REVOKE ALL ON FUNCTION public.get_org_plan_snapshot(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_org_plan_snapshot(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_org_kpis(p_org_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH checkout_started AS (
    SELECT count(*)::numeric AS total
    FROM public.checkout_events ce
    WHERE ce.organization_id = p_org_id
      AND ce.event_type = 'checkout_started'
      AND ce.created_at >= now() - interval '30 days'
  ),
  checkout_completed AS (
    SELECT count(*)::numeric AS total
    FROM public.orders o
    WHERE o.organization_id = p_org_id
      AND o.status IN ('paid', 'confirmed', 'processing', 'shipped', 'delivered')
      AND o.created_at >= now() - interval '30 days'
  ),
  aov AS (
    SELECT coalesce(avg(o.total_amount), 0)::numeric AS value
    FROM public.orders o
    WHERE o.organization_id = p_org_id
      AND o.status IN ('paid', 'confirmed', 'processing', 'shipped', 'delivered')
      AND o.created_at >= now() - interval '30 days'
  )
  SELECT jsonb_build_object(
    'window_days', 30,
    'checkout_started', cs.total,
    'checkout_completed', cc.total,
    'conversion_rate', CASE WHEN cs.total > 0 THEN round((cc.total / cs.total) * 100, 2) ELSE 0 END,
    'aov', round(a.value, 2),
    'checkout_abandonment_rate', CASE WHEN cs.total > 0 THEN round(((cs.total - cc.total) / cs.total) * 100, 2) ELSE 0 END
  )
  FROM checkout_started cs
  CROSS JOIN checkout_completed cc
  CROSS JOIN aov a;
$$;

REVOKE ALL ON FUNCTION public.get_org_kpis(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_org_kpis(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.enforce_plan_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_snapshot jsonb;
  v_limits jsonb;
  v_usage jsonb;
  v_limit integer;
  v_used integer;
  v_resource text;
BEGIN
  IF TG_TABLE_NAME = 'stores' THEN
    v_org_id := NEW.organization_id;
    v_resource := 'stores';
  ELSIF TG_TABLE_NAME = 'products' THEN
    v_org_id := NEW.organization_id;
    v_resource := 'products';
  ELSIF TG_TABLE_NAME = 'organization_members' THEN
    v_org_id := NEW.organization_id;
    v_resource := 'members';
  ELSIF TG_TABLE_NAME = 'story_scenes' THEN
    SELECT s.organization_id INTO v_org_id
    FROM public.stores s
    WHERE s.id = NEW.store_id;
    v_resource := 'scenes';
  ELSE
    RETURN NEW;
  END IF;

  IF v_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT public.get_org_plan_snapshot(v_org_id) INTO v_snapshot;
  IF v_snapshot IS NULL THEN
    RETURN NEW;
  END IF;

  v_limits := v_snapshot->'limits';
  v_usage := v_snapshot->'usage';
  v_limit := coalesce((v_limits->>v_resource)::integer, 0);
  v_used := coalesce((v_usage->>v_resource)::integer, 0);

  IF v_limit > 0 AND v_used >= v_limit THEN
    RAISE EXCEPTION 'Plan limit reached for % (%/%). Upgrade required.', v_resource, v_used, v_limit;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_limit_stores ON public.stores;
DROP TRIGGER IF EXISTS trg_limit_products ON public.products;
DROP TRIGGER IF EXISTS trg_limit_members ON public.organization_members;
DROP TRIGGER IF EXISTS trg_limit_scenes ON public.story_scenes;

CREATE TRIGGER trg_limit_stores
BEFORE INSERT ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.enforce_plan_limits();

CREATE TRIGGER trg_limit_products
BEFORE INSERT ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.enforce_plan_limits();

CREATE TRIGGER trg_limit_members
BEFORE INSERT ON public.organization_members
FOR EACH ROW
EXECUTE FUNCTION public.enforce_plan_limits();

CREATE TRIGGER trg_limit_scenes
BEFORE INSERT ON public.story_scenes
FOR EACH ROW
EXECUTE FUNCTION public.enforce_plan_limits();
