# Supabase Setup Guide

## 1. Create Project

1. Go to https://supabase.com
2. Create new project
3. Copy URL and anon key to `.env`

## 2. Database Schema

Run the following SQL in Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'user',
  created_at timestamp DEFAULT now()
);

-- Products table
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text NOT NULL,
  price numeric NOT NULL,
  image_url text NOT NULL,
  stock integer NOT NULL DEFAULT 0,
  created_at timestamp DEFAULT now()
);

-- Orders table
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES user_profiles NOT NULL,
  total numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp DEFAULT now()
);

-- Order items table
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES orders NOT NULL,
  product_id uuid REFERENCES products NOT NULL,
  quantity integer NOT NULL,
  price numeric NOT NULL
);
```

## 3. RLS Policies

```sql
-- User profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Products (public read, admin write)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view products"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage products"
  ON products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Orders (users see own, admins see all)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

## 4. RPC Function

```sql
CREATE OR REPLACE FUNCTION create_order(order_items jsonb)
RETURNS uuid AS $$
DECLARE
  new_order_id uuid;
  item jsonb;
  order_total numeric := 0;
BEGIN
  -- Create order
  INSERT INTO orders (user_id, total, status)
  VALUES (auth.uid(), 0, 'pending')
  RETURNING id INTO new_order_id;
  
  -- Process items
  FOR item IN SELECT * FROM jsonb_array_elements(order_items)
  LOOP
    INSERT INTO order_items (order_id, product_id, quantity, price)
    SELECT 
      new_order_id,
      (item->>'product_id')::uuid,
      (item->>'quantity')::integer,
      p.price
    FROM products p
    WHERE p.id = (item->>'product_id')::uuid;
    
    -- Update stock
    UPDATE products
    SET stock = stock - (item->>'quantity')::integer
    WHERE id = (item->>'product_id')::uuid;
    
    -- Add to total
    SELECT order_total + (p.price * (item->>'quantity')::integer)
    INTO order_total
    FROM products p
    WHERE p.id = (item->>'product_id')::uuid;
  END LOOP;
  
  -- Update order total
  UPDATE orders SET total = order_total WHERE id = new_order_id;
  
  RETURN new_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 5. Storage Bucket

1. Go to Storage in Supabase dashboard
2. Create bucket named `products`
3. Set to public
4. Add policy for admin uploads

## 6. Auth Setup

1. Enable Email provider
2. Enable Google OAuth
3. Add redirect URL: `http://localhost:3000/auth/callback`
