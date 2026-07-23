# Backend Engineer Assessment Checklist

Source reviewed: `Assessment for Backend Engineer.pdf` (5 pages).

Status legend:

- `[ ]` Planned
- `[x]` Complete and verified
- `[-]` Excluded at the user's explicit request

No item is marked complete until its implementation and listed verification exist.

## Functional Requirements

| Status | Requirement | Planned implementation | Source files | API route or page | Test coverage |
|---|---|---|---|---|---|
| [ ] | Users can register and log in | `UserService`, bcrypt password hashing, signed JWT access tokens, Zod request schemas | `Server/src/modules/auth/` | `POST /api/auth/register`, `POST /api/auth/login`; `/register`, `/login` | `Server/tests/auth.api.test.ts`, `Server/src/modules/users/user.service.test.ts` |
| [ ] | Store users in a relational Users table | Prisma `User` model with UUID, name, unique email, password hash, role, timestamps | `Server/prisma/schema.prisma`, migration | Internal persistence | Migration and service tests |
| [ ] | Enforce unique email addresses | Database unique constraint plus conflict translation | `Server/prisma/schema.prisma`, `Server/src/modules/users/user.service.ts` | Registration | Duplicate-email API test |
| [ ] | Support `ADMIN` and `USER` roles | Prisma enum, JWT claims, authentication and role middleware | `Server/prisma/schema.prisma`, `Server/src/middleware/` | Protected and admin routes | Authorization API tests |
| [ ] | Return the current user without password data | Response DTOs that never select or serialize `passwordHash` | `Server/src/modules/users/` | `GET /api/auth/me` | Profile and password-leak tests |
| [ ] | Users can view only their own orders | Ownership enforced in `OrderService` queries | `Server/src/modules/orders/` | `GET /api/users/me/orders`, `GET /api/orders/:id`; `/orders`, `/orders/:id` | Order ownership API tests |
| [ ] | Users can view only their own payments | Payments joined through user-owned orders | `Server/src/modules/payments/` | `GET /api/users/me/payments`; `/payments` | Payment ownership API tests |
| [ ] | Admin can create, update, and delete products | Thin controllers and admin-protected `ProductService` operations | `Server/src/modules/products/` | `POST/PATCH/DELETE /api/products`; `/admin/products*` | Product CRUD and role API tests |
| [ ] | Products contain required fields | Prisma Product model: id, name, unique SKU, description, Decimal price, stock, status, timestamps | `Server/prisma/schema.prisma` | Product APIs and admin forms | Product model/service tests |
| [ ] | Product SKU is unique | Unique database constraint and conflict response | `Server/prisma/schema.prisma` | Product create/update | Duplicate-SKU test |
| [ ] | Products support active/inactive status | `ProductStatus` enum and public active-only filtering | `Server/prisma/schema.prisma`, product service | `GET /api/products`, `GET /api/products/:id` | Product listing tests |
| [ ] | Users can view product lists and details | Paginated search/filter APIs and responsive React pages | `Server/src/modules/products/`, `client/src/features/products/` | `GET /api/products`, `GET /api/products/:id`; `/products`, `/products/:id` | Product API tests and frontend build |
| [ ] | Validate price and stock | Non-negative Decimal price and integer stock schemas plus DB checks where supported | Product validators and Prisma migration | Product mutation APIs | Product validation tests |
| [ ] | Products relate to categories | Required indexed category foreign key | Prisma schema and product service | Product APIs | Product/category integration tests |
| [ ] | Orders belong to users | Indexed user foreign key and ownership-aware service | Prisma schema and order service | Order APIs | Order API tests |
| [ ] | Orders contain required fields and statuses | `Order` with Decimal total and pending/paid/canceled enum | `Server/prisma/schema.prisma` | Order APIs | Order model/service tests |
| [ ] | Orders contain multiple products through OrderItems | `OrderItem` table with order/product FKs, quantity, captured price, subtotal | Prisma schema and migration | Order detail response | Order creation tests |
| [ ] | Server calculates item subtotals and order totals | Deterministic Decimal-based `OrderCalculator`; frontend sends only product IDs and quantities | `Server/src/modules/orders/order-calculator.ts` | `POST /api/orders` | Calculator unit tests and tampered-total API test |
| [ ] | Reject invalid quantities, inactive products, missing products, and insufficient stock | Validated request plus transactional stock availability checks | Order validator and service | `POST /api/orders` | Invalid-order API tests |
| [ ] | Create orders transactionally | Prisma interactive transaction creates order and captured-price items atomically | Order service | `POST /api/orders` | Transaction rollback test |
| [ ] | Users can cancel pending orders | Ownership and status transition checks | Order service/controller | `PATCH /api/orders/:id/cancel` | Cancellation API tests |
| [ ] | Stripe creates Payment Intents | Official Stripe SDK strategy with order metadata and configurable mode/key | `Server/src/modules/payments/strategies/stripe-payment.strategy.ts` | `POST /api/payments/stripe/create-intent`, checkout endpoint | Mocked Stripe strategy/API tests |
| [ ] | Stripe confirms or verifies payments server-side | Retrieve Payment Intent and trust provider status only | Stripe strategy and payment service | `POST /api/payments/stripe/verify` | Successful/failed verification tests |
| [ ] | Stripe handles signed webhooks | Raw request preservation, official signature verification, event deduplication | Stripe webhook controller/strategy | `POST /api/webhooks/stripe` | Valid/invalid/duplicate webhook tests |
| [ ] | Stripe stores provider, Payment Intent ID, status, and raw response | Payment upsert with safe JSON response | Payment service and Prisma schema | Payment APIs | Persistence tests |
| [ ] | bKash acquires and caches tokens | Grant-token integration with expiry-aware in-memory/cache abstraction | `Server/src/modules/payments/strategies/bkash-payment.strategy.ts` | Internal provider call | Token cache strategy tests |
| [ ] | bKash creates checkout payments | Configurable sandbox/live HTTP client and callback URL | bKash strategy | `POST /api/payments/bkash/create`, checkout endpoint | Mocked create-payment tests |
| [ ] | bKash executes payments | Execute API followed by server-side verification/finalization | bKash strategy | `POST /api/payments/bkash/execute` | Successful/failed execute tests |
| [ ] | bKash queries payments | Query API and normalized result | bKash strategy | `GET /api/payments/bkash/query/:paymentId` | Query tests |
| [ ] | bKash handles callbacks/webhooks | Callback verification before finalization and idempotent processing | bKash webhook controller/strategy | `POST /api/webhooks/bkash` | Callback and duplicate-processing tests |
| [ ] | bKash stores provider, payment ID, status, and raw response | Payment upsert with safe JSON response | Payment service and Prisma schema | Payment APIs | Persistence tests |
| [ ] | Real provider integrations support non-production and live configuration | Environment-selected provider URLs/keys; mock mode is explicit and never production-default | Payment config and strategies | All payment routes | Environment and strategy tests |
| [ ] | Payments contain required fields | Payment model with order FK, provider/status enums, nullable unique transaction ID, JSON response, timestamps | Prisma schema and migration | Payment/history APIs | Model/service tests |
| [ ] | Unified checkout selects provider | `PaymentStrategyFactory` resolves a strategy without provider logic in order service | Payment factory/service | `POST /api/orders/:orderId/checkout`; `/checkout` | Factory and checkout API tests |
| [ ] | Complete order/payment workflow | Create order, initiate, verify, update payment/order, reduce stock, show result | Server payment modules and client checkout feature | Checkout/payment routes and pages | End-to-end API workflow tests |
| [ ] | Stock reduces only after verified successful payment | Idempotent transaction checks pending state/payment status and conditionally decrements every product | `Server/src/modules/payments/payment-finalizer.ts` | Verify/webhook endpoints | Stock timing and rollback tests |
| [ ] | Duplicate or concurrent success cannot reduce stock twice | Serializable transaction, conditional status transition, transaction ID uniqueness, atomic stock predicates | Payment finalizer and migration | Verify/webhook endpoints | Duplicate webhook/verification tests |

