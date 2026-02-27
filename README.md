# 🛒 TechStore - Production-Ready E-commerce

A senior-level full-stack e-commerce platform built with React 19, TypeScript, Vite 6, and Supabase.

## ✨ Features

- 🔐 **Authentication**: Email/password + Google OAuth
- 🛍️ **Shopping**: Product catalog, cart, checkout
- 💳 **Transactional Checkout**: RPC with stock validation
- 👨‍💼 **Admin Dashboard**: Protected CRUD with image upload
- 🔒 **Security**: RBAC, RLS, input validation, secrets scanning
- ✅ **Testing**: Unit, integration, E2E with Vitest + Playwright
- 🚀 **CI/CD**: Automated pipeline with quality gates

## 🏗 Tech Stack

### Frontend
- React 19
- TypeScript
- Vite 6
- React Router v7
- Zustand (state)
- TanStack Query v5
- React Hook Form
- Zod (validation)
- Tailwind CSS
- Lucide React

### Backend
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Supabase RLS
- Supabase RPC

### Quality
- Vitest
- Playwright
- ESLint
- Prettier
- Commitlint
- Husky

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Supabase account

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Add your Supabase credentials to .env
```

### Setup Supabase

Follow the guide in `docs/backend/SUPABASE_SETUP.md`

### Development

```bash
# Start dev server
npm run dev

# Run tests
npm test

# Run E2E tests
npm run test:e2e

# Build for production
npm run build
```

## 📁 Project Structure

```
src/
├── app/              # App configuration
├── components/       # Shared components
├── features/         # Feature modules
│   ├── auth/        # Authentication
│   ├── products/    # Product catalog
│   ├── cart/        # Shopping cart
│   ├── checkout/    # Checkout flow
│   └── admin/       # Admin dashboard
├── hooks/           # Custom hooks
├── services/        # API services
├── stores/          # Zustand stores
├── schemas/         # Zod schemas
├── types/           # TypeScript types
└── lib/             # Utilities

tests/
├── unit/            # Unit tests
├── integration/     # Integration tests
└── e2e/             # E2E tests

docs/
├── architecture/    # Technical docs
├── backend/         # Backend setup
├── testing/         # Testing strategy
└── devops/          # CI/CD docs
```

## 🔒 Security

- Row Level Security (RLS) policies
- Role-Based Access Control (RBAC)
- Input sanitization with Zod
- Secrets scanning in CI
- Environment validation
- Protected admin routes

## 📊 Testing

```bash
# Unit + Integration tests
npm test

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e
```

## 🛠 Scripts

```bash
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Lint code
npm run format           # Format code
npm run format:check     # Check formatting
npm run env:check        # Validate environment
npm run secrets:scan     # Scan for secrets
npm run type-check       # TypeScript check
npm test                 # Run tests
npm run test:coverage    # Test with coverage
npm run test:e2e         # Run E2E tests
```

## 📚 Documentation

- [Technical Deep Dive](docs/architecture/TECHNICAL_DEEP_DIVE.md)
- [Supabase Setup](docs/backend/SUPABASE_SETUP.md)
- [Testing Strategy](docs/testing/TESTING_STRATEGY.md)
- [CI/CD Pipeline](docs/devops/CI_CD.md)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feat/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feat/amazing-feature`)
5. Open Pull Request

## 📝 License

MIT

---

Built with ❤️ using React 19, TypeScript, Vite 6, and Supabase
