export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Raco Commerce API',
    version: '1.0.0',
    description:
      'Ordering and provider-verified payment API. Money is returned as decimal strings.',
  },
  servers: [{ url: 'http://localhost:4000', description: 'Local development' }],
  tags: [
    { name: 'Authentication' },
    { name: 'Users' },
    { name: 'Products' },
    { name: 'Categories' },
    { name: 'Orders' },
    { name: 'Payments' },
    { name: 'Webhooks' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['success', 'message', 'code', 'details'],
        properties: {
          success: { type: 'boolean', const: false },
          message: { type: 'string' },
          code: { type: 'string' },
          details: { type: 'array', items: {} },
          requestId: { type: 'string' },
        },
      },
      RegisterInput: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', minLength: 2 },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 10, format: 'password' },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password' },
        },
      },
      ProductInput: {
        type: 'object',
        required: ['name', 'sku', 'description', 'price', 'stock', 'status', 'categoryId'],
        properties: {
          name: { type: 'string' },
          sku: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'number', minimum: 0 },
          stock: { type: 'integer', minimum: 0 },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
          categoryId: { type: 'string', format: 'uuid' },
        },
      },
      CategoryInput: {
        type: 'object',
        required: ['name', 'slug'],
        properties: {
          name: { type: 'string' },
          slug: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
          parentId: { type: ['string', 'null'], format: 'uuid' },
        },
      },
      OrderInput: {
        type: 'object',
        required: ['items'],
        properties: {
          items: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['productId', 'quantity'],
              properties: {
                productId: { type: 'string', format: 'uuid' },
                quantity: { type: 'integer', minimum: 1 },
              },
            },
          },
        },
      },
      CheckoutInput: {
        type: 'object',
        required: ['provider'],
        properties: { provider: { type: 'string', enum: ['stripe', 'bkash'] } },
      },
    },
  },
  paths: {
    '/api/auth/register': {
      post: operation('Authentication', 'Register a user', 'RegisterInput', false, ['201', '409', '422']),
    },
    '/api/auth/login': {
      post: operation('Authentication', 'Log in and receive a JWT', 'LoginInput', false, ['200', '401', '422']),
    },
    '/api/auth/me': { get: operation('Authentication', 'Get current profile', undefined, true) },
    '/api/users/me/orders': { get: operation('Users', 'List own orders', undefined, true) },
    '/api/users/me/payments': { get: operation('Users', 'List own payments', undefined, true) },
    '/api/products': {
      get: operation('Products', 'List active products with pagination/search/filter'),
      post: operation('Products', 'Create a product (admin)', 'ProductInput', true, ['201', '403', '409', '422']),
    },
    '/api/products/{id}': {
      get: operation('Products', 'Get active product details', undefined, false, ['200', '404']),
      patch: operation('Products', 'Update a product (admin)', 'ProductInput', true),
      delete: operation('Products', 'Delete a product (admin)', undefined, true, ['204', '409']),
    },
    '/api/products/{id}/recommendations': {
      get: operation('Products', 'Get deterministic DFS recommendations'),
    },
    '/api/products/admin/list': {
      get: operation('Products', 'List all products including inactive (admin)', undefined, true),
    },
    '/api/categories': {
      get: operation('Categories', 'List categories'),
      post: operation('Categories', 'Create a category (admin)', 'CategoryInput', true, ['201', '403', '409']),
    },
    '/api/categories/tree': { get: operation('Categories', 'Get cached category tree') },
    '/api/categories/{id}': {
      get: operation('Categories', 'Get category'),
      patch: operation('Categories', 'Update category and invalidate cache (admin)', 'CategoryInput', true),
      delete: operation('Categories', 'Delete unused category (admin)', undefined, true, ['204', '409']),
    },
    '/api/orders': {
      post: operation('Orders', 'Create a transactionally calculated order', 'OrderInput', true, ['201', '409', '422']),
      get: operation('Orders', 'List own orders', undefined, true),
    },
    '/api/orders/{id}': { get: operation('Orders', 'Get an owned order', undefined, true, ['200', '403', '404']) },
    '/api/orders/{id}/cancel': { patch: operation('Orders', 'Cancel an owned pending order', undefined, true, ['200', '409']) },
    '/api/orders/{orderId}/checkout': {
      post: operation('Payments', 'Initiate provider-independent checkout', 'CheckoutInput', true, ['201', '409']),
    },
    '/api/payments': { get: operation('Payments', 'List own payments', undefined, true) },
    '/api/payments/stripe/create-intent': {
      post: operation('Payments', 'Create Stripe Payment Intent', 'CheckoutInput', true, ['201']),
    },
    '/api/payments/stripe/verify': {
      post: operation('Payments', 'Verify Stripe payment server-side', undefined, true),
    },
    '/api/payments/bkash/create': {
      post: operation('Payments', 'Create bKash checkout', undefined, true, ['201']),
    },
    '/api/payments/bkash/execute': {
      post: operation('Payments', 'Execute and verify bKash payment', undefined, true),
    },
    '/api/payments/bkash/query/{paymentId}': {
      get: operation('Payments', 'Query and normalize bKash payment', undefined, true),
    },
    '/api/webhooks/stripe': {
      post: operation('Webhooks', 'Handle a signed Stripe webhook', undefined, false, ['200', '400']),
    },
    '/api/webhooks/bkash': {
      post: operation('Webhooks', 'Handle and verify a bKash callback', undefined, false),
    },
  },
} as const

function operation(
  tag: string,
  summary: string,
  requestSchema?: string,
  secured = false,
  statuses: string[] = ['200', '401', '422'],
) {
  const responses = Object.fromEntries(
    statuses.map((status) => [
      status,
      {
        description: status.startsWith('2') ? 'Successful response' : 'Error response',
        content: {
          'application/json': {
            schema: status.startsWith('2')
              ? { type: 'object', properties: { success: { const: true }, data: {} } }
              : { $ref: '#/components/schemas/Error' },
          },
        },
      },
    ]),
  )
  return {
    tags: [tag],
    summary,
    ...(secured ? { security: [{ bearerAuth: [] }] } : {}),
    ...(requestSchema
      ? {
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: `#/components/schemas/${requestSchema}` } },
            },
          },
        }
      : {}),
    responses,
  }
}
