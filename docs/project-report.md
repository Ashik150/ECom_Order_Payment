# Raco Commerce: E-commerce Ordering and Payment System

## Backend Engineer Assessment Project Report

Prepared by: Ashik Khan  
Project type: Full-stack backend engineering assessment  
Primary focus: Secure ordering, provider-based payments, transactional stock management, DFS recommendations, Redis caching, and deployment  
Report date: 24 July 2026

---

## 1. Executive Summary

Raco Commerce is a full-stack e-commerce ordering and payment system built to satisfy the requirements in the Backend Engineer Assessment. The system supports user registration and login, role-based product and category management, product browsing, shopping-cart and order workflows, Stripe and bKash payment strategies, payment verification, webhook handling, transactional stock reduction, order and payment history, and product recommendations based on a hierarchical category tree.

The backend is implemented with Node.js, Express, TypeScript, Prisma, PostgreSQL, and Redis. The demonstration frontend uses React, TypeScript, Vite, React Router, Axios, and Stripe Elements. The system is organized around service classes and clear module boundaries. Payment providers are isolated behind the Strategy Pattern, while order totals and stock finalization remain provider-independent.

The final deployment follows the assessment specification: the frontend is deployed on Vercel, the backend is exposed from the local machine through ngrok, and Docker Compose runs the backend, PostgreSQL, and Redis. The Docker stack, database migration, seed process, health endpoints, Redis cache, public ngrok endpoint, CORS configuration, backend linting, and all 32 backend tests were verified successfully.

Final assessment: the implementation is technically complete and suitable for assessment demonstration. Real payment completion still depends on valid third-party credentials, provider availability, and correctly configured webhooks. The bKash mock mode remains useful for demonstration because sandbox authentication was not successfully verified with the supplied credentials.

---

## 2. Project Objectives

The project was designed to achieve the following objectives:

- Provide secure registration, login, JWT authentication, and ADMIN/USER authorization.
- Store users, categories, products, orders, order items, and payments in relational tables.
- Allow administrators to manage products and hierarchical categories.
- Allow customers to browse products, maintain a cart, create orders, and view their own history.
- Calculate prices, subtotals, and totals deterministically on the backend.
- Integrate Stripe and bKash without coupling provider logic to order management.
- Verify payment results server-side before changing order or stock state.
- Reduce stock atomically and only once after verified payment success.
- Traverse the category hierarchy using a real deterministic DFS algorithm.
- Cache the category tree in Redis and fall back safely to PostgreSQL.
- Provide tests, Swagger documentation, architecture diagrams, an ERD, and payment-flow diagrams.
- Demonstrate the frontend through Vercel and the Dockerized local backend through ngrok.

---

## 3. Technology Stack

Backend:

- Node.js 22 and Express 5
- TypeScript
- Prisma ORM 6
- PostgreSQL 17
- Redis 7
- Zod request and environment validation
- JWT and bcrypt for authentication
- Stripe official SDK
- Axios for bKash HTTP communication
- Pino and pino-http for structured logging
- Helmet, CORS, and express-rate-limit
- Swagger/OpenAPI
- Jest and Supertest

Frontend:

- React 19 and TypeScript
- Vite
- React Router
- Axios
- React Hook Form and Zod
- Stripe Elements
- Responsive CSS-based interface

Deployment and operations:

- Vercel for the frontend
- ngrok for exposing the local backend
- Docker and Docker Compose for backend, PostgreSQL, and Redis
- Named Docker volumes for persistent PostgreSQL and Redis data

---

## 4. Implementation Approach and Rationale

### 4.1 Layered and Modular Architecture

The backend is divided into configuration, infrastructure, middleware, domain modules, documentation, and shared utilities. Each domain has its own schemas, routes, services, and supporting classes. Routes are intentionally thin: they validate HTTP input, enforce authentication or authorization, call a service, and format the response.

This design was selected because business rules such as order calculation, category-cycle prevention, provider verification, and stock finalization should be testable without starting an HTTP server. It also prevents large route files from becoming tightly coupled to Prisma or third-party SDKs.

The main OOP service classes are `UserService`, `ProductService`, `CategoryService`, `OrderService`, `PaymentService`, `PaymentFinalizer`, and `RecommendationService`. These classes satisfy the assessment's OOP requirement by encapsulating domain behavior and accepting dependencies through constructors.

### 4.2 Relational Database Design

