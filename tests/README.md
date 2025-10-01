# Frontend Tests

This directory contains all frontend tests for the Kidoers application.

## Structure

```
tests/
├── unit/                    # Unit tests (components, hooks, utils)
│   └── components/
│       └── *.test.tsx
├── e2e/                     # End-to-end tests with Playwright
│   └── *.spec.ts
├── helpers/                 # Test utilities and helpers
│   ├── render.tsx           # Custom render functions (to be created)
│   └── mockData.ts          # Mock data factories (to be created)
└── setup.ts                 # Test setup (to be created)
```

## Running Tests

```bash
# Unit tests
npm run test

# Unit tests in watch mode
npm run test -- --watch

# Unit tests with coverage
npm run test:coverage

# E2E tests
npm run test:e2e

# E2E tests in headed mode
npm run test:e2e -- --headed

# E2E tests in debug mode
npm run test:e2e -- --debug
```

## Writing Tests

1. **Unit tests** (`tests/unit/`)
   - Test components in isolation
   - Use Vitest + React Testing Library
   - Mock external dependencies
   - Should be very fast

2. **E2E tests** (`tests/e2e/`)
   - Test complete user workflows
   - Use Playwright
   - Test critical paths only
   - Can be slower but comprehensive

3. Use descriptive test names:
   ```typescript
   it('should remove member from selection when clicked', () => {
     // test implementation
   });
   ```

See `TESTING_CONVENTIONS.md` for detailed guidelines.

## Test Utilities

- `renderWithProviders()`: Render components with necessary providers
- `mockFamilyMembers`: Pre-built test data
- More utilities to be added in Step 3

## Next Steps

- [ ] Step 3: Set up Vitest configuration
- [ ] Step 3: Create test helpers (render, mockData)
- [ ] Step 3: Install testing dependencies
- [ ] Step 11: Set up Playwright
- [ ] Step 6+: Write actual tests for components

