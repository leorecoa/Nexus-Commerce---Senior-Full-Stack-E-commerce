-- White-label foundation: tenant branding + custom domains

CREATE TABLE IF NOT EXISTS public.tenant_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  public_name text,
  logo_url text,
  favicon_url text,
  primary_color text,
  secondary_color text,
  accent_color text,
  font_family text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed')),
  verification_token text NOT NULL DEFAULT encode(gen_random_bytes(12), 'hex'),
  validated_at timestamptz,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_branding_org ON public.tenant_branding(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_domains_org_status ON public.organization_domains(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_org_domains_domain ON public.organization_domains(domain);

ALTER TABLE public.tenant_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view tenant branding" ON public.tenant_branding;
DROP POLICY IF EXISTS "Org admins can manage tenant branding" ON public.tenant_branding;
DROP POLICY IF EXISTS "Org members can view domains" ON public.organization_domains;
DROP POLICY IF EXISTS "Org admins can manage domains" ON public.organization_domains;

CREATE POLICY "Org members can view tenant branding"
ON public.tenant_branding
FOR SELECT
USING (public.is_org_member(organization_id));

CREATE POLICY "Org admins can manage tenant branding"
ON public.tenant_branding
FOR ALL
USING (public.is_org_admin(organization_id))
WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "Org members can view domains"
ON public.organization_domains
FOR SELECT
USING (public.is_org_member(organization_id));

CREATE POLICY "Org admins can manage domains"
ON public.organization_domains
FOR ALL
USING (public.is_org_admin(organization_id))
WITH CHECK (public.is_org_admin(organization_id));

CREATE OR REPLACE FUNCTION public.get_branding_by_host(p_host text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'organization_id', o.id,
    'domain', d.domain,
    'public_name', coalesce(tb.public_name, o.name),
    'logo_url', tb.logo_url,
    'favicon_url', tb.favicon_url,
    'primary_color', tb.primary_color,
    'secondary_color', tb.secondary_color,
    'accent_color', tb.accent_color,
    'font_family', tb.font_family,
    'meta', coalesce(tb.meta, '{}'::jsonb)
  )
  FROM public.organization_domains d
  JOIN public.organizations o ON o.id = d.organization_id
  LEFT JOIN public.tenant_branding tb ON tb.organization_id = o.id
  WHERE lower(d.domain) = lower(p_host)
    AND d.status = 'verified'
  ORDER BY d.is_primary DESC, d.created_at ASC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_branding_by_host(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_branding_by_host(text) TO anon, authenticated, service_role;