PostgreSQL was selected because the project contains strongly related transactional data. Prisma defines the User, Category, Product, Order, OrderItem, and Payment models. UUID primary keys are used across the schema.

Important constraints include unique user email, category slug, product SKU, payment transaction ID, and the combination of order ID and product ID in OrderItems. Foreign keys protect relationships, while cascade or restrict behavior prevents accidental deletion of referenced business data.

Indexes were added for email, category parent, product status/category/name, order user/status/date, order-item order/product, and payment order/provider/status/transaction. Decimal database columns are used for money to avoid floating-point errors.

The Category table contains a self-referencing `parentId`, allowing parent and child categories to form a hierarchy. Service-level validation prevents a category from becoming its own ancestor.

### 4.3 Authentication, Authorization, and Security

Registration validates input, hashes passwords with bcrypt, and relies on a unique database constraint for email protection. Login verifies the password and returns a signed JWT. Password hashes are never selected into public response objects.

Authentication middleware verifies the JWT on protected routes. Role middleware protects administrator operations. Ownership checks are also performed inside services so a normal user cannot read another user's order or payment by manually changing a URL.

Zod validates bodies, query strings, route parameters, and environment variables. Helmet adds security headers, CORS accepts only the configured frontend origin, request sizes are limited, and authentication endpoints are rate limited. Centralized error middleware returns consistent safe errors with stable codes and request IDs.

Provider credentials are loaded from environment variables and are not committed to Git. Production environment validation rejects enabled payment mock modes. Logs redact authorization headers, passwords, cookies, and payment tokens.

### 4.4 Product and Category Management

Public product routes return active products only and support pagination, search, and category filtering. Separate administrator reads include inactive products so an administrator can edit or reactivate them.

Product creation, update, and deletion require an ADMIN token. Product validation prevents negative prices or stock and enforces a valid category relationship. Category creation, update, and deletion also require ADMIN access.

Category updates walk ancestor relationships with a visited set to prevent direct and indirect cycles. Categories containing child categories or products cannot be deleted, preventing broken references.

### 4.5 Deterministic Order Calculation

The frontend sends only product IDs and quantities. It is not trusted to send prices, subtotals, or totals. During order creation, the backend reads active products and current prices from PostgreSQL, checks quantities and available stock, and passes trusted values to `OrderCalculator`.

`decimal.js` and PostgreSQL `DECIMAL(12,2)` are used instead of JavaScript floating-point arithmetic. Unit prices are rounded half-up to two decimal places. Each subtotal is calculated as the rounded unit price multiplied by an integer quantity, and the order total is the exact sum of all subtotals.

The order and all OrderItems are created in one database transaction. Prices are captured in OrderItems so historical orders remain accurate even if a product price changes later.

### 4.6 Payment Strategy Pattern

Stripe and bKash implement a common `PaymentStrategy` contract. `PaymentStrategyFactory` stores strategies in a provider map and resolves the requested provider. `PaymentService` coordinates checkout and verification without containing provider-specific HTTP or SDK code.

This approach follows the Open/Closed Principle: a future provider can be added by implementing the strategy contract and registering it with the factory. Core order calculation and finalization logic do not need to be rewritten.

Stripe supports Payment Intent creation, server-side retrieval and verification, Stripe Elements on the frontend, signed webhook validation using the raw request body, order metadata, normalized payment status, and transaction storage.

bKash supports token acquisition and expiry-aware token caching, payment creation, execution, query/verification, callback handling, configurable sandbox/live URLs, normalized status, and raw response storage with sensitive fields excluded.

### 4.7 Payment Finalization and Stock Safety

Creating an order does not reduce stock. Initiating a payment also does not reduce stock. Stock changes only after the provider result has been verified by the backend.

`PaymentFinalizer` uses a Prisma transaction with serializable isolation. It verifies that the payment and order are still pending, conditionally claims the order, and decrements each product only when the product is active and `stock >= requested quantity`.

The order status, payment status, transaction ID, raw response, processed timestamp, product stock, and product version are committed together. If any stock update fails, the entire transaction rolls back. Duplicate verification requests or webhook deliveries detect an already successful payment or paid order and do not decrement stock again.

### 4.8 DFS Recommendations and Redis Caching

The recommendation process starts from the current product's category. An iterative depth-first traversal visits that category and its descendants, then expands through ancestors and related branches when needed.

