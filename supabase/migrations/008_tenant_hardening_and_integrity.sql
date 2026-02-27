-- Sprint 3: Tenant hardening and data integrity

-- 1) Make uniqueness tenant-scoped (remove legacy global uniqueness)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'categories_name_key'
      AND conrelid = 'public.categories'::regclass
  ) THEN
    ALTER TABLE public.categories DROP CONSTRAINT categories_name_key;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'categories_slug_key'
      AND conrelid = 'public.categories'::regclass
  ) THEN
    ALTER TABLE public.categories DROP CONSTRAINT categories_slug_key;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'customers_email_key'
      AND conrelid = 'public.customers'::regclass
  ) THEN
    ALTER TABLE public.customers DROP CONSTRAINT customers_email_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_org_slug_unique
  ON public.categories (organization_id, slug);

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_org_name_unique
  ON public.categories (organization_id, name);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_org_email_unique
  ON public.customers (organization_id, email);

-- 2) Composite keys to support cross-tenant FK checks
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_id_org_unique
  ON public.categories (id, organization_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_id_org_unique
  ON public.products (id, organization_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_id_org_unique
  ON public.orders (id, organization_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_id_org_unique
  ON public.customers (id, organization_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_wallet_id_org_unique
  ON public.user_wallet (id, organization_id);

-- 3) Enforce same-tenant relations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_category_org_fkey'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_category_org_fkey
      FOREIGN KEY (category_id, organization_id)
      REFERENCES public.categories (id, organization_id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'order_items_order_org_fkey'
      AND conrelid = 'public.order_items'::regclass
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_order_org_fkey
      FOREIGN KEY (order_id, organization_id)
      REFERENCES public.orders (id, organization_id)
      ON UPDATE CASCADE
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'order_items_product_org_fkey'
      AND conrelid = 'public.order_items'::regclass
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_product_org_fkey
      FOREIGN KEY (product_id, organization_id)
      REFERENCES public.products (id, organization_id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reviews_product_org_fkey'
      AND conrelid = 'public.reviews'::regclass
  ) THEN
    ALTER TABLE public.reviews
      ADD CONSTRAINT reviews_product_org_fkey
      FOREIGN KEY (product_id, organization_id)
      REFERENCES public.products (id, organization_id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_wallet_customer_org_fkey'
      AND conrelid = 'public.user_wallet'::regclass
  ) THEN
    ALTER TABLE public.user_wallet
      ADD CONSTRAINT user_wallet_customer_org_fkey
      FOREIGN KEY (customer_id, organization_id)
      REFERENCES public.customers (id, organization_id)
      ON UPDATE CASCADE
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'wallet_tx_wallet_org_fkey'
      AND conrelid = 'public.wallet_transactions'::regclass
  ) THEN
    ALTER TABLE public.wallet_transactions
      ADD CONSTRAINT wallet_tx_wallet_org_fkey
      FOREIGN KEY (wallet_id, organization_id)
      REFERENCES public.user_wallet (id, organization_id)
      ON UPDATE CASCADE
      ON DELETE CASCADE;
  END IF;
END $$;

-- 4) Ensure scene/theme columns are aligned with frontend domain model
ALTER TABLE public.store_themes
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.story_scenes
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 5) Indexes for tenant-scoped RLS/query performance
CREATE INDEX IF NOT EXISTS idx_categories_org_created_at
  ON public.categories (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_org_created_at
  ON public.products (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_org_active_created
  ON public.products (organization_id, is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customers_org_created_at
  ON public.customers (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_org_status_created
  ON public.orders (organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_org_created_at
  ON public.reviews (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_wallet_org_updated_at
  ON public.user_wallet (organization_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_org_created_at
  ON public.wallet_transactions (organization_id, created_at DESC);

-- 6) Keep bootstrap_tenant compatible with tenant-scoped customer email uniqueness
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

  IF NOT EXISTS (
    SELECT 1 FROM public.customers c WHERE c.auth_user_id = v_user_id AND c.organization_id = v_org_id
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
    ON CONFLICT (organization_id, email) DO UPDATE
      SET auth_user_id = EXCLUDED.auth_user_id,
          full_name = EXCLUDED.full_name;
  END IF;

  RETURN v_org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_tenant(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_tenant(text) TO authenticated, service_role;
