-- Fix RLS recursion by replacing self-referential admin checks with SECURITY DEFINER helper

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can view all customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage product ingredients" ON public.product_ingredients;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can manage reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins can view all wallets" ON public.user_wallet;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.wallet_transactions;

CREATE POLICY "Admins can view all profiles"
ON public.user_profiles
FOR SELECT
USING (public.is_admin_user());

CREATE POLICY "Admins can manage categories"
ON public.categories
FOR ALL
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

CREATE POLICY "Admins can view all customers"
ON public.customers
FOR SELECT
USING (public.is_admin_user());

CREATE POLICY "Admins can manage products"
ON public.products
FOR ALL
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

CREATE POLICY "Admins can manage product ingredients"
ON public.product_ingredients
FOR ALL
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

CREATE POLICY "Admins can view all orders"
ON public.orders
FOR SELECT
USING (public.is_admin_user());

CREATE POLICY "Admins can view all order items"
ON public.order_items
FOR SELECT
USING (public.is_admin_user());

CREATE POLICY "Admins can manage reviews"
ON public.reviews
FOR ALL
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

CREATE POLICY "Admins can view all wallets"
ON public.user_wallet
FOR SELECT
USING (public.is_admin_user());

CREATE POLICY "Admins can view all transactions"
ON public.wallet_transactions
FOR SELECT
USING (public.is_admin_user());
