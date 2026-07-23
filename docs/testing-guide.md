# Testing Guide

```bash
cd Server
npm install
npm run prisma:generate
npm run lint
npm run typecheck
npm test
npm run build

cd ../client
npm install
npm run lint
npm run typecheck
npm run build
```

Jest tests use mocked PostgreSQL/provider transports and never contact Stripe or
bKash. The suite covers decimal totals, invalid quantities/prices, DFS ordering
and cycle protection, cache behavior, strategy resolution, provider
normalization/token caching, transactional stock finalization, duplicate
processing, API validation, registration secrecy, duplicate email, auth/RBAC,
order ownership, checkout, Swagger, and invalid webhook signatures.

Database migration and seed verification require a local PostgreSQL instance.
Redis is optional for API correctness: cache failures are logged and category
reads fall back to PostgreSQL.