A visited set prevents infinite loops in malformed graphs. Categories and products use deterministic name and ID ordering. The current product is excluded, duplicate products are prevented, inactive products are ignored, and the requested result limit is respected.

The category tree is stored in Redis using the cache-aside pattern and key `categories:tree:v1`. The first request reads categories from PostgreSQL, builds the tree, serializes it as JSON, and stores it with a configurable TTL. Later requests reuse the cached tree.

Category creation, update, and deletion invalidate the cache key. Redis connection, read, write, or invalidation failures are logged but do not crash the API; the service falls back to PostgreSQL. DFS complexity is `O(V + E + P)` time with `O(V + P)` auxiliary space.

### 4.9 Frontend Demonstration

The React application provides public product browsing and product details, authentication pages, cart management, protected checkout and history pages, and administrator-only product and category pages.

React Router guards separate public, authenticated, and administrator routes. A centralized Axios client adds the access token and handles unauthorized responses. Cart data is persisted locally, but the backend remains authoritative for prices, totals, permissions, payment verification, and stock.

Stripe Elements is used for card entry so sensitive card details go directly to Stripe. bKash follows the create, redirect/session, execute, and verify flow supported by the selected mode.

### 4.10 Docker, Vercel, and Ngrok Deployment

The assessment specifically requests a Vercel frontend, a locally running backend through ngrok, and Docker deployment for the backend and database.

Docker Compose defines three services: backend, PostgreSQL, and Redis. Docker's internal network allows the backend to connect to the database using `db:5432` and Redis using `redis:6379`. PostgreSQL and Redis use named volumes so data survives container recreation.

The backend image installs Node dependencies and OpenSSL, generates Prisma Client, compiles TypeScript, exposes port 4000, applies checked-in migrations at startup, and launches the compiled server. Health checks prevent the backend from starting before PostgreSQL and Redis are ready.

Vercel hosts the static React frontend. Its `VITE_API_URL` points to the ngrok URL with `/api`. Ngrok forwards public HTTPS requests to port 4000 on the local machine, where Docker publishes the backend.

---

## 5. Rejected Alternatives and Reasons

### 5.1 Large Controllers or Route-Only Business Logic

Rejected because it would mix HTTP concerns, database access, calculations, provider behavior, and authorization. Service classes provide clearer ownership and easier unit testing.

### 5.2 Client-Supplied Prices and Totals

Rejected because a user could modify browser requests and submit a lower price. The backend reads trusted prices and calculates every subtotal and total.

### 5.3 JavaScript Number for Money

Rejected because binary floating-point arithmetic can produce values such as `0.1 + 0.2 !== 0.3`. Decimal columns, Prisma Decimal, and `decimal.js` provide deterministic currency calculations.

### 5.4 Stock Reduction at Order Creation

Rejected because abandoned or failed payments would incorrectly consume stock. Stock is checked during ordering but reduced only inside the verified-payment transaction.

### 5.5 Provider `if/else` Blocks in Order Logic

Rejected because every new payment provider would require modifications to core order code. The Strategy Pattern and factory isolate providers and support future extension.

### 5.6 Trusting Frontend Payment Success

Rejected because browser responses can be forged or interrupted. The backend retrieves or queries provider status and validates Stripe webhook signatures before finalization.

### 5.7 Non-Transactional Stock Updates

Rejected because a failure after updating only some products could leave inconsistent stock. A serializable transaction commits all product, payment, and order changes together or rolls them all back.

### 5.8 Database Query on Every Recommendation

Rejected because the category hierarchy changes infrequently but may be traversed repeatedly. Redis cache-aside reduces repeated database calls while TTL and invalidation control staleness.

### 5.9 Redis as a Required Source of Truth

Rejected because a Redis outage should not make product recommendations unavailable. PostgreSQL remains authoritative and Redis is an optional performance layer.

### 5.10 Schema Synchronization Without Migrations

Rejected because automatic schema synchronization does not provide a reviewable, repeatable production history. A checked-in Prisma migration is used and deployed with `prisma migrate deploy`.

### 5.11 SQLite or a Document Database

Rejected because the assessment explicitly requires relational tables, foreign keys, indexes, transactions, and hierarchical relationships. PostgreSQL fits these requirements and supports strong transactional guarantees.

### 5.12 Manual Local Installation as the Only Deployment Method

Rejected because machine-specific PostgreSQL, Redis, and Node configuration caused setup differences. Docker Compose produces a repeatable environment and directly satisfies the Docker deliverable.

