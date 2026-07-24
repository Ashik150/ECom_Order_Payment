# Local Backend Through Ngrok

## 1. Purpose

The Backend Engineer Assessment requires:

- The frontend to run on Vercel.
- The backend to run locally through ngrok.
- The backend and database to run through Docker.

This guide documents the exact workflow for making the local Docker backend
available to the deployed Vercel frontend.

## 2. Request Flow

```text
Interviewer browser
        |
        v
Vercel React frontend
        |
        v
Public ngrok HTTPS URL
        |
        v
localhost:4000
        |
        v
Docker backend
   |          |
   v          v
PostgreSQL   Redis
```

Vercel does not run the backend. Ngrok creates a public HTTPS tunnel to port
4000 on the local machine. Docker publishes the backend container on that port.

## 3. Prerequisites

Before starting, confirm:

- Docker Desktop is installed and open.
- ngrok is installed.
- An ngrok account and authentication token are configured.
- The root `.env` exists and contains placeholder-free local values.
- The Vercel frontend project has already been created.

Check the installed tools:

```bash
docker --version
docker compose version
ngrok version
```

One-time ngrok account setup:

```bash
ngrok config add-authtoken <your-ngrok-auth-token>
```

Never commit or share the authentication token.

## 4. Start the Docker Backend

Open Docker Desktop and wait until the Docker engine is running.

In Terminal 1:

```bash
cd "/Users/ashikkhan/Documents/Raco AI"
docker compose up -d --build
```

The first run downloads Node, PostgreSQL, and Redis images and may take several
minutes. Later starts use the cached images.

Check service health:

```bash
docker compose ps
```

Expected services:

```text
racoai-backend-1   healthy   0.0.0.0:4000->4000/tcp
racoai-db-1        healthy
racoai-redis-1     healthy
```

Seed the database on the first run:

```bash
docker compose run --rm backend npm run prisma:seed
```

The named PostgreSQL volume preserves the seed data, so seeding is not required
after every restart.

## 5. Verify the Local API First

Do not start troubleshooting ngrok until the local API works:

```bash
curl http://localhost:4000/api/health
```

Expected shape:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "..."
  }
}
```

Check seeded products:

```bash
curl "http://localhost:4000/api/products?page=1"
```

Inspect backend logs when either request fails:

```bash
docker compose logs --tail=100 backend
```

## 6. Start Ngrok

Keep Docker running. Open Terminal 2 and run:

```bash
ngrok http 4000
```

The command can run from any folder because it forwards a port, not a project
directory. Running it from the repository root is convenient but not required.

The ngrok screen displays something similar to:

```text
Session Status   online
Web Interface    http://127.0.0.1:4040
Forwarding       https://<domain>.ngrok-free.dev -> http://localhost:4000
```

The `Forwarding` HTTPS address is the public backend domain. Keep this terminal
running. Pressing `Ctrl+C`, closing the terminal, sleeping the Mac, stopping
Docker, or losing internet access makes the backend unavailable.

The address used during the verified setup was:

```text
https://rummage-borough-tapestry.ngrok-free.dev
```

Always check the ngrok terminal for the current address before a demonstration.

## 7. Verify the Public Tunnel

Replace `<ngrok-domain>` with the current domain:

```bash
curl -i "https://<ngrok-domain>/api/health"
```

Expected result:

```text
HTTP/2 200
```

Verify the endpoint used by Vercel and its CORS header:

```bash
curl -i \
  -H "Origin: https://e-com-order-payment.vercel.app" \
  "https://<ngrok-domain>/api/products?page=1"
