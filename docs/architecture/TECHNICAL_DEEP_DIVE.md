# TechStore - Technical Deep Dive

## Architecture Overview

TechStore is a production-ready e-commerce platform built with modern web technologies.

### Stack

- **Frontend**: React 19, TypeScript, Vite 6
- **State**: Zustand, TanStack Query v5
- **Backend**: Supabase (Auth, Postgres, RLS, RPC, Storage)
- **Testing**: Vitest, Playwright
- **CI/CD**: GitHub Actions

### Security

- Row Level Security (RLS) policies
- RBAC (user/admin roles)
- Input sanitization with Zod
- Secrets scanning
- Environment validation

### Key Features

1. **Authentication**: Email/password + Google OAuth
2. **Checkout**: Transactional RPC with stock validation
3. **Admin Area**: Protected CRUD with image upload
4. **Testing**: Unit, integration, and E2E coverage
5. **CI Pipeline**: Automated quality gates

### Database Schema

```sql
-- user_profiles
id uuid primary key
email text
role text (user|admin)
created_at timestamp

-- products
id uuid primary key
name text
description text
price numeric
image_url text
stock integer
created_at timestamp

-- orders
id uuid primary key
user_id uuid references user_profiles
total numeric
status text
created_at timestamp

-- order_items
id uuid primary key
order_id uuid references orders
product_id uuid references products
quantity integer
price numeric
```

### RPC Functions

```sql
CREATE OR REPLACE FUNCTION create_order(order_items jsonb)
RETURNS uuid AS $$
DECLARE
  new_order_id uuid;
BEGIN
  INSERT INTO orders (user_id, total, status)
  VALUES (auth.uid(), 0, 'pending')
  RETURNING id INTO new_order_id;
  
  -- Insert order items and validate stock
  -- Calculate total
  -- Return order ID
  
  RETURN new_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```
