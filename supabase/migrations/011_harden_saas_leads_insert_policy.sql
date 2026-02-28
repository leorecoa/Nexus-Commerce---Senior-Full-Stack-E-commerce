-- Harden saas_leads public insert policy (avoid WITH CHECK true)

DROP POLICY IF EXISTS "Public can create leads" ON public.saas_leads;

CREATE POLICY "Public can create leads"
ON public.saas_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(trim(name)) BETWEEN 2 AND 120
  AND email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
  AND coalesce(length(company), 0) <= 120
  AND coalesce(length(message), 0) <= 2000
  AND source IN ('pricing', 'demo', 'demo-page', 'contact')
);
