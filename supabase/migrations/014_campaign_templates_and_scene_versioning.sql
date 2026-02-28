-- Wave 2: campaign templates + scene template versioning and rollback

ALTER TABLE public.story_scenes
ADD COLUMN IF NOT EXISTS template_version integer NOT NULL DEFAULT 1;

ALTER TABLE public.story_scenes
ADD COLUMN IF NOT EXISTS template_key text;

CREATE TABLE IF NOT EXISTS public.campaign_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  style_family text NOT NULL DEFAULT 'custom',
  scene_bundle jsonb NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_scene_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  template_version integer NOT NULL,
  source_template_key text,
  scenes_snapshot jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, template_version)
);

CREATE INDEX IF NOT EXISTS idx_campaign_templates_org_active
ON public.campaign_templates(organization_id, is_active);

CREATE INDEX IF NOT EXISTS idx_store_scene_versions_store_version
ON public.store_scene_versions(store_id, template_version DESC);

INSERT INTO public.campaign_templates (
  key,
  name,
  description,
  style_family,
  scene_bundle,
  is_active,
  is_system
)
VALUES
(
  'apple-launch-v1',
  'Apple Launch v1',
  'Minimal premium launch narrative with clean product-first storytelling.',
  'apple',
  '[
    {"scene_type":"hero","position":1,"is_active":true,"content":{"title":"Think Different. Buy Smarter.","subtitle":"A focused launch layout built to maximize product clarity."}},
    {"scene_type":"feature","position":2,"is_active":true,"content":{"title":"Precision Design","subtitle":"Every section highlights one benefit with deliberate pacing."}},
    {"scene_type":"proof","position":3,"is_active":true,"content":{"title":"Trusted by Early Adopters","subtitle":"Show social proof, ratings and confidence signals."}},
    {"scene_type":"cta","position":4,"is_active":true,"content":{"title":"Ready to Upgrade?","subtitle":"Clear pricing. Fast checkout. Zero distraction.","ctaLabel":"Buy now"}}
  ]'::jsonb,
  true,
  true
),
(
  'nike-impact-v1',
  'Nike Impact v1',
  'High-energy campaign with bold action copy and conversion pacing.',
  'nike',
  '[
    {"scene_type":"hero","position":1,"is_active":true,"content":{"title":"Move Faster. Convert Stronger.","subtitle":"Dynamic above-the-fold for aggressive campaigns."}},
    {"scene_type":"feature","position":2,"is_active":true,"content":{"title":"Built for Performance","subtitle":"Technical differentiators with punchy visual rhythm."}},
    {"scene_type":"proof","position":3,"is_active":true,"content":{"title":"Results That Matter","subtitle":"Highlight outcomes, testimonials and benchmark gains."}},
    {"scene_type":"cta","position":4,"is_active":true,"content":{"title":"Start Your Sprint","subtitle":"Drive immediate action with one high-contrast CTA.","ctaLabel":"Start now"}}
  ]'::jsonb,
  true,
  true
)
ON CONFLICT (key) DO NOTHING;

DO $$
BEGIN
  INSERT INTO public.store_scene_versions (
    store_id,
    template_version,
    source_template_key,
    scenes_snapshot,
    created_by
  )
  SELECT
    s.id,
    1,
    'manual-baseline',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'scene_type', ss.scene_type,
            'position', ss.position,
            'product_id', ss.product_id,
            'content', ss.content,
            'is_active', ss.is_active,
            'template_version', ss.template_version,
            'template_key', ss.template_key
          )
          ORDER BY ss.position ASC, ss.created_at ASC
        )
        FROM public.story_scenes ss
        WHERE ss.store_id = s.id
      ),
      '[]'::jsonb
    ),
    auth.uid()
  FROM public.stores s
  ON CONFLICT (store_id, template_version) DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.apply_campaign_template(
  p_org_id uuid,
  p_template_key text,
  p_product_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id uuid;
  v_bundle jsonb;
  v_next_version integer;
BEGIN
  IF NOT public.has_permission(p_org_id, 'scenes.manage') THEN
    RAISE EXCEPTION 'Insufficient permission';
  END IF;

  SELECT s.id
  INTO v_store_id
  FROM public.stores s
  WHERE s.organization_id = p_org_id
    AND s.is_active = true
  ORDER BY s.created_at ASC
  LIMIT 1;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'No active store for organization';
  END IF;

  SELECT ct.scene_bundle
  INTO v_bundle
  FROM public.campaign_templates ct
  WHERE ct.key = p_template_key
    AND ct.is_active = true
    AND (ct.organization_id IS NULL OR ct.organization_id = p_org_id)
  ORDER BY ct.organization_id NULLS FIRST, ct.created_at DESC
  LIMIT 1;

  IF v_bundle IS NULL THEN
    RAISE EXCEPTION 'Template not found or not available';
  END IF;

  SELECT COALESCE(MAX(ss.template_version), 0) + 1
  INTO v_next_version
  FROM public.story_scenes ss
  WHERE ss.store_id = v_store_id;

  DELETE FROM public.story_scenes
  WHERE store_id = v_store_id;

  INSERT INTO public.story_scenes (
    store_id,
    product_id,
    scene_type,
    position,
    content,
    is_active,
    template_version,
    template_key
  )
  SELECT
    v_store_id,
    COALESCE((item->>'product_id')::uuid, p_product_id),
    (item->>'scene_type')::text,
    COALESCE((item->>'position')::integer, 1),
    COALESCE(item->'content', '{}'::jsonb),
    COALESCE((item->>'is_active')::boolean, true),
    v_next_version,
    p_template_key
  FROM jsonb_array_elements(v_bundle) item;

  INSERT INTO public.store_scene_versions (
    store_id,
    template_version,
    source_template_key,
    scenes_snapshot,
    created_by
  )
  SELECT
    v_store_id,
    v_next_version,
    p_template_key,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'scene_type', ss.scene_type,
            'position', ss.position,
            'product_id', ss.product_id,
            'content', ss.content,
            'is_active', ss.is_active,
            'template_version', ss.template_version,
            'template_key', ss.template_key
          )
          ORDER BY ss.position ASC, ss.created_at ASC
        )
        FROM public.story_scenes ss
        WHERE ss.store_id = v_store_id
      ),
      '[]'::jsonb
    ),
    auth.uid()
  ON CONFLICT (store_id, template_version) DO UPDATE
  SET source_template_key = EXCLUDED.source_template_key,
      scenes_snapshot = EXCLUDED.scenes_snapshot,
      created_by = EXCLUDED.created_by,
      created_at = now();

  RETURN v_next_version;