```

The response must include:

```text
access-control-allow-origin: https://e-com-order-payment.vercel.app
```

## 8. Connect Vercel to Ngrok

In the Vercel project, open:

```text
Project Settings -> Environment Variables
```

Set:

```text
VITE_API_URL=https://<ngrok-domain>/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_replace_me
```

Use the ngrok HTTPS address, include `/api`, and do not add a trailing slash
after `/api`.

Redeploy the frontend after changing `VITE_API_URL`. Vite embeds environment
variables during the build, so an existing deployment continues using the old
address until it is rebuilt.

## 9. Configure Backend CORS and Callback

In the root `.env`, set:

```text
FRONTEND_URL=https://e-com-order-payment.vercel.app
BKASH_CALLBACK_URL=https://e-com-order-payment.vercel.app/checkout
```

Recreate the backend so it receives the new values:

```bash
docker compose up -d --build backend
```

The backend allows one configured browser origin. Use only the Vercel origin in
`FRONTEND_URL`; do not append `/api`, `/products`, or `/checkout`.

## 10. Ngrok Browser Warning Handling

Free ngrok domains may display a browser warning page. The centralized Axios
client detects `ngrok-free.app` and `ngrok-free.dev` addresses and adds:

```text
ngrok-skip-browser-warning: 1
```

This allows API requests to receive JSON instead of the warning HTML. If a new
ngrok domain uses a different suffix, update the detection rule in
`client/src/api/client.ts`.

## 11. Inspect Requests

While ngrok is running, open:

```text
http://127.0.0.1:4040
```

The ngrok inspection interface shows:

- Request method and path.
- Request and response headers.
- HTTP status.
- Request duration.
- Whether a request reached the local backend.

This is useful for separating frontend, tunnel, CORS, and backend problems.

## 12. Daily Demonstration Checklist

Run these steps before sharing the Vercel URL:

```bash
cd "/Users/ashikkhan/Documents/Raco AI"
docker compose up -d
docker compose ps
curl http://localhost:4000/api/health
```

Then start ngrok:

```bash
ngrok http 4000
```

Complete the checklist:

- Confirm all three Docker services are healthy.
- Confirm local health returns HTTP 200.
- Confirm the ngrok domain matches Vercel's `VITE_API_URL`.
- Redeploy Vercel if the domain changed.
- Confirm the public health endpoint returns HTTP 200.
- Confirm the public products endpoint returns data.
- Confirm the Vercel origin appears in the CORS response header.
- Open the Vercel application in a private browser window.
- Test product browsing, login, and one checkout mode.
- Keep Docker Desktop, ngrok, the Mac, and internet access running.

## 13. Stop and Restart

Stop only the ngrok tunnel:

```text
Press Ctrl+C in the ngrok terminal.
```

Stop the Docker application without deleting data:

```bash
docker compose down
```

Start it again:

```bash
docker compose up -d
```

Do not use the following command unless all Docker database and Redis data
should be deleted:

```bash
docker compose down -v
```

## 14. Troubleshooting

### Vercel Shows `Network Error`

Check in this order:

```bash
docker compose ps
curl http://localhost:4000/api/health
curl https://<ngrok-domain>/api/health
```

If local works but public fails, restart ngrok. If both work, verify the Vercel
`VITE_API_URL` and redeploy.

### Browser Reports a CORS Error

Confirm:

```text
FRONTEND_URL=https://e-com-order-payment.vercel.app
```

Then restart the backend:

```bash
docker compose up -d --force-recreate backend
```

Test the header directly:

```bash
curl -i \
  -H "Origin: https://e-com-order-payment.vercel.app" \
  https://<ngrok-domain>/api/health
```

### ngrok Returns `ERR_NGROK_8012`

The tunnel is online but cannot connect to port 4000. Start the backend and
verify it is healthy:

```bash
docker compose up -d
docker compose ps
```

### Docker Cannot Bind Port 4000

Another local backend is probably using the port. Stop the old `npm run dev`
terminal before starting Docker.

Check the listener on macOS:

```bash
lsof -nP -iTCP:4000 -sTCP:LISTEN
```

### Products Return 404

Confirm the frontend base URL ends in `/api`:

```text
https://<ngrok-domain>/api
```

The product client then adds `/products`. Do not configure the base as
`https://<ngrok-domain>/api/products`.

### Browser Shows HTTP 200 but Axios Reports Failure

Inspect the response in `http://127.0.0.1:4040`. If it contains ngrok warning
HTML instead of JSON, confirm the frontend request contains:

```text
ngrok-skip-browser-warning: 1
```

### Vercel Still Uses the Previous Domain

Environment changes are not applied to an already-built Vite bundle. Update
the Production environment variable and create a new Vercel deployment.

### Payment Redirect Returns to the Wrong Page

Set the bKash callback to the deployed frontend:

```text
BKASH_CALLBACK_URL=https://e-com-order-payment.vercel.app/checkout
```

Restart the backend after changing it.

## 15. Interview Explanation

A concise explanation is:

> The React frontend is deployed on Vercel. The Express backend, PostgreSQL,
> and Redis run locally through Docker Compose. Docker publishes the backend on
> port 4000, and ngrok creates a public HTTPS tunnel to that port. Vercel uses
> the ngrok URL as its API base URL. CORS allows only the Vercel origin, and the
> client adds ngrok's warning-bypass header for API requests. This setup
> satisfies the assessment requirement while keeping backend secrets and
> provider credentials on the local server.

## 16. Limitation

This is an assessment demonstration deployment, not an always-online hosting
solution. The interviewer can use the Vercel frontend only while the local Mac,
Docker Desktop, Docker services, ngrok tunnel, and internet connection are
running.

