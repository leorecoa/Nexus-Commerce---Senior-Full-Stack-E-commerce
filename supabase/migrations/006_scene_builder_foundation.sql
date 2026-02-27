-- Sprint 2: Scene Builder foundation (cinematic storytelling as data)

CREATE TABLE IF NOT EXISTS public.store_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  tokens jsonb NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.story_scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  scene_type text NOT NULL CHECK (scene_type IN ('hero', 'feature', 'proof', 'cta')),
  position integer NOT NULL DEFAULT 1,
  content jsonb NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_themes_store_active ON public.store_themes(store_id, is_active);
CREATE INDEX IF NOT EXISTS idx_story_scenes_store_position ON public.story_scenes(store_id, position);
CREATE INDEX IF NOT EXISTS idx_story_scenes_product ON public.story_scenes(product_id);

ALTER TABLE public.store_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_scenes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active store themes" ON public.store_themes;
DROP POLICY IF EXISTS "Org admins can manage store themes" ON public.store_themes;
DROP POLICY IF EXISTS "Public can view active story scenes" ON public.story_scenes;
DROP POLICY IF EXISTS "Org admins can manage story scenes" ON public.story_scenes;

CREATE POLICY "Public can view active store themes"
ON public.store_themes
FOR SELECT
USING (is_active = true);

CREATE POLICY "Org admins can manage store themes"
ON public.store_themes
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.id = store_themes.store_id
      AND public.is_org_admin(s.organization_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.id = store_themes.store_id
      AND public.is_org_admin(s.organization_id)
  )
);

CREATE POLICY "Public can view active story scenes"
ON public.story_scenes
FOR SELECT
USING (is_active = true);

CREATE POLICY "Org admins can manage story scenes"
ON public.story_scenes
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.id = story_scenes.store_id
      AND public.is_org_admin(s.organization_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.id = story_scenes.store_id
      AND public.is_org_admin(s.organization_id)
  )
);
