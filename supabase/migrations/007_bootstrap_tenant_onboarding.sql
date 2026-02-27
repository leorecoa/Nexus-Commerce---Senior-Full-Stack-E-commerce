-- P0.2: onboarding transacional para tenant

CREATE OR REPLACE FUNCTION public.bootstrap_tenant(
  p_organization_name text DEFAULT 'My Organization'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_org_slug text;
  v_email text;
  v_full_name text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- If user already belongs to any organization, reuse first one
  SELECT om.organization_id
  INTO v_org_id
  FROM public.organization_members om
  WHERE om.user_id = v_user_id
  ORDER BY om.created_at
  LIMIT 1;

  IF v_org_id IS NULL THEN
    v_org_slug := lower(regexp_replace(p_organization_name, '[^a-zA-Z0-9]+', '-', 'g'));
    v_org_slug := trim(both '-' from v_org_slug);

    IF v_org_slug IS NULL OR v_org_slug = '' THEN
      v_org_slug := 'org';
    END IF;

    v_org_slug := v_org_slug || '-' || substr(replace(v_user_id::text, '-', ''), 1, 8);

    INSERT INTO public.organizations (name, slug)
    VALUES (coalesce(nullif(trim(p_organization_name), ''), 'My Organization'), v_org_slug)
    RETURNING id INTO v_org_id;

    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (v_org_id, v_user_id, 'owner')
    ON CONFLICT (organization_id, user_id) DO NOTHING;
  END IF;

  -- Ensure at least one active store
  IF NOT EXISTS (
    SELECT 1 FROM public.stores s WHERE s.organization_id = v_org_id AND s.is_active = true
  ) THEN
    INSERT INTO public.stores (organization_id, name, slug, is_active)
    VALUES (
      v_org_id,
      'Default Store',
      'default-store',
      true
    )
    ON CONFLICT (organization_id, slug) DO NOTHING;
  END IF;

  -- Ensure customer exists for checkout flow
  IF NOT EXISTS (
    SELECT 1 FROM public.customers c WHERE c.auth_user_id = v_user_id
  ) THEN
    SELECT au.email,
           coalesce(nullif(au.raw_user_meta_data->>'full_name', ''), split_part(au.email, '@', 1), 'Customer')
    INTO v_email, v_full_name
    FROM auth.users au
    WHERE au.id = v_user_id;

    INSERT INTO public.customers (
      organization_id,
      full_name,
      email,
      auth_user_id,
      user_role
    )
    VALUES (
      v_org_id,
      v_full_name,
      v_email,
      v_user_id,
      'customer'
    )
    ON CONFLICT (email) DO NOTHING;
  END IF;

  RETURN v_org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_tenant(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_tenant(text) TO authenticated, service_role;