### 5.13 Cloud Backend as the Only Demonstration

Not selected as the required assessment path because the PDF explicitly requests a backend running locally through ngrok. A cloud backend could improve availability later, but Vercel plus ngrok plus Docker demonstrates the requested architecture.

---

## 6. API and Router Documentation

Base URL: `/api`  
Local API: `http://localhost:4000/api`  
Swagger UI: `http://localhost:4000/api/docs`  
OpenAPI JSON: `http://localhost:4000/api/docs.json`  
Authentication header: `Authorization: Bearer <JWT>`

### 6.1 System Routes

- `GET /api/health` — Returns API status and timestamp.
- `GET /api/docs` — Opens Swagger UI.
- `GET /api/docs.json` — Returns the OpenAPI document.

### 6.2 Authentication Router

- `POST /api/auth/register` — Registers a validated user and hashes the password.
- `POST /api/auth/login` — Verifies credentials and returns a JWT.
- `GET /api/auth/me` — Returns the authenticated user's safe profile.

Registration and login are rate limited. The profile route requires authentication.

### 6.3 User Router

- `GET /api/users/me/orders?page=&limit=` — Returns only the authenticated user's orders.
- `GET /api/users/me/payments?page=&limit=` — Returns only the authenticated user's payments.

All user routes require authentication and apply ownership filters on the server.

### 6.4 Product Router

- `GET /api/products?page=&limit=&search=&categoryId=` — Lists active products.
- `GET /api/products/:id` — Returns one active product.
- `GET /api/products/:id/recommendations?limit=` — Returns deterministic DFS recommendations.
- `GET /api/products/admin/list` — Lists active and inactive products for administrators.
- `GET /api/products/admin/:id` — Returns a product for administrator editing.
- `POST /api/products` — Creates a product; ADMIN only.
- `PATCH /api/products/:id` — Updates a product; ADMIN only.
- `DELETE /api/products/:id` — Deletes a product; ADMIN only.

### 6.5 Category Router

- `GET /api/categories` — Returns the flat category list.
- `GET /api/categories/tree` — Returns the Redis-cached hierarchy.
- `GET /api/categories/:id` — Returns one category.
- `POST /api/categories` — Creates a category; ADMIN only.
- `PATCH /api/categories/:id` — Updates a category and prevents cycles; ADMIN only.
- `DELETE /api/categories/:id` — Deletes an unused category; ADMIN only.

Every category mutation invalidates `categories:tree:v1`.

### 6.6 Order Router

- `POST /api/orders` — Creates an order from product IDs and quantities.
- `GET /api/orders?page=&limit=` — Lists the authenticated user's orders.
- `GET /api/orders/:id` — Returns an owned order; administrators may inspect any order.
- `PATCH /api/orders/:id/cancel` — Cancels an owned pending order.
- `POST /api/orders/:orderId/checkout` — Initiates provider-independent checkout.

All order routes require authentication. The checkout request selects `stripe` or `bkash`; the factory resolves the strategy.

### 6.7 Payment Router

- `GET /api/payments?page=&limit=` — Lists the authenticated user's payments.
- `POST /api/payments/stripe/create-intent` — Creates a Stripe Payment Intent.
- `POST /api/payments/stripe/verify` — Verifies a Stripe transaction server-side.
- `POST /api/payments/bkash/create` — Creates a bKash checkout payment.
- `POST /api/payments/bkash/execute` — Executes and verifies a bKash payment.
- `GET /api/payments/bkash/query/:paymentId` — Queries and verifies a bKash payment.

All payment routes require authentication and verify order ownership.

### 6.8 Webhook Routes

- `POST /api/webhooks/stripe` — Accepts a raw body, validates the Stripe signature, normalizes the event, and performs idempotent finalization.
- `POST /api/webhooks/bkash` — Accepts callback data, verifies provider state, and performs idempotent finalization.

The Stripe webhook is registered before normal JSON parsing because signature verification requires the original raw payload.

### 6.9 Response Conventions

Successful responses use:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Error responses use:

```json
{
  "success": false,
  "message": "Human-readable message",
  "code": "STABLE_ERROR_CODE",
  "details": [],
  "requestId": "correlation-id"
}
```

Common status codes are 200 for successful reads, 201 for creation, 204 for deletion, 400 or 422 for invalid input, 401 for missing authentication, 403 for insufficient permission, 404 for missing resources, and 409 for state or uniqueness conflicts.