## Data, Algorithms, and Architecture

| Status | Requirement | Planned implementation | Source files | API route or page | Test coverage |
|---|---|---|---|---|---|
| [ ] | Use meaningful OOP classes for User, Product, Order, and Payment logic | Service/domain classes encapsulate registration, validation, totals, payment, and stock rules; controllers remain thin | `Server/src/modules/**/**.service.ts` | All domain routes | Service unit tests |
| [ ] | Use the Strategy Pattern for payment providers | `PaymentStrategy` interface, Stripe/bKash implementations, and factory | `Server/src/modules/payments/strategies/` | Checkout and provider routes | Factory and strategy unit tests |
| [ ] | Future providers do not require core order changes | Provider registration isolated in the strategy factory | Payment strategy factory | Checkout | Factory extension test |
| [ ] | Use relational tables for Users, Categories, Products, Orders, OrderItems, Payments | PostgreSQL Prisma schema with explicit relations and referential actions | Prisma schema and migration | Persistence layer | Migration verification |
| [ ] | Add efficient indexes and constraints | Index email, SKU, product status/category, category parent, order user/status, item order, payment order/provider/status/transaction | Prisma schema and SQL migration | Query layer | Schema inspection |
| [ ] | Model a hierarchical category tree | Self-referencing Category parent/children relation with unique slug and indexed parent ID | Prisma schema and category module | Category APIs; `/admin/categories` | Category API tests |
| [ ] | Prevent category cycles | Ancestor walk with visited-set validation before parent changes | Category service | Category mutation routes | Cycle tests |
| [ ] | Retrieve and manage category trees | Admin CRUD and public flat/tree reads | Category module | `/api/categories`, `/api/categories/tree`, `/api/categories/:id` | Category API tests |
| [ ] | Implement real DFS traversal | Iterative deterministic DFS with visited categories/products, current-product exclusion, and limit | `Server/src/modules/recommendations/dfs.ts` | `GET /api/products/:id/recommendations` | Empty/nested/duplicate/exclusion/limit/cycle tests |
| [ ] | Document DFS complexity | Explain `O(V + E + P)` time and `O(V + P)` auxiliary space | README and architecture docs | Recommendation endpoint | Documentation audit |
| [ ] | Cache category tree | Redis cache-aside using `categories:tree:v1`, JSON, configurable TTL | `Server/src/infrastructure/cache/`, category service | Category tree/recommendations | Cache hit/miss tests |
| [ ] | Invalidate category cache after mutations | Delete category tree key after create/update/delete | Category service | Category admin routes | Invalidation tests |
| [ ] | Redis failure falls back safely | Testable cache contract catches/logs Redis failures and returns database result | Cache adapter and category service | Tree/recommendations | Cache failure tests |
| [ ] | Use migrations rather than schema synchronization | Checked-in Prisma migration SQL and documented migrate commands | `Server/prisma/migrations/` | Local setup | Migration verification |
| [ ] | Seed representative data | Admin/user, nested categories, active/inactive products across levels | `Server/prisma/seed.ts` | Seed command | Seed verification |

