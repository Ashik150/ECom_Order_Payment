# Environment Configuration Guide

## 1. Purpose

This guide explains every environment variable used by Raco Commerce, where it
must be configured, and how the values change between:

- A completely local development environment.
- The Docker Compose environment.
- A Vercel frontend connected to the local backend through ngrok.

Never commit the real `.env` file. The repository tracks only `.env.example`,
which contains placeholders.

## 2. Environment File Location

Create the environment file at the repository root:

```bash
cd "/Users/ashikkhan/Documents/Raco AI"
cp .env.example .env
```

The final location must be:

```text
Raco AI/.env
```

The backend explicitly loads the root file. Vite also uses the repository root
as its environment directory through `client/vite.config.ts`.

Use normal `KEY=value` syntax:

```text
PORT=4000
```

Do not add Markdown characters such as `**`, and do not put spaces around `=`.

## 3. Security Rules

- Keep `.env` outside Git; the root `.gitignore` already excludes it.
- Never place server secrets in variables beginning with `VITE_`.
- Treat every `VITE_*` value as public because Vite embeds it in browser code.
- Use test or sandbox payment credentials for the assessment.
- Rotate any credential that has been pasted into chat, screenshots, documents,
  or other places outside the intended secret store.
- Use different credentials and JWT secrets for development and production.

Generate a strong local JWT secret:

```bash
openssl rand -hex 32
```

## 4. Application Variables

### `NODE_ENV`

Controls development, test, or production behavior.

```text
NODE_ENV=development
```

Allowed values are `development`, `test`, and `production`. Payment mock modes
are rejected when this value is `production`.

### `PORT`

The Express API port:

```text
PORT=4000
```

Docker publishes this as `localhost:4000`, and ngrok forwards traffic to it.

### `FRONTEND_URL`

The one browser origin allowed by backend CORS.

For a local Vite frontend:

```text
FRONTEND_URL=http://localhost:5173
```

For the deployed assessment frontend:

```text
FRONTEND_URL=https://e-com-order-payment.vercel.app
```

Use the exact origin without a trailing slash or path.

### `LOG_LEVEL`

Controls Pino logging verbosity:

```text
LOG_LEVEL=info
```

Useful alternatives include `debug`, `warn`, and `error`.

## 5. Database and Cache Variables

### `DATABASE_URL`

Prisma's PostgreSQL connection string.

For a host-installed PostgreSQL example:

```text
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/raco_commerce?schema=public
```

Docker Compose overrides this inside the backend container with:

```text
postgresql://raco:raco_local_password@db:5432/raco_commerce?schema=public
```

Inside Docker, `db` is the PostgreSQL service name. `localhost` would point back
to the backend container and would not reach PostgreSQL.

### `REDIS_URL`

For a host-installed Redis:

```text
REDIS_URL=redis://localhost:6379
```

Docker Compose overrides it inside the backend container with:

```text
REDIS_URL=redis://redis:6379
```

The second `redis` is the Compose service name.

### `CATEGORY_CACHE_TTL_SECONDS`

Controls how long the category tree remains cached:

```text
CATEGORY_CACHE_TTL_SECONDS=300
```

The default of 300 seconds means five minutes. Category mutations also delete
the cache immediately.

## 6. JWT Variables

### `JWT_SECRET`

Signs and verifies access tokens. It must contain at least 32 characters:

```text
JWT_SECRET=<generated-secret>
```

### `JWT_EXPIRES_IN`

Controls token lifetime:

```text
JWT_EXPIRES_IN=1h
```

Examples include `30m`, `1h`, and `1d`.

## 7. Stripe Variables

### `STRIPE_SECRET_KEY`

Private server key used by the Stripe SDK:

```text
STRIPE_SECRET_KEY=sk_test_replace_me
```

This must stay in the root `.env` used by the backend. Never add it to Vercel's
frontend project.

### `STRIPE_PUBLISHABLE_KEY`

Server-side configuration field retained for complete provider configuration:

```text
STRIPE_PUBLISHABLE_KEY=pk_test_replace_me
```

The browser does not read this variable. The actual React Stripe form uses
`VITE_STRIPE_PUBLISHABLE_KEY`.

### `STRIPE_WEBHOOK_SECRET`

Validates signed Stripe webhook payloads:

```text
STRIPE_WEBHOOK_SECRET=whsec_replace_me
```

The value must match the webhook endpoint or Stripe CLI forwarding session
being used. It is a server secret.

### `VITE_STRIPE_PUBLISHABLE_KEY`

Public Stripe key used by React and Stripe Elements:

```text
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_replace_me
```

This is safe to expose in browser code and must be added to Vercel.

## 8. bKash Variables

### `BKASH_BASE_URL`

Sandbox example:

```text
BKASH_BASE_URL=https://tokenized.sandbox.bka.sh/v1.2.0-beta
```

Use the provider's approved live URL only when switching to live credentials.

### bKash Credentials

The following are private backend values:

```text
BKASH_APP_KEY=replace_me
BKASH_APP_SECRET=replace_me
BKASH_USERNAME=replace_me
BKASH_PASSWORD=replace_me
```

They are used to acquire the bKash grant token and must never be added to
Vercel's frontend variables.

### `BKASH_CALLBACK_URL`

The page to which bKash returns the customer.

For local frontend development:

```text
BKASH_CALLBACK_URL=http://localhost:5173/checkout
```

For the Vercel frontend:

```text
BKASH_CALLBACK_URL=https://e-com-order-payment.vercel.app/checkout
```

## 9. Payment Mode Variables

### `PAYMENT_MOCK_MODE`

Provides the default mock setting for both providers:

```text
PAYMENT_MOCK_MODE=false
```

### `STRIPE_MOCK_MODE` and `BKASH_MOCK_MODE`

Provider-specific values override `PAYMENT_MOCK_MODE`.

Recommended assessment configuration with real Stripe test mode and mocked
bKash:

```text
PAYMENT_MOCK_MODE=false
STRIPE_MOCK_MODE=false
BKASH_MOCK_MODE=true
```

To call both real provider test/sandbox APIs:

```text
PAYMENT_MOCK_MODE=false
STRIPE_MOCK_MODE=false
BKASH_MOCK_MODE=false
```

To demonstrate both providers without external API calls:

```text
PAYMENT_MOCK_MODE=true
STRIPE_MOCK_MODE=true
BKASH_MOCK_MODE=true
```

Mock modes are for development and assessment demonstrations only.

## 10. Frontend API Variable

### `VITE_API_URL`

Controls the Axios base URL used by React.

For a completely local setup:

```text
VITE_API_URL=http://localhost:4000/api
```

For the Vercel frontend and local ngrok backend:

```text
VITE_API_URL=https://<current-ngrok-domain>/api
```

The `/api` suffix is required. The frontend automatically sends
`ngrok-skip-browser-warning: 1` for `ngrok-free.app` and `ngrok-free.dev`
domains.

## 11. Recommended Root `.env` for Docker and Ngrok

Use placeholders for all credentials:

```text
NODE_ENV=development
PORT=4000
FRONTEND_URL=https://e-com-order-payment.vercel.app
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/raco_commerce?schema=public
REDIS_URL=redis://localhost:6379
CATEGORY_CACHE_TTL_SECONDS=300
JWT_SECRET=<at-least-32-random-characters>
JWT_EXPIRES_IN=1h
LOG_LEVEL=info
STRIPE_SECRET_KEY=sk_test_replace_me
STRIPE_PUBLISHABLE_KEY=pk_test_replace_me
STRIPE_WEBHOOK_SECRET=whsec_replace_me
BKASH_BASE_URL=https://tokenized.sandbox.bka.sh/v1.2.0-beta
BKASH_APP_KEY=replace_me
BKASH_APP_SECRET=replace_me
BKASH_USERNAME=replace_me
BKASH_PASSWORD=replace_me
BKASH_CALLBACK_URL=https://e-com-order-payment.vercel.app/checkout
PAYMENT_MOCK_MODE=false
STRIPE_MOCK_MODE=false
BKASH_MOCK_MODE=true
VITE_API_URL=https://<current-ngrok-domain>/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_replace_me
```

The host database and Redis values remain in this file for non-Docker commands.
Docker Compose replaces those two URLs inside the backend container.

## 12. Vercel Environment Variables

Add only these variables to the Vercel frontend project:

```text
VITE_API_URL=https://<current-ngrok-domain>/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_replace_me
```

Apply them to the Production environment and redeploy after changing either
value. Vite variables are compiled during the build, so changing the dashboard
value does not change an already-built deployment.

Do not add `DATABASE_URL`, `JWT_SECRET`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `BKASH_APP_SECRET`, `BKASH_USERNAME`, or
`BKASH_PASSWORD` to the frontend project.

## 13. Docker Environment Behavior

`compose.yaml` loads the root `.env` into the backend container. It then
overrides these values:

```text
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://raco:raco_local_password@db:5432/raco_commerce?schema=public
REDIS_URL=redis://redis:6379
```

All JWT, CORS, Stripe, bKash, logging, callback, cache TTL, and mock-mode values
continue to come from the root `.env`.

After changing backend variables, recreate the backend:

```bash
docker compose up -d --build backend
```

## 14. Configuration Verification

Validate the Compose model:

```bash
docker compose config --quiet
```

Start and inspect services:

```bash
docker compose up -d
docker compose ps
docker compose logs --tail=100 backend
```

Verify the API and CORS:

```bash
curl -i \
  -H "Origin: https://e-com-order-payment.vercel.app" \
  http://localhost:4000/api/health
```

The response should contain:

```text
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://e-com-order-payment.vercel.app
```

## 15. Common Configuration Errors

`Environment variable not found: DATABASE_URL`:

- Confirm `.env` is in the repository root.
- Confirm the line uses plain `DATABASE_URL=value` syntax.
- Recreate the backend after changing Docker environment values.

Browser CORS error:

- Set `FRONTEND_URL` to the exact Vercel origin.
- Do not include `/`, `/api`, or `/checkout`.
- Restart the backend container.

Vercel still calls an old ngrok domain:

- Update `VITE_API_URL` in Vercel.
- Confirm the value ends with `/api`.
- Redeploy because Vite embeds the value at build time.

Stripe form does not load:

- Confirm `VITE_STRIPE_PUBLISHABLE_KEY` starts with the appropriate `pk_`
  prefix.
- Confirm Vercel was redeployed after adding the variable.
- Confirm Stripe mock mode is disabled when using real Stripe Elements.

bKash authentication fails:

- Verify that app key, app secret, username, and password belong to the same
  sandbox account.
- Confirm `BKASH_BASE_URL` matches those credentials.
- Use `BKASH_MOCK_MODE=true` only for the documented local demonstration.

