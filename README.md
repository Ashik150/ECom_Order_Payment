# Raco Commerce

A full-stack e-commerce ordering and provider-verified payment assessment. The
backend emphasizes ownership, deterministic money calculations, transactional
stock safety, extensible payment strategies, DFS recommendations, and graceful
cache failure. The React client demonstrates the complete customer and admin
workflows.

## Features

- Registration, login, JWT authentication, `ADMIN`/`USER` authorization
- Active product browsing, search, category filtering, details, and DFS recommendations
- Admin product and category CRUD with cycle prevention
- Cart, server-calculated orders, cancellation, own order/payment histories
- Stripe Payment Intents, server verification, signed webhooks, and Elements
- bKash grant token, create, execute, query, callback verification, token expiry cache
- Idempotent paid-order finalization and atomic stock reduction
- PostgreSQL/Prisma migrations and seed data
- Redis cache-aside category trees with TTL, invalidation, and fallback
- Swagger UI, Mermaid architecture/ERD/payment diagrams, Jest and Supertest

## Stack

React 19, TypeScript, Vite, React Router, Axios, React Hook Form, Zod,
Tailwind CSS, Stripe Elements, Node.js, Express 5, Prisma, PostgreSQL, Redis,
JWT, bcrypt, Pino, Swagger, Jest, and Supertest.

## Structure

```text
client/                 React application
Server/
  prisma/               schema, migration, seed
  src/config/           validated environment
  src/infrastructure/   Prisma, Redis cache, logging
  src/middleware/       auth, RBAC, validation, errors, request IDs
  src/modules/          domain services, routes, payment strategies
  src/docs/             OpenAPI document
  tests/                Supertest API tests
docs/                   checklist and Mermaid documentation
```

See [architecture](docs/architecture.md), [ERD](docs/erd.md),
[payment flows](docs/payment-flow.md), [API guide](docs/api-guide.md), and
[testing guide](docs/testing-guide.md).

## Prerequisites

- Node.js `22.13.0` or newer
- PostgreSQL
- Redis (recommended; the API safely falls back without it)
- Stripe test credentials and/or bKash sandbox credentials for real provider flows

## Local Setup

```bash
cp .env.example .env
createdb raco_commerce

cd Server
npm install
npm run prisma:generate
npm run prisma:deploy
npm run prisma:seed
npm run dev
```

In another terminal:

```bash
cd client
npm install
npm run dev
```

Client: `http://localhost:5173`  
API: `http://localhost:4000/api`  
Swagger: `http://localhost:4000/api/docs`

For iterative schema development use `npm run prisma:migrate`. For checked-in
migrations use `npm run prisma:deploy`.

## Environment

The root `.env.example` documents PostgreSQL, Redis, JWT, origins, ports,
logging, Stripe, bKash, callback URLs, cache TTL, frontend keys, and mock mode.
Never commit `.env`.

`PAYMENT_MOCK_MODE=true` is intended only for local demonstrations/tests. The
environment validator rejects it in production. Set it to `false` and configure
real test/sandbox credentials to exercise provider APIs. Stripe webhook payloads
still require an official signature. bKash provider URL and credentials can be
switched from sandbox to live without code changes.

## Seed Data

```bash
cd Server
npm run prisma:seed
```

- Admin: `admin@example.com` / `Assessment123!`
- User: `user@example.com` / `Assessment123!`

These are development credentials and must never be used in production. The
seed includes nested electronics/computer/accessory categories, a separate home
branch, four active products, and one inactive product.

## Commands

Backend:

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

Frontend:

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
```

## Order and Money Rules

Catalog currency is **BDT** for both providers. Prices use PostgreSQL
`DECIMAL(12,2)`, Prisma Decimal, and `decimal.js`. Unit prices round half-up to
two decimal places, `subtotal = rounded price * integer quantity`, and order
total is the sum of exact subtotals. The same input produces the same result.
Only the backend calculates authoritative totals.

Order creation reads active products, checks stock, captures prices, calculates
items, and creates the order inside one transaction. Stock is not reserved or
changed at this stage.

After provider verification, a serializable transaction conditionally changes
the order from pending to paid, updates each product only when adequate stock
still exists, increments its version, marks payment successful, and commits all
changes together. Any failure rolls everything back. Duplicate callbacks see a
successful payment/paid order and skip stock changes.

## Algorithms and Patterns

Service classes provide meaningful OOP boundaries for users, products,
categories, orders, payments, and recommendations. `PaymentStrategyFactory`
resolves `StripePaymentStrategy` or `BkashPaymentStrategy`; core order logic has
no provider conditionals.

Recommendations start at the product category and traverse descendants in
deterministic depth-first order. If needed they continue through parent/sibling
branches, exclude the current product, deduplicate IDs, obey the limit, and use
a visited set for malformed cycles. Complexity is `O(V + E + P)` time and
`O(V + P)` auxiliary space.

Category trees use cache-aside Redis storage at `categories:tree:v1`, JSON
serialization, configurable TTL, invalidation on every mutation, and logged
PostgreSQL fallback.

## Security Decisions

- Passwords use bcrypt cost 12 and never appear in response DTOs.
- JWT claims are verified on every protected request; admin and ownership checks are server-side.
- Auth routes are rate limited; Helmet, strict CORS, body limits, Zod, and centralized errors are enabled.
- Logs include request IDs and redact authorization, cookies, passwords, and provider tokens.
- Stripe signatures are verified against the raw body.
- Provider credentials remain environment-only; bKash tokens never enter API responses or persisted raw data.
- Production errors omit stack traces.

## Testing

Verified commands and current counts are recorded in the assessment checklist.
External APIs are mocked. The checked-in migration and seed were successfully
verified against local PostgreSQL 17. Redis fallback behavior is covered by
tests, so category retrieval remains available when Redis is offline.

## Assumptions and Limitations

- The catalog has one currency (BDT); currency conversion is outside scope.
- Real payment completion requires valid third-party credentials and provider accounts.
- Access tokens use session storage because the assessment does not define a refresh-token cookie flow.
- Stock is checked at order creation but reserved only by the successful-payment transaction.
- Provider refund/dispute workflows are outside the supplied assessment.

## Compliance

The detailed, evidence-linked matrix is maintained in
[docs/assessment-checklist.md](docs/assessment-checklist.md). Implemented areas
include every non-deployment PDF feature: users, products, categories, orders,
payments, Stripe/bKash structures, OOP, Strategy, deterministic totals,
transactional stock, DFS, Redis, migrations, seeds, tests, Swagger, diagrams,
and environment guidance.

Deployment was not implemented because it was excluded by the user. This
includes Vercel, ngrok, Docker, and cloud/server deployment work.