## API, Validation, Security, and Operations

| Status | Requirement | Planned implementation | Source files | API route or page | Test coverage |
|---|---|---|---|---|---|
| [ ] | Clean, consistently prefixed REST API | Express router under `/api`, resource methods, status codes, pagination metadata | Server routes/controllers | All `/api/*` routes | API tests |
| [ ] | Validate all request input | Zod schemas for body, params, and query input | `Server/src/modules/**/**.schema.ts` | All mutation/list routes | Validation API tests |
| [ ] | Apply authentication, authorization, and ownership checks | JWT middleware, role guard, and service-level ownership predicates | `Server/src/middleware/`, services | Protected routes | Auth/role/ownership tests |
| [ ] | Protect authentication endpoints from abuse | Configurable rate limiter | Auth routes | Register/login | Rate-limit test |
| [ ] | Add Helmet, CORS, request limits, and input safety | Express security middleware with validated frontend origin and JSON limits | `Server/src/app.ts` | Entire API | App middleware tests |
| [ ] | Validate environment and never commit secrets | Zod environment module and complete `.env.example` | `Server/src/config/env.ts`, `.env.example` | Startup | Environment tests |
| [ ] | Centralize consistent errors and not-found responses | Typed `AppError`, async handling, production-safe error middleware | `Server/src/errors/`, middleware | Entire API | Error response tests |
| [ ] | Add structured secure logging and request IDs | Pino HTTP logging, correlation IDs, secret/token redaction, environment behavior | `Server/src/infrastructure/logger.ts`, middleware | Entire API | Logger/request ID tests |
| [ ] | Preserve useful provider failures securely | Sanitized raw responses and provider error mapping without credentials | Payment strategies/service | Payment APIs | Provider failure tests |
| [ ] | Expose complete Swagger/OpenAPI docs | OpenAPI schemas/routes and Swagger UI | `Server/src/docs/openapi.ts` | `GET /api/docs`, `GET /api/docs.json` | OpenAPI smoke test |

## Frontend Demonstration