END;
$$;

CREATE OR REPLACE FUNCTION public.rollback_store_template_version(
  p_org_id uuid,
  p_target_version integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id uuid;
  v_snapshot jsonb;
BEGIN
  IF NOT public.has_permission(p_org_id, 'scenes.manage') THEN
    RAISE EXCEPTION 'Insufficient permission';
  END IF;

  SELECT s.id
  INTO v_store_id
  FROM public.stores s
  WHERE s.organization_id = p_org_id
    AND s.is_active = true
  ORDER BY s.created_at ASC
  LIMIT 1;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'No active store for organization';
  END IF;

  SELECT v.scenes_snapshot
  INTO v_snapshot
  FROM public.store_scene_versions v
  WHERE v.store_id = v_store_id
    AND v.template_version = p_target_version
  LIMIT 1;

  IF v_snapshot IS NULL THEN
    RAISE EXCEPTION 'Target version not found';
  END IF;

  DELETE FROM public.story_scenes
  WHERE store_id = v_store_id;

  INSERT INTO public.story_scenes (
    store_id,
    product_id,
    scene_type,
    position,
    content,
    is_active,
    template_version,
    template_key
  )
  SELECT
    v_store_id,
    (item->>'product_id')::uuid,
    (item->>'scene_type')::text,
    COALESCE((item->>'position')::integer, 1),
    COALESCE(item->'content', '{}'::jsonb),
    COALESCE((item->>'is_active')::boolean, true),
    COALESCE((item->>'template_version')::integer, p_target_version),
    (item->>'template_key')::text
  FROM jsonb_array_elements(v_snapshot) item;

  RETURN p_target_version;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_campaign_template(uuid, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rollback_store_template_version(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_campaign_template(uuid, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rollback_store_template_version(uuid, integer) TO authenticated, service_role;

ALTER TABLE public.campaign_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_scene_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view campaign templates" ON public.campaign_templates;
DROP POLICY IF EXISTS "Scene managers can manage org templates" ON public.campaign_templates;
DROP POLICY IF EXISTS "Members can view scene versions" ON public.store_scene_versions;
DROP POLICY IF EXISTS "Scene managers can manage scene versions" ON public.store_scene_versions;

CREATE POLICY "Members can view campaign templates"
ON public.campaign_templates
FOR SELECT
USING (
  is_active = true
  AND (
    organization_id IS NULL
    OR public.is_org_member(organization_id)
  )
);

CREATE POLICY "Scene managers can manage org templates"
ON public.campaign_templates
FOR ALL
USING (
  organization_id IS NOT NULL
  AND public.has_permission(organization_id, 'scenes.manage')
)
WITH CHECK (
  organization_id IS NOT NULL
  AND public.has_permission(organization_id, 'scenes.manage')
);

CREATE POLICY "Members can view scene versions"
ON public.store_scene_versions
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.id = store_scene_versions.store_id
      AND public.is_org_member(s.organization_id)
  )
);

CREATE POLICY "Scene managers can manage scene versions"
ON public.store_scene_versions
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.id = store_scene_versions.store_id
      AND public.has_permission(s.organization_id, 'scenes.manage')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.id = store_scene_versions.store_id
      AND public.has_permission(s.organization_id, 'scenes.manage')
  )
);
