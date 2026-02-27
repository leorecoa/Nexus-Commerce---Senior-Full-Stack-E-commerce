# Supabase Edge Functions

## Overview

TechStore uses Supabase Edge Functions for server-side operations.

## Functions

### 1. process-order

Processes order after payment confirmation.

**Location**: `supabase/functions/process-order/index.ts`

**Trigger**: Manual or webhook

**Actions**:
- Updates order status
- Sends confirmation email
- Updates inventory

### 2. payment-webhook

Handles payment provider webhooks.

**Location**: `supabase/functions/payment-webhook/index.ts`

**Trigger**: Stripe webhook

**Actions**:
- Validates webhook signature
- Updates order status
- Triggers order processing

### 3. send-email

Sends transactional emails.

**Location**: `supabase/functions/send-email/index.ts`

**Trigger**: Manual call

**Actions**:
- Sends email via SendGrid
- Handles templates
- Logs delivery status

## Deployment

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Deploy function
supabase functions deploy process-order
supabase functions deploy payment-webhook
supabase functions deploy send-email
```

## Environment Variables

Set in Supabase dashboard:

- `SENDGRID_API_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Testing

```bash
# Local development
supabase functions serve

# Test function
curl -i --location --request POST 'http://localhost:54321/functions/v1/process-order' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"orderId":"123"}'
```