| Status | Requirement | Planned implementation | Source files | API route or page | Test coverage |
|---|---|---|---|---|---|
| [ ] | Maintainable React TypeScript architecture | Feature folders, typed API client, shared components/layouts/hooks/schemas/store | `client/src/` | Entire client | Lint, typecheck, build |
| [ ] | React Router with public, protected, and admin routes | Route configuration plus `ProtectedRoute` and `AdminRoute` | `client/src/routes/` | All required pages | Route component tests/build |
| [ ] | Registration, login, logout, persisted session | React Hook Form, Zod, auth context/store, token handling, 401 behavior | `client/src/features/auth/` | `/register`, `/login` | Auth component tests/build |
| [ ] | Product browsing, search, filtering, details, recommendations | Responsive list/detail components and API hooks | `client/src/features/products/` | `/products`, `/products/:id` | Component tests/build |
| [ ] | Cart management | Persisted cart store with add/update/remove actions | `client/src/features/cart/` | `/cart` | Store tests/build |
| [ ] | Checkout with Stripe or bKash and final status | Order creation, provider choice, official Stripe Elements flow, bKash redirect/execute flow | `client/src/features/checkout/` | `/checkout` | Checkout tests/build |
| [ ] | Own order and payment history | Paginated histories and order detail | Client order/payment features | `/orders`, `/orders/:id`, `/payments` | Component tests/build |
| [ ] | Admin product and category management | Validated CRUD forms, tables, confirmations, admin routing | `client/src/features/admin/` | `/admin/products`, `/admin/products/new`, `/admin/products/:id/edit`, `/admin/categories` | Admin component tests/build |
| [ ] | Loading, empty, validation, and API error states | Shared accessible UI states and form controls | `client/src/components/` | All pages | Component tests/build |
| [ ] | Professional responsive interface | Tailwind CSS design system, accessible controls, mobile/desktop layouts | Client styles/components | All pages | Browser screenshots and build |

## Testing and Deliverables

| Status | Requirement | Planned implementation | Source files | API route or page | Test coverage |
|---|---|---|---|---|---|
| [ ] | Unit tests for models and services | Jest tests for users, products, totals, stock, strategies, DFS, recommendations, cache | `Server/src/**/*.test.ts` | Internal logic | `npm test` |
| [ ] | API tests for authentication, orders, and payments | Supertest app tests with isolated test doubles/database strategy | `Server/tests/*.api.test.ts` | Auth/order/payment routes | `npm test` |
| [ ] | Webhook test cases | Mocked Stripe signatures/events and bKash verification, including duplicates/failures | `Server/tests/webhooks.api.test.ts` | Webhook routes | `npm test` |
| [ ] | External payment tests never call real providers | Mock Stripe SDK and bKash HTTP transport | Strategy/webhook tests | Payment routes | `npm test` |
| [ ] | System architecture diagram | Mermaid diagram covering client, Express layers, strategies, PostgreSQL, Redis, providers | `docs/architecture.md` | Documentation | Documentation audit |
| [ ] | ERD | Mermaid ERD with all tables, keys, relations, and constraints | `docs/erd.md` | Documentation | Documentation audit |
| [ ] | Stripe and bKash payment flow diagrams | Separate Mermaid sequence diagrams through verification and stock finalization | `docs/payment-flow.md` | Documentation | Documentation audit |
| [ ] | API documentation | Swagger plus written API/local usage guide | `Server/src/docs/`, `docs/api-guide.md` | `/api/docs` | OpenAPI test |
| [ ] | Testing documentation | Local database/cache/test commands and test architecture | `docs/testing-guide.md` | Documentation | Documentation audit |
| [ ] | Complete environment configuration guide | Placeholder-only `.env.example` and local setup instructions | `.env.example`, README | Local startup | Environment audit |
| [ ] | Root README covers all requested operational and compliance topics | Developer-ready overview, setup, payments, algorithms, security, limitations, matrix | `README.md` | Documentation | Final audit |

## Deployment Exclusions

| Status | Requirement | Decision | Notes |
|---|---|---|---|
| [x] | Local environment configuration guide | Included | This is documentation, not deployment, and remains required. |
| [-] | Frontend deployment on Vercel | Excluded at the user's explicit request | No Vercel configuration or deployment will be created. |
| [-] | Backend exposure through ngrok | Excluded at the user's explicit request | Backend will run locally only. |
| [-] | Docker deployment for backend and database | Excluded at the user's explicit request | No Dockerfile or Compose deployment will be created. |

## Verification Record

| Phase | Commands/evidence | Result |
|---|---|---|
| Initial repository audit | `git status`, `git branch --show-current`, `git log --oneline -10`, source/manifests review | Complete: clean `main`, one initial commit, stock React client, Express-only server |
| PDF review | Extracted and read all 5 pages with page boundaries | Complete |
| Final backend verification | Install, lint, typecheck, tests, build, migration, seed, Swagger smoke test | Pending |
| Final frontend verification | Install, lint, typecheck, tests, build, responsive browser checks | Pending |
| Final compliance audit | Re-read PDF and map evidence for every row | Pending |
