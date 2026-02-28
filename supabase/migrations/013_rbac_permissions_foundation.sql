-- RBAC foundation: fine-grained permissions + permission-aware helper

CREATE TABLE IF NOT EXISTS public.permissions (
  key text PRIMARY KEY,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  permission_key text NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  allowed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, permission_key)
);

CREATE TABLE IF NOT EXISTS public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  allowed boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_org_user
ON public.user_permissions(organization_id, user_id);

INSERT INTO public.permissions (key, description)
VALUES
  ('admin.dashboard.access', 'Access admin dashboard'),
  ('org.admin', 'Administrative control of organization'),
  ('org.members.manage', 'Manage organization members and overrides'),
  ('products.manage', 'Create/update/delete products'),
  ('categories.manage', 'Create/update/delete categories'),
  ('scenes.manage', 'Manage story scenes and templates'),
  ('orders.read', 'Read all tenant orders'),
  ('billing.manage', 'Manage billing and subscriptions'),
  ('branding.manage', 'Manage white-label branding and domains'),
  ('analytics.export', 'Export analytics data'),
  ('webhooks.manage', 'Manage outbound and inbound webhooks'),
  ('experiments.manage', 'Manage A/B experiments')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, allowed)
SELECT seed.role, seed.permission_key, seed.allowed
FROM (
  VALUES
    ('owner', 'admin.dashboard.access', true),
    ('owner', 'org.admin', true),
    ('owner', 'org.members.manage', true),
    ('owner', 'products.manage', true),
    ('owner', 'categories.manage', true),
    ('owner', 'scenes.manage', true),
    ('owner', 'orders.read', true),
    ('owner', 'billing.manage', true),
    ('owner', 'branding.manage', true),
    ('owner', 'analytics.export', true),
    ('owner', 'webhooks.manage', true),
    ('owner', 'experiments.manage', true),
    ('admin', 'admin.dashboard.access', true),
    ('admin', 'org.admin', true),
    ('admin', 'org.members.manage', true),
    ('admin', 'products.manage', true),
    ('admin', 'categories.manage', true),
    ('admin', 'scenes.manage', true),
    ('admin', 'orders.read', true),
    ('admin', 'billing.manage', true),
    ('admin', 'branding.manage', true),
    ('admin', 'analytics.export', true),
    ('admin', 'webhooks.manage', true),
    ('admin', 'experiments.manage', true),
    ('editor', 'admin.dashboard.access', true),
    ('editor', 'products.manage', true),
    ('editor', 'categories.manage', true),
    ('editor', 'scenes.manage', true),
    ('editor', 'orders.read', true),
    ('editor', 'branding.manage', true),
    ('viewer', 'orders.read', true)
) AS seed(role, permission_key, allowed)
ON CONFLICT (role, permission_key) DO UPDATE
SET allowed = EXCLUDED.allowed,
    updated_at = now();

CREATE OR REPLACE FUNCTION public.has_permission(
  p_org_id uuid,
  p_permission_key text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_role text;
  v_role_allowed boolean := false;
  v_user_override boolean;
  v_jwt_role text := current_setting('request.jwt.claim.role', true);
BEGIN
  IF v_jwt_role = 'service_role' THEN
    RETURN true;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF public.is_admin_user() THEN
    RETURN true;
  END IF;

  SELECT om.role
  INTO v_org_role
  FROM public.organization_members om
  WHERE om.organization_id = p_org_id
    AND om.user_id = v_user_id
  LIMIT 1;

  IF v_org_role IS NULL THEN
    RETURN false;
  END IF;

  SELECT rp.allowed
  INTO v_role_allowed
  FROM public.role_permissions rp
  WHERE rp.role = v_org_role
    AND rp.permission_key = p_permission_key
  LIMIT 1;

  SELECT up.allowed
  INTO v_user_override
  FROM public.user_permissions up
  WHERE up.organization_id = p_org_id
    AND up.user_id = v_user_id
    AND up.permission_key = p_permission_key
  LIMIT 1;

  RETURN COALESCE(v_user_override, v_role_allowed, false);
END;
$$;

REVOKE ALL ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_permission(p_org_id, 'org.admin');
$$;

REVOKE ALL ON FUNCTION public.is_org_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO anon, authenticated, service_role;

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read permissions" ON public.permissions;
DROP POLICY IF EXISTS "Authenticated can read role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Service role manages role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Org members can view user permission overrides" ON public.user_permissions;
DROP POLICY IF EXISTS "Org managers can manage user permission overrides" ON public.user_permissions;

CREATE POLICY "Authenticated can read permissions"
ON public.permissions
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can read role permissions"
ON public.role_permissions
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role manages role permissions"
ON public.role_permissions
FOR ALL
USING (current_setting('request.jwt.claim.role', true) = 'service_role')
WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');

CREATE POLICY "Org members can view user permission overrides"
ON public.user_permissions
FOR SELECT
USING (public.is_org_member(organization_id));

CREATE POLICY "Org managers can manage user permission overrides"
ON public.user_permissions
FOR ALL
USING (public.has_permission(organization_id, 'org.members.manage'))
WITH CHECK (public.has_permission(organization_id, 'org.members.manage'));
