CREATE OR REPLACE FUNCTION public.create_order(
  p_items jsonb,
  p_shipping_address jsonb,
  p_payment_method text DEFAULT NULL,
  p_use_wallet_balance boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
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
BEGIN
  SELECT id INTO v_customer_id FROM public.customers WHERE auth_user_id = auth.uid();
  IF v_customer_id IS NULL THEN RAISE EXCEPTION 'Customer not found'; END IF;
  
  IF p_use_wallet_balance THEN
    SELECT id, balance INTO v_wallet_id, v_wallet_balance FROM public.user_wallet WHERE customer_id = v_customer_id;
    IF v_wallet_balance IS NULL THEN v_wallet_balance := 0; END IF;
  END IF;
  
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT price, stock_quantity INTO v_product_price, v_product_stock FROM public.products WHERE id = (v_item->>'product_id')::uuid AND is_active = true;
    IF v_product_price IS NULL THEN RAISE EXCEPTION 'Product not found'; END IF;
    IF v_product_stock < (v_item->>'quantity')::integer THEN RAISE EXCEPTION 'Insufficient stock'; END IF;
    v_total := v_total + (v_product_price * (v_item->>'quantity')::integer);
  END LOOP;
  
  v_final_charge := GREATEST(v_total - v_wallet_balance, 0);
  
  INSERT INTO public.orders (customer_id, user_id, total_amount, status, payment_method, shipping_address_snapshot, used_wallet_balance, final_charge_amount)
  VALUES (v_customer_id, auth.uid(), v_total, 'pending', p_payment_method, p_shipping_address, LEAST(v_wallet_balance, v_total), v_final_charge)
  RETURNING id INTO v_order_id;
  
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT price INTO v_product_price FROM public.products WHERE id = (v_item->>'product_id')::uuid;
    INSERT INTO public.order_items (order_id, product_id, quantity, unit_price, subtotal)
    VALUES (v_order_id, (v_item->>'product_id')::uuid, (v_item->>'quantity')::integer, v_product_price, v_product_price * (v_item->>'quantity')::integer);
    UPDATE public.products SET stock_quantity = stock_quantity - (v_item->>'quantity')::integer WHERE id = (v_item->>'product_id')::uuid;
  END LOOP;
  
  IF p_use_wallet_balance AND v_wallet_balance > 0 AND v_wallet_id IS NOT NULL THEN
    UPDATE public.user_wallet SET balance = balance - LEAST(v_wallet_balance, v_total), updated_at = now() WHERE id = v_wallet_id;
    INSERT INTO public.wallet_transactions (wallet_id, type, amount, status, description)
    VALUES (v_wallet_id, 'PURCHASE', LEAST(v_wallet_balance, v_total), 'COMPLETED', 'Order payment');
  END IF;
  
  RETURN v_order_id;
END;
$$;