---

## 7. Testing Approach

The testing strategy combines focused unit tests, HTTP-level API tests, mocked provider tests, migration and seed verification, build checks, linting, and runtime smoke tests.

Unit tests isolate deterministic business logic such as money calculations, DFS ordering, cache behavior, payment strategy selection, provider normalization, token caching, stock finalization, rollback behavior, and duplicate processing.

Supertest API tests exercise Express routing, validation, registration, login, password secrecy, duplicate email handling, authentication, role restrictions, ownership, product operations, order creation, checkout behavior, Swagger availability, and invalid webhook signatures.

Stripe and bKash transports are mocked during automated tests. Tests do not contact real payment providers, which makes them deterministic and prevents accidental charges or dependence on provider availability.

The cache abstraction includes a memory implementation for unit tests. Redis-failure tests verify that category retrieval falls back to PostgreSQL.

Database verification separately checks Prisma Client generation, schema validation, migration deployment, and seed execution against PostgreSQL. Runtime checks verify API health, seeded product listing, Redis connectivity, category-tree cache creation, CORS, and ngrok forwarding.

---

## 8. Test Report

Latest verified backend test command:

```bash
docker compose exec -T backend npm test
```

Result:

- Test suites: 7 passed, 7 total.
- Tests: 32 passed, 32 total.
- Snapshots: 0.
- Failed tests: 0.

Passing suites:

- `tests/api.test.ts`
- `src/modules/payments/payment-finalizer.test.ts`
- `src/modules/payments/strategies/payment-strategies.test.ts`
- `src/modules/recommendations/dfs.test.ts`
- `src/modules/orders/order-calculator.test.ts`
- `src/modules/payments/strategies/payment-strategy.factory.test.ts`
- `src/infrastructure/cache.test.ts`

Additional verification:

- Backend lint: passed with no ESLint errors.
- Backend TypeScript build: passed.
- Prisma Client generation: passed.
- Prisma migration deployment: passed.
- Database seed: passed.
- Docker image build: passed.
- Docker health checks: backend, PostgreSQL, and Redis healthy.
- Redis connectivity: `PONG`.
- Redis category key: `categories:tree:v1` created successfully.
- Local product endpoint: HTTP 200 with four active seeded products.
- Public ngrok health endpoint: HTTP 200.
- Public ngrok product endpoint used by Vercel: HTTP 200.
- CORS header for `https://e-com-order-payment.vercel.app`: verified.
- Frontend lint, type checking, and production build: recorded as passed during final frontend verification.

The frontend does not currently have a dedicated browser automation test suite. The production build and responsive/manual workflow checks provide frontend verification, while backend permissions and business rules remain protected by API tests.

---

## 9. Implementation Issues and Resolutions

### 9.1 PostgreSQL Commands and Authentication

The `createdb` command was initially unavailable because PostgreSQL command-line tools were not on the shell path. A later connection also failed because the local PostgreSQL user password did not match. Database configuration was corrected, and Docker now provides a self-contained PostgreSQL service that avoids dependence on the host installation.

### 9.2 Missing `DATABASE_URL`

Prisma initially returned error P1012 because `DATABASE_URL` was not available in its process environment. Environment loading was updated so Prisma can read the root configuration, and Docker Compose explicitly injects the internal database URL.

### 9.3 Vercel Could Not Find Vite

Vercel reported `vite: command not found` when dependencies or the selected project root were not configured correctly. The client build configuration and dependency installation were corrected so Vercel runs the Vite production build.

### 9.4 Product Changes Were Not Visible Publicly

Administrator reads and public reads had different requirements. Public browsing correctly excludes inactive products, while administrator routes must include them. Dedicated administrator product-list and detail routes were added, and the frontend was connected to the correct endpoints.

### 9.5 Stripe Card Form Did Not Open

The client was not consistently loading the Vite-prefixed publishable key. Stripe initialization was corrected to use `VITE_STRIPE_PUBLISHABLE_KEY`, allowing Stripe Elements to render when the key and Payment Intent are valid.

### 9.6 bKash Authentication Failed

The supplied sandbox credentials did not produce a verified authentication flow. The implementation preserves the real sandbox/live strategy but supports a clearly separated bKash mock mode for assessment demonstration. Mock mode is rejected automatically when `NODE_ENV=production`.

