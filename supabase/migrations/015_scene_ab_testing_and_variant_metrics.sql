-- Wave 3: scene A/B testing + deterministic allocation + variant metrics

CREATE TABLE IF NOT EXISTS public.scene_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  target_scene_type text NOT NULL CHECK (target_scene_type IN ('hero', 'feature', 'proof', 'cta')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

CREATE TABLE IF NOT EXISTS public.scene_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL REFERENCES public.scene_experiments(id) ON DELETE CASCADE,
  label text NOT NULL,
  weight numeric NOT NULL DEFAULT 50 CHECK (weight > 0),
  is_control boolean NOT NULL DEFAULT false,
  content_override jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scene_variant_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  experiment_id uuid NOT NULL REFERENCES public.scene_experiments(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES public.scene_variants(id) ON DELETE CASCADE,
  assignment_key text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (experiment_id, assignment_key)
);

CREATE TABLE IF NOT EXISTS public.scene_variant_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  experiment_id uuid REFERENCES public.scene_experiments(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.scene_variants(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('impression', 'cta_click', 'add_to_cart', 'checkout_start', 'conversion')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scene_experiments_org_status
ON public.scene_experiments(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_scene_variants_experiment_active
ON public.scene_variants(experiment_id, is_active);

CREATE INDEX IF NOT EXISTS idx_scene_variant_assignments_lookup
ON public.scene_variant_assignments(experiment_id, assignment_key);

CREATE INDEX IF NOT EXISTS idx_scene_variant_events_org_date
ON public.scene_variant_events(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scene_variant_events_variant_type
ON public.scene_variant_events(variant_id, event_type);

ALTER TABLE public.scene_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scene_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scene_variant_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scene_variant_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view scene experiments" ON public.scene_experiments;
DROP POLICY IF EXISTS "Scene managers can manage experiments" ON public.scene_experiments;
DROP POLICY IF EXISTS "Members can view scene variants" ON public.scene_variants;
DROP POLICY IF EXISTS "Scene managers can manage variants" ON public.scene_variants;
DROP POLICY IF EXISTS "Members can view assignments" ON public.scene_variant_assignments;
DROP POLICY IF EXISTS "Scene managers can manage assignments" ON public.scene_variant_assignments;
DROP POLICY IF EXISTS "Members can view variant events" ON public.scene_variant_events;
DROP POLICY IF EXISTS "Members can insert variant events" ON public.scene_variant_events;

CREATE POLICY "Members can view scene experiments"
ON public.scene_experiments
FOR SELECT
USING (public.is_org_member(organization_id));

CREATE POLICY "Scene managers can manage experiments"
ON public.scene_experiments
FOR ALL
USING (public.has_permission(organization_id, 'experiments.manage'))
WITH CHECK (public.has_permission(organization_id, 'experiments.manage'));

CREATE POLICY "Members can view scene variants"
ON public.scene_variants
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.scene_experiments se
    WHERE se.id = scene_variants.experiment_id
      AND public.is_org_member(se.organization_id)
  )
);

CREATE POLICY "Scene managers can manage variants"
ON public.scene_variants
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.scene_experiments se
    WHERE se.id = scene_variants.experiment_id
      AND public.has_permission(se.organization_id, 'experiments.manage')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.scene_experiments se
    WHERE se.id = scene_variants.experiment_id
      AND public.has_permission(se.organization_id, 'experiments.manage')
  )
);

CREATE POLICY "Members can view assignments"
ON public.scene_variant_assignments
FOR SELECT
USING (public.is_org_member(organization_id));

CREATE POLICY "Scene managers can manage assignments"
ON public.scene_variant_assignments
FOR ALL
USING (public.has_permission(organization_id, 'experiments.manage'))
WITH CHECK (public.has_permission(organization_id, 'experiments.manage'));

CREATE POLICY "Members can view variant events"
ON public.scene_variant_events
FOR SELECT
USING (public.is_org_member(organization_id));

CREATE POLICY "Members can insert variant events"
ON public.scene_variant_events
FOR INSERT
WITH CHECK (public.is_org_member(organization_id));

CREATE OR REPLACE FUNCTION public.assign_scene_variant(
  p_experiment_id uuid,
  p_assignment_key text,
  p_user_id uuid DEFAULT NULL,
  p_session_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_variant_id uuid;
  v_org_id uuid;
  v_total_weight numeric;
  v_hash_bigint bigint;
  v_target numeric;
  v_running numeric := 0;
  v_candidate record;
BEGIN
  IF p_assignment_key IS NULL OR trim(p_assignment_key) = '' THEN
    RAISE EXCEPTION 'Assignment key is required';
  END IF;

  SELECT organization_id
  INTO v_org_id
  FROM public.scene_experiments
  WHERE id = p_experiment_id
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Experiment not found';
  END IF;

  SELECT sva.variant_id
  INTO v_existing_variant_id
  FROM public.scene_variant_assignments sva
  WHERE sva.experiment_id = p_experiment_id
    AND sva.assignment_key = p_assignment_key
  LIMIT 1;

  IF v_existing_variant_id IS NOT NULL THEN
    RETURN v_existing_variant_id;
  END IF;

  SELECT COALESCE(sum(sv.weight), 0)
  INTO v_total_weight
  FROM public.scene_variants sv
  WHERE sv.experiment_id = p_experiment_id
    AND sv.is_active = true;

  IF v_total_weight <= 0 THEN
    RAISE EXCEPTION 'No active variants for experiment';
  END IF;

  v_hash_bigint := ('x' || substr(md5(p_experiment_id::text || ':' || p_assignment_key), 1, 16))::bit(64)::bigint;
  v_target := mod(abs(v_hash_bigint), 1000000)::numeric / 1000000 * v_total_weight;

  FOR v_candidate IN
    SELECT sv.id, sv.weight
    FROM public.scene_variants sv
    WHERE sv.experiment_id = p_experiment_id
      AND sv.is_active = true
    ORDER BY sv.is_control DESC, sv.created_at ASC
  LOOP
    v_running := v_running + v_candidate.weight;
    IF v_target <= v_running THEN
      v_existing_variant_id := v_candidate.id;
      EXIT;
    END IF;
  END LOOP;

  IF v_existing_variant_id IS NULL THEN
    SELECT sv.id
    INTO v_existing_variant_id
    FROM public.scene_variants sv
    WHERE sv.experiment_id = p_experiment_id
      AND sv.is_active = true
    ORDER BY sv.is_control DESC, sv.created_at ASC
    LIMIT 1;
  END IF;

  INSERT INTO public.scene_variant_assignments (
    organization_id,
    experiment_id,
    variant_id,
    assignment_key,
    user_id,
    session_id
  )
  VALUES (
    v_org_id,
    p_experiment_id,
    v_existing_variant_id,
    p_assignment_key,
    p_user_id,
    p_session_id
  )
  ON CONFLICT (experiment_id, assignment_key) DO NOTHING;

  RETURN v_existing_variant_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_story_scenes_for_session(
  p_org_id uuid,
  p_session_id text,
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  store_id uuid,
  product_id uuid,
  scene_type text,
  position integer,
  content jsonb,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  template_version integer,
  template_key text,
  experiment_id uuid,
  variant_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id uuid;
  v_assignment_key text;
  v_exp_id uuid;
  v_var_id uuid;
  v_override jsonb;
  v_scene record;
BEGIN
  SELECT s.id
  INTO v_store_id
  FROM public.stores s
  WHERE s.organization_id = p_org_id
    AND s.is_active = true
  ORDER BY s.created_at ASC
  LIMIT 1;

  IF v_store_id IS NULL THEN
    RETURN;
  END IF;

  v_assignment_key := COALESCE(p_user_id::text, p_session_id);
  IF v_assignment_key IS NULL OR trim(v_assignment_key) = '' THEN
    v_assignment_key := md5(clock_timestamp()::text || random()::text);
  END IF;

  FOR v_scene IN
    SELECT ss.*
    FROM public.story_scenes ss
    WHERE ss.store_id = v_store_id
      AND ss.is_active = true
    ORDER BY ss.position ASC, ss.created_at ASC
  LOOP
    SELECT se.id
    INTO v_exp_id
    FROM public.scene_experiments se
    WHERE se.organization_id = p_org_id
      AND se.target_scene_type = v_scene.scene_type
      AND se.status = 'active'
      AND (se.starts_at IS NULL OR se.starts_at <= now())
      AND (se.ends_at IS NULL OR se.ends_at >= now())
    ORDER BY se.created_at DESC
    LIMIT 1;

    IF v_exp_id IS NOT NULL THEN
      v_var_id := public.assign_scene_variant(
        v_exp_id,
        v_assignment_key,
        p_user_id,
        p_session_id
      );

      SELECT sv.content_override
      INTO v_override
      FROM public.scene_variants sv
      WHERE sv.id = v_var_id
      LIMIT 1;
    ELSE
      v_var_id := NULL;
      v_override := NULL;
    END IF;

    RETURN QUERY
    SELECT
      v_scene.id,
      v_scene.store_id,
      v_scene.product_id,
      v_scene.scene_type,
      v_scene.position,
      COALESCE(v_override, v_scene.content),
      v_scene.is_active,
      v_scene.created_at,
      v_scene.updated_at,
      v_scene.template_version,
      v_scene.template_key,
      v_exp_id,
      v_var_id;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.track_scene_variant_event(
  p_org_id uuid,
  p_event_type text,
  p_session_id text,
  p_user_id uuid DEFAULT NULL,
  p_experiment_id uuid DEFAULT NULL,
  p_variant_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  IF NOT public.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'Not a member of organization';
  END IF;

  INSERT INTO public.scene_variant_events (
    organization_id,
    experiment_id,
    variant_id,
    user_id,
    session_id,
    event_type,
    metadata
  )
  VALUES (
    p_org_id,
    p_experiment_id,
    p_variant_id,
    p_user_id,
    p_session_id,
    p_event_type,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_scene_variant_metrics(
  p_org_id uuid,
  p_days integer DEFAULT 30
)
RETURNS TABLE (
  experiment_id uuid,
  experiment_name text,
  variant_id uuid,
  variant_label text,
  impressions bigint,
  cta_clicks bigint,
  add_to_cart bigint,
  checkout_start bigint,
  conversions bigint,
  ctr numeric,
  add_to_cart_rate numeric,
  checkout_start_rate numeric,
  conversion_rate numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      sve.experiment_id,
      sve.variant_id,
      count(*) FILTER (WHERE sve.event_type = 'impression') AS impressions,
      count(*) FILTER (WHERE sve.event_type = 'cta_click') AS cta_clicks,
      count(*) FILTER (WHERE sve.event_type = 'add_to_cart') AS add_to_cart,
      count(*) FILTER (WHERE sve.event_type = 'checkout_start') AS checkout_start,
      count(*) FILTER (WHERE sve.event_type = 'conversion') AS conversions
    FROM public.scene_variant_events sve
    WHERE sve.organization_id = p_org_id
      AND sve.created_at >= now() - make_interval(days => p_days)
    GROUP BY sve.experiment_id, sve.variant_id
  )
  SELECT
    b.experiment_id,
    se.name AS experiment_name,
    b.variant_id,
    sv.label AS variant_label,
    b.impressions,
    b.cta_clicks,
    b.add_to_cart,
    b.checkout_start,
    b.conversions,
    round(CASE WHEN b.impressions = 0 THEN 0 ELSE (b.cta_clicks::numeric / b.impressions) * 100 END, 2) AS ctr,
    round(CASE WHEN b.impressions = 0 THEN 0 ELSE (b.add_to_cart::numeric / b.impressions) * 100 END, 2) AS add_to_cart_rate,
    round(CASE WHEN b.impressions = 0 THEN 0 ELSE (b.checkout_start::numeric / b.impressions) * 100 END, 2) AS checkout_start_rate,
    round(CASE WHEN b.impressions = 0 THEN 0 ELSE (b.conversions::numeric / b.impressions) * 100 END, 2) AS conversion_rate
  FROM base b
  LEFT JOIN public.scene_experiments se ON se.id = b.experiment_id
  LEFT JOIN public.scene_variants sv ON sv.id = b.variant_id
  ORDER BY b.impressions DESC, b.conversions DESC;
$$;

REVOKE ALL ON FUNCTION public.assign_scene_variant(uuid, text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_story_scenes_for_session(uuid, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.track_scene_variant_event(uuid, text, text, uuid, uuid, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_scene_variant_metrics(uuid, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.assign_scene_variant(uuid, text, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_story_scenes_for_session(uuid, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.track_scene_variant_event(uuid, text, text, uuid, uuid, uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_scene_variant_metrics(uuid, integer) TO authenticated, service_role;
