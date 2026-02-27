-- Sprint 1 foundation: multi-tenant schema + tenant-aware RLS + checkout RPC adaptation

-- 1) Core multi-tenant entities
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

-- 2) Add tenant key columns
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.user_wallet ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS organization_id uuid;

-- 3) Backfill tenant data for existing rows
DO $$
DECLARE
  v_default_org_id uuid;
BEGIN
  INSERT INTO public.organizations (name, slug)
  VALUES ('Default Organization', 'default-org')
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_default_org_id;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  SELECT
    v_default_org_id,
    up.id,
    CASE WHEN up.role = 'admin' THEN 'owner' ELSE 'editor' END
  FROM public.user_profiles up
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  INSERT INTO public.stores (organization_id, name, slug)
  VALUES (v_default_org_id, 'Default Store', 'default-store')
  ON CONFLICT (organization_id, slug) DO NOTHING;

  UPDATE public.categories SET organization_id = v_default_org_id WHERE organization_id IS NULL;
  UPDATE public.customers SET organization_id = v_default_org_id WHERE organization_id IS NULL;
  UPDATE public.products SET organization_id = v_default_org_id WHERE organization_id IS NULL;
  UPDATE public.orders SET organization_id = v_default_org_id WHERE organization_id IS NULL;

  UPDATE public.order_items oi
  SET organization_id = o.organization_id
  FROM public.orders o
  WHERE oi.order_id = o.id
    AND oi.organization_id IS NULL;

  UPDATE public.order_items
  SET organization_id = v_default_org_id
  WHERE organization_id IS NULL;

  UPDATE public.reviews r
  SET organization_id = p.organization_id
  FROM public.products p
  WHERE r.product_id = p.id
    AND r.organization_id IS NULL;

  UPDATE public.reviews
  SET organization_id = v_default_org_id
  WHERE organization_id IS NULL;

  UPDATE public.user_wallet uw
  SET organization_id = c.organization_id
  FROM public.customers c
  WHERE uw.customer_id = c.id
    AND uw.organization_id IS NULL;

  UPDATE public.user_wallet
  SET organization_id = v_default_org_id
  WHERE organization_id IS NULL;

  UPDATE public.wallet_transactions wt
  SET organization_id = uw.organization_id
  FROM public.user_wallet uw
  WHERE wt.wallet_id = uw.id
    AND wt.organization_id IS NULL;

  UPDATE public.wallet_transactions
  SET organization_id = v_default_org_id
  WHERE organization_id IS NULL;
END $$;

-- 4) Enforce tenant foreign keys + not null
ALTER TABLE public.categories ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.customers ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.orders ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.order_items ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.reviews ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.user_wallet ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.wallet_transactions ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.categories
  ADD CONSTRAINT categories_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.customers
  ADD CONSTRAINT customers_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.products
  ADD CONSTRAINT products_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.user_wallet
  ADD CONSTRAINT user_wallet_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 5) Indexes for tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_organization_members_org_user ON public.organization_members(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_stores_org ON public.stores(organization_id);
CREATE INDEX IF NOT EXISTS idx_categories_org ON public.categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_org ON public.customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_org_active ON public.products(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_orders_org_created ON public.orders(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_org ON public.order_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_reviews_org ON public.reviews(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_wallet_org ON public.user_wallet(organization_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_org ON public.wallet_transactions(organization_id);

-- 6) Helper functions for RLS
CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = p_org_id
      AND om.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = p_org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
  );
$$;

REVOKE ALL ON FUNCTION public.is_org_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_org_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO anon, authenticated, service_role;

-- 7) Enable RLS for new tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- 8) Reset old policies (include legacy + recursion-fix migration names)
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;

DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;

DROP POLICY IF EXISTS "Users can view own customer data" ON public.customers;
DROP POLICY IF EXISTS "Admins can view all customers" ON public.customers;
DROP POLICY IF EXISTS "Users can update own customer data" ON public.customers;

DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

DROP POLICY IF EXISTS "Anyone can view product ingredients" ON public.product_ingredients;
DROP POLICY IF EXISTS "Admins can manage product ingredients" ON public.product_ingredients;

DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;

DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;

DROP POLICY IF EXISTS "Anyone can view visible reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins can manage reviews" ON public.reviews;

DROP POLICY IF EXISTS "Users can view own wallet" ON public.user_wallet;
DROP POLICY IF EXISTS "Admins can view all wallets" ON public.user_wallet;

DROP POLICY IF EXISTS "Users can view own transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.wallet_transactions;

-- 9) New tenant-aware policies
CREATE POLICY "Users can view own profile"
ON public.user_profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can view own orgs"
ON public.organizations
FOR SELECT
USING (public.is_org_member(id));

