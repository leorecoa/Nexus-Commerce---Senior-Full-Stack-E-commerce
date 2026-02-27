# Testing Strategy

## Overview

TechStore uses a comprehensive testing approach with three layers:

1. **Unit Tests** (Vitest)
2. **Integration Tests** (Vitest)
3. **E2E Tests** (Playwright)

## Unit Tests

Located in `tests/unit/`

### Coverage

- Zustand stores
- Utility functions
- Custom hooks
- Validation schemas

### Example

```typescript
import { describe, it, expect } from 'vitest'
import { useCartStore } from '@/stores/cartStore'

describe('cartStore', () => {
  it('should add item to cart', () => {
    const product = { id: '1', name: 'Test', price: 100 }
    useCartStore.getState().addItem(product, 2)
    expect(useCartStore.getState().items).toHaveLength(1)
  })
})
```

## Integration Tests

Located in `tests/integration/`

### Coverage

- Auth flow
- Checkout flow
- API service integration

## E2E Tests

Located in `tests/e2e/`

### Critical Paths

1. **Checkout Flow** (GATE)
   - Add to cart
   - Proceed to checkout
   - Complete order
   - Verify success page

2. **ErrorBoundary** (GATE)
   - Trigger error
   - Verify error UI
   - Verify reload functionality

### Running Tests

```bash
# Unit + Integration
npm test

# Coverage
npm run test:coverage

# E2E
npm run test:e2e
```

## CI Gates

Tests that must pass in CI:

- ✅ All unit tests
- ✅ All integration tests
- ✅ Checkout E2E spec
- ✅ ErrorBoundary E2E spec
- ✅ Coverage > 80%
