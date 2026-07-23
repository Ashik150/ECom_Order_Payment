import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.id_token',
      '*.app_secret',
      '*.appSecret',
    ],
    censor: '[REDACTED]',
  },
  base: process.env.NODE_ENV === 'production' ? undefined : { service: 'raco-commerce-api' },
})