CREATE POLICY "Org admins can update org"
ON public.organizations
FOR UPDATE
USING (public.is_org_admin(id))
WITH CHECK (public.is_org_admin(id));

CREATE POLICY "Users can view org members"
ON public.organization_members
FOR SELECT
USING (public.is_org_member(organization_id));

CREATE POLICY "Org admins can manage members"
ON public.organization_members
FOR ALL
USING (public.is_org_admin(organization_id))
WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "Users can view stores"
ON public.stores
FOR SELECT
USING (public.is_org_member(organization_id));

CREATE POLICY "Org admins can manage stores"
ON public.stores
FOR ALL
USING (public.is_org_admin(organization_id))
WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "Users can view categories by org"
ON public.categories
FOR SELECT
USING (public.is_org_member(organization_id));

CREATE POLICY "Org admins can manage categories"
ON public.categories
FOR ALL
USING (public.is_org_admin(organization_id))
WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "Users can view own customer data by org"
ON public.customers
FOR SELECT
USING (auth.uid() = auth_user_id AND public.is_org_member(organization_id));

CREATE POLICY "Org admins can view all customers"
ON public.customers
FOR SELECT
USING (public.is_org_admin(organization_id));

CREATE POLICY "Users can update own customer data"
ON public.customers
FOR UPDATE
USING (auth.uid() = auth_user_id AND public.is_org_member(organization_id))
WITH CHECK (auth.uid() = auth_user_id AND public.is_org_member(organization_id));

CREATE POLICY "Users can view active products by org"
ON public.products
FOR SELECT
USING (is_active = true AND public.is_org_member(organization_id));

CREATE POLICY "Org admins can manage products"
ON public.products
FOR ALL
USING (public.is_org_admin(organization_id))
WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "Users can view product ingredients by org"
ON public.product_ingredients
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p.id = product_ingredients.product_id
      AND public.is_org_member(p.organization_id)
  )
);

CREATE POLICY "Org admins can manage product ingredients"
ON public.product_ingredients
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p.id = product_ingredients.product_id
      AND public.is_org_admin(p.organization_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p.id = product_ingredients.product_id
      AND public.is_org_admin(p.organization_id)
  )
);

CREATE POLICY "Users can view own orders by org"
ON public.orders
FOR SELECT
USING (auth.uid() = user_id AND public.is_org_member(organization_id));

CREATE POLICY "Org admins can view all orders"
ON public.orders
FOR SELECT
USING (public.is_org_admin(organization_id));

CREATE POLICY "Users can create orders by org"
ON public.orders
FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.is_org_member(organization_id));

CREATE POLICY "Users can view own order items by org"
ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.user_id = auth.uid()
      AND public.is_org_member(o.organization_id)
  )
);

CREATE POLICY "Org admins can view all order items"
ON public.order_items
FOR SELECT
USING (public.is_org_admin(organization_id));

CREATE POLICY "Users can view visible reviews by org"
ON public.reviews
FOR SELECT
USING (is_visible = true AND public.is_org_member(organization_id));

CREATE POLICY "Users can create reviews by org"
ON public.reviews
FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.is_org_member(organization_id));

CREATE POLICY "Org admins can manage reviews"
ON public.reviews
FOR ALL
USING (public.is_org_admin(organization_id))
WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "Users can view own wallet by org"
ON public.user_wallet
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.customers c
    WHERE c.id = user_wallet.customer_id
      AND c.auth_user_id = auth.uid()
      AND c.organization_id = user_wallet.organization_id
      AND public.is_org_member(c.organization_id)
  )
);

CREATE POLICY "Org admins can view all wallets"
ON public.user_wallet
FOR SELECT
USING (public.is_org_admin(organization_id));

