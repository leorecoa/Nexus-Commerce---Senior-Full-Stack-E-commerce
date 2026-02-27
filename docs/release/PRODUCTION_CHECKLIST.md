# Production Checklist

## 1. Database and Migrations
- [ ] Apply migrations `004` to `009` in remote Supabase project.
- [ ] Confirm latest migration executed in production.
- [ ] Validate tenant isolation constraints (`products_category_org_fkey`, `order_items_*_org_fkey`).
- [ ] Validate `bootstrap_tenant()` for first login and repeated login.

## 2. Auth and Session Hardening
- [x] Session state synced via Supabase auth listener.
- [x] Cross-tab logout sync via `BroadcastChannel` + `localStorage` auth event.
- [x] Session revalidation on window focus.
- [ ] Run manual QA for login/logout across multiple tabs and devices.

## 3. SaaS Core Flows
- [x] Admin CRUD categories/products (create/update/delete/upload).
- [x] Scene builder integrated in admin dashboard.
- [x] Protected checkout route.
- [ ] Validate production checkout RPC and payment edges with real environment data.

## 4. Observability
- [x] Frontend monitoring hooks integrated (`window.error`, unhandled promises, React Query, ErrorBoundary).
- [x] Structured logs added to edge functions.
- [ ] Set `VITE_SENTRY_DSN` in production and validate incoming events.
- [ ] Define alert rules (error rate, failed checkout, edge failures).

## 5. CI/CD Gates
- [x] CI action versions updated (`checkout/setup-node/upload-artifact` v4).
- [x] Migration numbering gate (`npm run migrations:check`) added to CI.
- [ ] Add Supabase schema drift gate in CI with project credentials.

## 6. Automated Tests
- [x] E2E baseline updated for auth/admin/checkout/tenant selector flows.
- [x] Authenticated E2E flows supported via `E2E_EMAIL` + `E2E_PASSWORD`.
- [ ] Configure CI secrets for authenticated E2E and enable full suite in pipeline.

## 7. Runtime Configuration
- [ ] Set Vercel env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SENTRY_DSN`.
- [ ] Redeploy after env updates.
- [ ] Verify no runtime `Missing Supabase environment variables` error.

## 8. Go-live Validation
- [ ] New user signup -> email confirmation -> login -> tenant bootstrap.
- [ ] Admin creates category/product and product appears in storefront.
- [ ] Cart -> checkout -> order created with correct `organization_id`.
- [ ] Scene builder updates reflect on home storytelling.
