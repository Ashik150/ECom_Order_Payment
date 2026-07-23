# API Guide

Swagger UI: `http://localhost:4000/api/docs`  
OpenAPI JSON: `http://localhost:4000/api/docs.json`

All resource routes use `/api`. Protected routes require
`Authorization: Bearer <token>`. Responses use `{ success, data, meta? }` or:

```json
{
  "success": false,
  "message": "Human-readable message",
  "code": "STABLE_ERROR_CODE",
  "details": [],
  "requestId": "correlation-id"
}
```

Main groups:

- Auth: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- Users: `GET /users/me/orders`, `GET /users/me/payments`
- Products: public list/detail/recommendations; admin CRUD and inactive reads
- Categories: flat/tree/detail reads; admin CRUD
- Orders: create/list/detail/cancel and `POST /orders/:orderId/checkout`
- Payments: Stripe create/verify, bKash create/execute/query, own history
- Webhooks: `POST /webhooks/stripe`, `POST /webhooks/bkash`

List routes accept `page` and `limit`; products also accept `search` and
`categoryId`. The authoritative order body contains only product IDs and
quantities. Prices and totals from clients are ignored.