### 9.7 Vercel-to-Ngrok CORS Failure

The backend originally allowed the local frontend origin, not the deployed Vercel origin. `FRONTEND_URL` was changed to the exact Vercel origin, and the backend now returns `Access-Control-Allow-Origin: https://e-com-order-payment.vercel.app`.

### 9.8 Ngrok Browser Interstitial

Ngrok's browser warning could interfere with API requests. The API client was configured to bypass the ngrok browser interstitial where required, and the public product endpoint was verified.

### 9.9 Port 4000 Conflict During Docker Startup

The host-run `npm run dev` process was already listening on port 4000. It was stopped before Docker started so the backend container could publish the same port.

### 9.10 Prisma OpenSSL Warning in Docker

The Node slim image did not initially include OpenSSL, causing Prisma to warn about engine compatibility. OpenSSL was installed in the Dockerfile and the image was rebuilt successfully.

### 9.11 npm Registry Connection Reset During Docker Build

`npm ci` failed twice with `ECONNRESET`. npm fetch retries and retry timeouts were added to the Dockerfile. The following build completed with 577 packages installed and zero reported vulnerabilities.

### 9.12 Container Startup Ordering

The backend could attempt migrations before PostgreSQL was ready. PostgreSQL and Redis health checks plus Compose dependency conditions now delay backend startup until both services are healthy.

---

## 10. Deployment and Demonstration Procedure

From the project root:

```bash
docker compose up -d --build
docker compose run --rm backend npm run prisma:seed
docker compose ps
```

Start ngrok in another terminal:

```bash
ngrok http 4000
```

The Vercel environment variable must use:

```text
VITE_API_URL=https://<ngrok-domain>/api
```

The backend environment must allow the Vercel origin:

```text
FRONTEND_URL=https://e-com-order-payment.vercel.app
```

The final request path is:

```text
Interviewer browser -> Vercel frontend -> ngrok HTTPS URL -> Docker backend
                                                        -> PostgreSQL
                                                        -> Redis
                                                        -> Stripe/bKash
```

Because the assessment specifically requests a locally running backend through ngrok, Docker Desktop, the Docker containers, ngrok, the local machine, and the internet connection must remain active during a live remote demonstration.

---

## 11. Known Limitations and Risks

- Real Stripe completion requires valid Stripe test or live keys and a correctly forwarded webhook secret.
- Real bKash completion requires valid sandbox or live credentials; the supplied sandbox authentication was not verified successfully.
- bKash mock mode demonstrates application flow but is not evidence of a completed real provider transaction.
- The ngrok backend is unavailable when the local machine, Docker Desktop, ngrok, or internet connection stops.
- A free ngrok address may change, requiring `VITE_API_URL` to be updated and Vercel to be redeployed.
- Access tokens use browser session storage; refresh-token rotation and secure HTTP-only refresh cookies are outside the assessment scope.
- Stock is checked during order creation but not reserved. A later buyer may complete payment first; finalization detects this and requires reconciliation rather than allowing negative stock.
- Refunds, disputes, partial captures, partial refunds, and chargebacks are outside the supplied requirements.
- The project uses one catalog currency, BDT; currency conversion is not implemented.
- Long-running monitoring, automated backups, and disaster-recovery procedures are not included in the assessment deployment.

---

## 12. Final Verdict

The project successfully implements the assessment's main functional, architectural, algorithmic, data, security, documentation, testing, frontend, and deployment requirements.

The strongest aspects are the provider-independent payment architecture, deterministic Decimal-based totals, server-side payment verification, serializable and idempotent stock finalization, relational constraints and indexes, real DFS traversal, Redis cache-aside behavior, ownership enforcement, structured API errors, comprehensive documentation, and repeatable Docker environment.

The automated backend result is strong: all 7 suites and all 32 tests pass, lint passes, TypeScript compilation passes, migrations and seed data work, and all Docker services report healthy. Local and public API checks return HTTP 200, Redis caching is active, and Vercel CORS is correctly configured.

The correct final classification is:

**Implementation-complete and assessment-demo-ready, with third-party verification limitations.**

The application is ready to demonstrate using Vercel, ngrok, and Docker. However, it should not be described as fully production-ready until real Stripe and bKash end-to-end transactions, production webhook delivery, secret rotation, long-running cloud availability, monitoring, backups, and operational recovery have been verified.

The README, assessment checklist, and this report now describe the verified final deployment state consistently.