CREATE POLICY "Users can view own transactions by org"
ON public.wallet_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_wallet uw
    JOIN public.customers c ON c.id = uw.customer_id
    WHERE uw.id = wallet_transactions.wallet_id
      AND c.auth_user_id = auth.uid()
      AND uw.organization_id = wallet_transactions.organization_id
      AND public.is_org_member(uw.organization_id)
  )
);

CREATE POLICY "Org admins can view all transactions"
ON public.wallet_transactions
FOR SELECT
USING (public.is_org_admin(organization_id));

-- 10) Update checkout RPC to enforce tenant and persist organization_id in orders/items
CREATE OR REPLACE FUNCTION public.create_order(
  p_items jsonb,
  p_shipping_address jsonb,
  p_payment_method text DEFAULT NULL,
  p_use_wallet_balance boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_item jsonb;
  v_total numeric := 0;
  v_customer_id uuid;
  v_wallet_id uuid;
  v_wallet_balance numeric := 0;
  v_final_charge numeric;
  v_product_price numeric;
  v_product_stock integer;
  v_org_id uuid;
BEGIN
  SELECT c.id, c.organization_id
  INTO v_customer_id, v_org_id
  FROM public.customers c
  WHERE c.auth_user_id = auth.uid();

  IF v_customer_id IS NULL OR v_org_id IS NULL THEN
    RAISE EXCEPTION 'Customer or organization not found';
  END IF;

  IF p_use_wallet_balance THEN
    SELECT id, balance
    INTO v_wallet_id, v_wallet_balance
    FROM public.user_wallet
    WHERE customer_id = v_customer_id
      AND organization_id = v_org_id;

    IF v_wallet_balance IS NULL THEN
      v_wallet_balance := 0;
    END IF;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT p.price, p.stock_quantity
    INTO v_product_price, v_product_stock
    FROM public.products p
    WHERE p.id = (v_item->>'product_id')::uuid
      AND p.is_active = true
      AND p.organization_id = v_org_id;

    IF v_product_price IS NULL THEN
      RAISE EXCEPTION 'Product not found in current organization';
    END IF;

    IF v_product_stock < (v_item->>'quantity')::integer THEN
      RAISE EXCEPTION 'Insufficient stock';
    END IF;

    v_total := v_total + (v_product_price * (v_item->>'quantity')::integer);
  END LOOP;

  v_final_charge := GREATEST(v_total - v_wallet_balance, 0);

  INSERT INTO public.orders (
    customer_id,
    user_id,
    organization_id,
    total_amount,
    status,
    payment_method,
    shipping_address_snapshot,
    used_wallet_balance,
    final_charge_amount
  )
  VALUES (
    v_customer_id,
    auth.uid(),
    v_org_id,
    v_total,
    'pending',
    p_payment_method,
    p_shipping_address,
    LEAST(v_wallet_balance, v_total),
    v_final_charge
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT p.price
    INTO v_product_price
    FROM public.products p
    WHERE p.id = (v_item->>'product_id')::uuid
      AND p.organization_id = v_org_id;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      organization_id,
      quantity,
      unit_price,
      subtotal
    )
    VALUES (
      v_order_id,
      (v_item->>'product_id')::uuid,
      v_org_id,
      (v_item->>'quantity')::integer,
      v_product_price,
      v_product_price * (v_item->>'quantity')::integer
    );

    UPDATE public.products
    SET stock_quantity = stock_quantity - (v_item->>'quantity')::integer
    WHERE id = (v_item->>'product_id')::uuid
      AND organization_id = v_org_id;
  END LOOP;

  IF p_use_wallet_balance AND v_wallet_balance > 0 AND v_wallet_id IS NOT NULL THEN
    UPDATE public.user_wallet
    SET balance = balance - LEAST(v_wallet_balance, v_total),
        updated_at = now()
    WHERE id = v_wallet_id
      AND organization_id = v_org_id;

    INSERT INTO public.wallet_transactions (
      wallet_id,
      organization_id,
      type,
      amount,
      status,
      description
    )
    VALUES (
      v_wallet_id,
      v_org_id,
      'PURCHASE',
      LEAST(v_wallet_balance, v_total),
      'COMPLETED',
      'Order payment'
    );
  END IF;

  RETURN v_order_id;
END;
$$;
