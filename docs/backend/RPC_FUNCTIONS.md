# RPC Functions

## create_order

Creates a new order with transactional integrity.

```sql
CREATE OR REPLACE FUNCTION create_order(
  p_items jsonb,
  p_shipping_address jsonb,
  p_payment_method text DEFAULT NULL,
  p_use_wallet_balance boolean DEFAULT false
)
RETURNS uuid AS $$
DECLARE
  v_order_id uuid;
  v_item jsonb;
  v_total numeric := 0;
  v_customer_id uuid;
  v_wallet_balance numeric := 0;
  v_final_charge numeric;
BEGIN
  -- Get customer
  SELECT id INTO v_customer_id
  FROM customers
  WHERE auth_user_id = auth.uid();
  
  -- Get wallet balance if requested
  IF p_use_wallet_balance THEN
    SELECT balance INTO v_wallet_balance
    FROM user_wallet
    WHERE customer_id = v_customer_id;
  END IF;
  
  -- Calculate total
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT v_total + (p.price * (v_item->>'quantity')::integer)
    INTO v_total
    FROM products p
    WHERE p.id = (v_item->>'product_id')::uuid;
  END LOOP;
  
  -- Calculate final charge
  v_final_charge := GREATEST(v_total - v_wallet_balance, 0);
  
  -- Create order
  INSERT INTO orders (
    customer_id,
    user_id,
    total_amount,
    status,
    payment_method,
    shipping_address_snapshot,
    used_wallet_balance,
    final_charge_amount
  ) VALUES (
    v_customer_id,
    auth.uid(),
    v_total,
    'pending',
    p_payment_method,
    p_shipping_address,
    LEAST(v_wallet_balance, v_total),
    v_final_charge
  ) RETURNING id INTO v_order_id;
  
  -- Insert order items and update stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
    SELECT 
      v_order_id,
      (v_item->>'product_id')::uuid,
      (v_item->>'quantity')::integer,
      p.price,
      p.price * (v_item->>'quantity')::integer
    FROM products p
    WHERE p.id = (v_item->>'product_id')::uuid;
    
    -- Update stock
    UPDATE products
    SET stock_quantity = stock_quantity - (v_item->>'quantity')::integer
    WHERE id = (v_item->>'product_id')::uuid
    AND stock_quantity >= (v_item->>'quantity')::integer;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient stock for product %', v_item->>'product_id';
    END IF;
  END LOOP;
  
  -- Deduct from wallet if used
  IF p_use_wallet_balance AND v_wallet_balance > 0 THEN
    UPDATE user_wallet
    SET balance = balance - LEAST(v_wallet_balance, v_total)
    WHERE customer_id = v_customer_id;
    
    INSERT INTO wallet_transactions (wallet_id, type, amount, status, description)
    SELECT id, 'PURCHASE', LEAST(v_wallet_balance, v_total), 'COMPLETED', 'Order payment'
    FROM user_wallet WHERE customer_id = v_customer_id;
  END IF;
  
  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```
